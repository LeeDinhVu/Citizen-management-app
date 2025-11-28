using Microsoft.AspNetCore.Mvc;
using CitizenGraph.Backend.Services;
using Neo4j.Driver;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Text.Json;

namespace CitizenGraph.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CitizensController : ControllerBase
    {
        private readonly Neo4jRepository _repository;
        private readonly AdminActionLogger _logger;

        public CitizensController(Neo4jRepository repository, AdminActionLogger logger)
        {
            _repository = repository;
            _logger = logger;
        }

        // =========================================================================================
        // 1. THỐNG KÊ CÔNG DÂN
        // =========================================================================================
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            const string action = "Xem thống kê công dân (Citizens)";
            await _logger.LogProcessing(action, "Citizens");

            try
            {
                var query = @"
                    MATCH (p:Person)
                    WITH count(p) AS Total
                    MATCH (m:Person) WHERE m.gioiTinh = 'Nam'   WITH Total, count(m) AS Male
                    MATCH (f:Person) WHERE f.gioiTinh = 'Nữ'    WITH Total, Male, count(f) AS Female
                    MATCH (a:Person) WHERE a.ngaySinh IS NOT NULL
                    WITH Total, Male, Female, a
                    WITH Total, Male, Female, 
                         date().year - date(a.ngaySinh).year AS Age
                    RETURN 
                        Total,
                        Male,
                        Female,
                        Total - (Male + Female) AS OtherGender,
                        avg(toFloat(Age)) AS AvgAge";

                var result = await _repository.RunAsync(query);
                var rec = result.FirstOrDefault();

                if (rec == null)
                {
                    await _logger.LogSuccess(action, "Citizens");
                    return Ok(new { Total = 0L, Male = 0L, Female = 0L, OtherGender = 0L, AvgAge = 0.0 });
                }

                await _logger.LogSuccess(action, "Citizens");

                return Ok(new
                {
                    Total = rec["Total"].As<long>(),
                    Male = rec["Male"].As<long>(),
                    Female = rec["Female"].As<long>(),
                    OtherGender = rec["OtherGender"].As<long>(),
                    AvgAge = Math.Round(rec["AvgAge"].As<double>(), 1)
                });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"Thống kê công dân thất bại: {ex.Message}", "Citizens");
                return StatusCode(500, new { message = "Lỗi server", error = ex.Message });
            }
        }

        // =========================================================================================
        // 2. DANH SÁCH CÔNG DÂN
        // =========================================================================================
        [HttpGet]
        public async Task<IActionResult> GetAllCitizens([FromQuery] string search = "", [FromQuery] int limit = 100)
        {
            var action = string.IsNullOrEmpty(search)
                ? "Xem danh sách công dân"
                : $"Tìm kiếm công dân: '{search}'";

            await _logger.LogProcessing(action, "Citizens");

            try
            {
                var query = @"
                    MATCH (n:Person)
                    WHERE ($search = '' 
                        OR toLower(n.hoTen) CONTAINS toLower($search)
                        OR n.cccd CONTAINS $search)
                    RETURN n
                    ORDER BY n.createdDate DESC
                    LIMIT $limit";

                var result = await _repository.RunAsync(query, new { search, limit });

                await _logger.LogSuccess(action, "Citizens");

                return Ok(result.Select(r => MapNodeToDto(r["n"].As<INode>())));
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Citizens");
                return StatusCode(500, new { message = "Lỗi server", error = ex.Message });
            }
        }

        // =========================================================================================
        // 3. CHI TIẾT CÔNG DÂN + QUAN HỆ
        // =========================================================================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCitizenDetail(string id)
        {
            var action = $"Xem chi tiết CCCD: {id}";
            try
            {
                var query = @"
                    MATCH (n:Person)
                    WHERE n.cccd = $id 
                    OPTIONAL MATCH (n)-[r]-(m) 
                    RETURN n as SourceNode, r as Rel, m as TargetNode";

                var result = await _repository.RunAsync(query, new { id });

                if (!result.Any()) return NotFound(new { message = "Không tìm thấy công dân" });

                var firstRecord = result.First();
                var personDto = MapNodeToDto(firstRecord["SourceNode"].As<INode>());

                var relationships = new List<object>();
                foreach (var record in result)
                {
                    if (record["Rel"] is IRelationship rel && record["TargetNode"] is INode target)
                    {
                        var sourceId = firstRecord["SourceNode"].As<INode>().Id;
                        var direction = rel.StartNodeId == sourceId ? "OUT" : "IN";

                        relationships.Add(new
                        {
                            Id = rel.Id,
                            Type = rel.Type,
                            Direction = direction,
                            Properties = NormalizeDictionary(rel.Properties),
                            Target = new
                            {
                                Id = GetProp(target.Properties, "cccd") ?? target.Id.ToString(),
                                Name = GetProp(target.Properties, "hoTen"),
                                Label = target.Labels.FirstOrDefault() ?? "Unknown"
                            }
                        });
                    }
                }

                return Ok(new { Person = personDto, Relationships = relationships });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi server", error = ex.Message });
            }
        }

        // =========================================================================================
        // 4. CRUD CÔNG DÂN (CREATE)
        // =========================================================================================
        [HttpPost]
        public async Task<IActionResult> CreateCitizen([FromBody] Dictionary<string, object> rawProps)
        {
            var action = "Tạo công dân mới";
            await _logger.LogProcessing(action, "Citizens");

            try
            {
                var props = ConvertDictionary(rawProps);

                if (!props.ContainsKey("hoTen") || !props.ContainsKey("ngaySinh") || !props.ContainsKey("cccd"))
                    return BadRequest(new { message = "Họ tên, CCCD và ngày sinh là bắt buộc." });

                DateTime dob;
                if (!DateTime.TryParse(props["ngaySinh"].ToString(), out dob))
                    return BadRequest(new { message = "Định dạng ngày sinh không hợp lệ." });

                var age = DateTime.Now.Year - dob.Year;
                if (dob > DateTime.Now.AddYears(-age)) age--;
                
                bool isChild = age < 18;

                if (isChild)
                {
                    string fatherCCCD = props.ContainsKey("fatherCCCD") ? props["fatherCCCD"]?.ToString() : null;
                    string motherCCCD = props.ContainsKey("motherCCCD") ? props["motherCCCD"]?.ToString() : null;

                    if (string.IsNullOrEmpty(fatherCCCD) && string.IsNullOrEmpty(motherCCCD))
                        return BadRequest(new { message = "Trẻ em cần nhập CCCD của ít nhất Cha hoặc Mẹ." });

                    // Validate tồn tại và giới tính
                    if (!string.IsNullOrEmpty(fatherCCCD))
                    {
                        var checkF = await _repository.RunAsync("MATCH (f:Person {cccd: $id, gioiTinh: 'Nam'}) RETURN count(f) as c", new { id = fatherCCCD });
                        if (checkF.First()["c"].As<long>() == 0) return BadRequest(new { message = $"CCCD Cha ({fatherCCCD}) không tồn tại hoặc sai giới tính (phải là Nam)." });
                    }

                    if (!string.IsNullOrEmpty(motherCCCD))
                    {
                        var checkM = await _repository.RunAsync("MATCH (m:Person {cccd: $id, gioiTinh: 'Nữ'}) RETURN count(m) as c", new { id = motherCCCD });
                        if (checkM.First()["c"].As<long>() == 0) return BadRequest(new { message = $"CCCD Mẹ ({motherCCCD}) không tồn tại hoặc sai giới tính (phải là Nữ)." });
                    }

                    props["trangThai"] ??= "Hoạt động";
                    props["createdDate"] = DateTime.Now.ToString("yyyy-MM-dd");
                    bool isAdopted = props.ContainsKey("isAdopted") && bool.TryParse(props["isAdopted"].ToString(), out bool val) ? val : false;
                    props["isAdopted"] = isAdopted;
                    
                    props["fatherCCCD"] = string.IsNullOrEmpty(fatherCCCD) ? null : fatherCCCD;
                    props["motherCCCD"] = string.IsNullOrEmpty(motherCCCD) ? null : motherCCCD;

                    // *** QUAN TRỌNG: Thêm fatherCCCD và motherCCCD vào thuộc tính node ***
                    var createChildQuery = @"
                        CREATE (c:Person {
                            cccd: $cccd,
                            hoTen: $hoTen,
                            ngaySinh: $ngaySinh,
                            gioiTinh: $gioiTinh,
                            queQuan: $queQuan,
                            danToc: $danToc,
                            tonGiao: $tonGiao,
                            birthOrder: $birthOrder,
                            ngheNghiep: $ngheNghiep, 
                            trinhDoHocVan: $trinhDoHocVan,
                            trangThai: $trangThai,
                            createdDate: $createdDate,
                            fatherCCCD: $fatherCCCD,
                            motherCCCD: $motherCCCD
                        })
                        WITH c
                        OPTIONAL MATCH (f:Person {cccd: $fatherCCCD})
                        OPTIONAL MATCH (m:Person {cccd: $motherCCCD})
                        
                        FOREACH (_ IN CASE WHEN f IS NOT NULL THEN [1] ELSE [] END |
                            CREATE (c)-[:CHILD_OF {birthOrder: $birthOrder, isAdopted: $isAdopted}]->(f)
                            CREATE (f)-[:FATHER_OF {recognizedDate: $ngaySinh}]->(c)
                        )

                        FOREACH (_ IN CASE WHEN m IS NOT NULL THEN [1] ELSE [] END |
                            CREATE (c)-[:CHILD_OF {birthOrder: $birthOrder, isAdopted: $isAdopted}]->(m)
                            CREATE (m)-[:MOTHER_OF {recognizedDate: $ngaySinh}]->(c)
                        )
                        
                        RETURN c as n";

                    var result = await _repository.RunAsync(createChildQuery, props);
                    await _logger.LogSuccess($"Tạo trẻ em (CCCD): {props["hoTen"]}", "Citizens");
                    return Ok(MapNodeToDto(result.First()["n"].As<INode>()));
                }
                else
                {
                    props["trangThai"] ??= "Hoạt động";
                    props["createdDate"] = DateTime.Now.ToString("yyyy-MM-dd");
                    
                    var allowedKeys = new[] { "cccd", "hoTen", "ngaySinh", "gioiTinh", "queQuan", "danToc", "tonGiao", "ngheNghiep", "trinhDoHocVan", "trangThai", "createdDate" };
                    var cleanProps = props.Where(k => allowedKeys.Contains(k.Key)).ToDictionary(k => k.Key, v => v.Value);

                    var setClause = string.Join(", ", cleanProps.Keys.Select(k => $"n.{k} = ${k}"));
                    var query = $"CREATE (n:Person) SET {setClause} RETURN n";

                    var result = await _repository.RunAsync(query, cleanProps);
                    await _logger.LogSuccess($"Tạo người lớn: {props["hoTen"]}", "Citizens");
                    return Ok(MapNodeToDto(result.First()["n"].As<INode>()));
                }
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"Lỗi tạo: {ex.Message}", "Citizens");
                if (ex.Message.Contains("Constraint")) return StatusCode(409, new { message = "Số CCCD đã tồn tại trong hệ thống." });
                return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
            }
        }

        // =========================================================================================
        // 5. CRUD CÔNG DÂN (UPDATE)
        // =========================================================================================
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCitizen(string id, [FromBody] Dictionary<string, object> rawProps)
        {
            var action = $"Cập nhật công dân CCCD: {id}";
            await _logger.LogProcessing(action, "Citizens");

            try
            {
                var props = ConvertDictionary(rawProps);

                if (!props.Any()) return BadRequest("Không có dữ liệu update");

                // *** QUAN TRỌNG: Thêm fatherCCCD, motherCCCD vào danh sách update properties ***
                var nodeKeys = new[] { 
                    "hoTen", "ngaySinh", "gioiTinh", "queQuan", "danToc", "tonGiao", 
                    "ngheNghiep", "trinhDoHocVan", "trangThai", "cccd", 
                    "fatherCCCD", "motherCCCD"
                };
                
                var cleanProps = props.Where(k => nodeKeys.Contains(k.Key)).ToDictionary(k => k.Key, v => v.Value);
                cleanProps["targetCccd"] = id;
                cleanProps["updatedDate"] = DateTime.Now.ToString("yyyy-MM-dd");

                // Update Node Properties
                var updateNodeQuery = @"
                    MATCH (n:Person) 
                    WHERE n.cccd = $targetCccd
                    SET n += $cleanProps 
                    RETURN n";

                var result = await _repository.RunAsync(updateNodeQuery, new { targetCccd = id, cleanProps });
                if (!result.Any()) return NotFound(new { message = "Không tìm thấy hồ sơ" });

                var updatedNode = result.First()["n"].As<INode>();
                
                DateTime dob;
                bool isChild = false;
                if (updatedNode.Properties.ContainsKey("ngaySinh") && DateTime.TryParse(updatedNode.Properties["ngaySinh"].ToString(), out dob))
                {
                    var age = DateTime.Now.Year - dob.Year;
                    if (dob > DateTime.Now.AddYears(-age)) age--;
                    isChild = age < 18;
                }

                // Update Relationships (chỉ nếu là trẻ em)
                if (isChild)
                {
                    string fatherCCCD = props.ContainsKey("fatherCCCD") ? props["fatherCCCD"]?.ToString() : null;
                    string motherCCCD = props.ContainsKey("motherCCCD") ? props["motherCCCD"]?.ToString() : null;
                    object birthOrder = props.ContainsKey("birthOrder") ? props["birthOrder"] : null;
                    object isAdopted = props.ContainsKey("isAdopted") ? props["isAdopted"] : null;

                    // Chỉ xử lý nếu có dữ liệu gửi lên (không bắt buộc cả 2)
                    if (props.ContainsKey("fatherCCCD") || props.ContainsKey("motherCCCD"))
                    {
                        if (string.IsNullOrEmpty(fatherCCCD) && string.IsNullOrEmpty(motherCCCD))
                        {
                             // Cho phép xóa nếu gửi chuỗi rỗng? Tạm thời giữ logic bắt buộc 1 trong 2 nếu update quan hệ
                             return BadRequest(new { message = "Cần ít nhất CCCD Cha hoặc Mẹ." });
                        }

                        if (!string.IsNullOrEmpty(fatherCCCD))
                        {
                            var checkF = await _repository.RunAsync("MATCH (f:Person {cccd: $id, gioiTinh: 'Nam'}) RETURN count(f) as c", new { id = fatherCCCD });
                            if (checkF.First()["c"].As<long>() == 0) return BadRequest(new { message = $"CCCD Cha ({fatherCCCD}) không tồn tại hoặc sai giới tính." });
                        }
                        if (!string.IsNullOrEmpty(motherCCCD))
                        {
                            var checkM = await _repository.RunAsync("MATCH (m:Person {cccd: $id, gioiTinh: 'Nữ'}) RETURN count(m) as c", new { id = motherCCCD });
                            if (checkM.First()["c"].As<long>() == 0) return BadRequest(new { message = $"CCCD Mẹ ({motherCCCD}) không tồn tại hoặc sai giới tính." });
                        }

                        var updateRelQuery = @"
                            MATCH (n:Person) WHERE n.cccd = $targetCccd
                            
                            OPTIONAL MATCH (newF:Person {cccd: $fatherCCCD})
                            OPTIONAL MATCH (newM:Person {cccd: $motherCCCD})

                            OPTIONAL MATCH (n)-[oldR1:CHILD_OF]->() DELETE oldR1
                            OPTIONAL MATCH ()-[oldR2:FATHER_OF]->(n) DELETE oldR2
                            OPTIONAL MATCH ()-[oldR3:MOTHER_OF]->(n) DELETE oldR3

                            FOREACH (_ IN CASE WHEN newF IS NOT NULL THEN [1] ELSE [] END |
                                MERGE (n)-[rF:CHILD_OF]->(newF)
                                SET rF.birthOrder = $birthOrder, rF.isAdopted = $isAdopted
                                MERGE (newF)-[:FATHER_OF {recognizedDate: n.ngaySinh}]->(n)
                            )
                            
                            FOREACH (_ IN CASE WHEN newM IS NOT NULL THEN [1] ELSE [] END |
                                MERGE (n)-[rM:CHILD_OF]->(newM)
                                SET rM.birthOrder = $birthOrder, rM.isAdopted = $isAdopted
                                MERGE (newM)-[:MOTHER_OF {recognizedDate: n.ngaySinh}]->(n)
                            )
                            
                            RETURN n";
                        
                        var relParams = new { 
                            targetCccd = id, 
                            fatherCCCD = string.IsNullOrEmpty(fatherCCCD) ? null : fatherCCCD,
                            motherCCCD = string.IsNullOrEmpty(motherCCCD) ? null : motherCCCD,
                            birthOrder = birthOrder ?? 1, 
                            isAdopted = isAdopted is bool b ? b : false 
                        };

                        await _repository.RunAsync(updateRelQuery, relParams);
                    }
                }

                await _logger.LogSuccess(action, "Citizens");
                return Ok(MapNodeToDto(updatedNode));
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Citizens");
                return StatusCode(500, new { message = "Lỗi cập nhật", error = ex.Message });
            }
        }

        // =========================================================================================
        // 6. DELETE CÔNG DÂN
        // =========================================================================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCitizen(string id)
        {
            var action = $"Xóa công dân CCCD: {id}";
            await _logger.LogProcessing(action, "Citizens");

            try
            {
                await _repository.RunAsync("MATCH (n:Person) WHERE n.cccd = $id DETACH DELETE n", new { id });
                await _logger.LogSuccess(action, "Citizens");
                return Ok(new { message = "Đã xóa hồ sơ thành công" });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Citizens");
                return StatusCode(500, new { message = "Lỗi xóa", error = ex.Message });
            }
        }

        // =========================================================================================
        // 7. HELPER FUNCTIONS
        // =========================================================================================

        private Dictionary<string, object> ConvertDictionary(Dictionary<string, object> input)
        {
            var result = new Dictionary<string, object>();
            foreach (var kvp in input)
            {
                if (kvp.Value is JsonElement jsonElem)
                {
                    switch (jsonElem.ValueKind)
                    {
                        case JsonValueKind.String: result[kvp.Key] = jsonElem.GetString() ?? ""; break;
                        case JsonValueKind.Number:
                            if (jsonElem.TryGetInt64(out long l)) result[kvp.Key] = l;
                            else if (jsonElem.TryGetDouble(out double d)) result[kvp.Key] = d;
                            break;
                        case JsonValueKind.True: result[kvp.Key] = true; break;
                        case JsonValueKind.False: result[kvp.Key] = false; break;
                        default: result[kvp.Key] = jsonElem.ToString(); break;
                    }
                }
                else { result[kvp.Key] = kvp.Value; }
            }
            return result;
        }

        private object NormalizeValue(object value)
        {
            if (value == null) return null;
            if (value is LocalDate localDate) return localDate.ToString();
            if (value is ZonedDateTime zdt) return zdt.ToString();
            if (value is LocalDateTime ldt) return ldt.ToString();
            if (value is OffsetTime ot) return ot.ToString();
            if (value is LocalTime lt) return lt.ToString();
            return value;
        }

        private Dictionary<string, object> NormalizeDictionary(IReadOnlyDictionary<string, object> input)
        {
            var result = new Dictionary<string, object>();
            foreach (var kvp in input) result[kvp.Key] = NormalizeValue(kvp.Value);
            return result;
        }

        public class PersonDto
        {
            public string Id { get; set; }
            public string HoTen { get; set; }
            public string NgaySinh { get; set; }
            public string GioiTinh { get; set; }
            public string QueQuan { get; set; }
            public string MaritalStatus { get; set; }
            public string NgheNghiep { get; set; }
            public Dictionary<string, object> Details { get; set; }
        }

        private PersonDto MapNodeToDto(INode node)
        {
            var props = node.Properties;
            var standardKeys = new HashSet<string> { "hoTen", "ngaySinh", "gioiTinh", "queQuan", "maritalStatus", "ngheNghiep" };
            var details = new Dictionary<string, object>();
            
            foreach(var kvp in props)
            {
                if(!standardKeys.Contains(kvp.Key))
                {
                    details[kvp.Key] = NormalizeValue(kvp.Value);
                }
            }
            
            details["cccd"] = GetProp(props, "cccd");

            return new PersonDto
            {
                Id = details["cccd"].ToString(), 
                HoTen = GetProp(props, "hoTen") ?? "Không tên",
                NgaySinh = NormalizeValue(GetPropObj(props, "ngaySinh"))?.ToString(),
                GioiTinh = GetProp(props, "gioiTinh"),
                QueQuan = GetProp(props, "queQuan"),
                MaritalStatus = GetProp(props, "maritalStatus"),
                NgheNghiep = GetProp(props, "ngheNghiep"),
                Details = details 
            };
        }

        private object? GetPropObj(IReadOnlyDictionary<string, object> props, string key)
        {
            if (props.TryGetValue(key, out object? val)) return val;
            return null;
        }

        private string? GetProp(IReadOnlyDictionary<string, object> props, string key)
        {
            if (props.TryGetValue(key, out object? val)) return NormalizeValue(val)?.ToString() ?? "";
            return "";
        }
    }
}


// using Microsoft.AspNetCore.Mvc;
// using CitizenGraph.Backend.Services;
// using Neo4j.Driver;
// using System;
// using System.Linq;
// using System.Threading.Tasks;
// using System.Collections.Generic;
// using System.Text.Json;

// namespace CitizenGraph.Backend.Controllers
// {
//     [Route("api/[controller]")]
//     [ApiController]
// public class CitizensController : ControllerBase
//     {
//         private readonly Neo4jRepository _repository;
//         private readonly AdminActionLogger _logger;

//         public CitizensController(Neo4jRepository repository, AdminActionLogger logger)
//         {
//             _repository = repository;
//             _logger = logger;
//         }

//         // =========================================================================================
//         // 1. THỐNG KÊ CÔNG DÂN
//         // =========================================================================================
//         [HttpGet("stats")]
//         public async Task<IActionResult> GetStats()
//         {
//             const string action = "Xem thống kê công dân (Citizens)";
//             await _logger.LogProcessing(action, "Citizens");

//             try
//             {
//                 var query = @"
//                     MATCH (p:Person)
//                     WITH count(p) AS Total
//                     MATCH (m:Person) WHERE m.gioiTinh = 'Nam'   WITH Total, count(m) AS Male
//                     MATCH (f:Person) WHERE f.gioiTinh = 'Nữ'    WITH Total, Male, count(f) AS Female
//                     MATCH (a:Person) WHERE a.ngaySinh IS NOT NULL
//                     WITH Total, Male, Female, a
//                     WITH Total, Male, Female, 
//                          date().year - date(a.ngaySinh).year AS Age
//                     RETURN 
//                         Total,
//                         Male,
//                         Female,
//                         Total - (Male + Female) AS OtherGender,
//                         avg(toFloat(Age)) AS AvgAge";

//                 var result = await _repository.RunAsync(query);
//                 var rec = result.FirstOrDefault();

//                 if (rec == null)
//                 {
//                     await _logger.LogSuccess(action, "Citizens");
//                     return Ok(new { Total = 0L, Male = 0L, Female = 0L, OtherGender = 0L, AvgAge = 0.0 });
//                 }

//                 await _logger.LogSuccess(action, "Citizens");

//                 return Ok(new
//                 {
//                     Total = rec["Total"].As<long>(),
//                     Male = rec["Male"].As<long>(),
//                     Female = rec["Female"].As<long>(),
//                     OtherGender = rec["OtherGender"].As<long>(),
//                     AvgAge = Math.Round(rec["AvgAge"].As<double>(), 1)
//                 });
//             }
//             catch (Exception ex)
//             {
//                 await _logger.LogFailed($"Thống kê công dân thất bại: {ex.Message}", "Citizens");
//                 return StatusCode(500, new { message = "Lỗi server", error = ex.Message });
//             }
//         }

//         // =========================================================================================
//         // 2. DANH SÁCH CÔNG DÂN
//         // =========================================================================================
//         [HttpGet]
//         public async Task<IActionResult> GetAllCitizens([FromQuery] string search = "", [FromQuery] int limit = 100)
//         {
//             var action = string.IsNullOrEmpty(search)
//                 ? "Xem danh sách công dân"
//                 : $"Tìm kiếm công dân: '{search}'";

//             await _logger.LogProcessing(action, "Citizens");

//             try
//             {
//                 var query = @"
//                     MATCH (n:Person)
//                     WHERE ($search = '' 
//                         OR toLower(n.hoTen) CONTAINS toLower($search)
//                         OR n.cccd CONTAINS $search OR n.soKhaiSinh CONTAINS $search)
//                     RETURN n
//                     ORDER BY n.createdDate DESC
//                     LIMIT $limit";

//                 var result = await _repository.RunAsync(query, new { search, limit });

//                 await _logger.LogSuccess(action, "Citizens");

//                 return Ok(result.Select(r => MapNodeToDto(r["n"].As<INode>())));
//             }
//             catch (Exception ex)
//             {
//                 await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Citizens");
//                 return StatusCode(500, new { message = "Lỗi server", error = ex.Message });
//             }
//         }

//         // =========================================================================================
//         // 3. CHI TIẾT CÔNG DÂN + QUAN HỆ
//         // =========================================================================================
//         [HttpGet("{id}")]
//         public async Task<IActionResult> GetCitizenDetail(string id)
//         {
//             var action = $"Xem chi tiết ID: {id}";
//             try
//             {
//                 // Sửa query: Tìm theo cccd HOẶC soKhaiSinh
//                 var query = @"
//                     MATCH (n:Person)
//                     WHERE n.cccd = $id OR n.soKhaiSinh = $id
//                     OPTIONAL MATCH (n)-[r]-(m) 
//                     RETURN n as SourceNode, r as Rel, m as TargetNode";
                
//                 // Lưu ý: Tôi sửa (n)-[r]-(m) (bỏ mũi tên) để lấy cả quan hệ 2 chiều (cha mẹ <-> con)

//                 var result = await _repository.RunAsync(query, new { id });

//                 if (!result.Any()) return NotFound(new { message = "Không tìm thấy công dân" });

//                 var firstRecord = result.First();
//                 var personDto = MapNodeToDto(firstRecord["SourceNode"].As<INode>());

//                 var relationships = new List<object>();
//                 foreach (var record in result)
//                 {
//                     if (record["Rel"] is IRelationship rel && record["TargetNode"] is INode target)
//                     {
//                         var sourceId = firstRecord["SourceNode"].As<INode>().Id;
//                         var direction = rel.StartNodeId == sourceId ? "OUT" : "IN";

//                         relationships.Add(new
//                         {
//                             Id = rel.Id,
//                             Type = rel.Type,
//                             Direction = direction,
//                             Properties = NormalizeDictionary(rel.Properties),
//                             Target = new
//                             {
//                                 Id = GetProp(target.Properties, "cccd") ?? GetProp(target.Properties, "soKhaiSinh") ?? target.Id.ToString(),
//                                 Name = GetProp(target.Properties, "hoTen"),
//                                 Label = target.Labels.FirstOrDefault() ?? "Unknown"
//                             }
//                         });
//                     }
//                 }

//                 return Ok(new { Person = personDto, Relationships = relationships });
//             }
//             catch (Exception ex)
//             {
//                 return StatusCode(500, new { message = "Lỗi server", error = ex.Message });
//             }
//         }
//         // [HttpGet("{cccd}")]
//         // public async Task<IActionResult> GetCitizenDetail(string cccd)
//         // {
//         //     var action = $"Xem chi tiết công dân CCCD: {cccd}";
//         //     await _logger.LogProcessing(action, "Citizens");

//         //     try
//         //     {
//         //         var query = @"
//         //             MATCH (n:Person {cccd: $cccd})
//         //             OPTIONAL MATCH (n)-[r]->(m)
//         //             RETURN n as SourceNode, r as Rel, m as TargetNode";

//         //         var result = await _repository.RunAsync(query, new { cccd });

//         //         if (!result.Any())
//         //         {
//         //             await _logger.LogFailed($"{action} - Không tìm thấy", "Citizens");
//         //             return NotFound(new { message = "Không tìm thấy công dân" });
//         //         }

//         //         var firstRecord = result.First();
//         //         var personDto = MapNodeToDto(firstRecord["SourceNode"].As<INode>());

//         //         var relationships = new List<object>();
//         //         foreach (var record in result)
//         //         {
//         //             if (record["Rel"] is IRelationship rel && record["TargetNode"] is INode target)
//         //             {
//         //                 var direction = rel.StartNodeId == firstRecord["SourceNode"].As<INode>().Id ? "OUT" : "IN";

//         //                 relationships.Add(new
//         //                 {
//         //                     Id = rel.Id,
//         //                     Type = rel.Type,
//         //                     Direction = direction,
//         //                     Properties = NormalizeDictionary(rel.Properties),
//         //                     Target = new
//         //                     {
//         //                         Id = GetProp(target.Properties, "cccd") ?? 
//         //                              GetProp(target.Properties, "householdId") ?? 
//         //                              target.Id.ToString(),
//         //                         Name = GetProp(target.Properties, "hoTen") ?? 
//         //                                GetProp(target.Properties, "address") ?? 
//         //                                "Không tên",
//         //                         Label = target.Labels.FirstOrDefault() ?? "Unknown"
//         //                     }
//         //                 });
//         //             }
//         //         }

//         //         await _logger.LogSuccess(action, "Citizens");

//         //         return Ok(new
//         //         {
//         //             Person = personDto,
//         //             Relationships = relationships
//         //         });
//         //     }
//         //     catch (Exception ex)
//         //     {
//         //         await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Citizens");
//         //         return StatusCode(500, new { message = "Lỗi server", error = ex.Message });
//         //     }
//         // }

//         // =========================================================================================
//         // 4. CRUD CÔNG DÂN
//         // =========================================================================================
//         [HttpPost]
//         public async Task<IActionResult> CreateCitizen([FromBody] Dictionary<string, object> rawProps)
//         {
//             var action = "Tạo công dân mới";
//             await _logger.LogProcessing(action, "Citizens");

//             try
//             {
//                 var props = ConvertDictionary(rawProps);

//                 // 1. Kiểm tra họ tên và ngày sinh (Bắt buộc chung)
//                 if (!props.ContainsKey("hoTen") || !props.ContainsKey("ngaySinh"))
//                     return BadRequest(new { message = "Họ tên và ngày sinh là bắt buộc." });

//                 DateTime dob;
//                 if (!DateTime.TryParse(props["ngaySinh"].ToString(), out dob))
//                     return BadRequest(new { message = "Định dạng ngày sinh không hợp lệ." });

//                 // Tính tuổi
//                 var age = DateTime.Now.Year - dob.Year;
//                 if (dob > DateTime.Now.AddYears(-age)) age--;

//                 bool isChild = age < 18;

//                 // 2. PHÂN NHÁNH VALIDATION
//                 if (isChild)
//                 {
//                     // --- LOGIC TRẺ EM ---
//                     if (!props.ContainsKey("soKhaiSinh") || string.IsNullOrWhiteSpace(props["soKhaiSinh"]?.ToString()))
//                         return BadRequest(new { message = "Trẻ em dưới 18 tuổi cần Số khai sinh." });
                    
//                     if (!props.ContainsKey("fatherCCCD") || !props.ContainsKey("motherCCCD"))
//                         return BadRequest(new { message = "Cần nhập đủ CCCD của Cha và Mẹ." });

//                     string fatherCCCD = props["fatherCCCD"].ToString();
//                     string motherCCCD = props["motherCCCD"].ToString();

//                     // CHECK: Kiểm tra cha mẹ có tồn tại không
//                     var checkParentsQuery = @"
//                         MATCH (f:Person {cccd: $fatherCCCD})
//                         MATCH (m:Person {cccd: $motherCCCD})
//                         RETURN count(f) as fCount, count(m) as mCount";
                    
//                     var checkRes = await _repository.RunAsync(checkParentsQuery, new { fatherCCCD, motherCCCD });
//                     var record = checkRes.FirstOrDefault();
                    
//                     if (record == null || record["fCount"].As<long>() == 0 || record["mCount"].As<long>() == 0)
//                     {
//                         return BadRequest(new { message = "Không tìm thấy dữ liệu CCCD của Cha hoặc Mẹ trong hệ thống." });
//                     }

//                     // Chuẩn bị dữ liệu Child
//                     props["trangThai"] ??= "Hoạt động";
//                     props["createdDate"] = DateTime.Now.ToString("yyyy-MM-dd");
                    
//                     // Lấy giá trị isAdopted (mặc định false nếu không có)
//                     bool isAdopted = props.ContainsKey("isAdopted") && bool.TryParse(props["isAdopted"].ToString(), out bool val) ? val : false;
//                     props["isAdopted"] = isAdopted;

//                     // Xóa các key không cần thiết
//                     props.Remove("cccd"); 

//                     // QUERY TẠO TRẺ EM VÀ QUAN HỆ (SỬ DỤNG ĐÚNG SCHEMA DATASET)
//                     // 1. Tạo Node con
//                     // 2. Tạo quan hệ CHILD_OF (Con -> Cha/Mẹ) có birthOrder, isAdopted
//                     // 3. Tạo quan hệ FATHER_OF/MOTHER_OF (Cha/Mẹ -> Con) có recognizedDate = ngaySinh
//                     var createChildQuery = @"
//                         CREATE (c:Person {
//                             soKhaiSinh: $soKhaiSinh,
//                             hoTen: $hoTen,
//                             ngaySinh: $ngaySinh,
//                             gioiTinh: $gioiTinh,
//                             queQuan: $queQuan,
//                             danToc: $danToc,
//                             tonGiao: $tonGiao,
//                             birthOrder: $birthOrder,
//                             trangThai: $trangThai,
//                             createdDate: $createdDate
//                         })
//                         WITH c
//                         MATCH (f:Person {cccd: $fatherCCCD})
//                         MATCH (m:Person {cccd: $motherCCCD})
                        
//                         CREATE (c)-[:CHILD_OF {birthOrder: $birthOrder, isAdopted: $isAdopted}]->(f)
//                         CREATE (c)-[:CHILD_OF {birthOrder: $birthOrder, isAdopted: $isAdopted}]->(m)
                        
//                         CREATE (f)-[:FATHER_OF {recognizedDate: $ngaySinh}]->(c)
//                         CREATE (m)-[:MOTHER_OF {recognizedDate: $ngaySinh}]->(c)
                        
//                         RETURN c as n";

//                     var result = await _repository.RunAsync(createChildQuery, props);
//                     await _logger.LogSuccess($"Tạo trẻ em {props["hoTen"]}", "Citizens");
//                     return Ok(MapNodeToDto(result.First()["n"].As<INode>()));
//                 }
//                 else
//                 {
//                     // --- LOGIC NGƯỜI LỚN (GIỮ NGUYÊN) ---
//                     if (!props.ContainsKey("cccd") || string.IsNullOrWhiteSpace(props["cccd"]?.ToString()))
//                         return BadRequest(new { message = "Công dân trên 18 tuổi bắt buộc phải có CCCD." });

//                     props["trangThai"] ??= "Hoạt động";
//                     props["createdDate"] = DateTime.Now.ToString("yyyy-MM-dd");
                    
//                     var allowedKeys = new[] { "cccd", "hoTen", "ngaySinh", "gioiTinh", "queQuan", "danToc", "tonGiao", "ngheNghiep", "trinhDoHocVan", "trangThai", "createdDate" };
//                     var cleanProps = props.Where(k => allowedKeys.Contains(k.Key)).ToDictionary(k => k.Key, v => v.Value);

//                     var setClause = string.Join(", ", cleanProps.Keys.Select(k => $"n.{k} = ${k}"));
//                     var query = $"CREATE (n:Person) SET {setClause} RETURN n";

//                     var result = await _repository.RunAsync(query, cleanProps);
//                     await _logger.LogSuccess(action, "Citizens");
//                     return Ok(MapNodeToDto(result.First()["n"].As<INode>()));
//                 }
//             }
//             catch (Exception ex)
//             {
//                 await _logger.LogFailed($"Lỗi tạo: {ex.Message}", "Citizens");
//                 if (ex.Message.Contains("Constraint")) return StatusCode(409, new { message = "Dữ liệu định danh đã tồn tại." });
//                 return StatusCode(500, new { message = "Lỗi hệ thống", error = ex.Message });
//             }
//         }

//         [HttpPut("{id}")]
//         public async Task<IActionResult> UpdateCitizen(string id, [FromBody] Dictionary<string, object> rawProps)
//         {
//             // id: Có thể là cccd hoặc soKhaiSinh
//             var action = $"Cập nhật công dân ID: {id}";
//             await _logger.LogProcessing(action, "Citizens");

//             try
//             {
//                 var props = ConvertDictionary(rawProps);

//                 // 1. Validate sơ bộ
//                 if (!props.Any()) return BadRequest("Không có dữ liệu update");

//                 // 2. Tách các thuộc tính Node và thuộc tính Quan hệ
//                 // Các field cho Node
//                 var nodeKeys = new[] { 
//                     "hoTen", "ngaySinh", "gioiTinh", "queQuan", "danToc", "tonGiao", 
//                     "ngheNghiep", "trinhDoHocVan", "trangThai", "soKhaiSinh", "cccd"
//                 };
                
//                 // Các field đặc biệt cho quan hệ (chỉ dùng cho trẻ em)
//                 string fatherCCCD = props.ContainsKey("fatherCCCD") ? props["fatherCCCD"].ToString() : null;
//                 string motherCCCD = props.ContainsKey("motherCCCD") ? props["motherCCCD"].ToString() : null;
                
//                 // Lấy birthOrder, isAdopted (nếu có)
//                 object birthOrder = props.ContainsKey("birthOrder") ? props["birthOrder"] : null;
//                 object isAdopted = props.ContainsKey("isAdopted") ? props["isAdopted"] : null;

//                 // Chuẩn bị props để update vào Node
//                 var cleanProps = props.Where(k => nodeKeys.Contains(k.Key)).ToDictionary(k => k.Key, v => v.Value);
//                 cleanProps["targetId"] = id;
//                 cleanProps["updatedDate"] = DateTime.Now.ToString("yyyy-MM-dd");

//                 // 3. Logic Update
//                 // Bước A: Update thông tin cơ bản trên Node trước
//                 var updateNodeQuery = @"
//                     MATCH (n:Person) 
//                     WHERE n.cccd = $targetId OR n.soKhaiSinh = $targetId 
//                     SET n += $cleanProps 
//                     RETURN n";

//                 var result = await _repository.RunAsync(updateNodeQuery, new { targetId = id, cleanProps });
//                 if (!result.Any()) return NotFound(new { message = "Không tìm thấy hồ sơ" });

//                 var updatedNode = result.First()["n"].As<INode>();
                
//                 // Kiểm tra tuổi sau khi update để biết có cần xử lý quan hệ cha mẹ không
//                 DateTime dob;
//                 bool isChild = false;
//                 if (updatedNode.Properties.ContainsKey("ngaySinh") && DateTime.TryParse(updatedNode.Properties["ngaySinh"].ToString(), out dob))
//                 {
//                     var age = DateTime.Now.Year - dob.Year;
//                     if (dob > DateTime.Now.AddYears(-age)) age--;
//                     isChild = age < 18;
//                 }

//                 // Bước B: Xử lý Quan hệ (Chỉ nếu là trẻ em)
//                 if (isChild)
//                 {
//                     // Validate Cha Mẹ nếu có thay đổi
//                     if (fatherCCCD != null && motherCCCD != null)
//                     {
//                          var checkParentsQuery = @"
//                             MATCH (f:Person {cccd: $fatherCCCD})
//                             MATCH (m:Person {cccd: $motherCCCD})
//                             RETURN count(f) as fCount, count(m) as mCount";
//                         var checkRes = await _repository.RunAsync(checkParentsQuery, new { fatherCCCD, motherCCCD });
//                         var checkRec = checkRes.FirstOrDefault();
//                         if (checkRec == null || checkRec["fCount"].As<long>() == 0 || checkRec["mCount"].As<long>() == 0)
//                         {
//                             return BadRequest(new { message = "CCCD Cha hoặc Mẹ cập nhật không tồn tại trong hệ thống." });
//                         }

//                         // QUAN TRỌNG: Cập nhật lại Graph
//                         // 1. Xóa quan hệ cũ (với bất kỳ cha mẹ nào cũ)
//                         // 2. Tạo quan hệ mới với cha mẹ (dù cha mẹ cũ hay mới)
//                         // 3. Set lại thuộc tính birthOrder, isAdopted, recognizedDate
//                         var updateRelQuery = @"
//                             MATCH (n:Person) WHERE n.cccd = $targetId OR n.soKhaiSinh = $targetId
                            
//                             // Tìm cha mẹ mới
//                             MATCH (newF:Person {cccd: $fatherCCCD})
//                             MATCH (newM:Person {cccd: $motherCCCD})

//                             // Xóa quan hệ cũ (nếu có)
//                             OPTIONAL MATCH (n)-[oldR1:CHILD_OF]->() DELETE oldR1
//                             OPTIONAL MATCH ()-[oldR2:FATHER_OF]->(n) DELETE oldR2
//                             OPTIONAL MATCH ()-[oldR3:MOTHER_OF]->(n) DELETE oldR3

//                             // Tạo quan hệ mới
//                             MERGE (n)-[rF:CHILD_OF]->(newF)
//                             SET rF.birthOrder = $birthOrder, rF.isAdopted = $isAdopted
                            
//                             MERGE (n)-[rM:CHILD_OF]->(newM)
//                             SET rM.birthOrder = $birthOrder, rM.isAdopted = $isAdopted

//                             MERGE (newF)-[:FATHER_OF {recognizedDate: n.ngaySinh}]->(n)
//                             MERGE (newM)-[:MOTHER_OF {recognizedDate: n.ngaySinh}]->(n)
                            
//                             RETURN n";
                        
//                         // Nếu client không gửi birthOrder/isAdopted khi update, ta phải lấy lại giá trị cũ hoặc để null
//                         // Ở đây giả định client Form luôn gửi đủ bộ data details
//                         var relParams = new { 
//                             targetId = id, 
//                             fatherCCCD, 
//                             motherCCCD, 
//                             birthOrder = birthOrder ?? 1, // Default fallback
//                             isAdopted = isAdopted is bool b ? b : false 
//                         };

//                         await _repository.RunAsync(updateRelQuery, relParams);
//                     }
//                 }

//                 await _logger.LogSuccess(action, "Citizens");
//                 return Ok(MapNodeToDto(updatedNode));
//             }
//             catch (Exception ex)
//             {
//                 await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Citizens");
//                 return StatusCode(500, new { message = "Lỗi cập nhật", error = ex.Message });
//             }
//         }
//         // [HttpPost]
//         // public async Task<IActionResult> CreateCitizen([FromBody] Dictionary<string, object> rawProps)
//         // {
//         //     var action = "Tạo công dân mới";
//         //     await _logger.LogProcessing(action, "Citizens");

//         //     try
//         //     {
//         //         var props = ConvertDictionary(rawProps);

//         //         if (!props.ContainsKey("cccd") || !props.ContainsKey("hoTen"))
//         //             return BadRequest("CCCD và Họ tên là bắt buộc");

//         //         props["createdDate"] ??= DateTime.Now.ToString("yyyy-MM-dd");

//         //         var setClause = string.Join(", ", props.Keys.Select(k => $"n.{k} = ${k}"));
//         //         var query = $"CREATE (n:Person) SET {setClause} RETURN n";

//         //         var result = await _repository.RunAsync(query, props);

//         //         await _logger.LogSuccess(action, "Citizens");
//         //         return Ok(MapNodeToDto(result.First()["n"].As<INode>()));
//         //     }
//         //     catch (Exception ex)
//         //     {
//         //         await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Citizens");
//         //         return StatusCode(500, new { message = "Lỗi tạo công dân", error = ex.Message });
//         //     }
//         // }

//         // [HttpPut("{cccd}")]
//         // public async Task<IActionResult> UpdateCitizen(string cccd, [FromBody] Dictionary<string, object> rawProps)
//         // {
//         //     var action = $"Cập nhật công dân CCCD: {cccd}";
//         //     await _logger.LogProcessing(action, "Citizens");

//         //     try
//         //     {
//         //         var props = ConvertDictionary(rawProps);
//         //         props["targetCccd"] = cccd;

//         //         var setClause = string.Join(", ", props.Keys.Where(k => k != "targetCccd").Select(k => $"n.{k} = ${k}"));
//         //         var query = $"MATCH (n:Person {{cccd: $targetCccd}}) SET {setClause} RETURN n";

//         //         var result = await _repository.RunAsync(query, props);
//         //         if (!result.Any())
//         //         {
//         //             await _logger.LogFailed($"{action} - Không tìm thấy", "Citizens");
//         //             return NotFound();
//         //         }

//         //         await _logger.LogSuccess(action, "Citizens");
//         //         return Ok(MapNodeToDto(result.First()["n"].As<INode>()));
//         //     }
//         //     catch (Exception ex)
//         //     {
//         //         await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Citizens");
//         //         return StatusCode(500, new { message = "Lỗi cập nhật", error = ex.Message });
//         //     }
//         // }

//         [HttpDelete("{cccd}")]
//         public async Task<IActionResult> DeleteCitizen(string cccd)
//         {
//             var action = $"Xóa công dân CCCD: {cccd}";
//             await _logger.LogProcessing(action, "Citizens");

//             try
//             {
//                 await _repository.RunAsync("MATCH (n:Person {cccd: $cccd}) DETACH DELETE n", new { cccd });
//                 await _logger.LogSuccess(action, "Citizens");
//                 return Ok(new { message = "Đã xóa công dân thành công" });
//             }
//             catch (Exception ex)
//             {
//                 await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Citizens");
//                 return StatusCode(500, new { message = "Lỗi xóa", error = ex.Message });
//             }
//         }

//         // =========================================================================================
//         // 3. HELPER FUNCTIONS (ĐÃ SỬA LOGIC MAP)
//         // =========================================================================================

//         private Dictionary<string, object> ConvertDictionary(Dictionary<string, object> input)
//         {
//             var result = new Dictionary<string, object>();
//             foreach (var kvp in input)
//             {
//                 if (kvp.Value is JsonElement jsonElem)
//                 {
//                     switch (jsonElem.ValueKind)
//                     {
//                         case JsonValueKind.String: result[kvp.Key] = jsonElem.GetString() ?? ""; break;
//                         case JsonValueKind.Number:
//                             if (jsonElem.TryGetInt64(out long l)) result[kvp.Key] = l;
//                             else if (jsonElem.TryGetDouble(out double d)) result[kvp.Key] = d;
//                             break;
//                         case JsonValueKind.True: result[kvp.Key] = true; break;
//                         case JsonValueKind.False: result[kvp.Key] = false; break;
//                         default: result[kvp.Key] = jsonElem.ToString(); break;
//                     }
//                 }
//                 else { result[kvp.Key] = kvp.Value; }
//             }
//             return result;
//         }

//         private object NormalizeValue(object value)
//         {
//             if (value == null) return null;
//             if (value is LocalDate localDate) return localDate.ToString();
//             if (value is ZonedDateTime zdt) return zdt.ToString();
//             if (value is LocalDateTime ldt) return ldt.ToString();
//             if (value is OffsetTime ot) return ot.ToString();
//             if (value is LocalTime lt) return lt.ToString();
//             return value;
//         }

//         private Dictionary<string, object> NormalizeDictionary(IReadOnlyDictionary<string, object> input)
//         {
//             var result = new Dictionary<string, object>();
//             foreach (var kvp in input) result[kvp.Key] = NormalizeValue(kvp.Value);
//             return result;
//         }

//         public class PersonDto
//         {
//             public string Id { get; set; }
//             public string HoTen { get; set; }
//             public string NgaySinh { get; set; }
//             public string GioiTinh { get; set; }
//             public string QueQuan { get; set; }
//             public string MaritalStatus { get; set; }
//             public string NgheNghiep { get; set; }
//             public Dictionary<string, object> Details { get; set; }
//         }

//         private PersonDto MapNodeToDto(INode node)
//         {
//             var props = node.Properties;
            
//             // SỬA LỖI QUAN TRỌNG: Loại bỏ các trường chuẩn ra khỏi Details để tránh trùng lặp và lỗi overwrite ở frontend
//             var standardKeys = new HashSet<string> { "cccd", "hoTen", "ngaySinh", "gioiTinh", "queQuan", "maritalStatus", "ngheNghiep", "householdId" };
//             var details = new Dictionary<string, object>();
            
//             foreach(var kvp in props)
//             {
//                 if(!standardKeys.Contains(kvp.Key))
//                 {
//                     details[kvp.Key] = NormalizeValue(kvp.Value);
//                 }
//             }

//             return new PersonDto
//             {
//                 Id = GetProp(props, "cccd") ?? GetProp(props, "householdId") ?? node.Id.ToString(),
//                 HoTen = GetProp(props, "hoTen") ?? "Không tên",
//                 NgaySinh = NormalizeValue(GetPropObj(props, "ngaySinh"))?.ToString(),
//                 GioiTinh = GetProp(props, "gioiTinh"),
//                 QueQuan = GetProp(props, "queQuan"),
//                 MaritalStatus = GetProp(props, "maritalStatus"),
//                 NgheNghiep = GetProp(props, "ngheNghiep"),
//                 Details = details // Details giờ chỉ chứa các trường phụ (như soDienThoai...)
//             };
//         }

//         private object? GetPropObj(IReadOnlyDictionary<string, object> props, string key)
//         {
//             if (props.TryGetValue(key, out object? val)) return val;
//             return null;
//         }

//         private string? GetProp(IReadOnlyDictionary<string, object> props, string key)
//         {
//             if (props.TryGetValue(key, out object? val)) return NormalizeValue(val)?.ToString() ?? "";
//             return "";
//         }
//     }
// }


// using Microsoft.AspNetCore.Mvc;
// using CitizenGraph.Backend.Services;
// using Neo4j.Driver;
// using System;
// using System.Linq;
// using System.Threading.Tasks;
// using System.Collections.Generic;
// using System.Text.Json;

// namespace CitizenGraph.Backend.Controllers
// {
//     [Route("api/[controller]")]
//     [ApiController]
//     public class CitizensController : ControllerBase
//     {
//         private readonly Neo4jRepository _repository;

//         public CitizensController(Neo4jRepository repository)
//         {
//             _repository = repository;
//         }

//         // =========================================================================================
//         // 1. DASHBOARD & LIST
//         // =========================================================================================

//         [HttpGet("stats")]
//         public async Task<IActionResult> GetStats()
//         {
//             var query = @"
//                 MATCH (p:Person)
//                 RETURN 
//                     count(p) as Total,
//                     sum(CASE WHEN p.gioiTinh = 'Nam' THEN 1 ELSE 0 END) as Male,
//                     sum(CASE WHEN p.gioiTinh = 'Nữ' THEN 1 ELSE 0 END) as Female,
//                     avg(date().year - date(p.ngaySinh).year) as AvgAge
//             ";

//             try
//             {
//                 var result = await _repository.RunAsync(query);
//                 var record = result.FirstOrDefault();
//                 if (record == null) return Ok(new { Total = 0, Male = 0, Female = 0, AvgAge = 0 });

//                 return Ok(new
//                 {
//                     Total = record["Total"].As<long>(),
//                     Male = record["Male"].As<long>(),
//                     Female = record["Female"].As<long>(),
//                     AvgAge = Math.Round(record["AvgAge"].As<double>(), 1)
//                 });
//             }
//             catch (Exception ex) { return StatusCode(500, ex.Message); }
//         }

//         [HttpGet]
//         public async Task<IActionResult> GetAllCitizens([FromQuery] string search = "")
//         {
//             var query = @"MATCH (n:Person) ";
            
//             if (!string.IsNullOrEmpty(search))
//             {
//                 query += $"WHERE toLower(n.hoTen) CONTAINS toLower($search) OR n.cccd CONTAINS $search ";
//             }

//             query += "RETURN n ORDER BY n.createdDate DESC LIMIT 100";

//             try
//             {
//                 var result = await _repository.RunAsync(query, new { search });
//                 var citizens = result.Select(r => MapNodeToDto(r["n"].As<INode>()));
//                 return Ok(citizens);
//             }
//             catch (Exception ex) { return StatusCode(500, ex.Message); }
//         }

//         [HttpGet("{cccd}")]
//         public async Task<IActionResult> GetCitizenDetail(string cccd)
//         {
//             // Lấy thông tin chi tiết node và các mối quan hệ trực tiếp
//             var query = @"
//                 MATCH (n:Person {cccd: $cccd})
//                 OPTIONAL MATCH (n)-[r]-(m)
//                 RETURN n as SourceNode, r as Rel, m as TargetNode";

//             try
//             {
//                 var result = await _repository.RunAsync(query, new { cccd });
//                 if (!result.Any()) return NotFound("Không tìm thấy công dân");

//                 var firstRecord = result.First();
//                 var personDto = MapNodeToDto(firstRecord["SourceNode"].As<INode>());

//                 // Xử lý danh sách quan hệ
//                 var relationships = new List<object>();
//                 foreach (var record in result)
//                 {
//                     if (record["Rel"] != null && record["TargetNode"] != null)
//                     {
//                         var rel = record["Rel"].As<IRelationship>();
//                         var target = record["TargetNode"].As<INode>();
                        
//                         // Xác định hướng quan hệ
//                         string direction = rel.StartNodeId == firstRecord["SourceNode"].As<INode>().Id ? "OUT" : "IN";
                        
//                         relationships.Add(new 
//                         {
//                             Id = rel.Id.ToString(),
//                             Type = rel.Type,
//                             Properties = NormalizeDictionary(rel.Properties),
//                             Direction = direction,
//                             Target = new {
//                                 Id = GetProp(target.Properties, "cccd") ?? GetProp(target.Properties, "householdId") ?? target.Id.ToString(),
//                                 Name = GetProp(target.Properties, "hoTen") ?? GetProp(target.Properties, "address") ?? "N/A",
//                                 Label = target.Labels.FirstOrDefault()
//                             }
//                         });
//                     }
//                 }

//                 return Ok(new { Person = personDto, Relationships = relationships });
//             }
//             catch (Exception ex) { return StatusCode(500, ex.Message); }
//         }

//         // =========================================================================================
//         // 2. CRUD NODE (Person)
//         // =========================================================================================

//         [HttpPost]
//         public async Task<IActionResult> CreateCitizen([FromBody] Dictionary<string, object> rawProps)
//         {
//             var props = ConvertDictionary(rawProps);
            
//             if (!props.ContainsKey("cccd") || !props.ContainsKey("hoTen"))
//                 return BadRequest("CCCD và Họ tên là bắt buộc");

//             if (!props.ContainsKey("createdDate")) props["createdDate"] = DateTime.Now.ToString("yyyy-MM-dd");

//             // Tạo câu lệnh SET động
//             var setClause = string.Join(", ", props.Keys.Select(k => $"n.{k} = ${k}"));
//             var query = $"CREATE (n:Person) SET {setClause} RETURN n";

//             try
//             {
//                 var result = await _repository.RunAsync(query, props);
//                 return Ok(MapNodeToDto(result.First()["n"].As<INode>()));
//             }
//             catch (Exception ex) { return StatusCode(500, "Lỗi tạo: " + ex.Message); }
//         }

//         [HttpPut("{cccd}")]
//         public async Task<IActionResult> UpdateCitizen(string cccd, [FromBody] Dictionary<string, object> rawProps)
//         {
//             var props = ConvertDictionary(rawProps);
//             props["targetCccd"] = cccd; // Param cho query

//             var setClause = string.Join(", ", props.Keys.Where(k => k != "targetCccd").Select(k => $"n.{k} = ${k}"));
//             var query = $"MATCH (n:Person {{cccd: $targetCccd}}) SET {setClause} RETURN n";

//             try
//             {
//                 var result = await _repository.RunAsync(query, props);
//                 if (!result.Any()) return NotFound();
//                 return Ok(MapNodeToDto(result.First()["n"].As<INode>()));
//             }
//             catch (Exception ex) { return StatusCode(500, "Lỗi cập nhật: " + ex.Message); }
//         }

//         [HttpDelete("{cccd}")]
//         public async Task<IActionResult> DeleteCitizen(string cccd)
//         {
//             // Xóa node và mọi quan hệ liên quan
//             var query = "MATCH (n:Person {cccd: $cccd}) DETACH DELETE n";
//             try
//             {
//                 await _repository.RunAsync(query, new { cccd });
//                 return Ok(new { message = "Đã xóa công dân thành công" });
//             }
//             catch (Exception ex) { return StatusCode(500, ex.Message); }
//         }

//         // =========================================================================================
//         // 3. HELPER FUNCTIONS (REQUIRED)
//         // =========================================================================================

//         private Dictionary<string, object> ConvertDictionary(Dictionary<string, object> input)
//         {
//             var result = new Dictionary<string, object>();
//             foreach (var kvp in input)
//             {
//                 if (kvp.Value is JsonElement jsonElem)
//                 {
//                     switch (jsonElem.ValueKind)
//                     {
//                         case JsonValueKind.String: result[kvp.Key] = jsonElem.GetString() ?? ""; break;
//                         case JsonValueKind.Number:
//                             if (jsonElem.TryGetInt64(out long l)) result[kvp.Key] = l;
//                             else if (jsonElem.TryGetDouble(out double d)) result[kvp.Key] = d;
//                             break;
//                         case JsonValueKind.True: result[kvp.Key] = true; break;
//                         case JsonValueKind.False: result[kvp.Key] = false; break;
//                         default: result[kvp.Key] = jsonElem.ToString(); break;
//                     }
//                 }
//                 else { result[kvp.Key] = kvp.Value; }
//             }
//             return result;
//         }

//         private object NormalizeValue(object value)
//         {
//             if (value == null) return null;
//             if (value is LocalDate localDate) return localDate.ToString();
//             if (value is ZonedDateTime zdt) return zdt.ToString();
//             if (value is LocalDateTime ldt) return ldt.ToString();
//             if (value is OffsetTime ot) return ot.ToString();
//             if (value is LocalTime lt) return lt.ToString();
//             return value;
//         }

//         private Dictionary<string, object> NormalizeDictionary(IReadOnlyDictionary<string, object> input)
//         {
//             var result = new Dictionary<string, object>();
//             foreach (var kvp in input) result[kvp.Key] = NormalizeValue(kvp.Value);
//             return result;
//         }

//         // DTO Classes cho Helper
//         public class PersonDto
//         {
//             public string Id { get; set; }
//             public string HoTen { get; set; }
//             public string NgaySinh { get; set; }
//             public string GioiTinh { get; set; }
//             public string QueQuan { get; set; }
//             public string MaritalStatus { get; set; }
//             public string NgheNghiep { get; set; }
//             public Dictionary<string, object> Details { get; set; }
//         }

//         public class RelationshipDto
//         {
//             public long Id { get; set; }
//             public string Source { get; set; }
//             public string Target { get; set; }
//             public string Type { get; set; }
//             public string Label { get; set; }
//             public Dictionary<string, object> Properties { get; set; }
//         }

//         private PersonDto MapNodeToDto(INode node)
//         {
//             var props = node.Properties;
//             return new PersonDto
//             {
//                 Id = GetProp(props, "cccd") ?? GetProp(props, "householdId") ?? node.Id.ToString(),
//                 HoTen = GetProp(props, "hoTen") ?? "Không tên",
//                 NgaySinh = NormalizeValue(GetPropObj(props, "ngaySinh"))?.ToString(),
//                 GioiTinh = GetProp(props, "gioiTinh"),
//                 QueQuan = GetProp(props, "queQuan"),
//                 MaritalStatus = GetProp(props, "maritalStatus"),
//                 NgheNghiep = GetProp(props, "ngheNghiep"),
//                 Details = NormalizeDictionary(props)
//             };
//         }

//         private object? GetPropObj(IReadOnlyDictionary<string, object> props, string key)
//         {
//             if (props.TryGetValue(key, out object? val)) return val;
//             return null;
//         }

//         private string? GetProp(IReadOnlyDictionary<string, object> props, string key)
//         {
//             if (props.TryGetValue(key, out object? val)) return NormalizeValue(val)?.ToString() ?? "";
//             return "";
//         }

//         private string SafeString(object? val)
//         {
//             return NormalizeValue(val)?.ToString() ?? "";
//         }
        
//         private string TranslateRelType(string type) { return type; } // Placeholder if needed
//     }
// }