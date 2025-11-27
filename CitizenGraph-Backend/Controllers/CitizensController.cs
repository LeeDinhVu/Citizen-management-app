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
        [HttpGet("{cccd}")]
        public async Task<IActionResult> GetCitizenDetail(string cccd)
        {
            var action = $"Xem chi tiết công dân CCCD: {cccd}";
            await _logger.LogProcessing(action, "Citizens");

            try
            {
                var query = @"
                    MATCH (n:Person {cccd: $cccd})
                    OPTIONAL MATCH (n)-[r]-(m)
                    RETURN n as SourceNode, r as Rel, m as TargetNode";

                var result = await _repository.RunAsync(query, new { cccd });

                if (!result.Any())
                {
                    await _logger.LogFailed($"{action} - Không tìm thấy", "Citizens");
                    return NotFound(new { message = "Không tìm thấy công dân" });
                }

                var firstRecord = result.First();
                var personDto = MapNodeToDto(firstRecord["SourceNode"].As<INode>());

                var relationships = new List<object>();
                foreach (var record in result)
                {
                    if (record["Rel"] is IRelationship rel && record["TargetNode"] is INode target)
                    {
                        var direction = rel.StartNodeId == firstRecord["SourceNode"].As<INode>().Id ? "OUT" : "IN";

                        relationships.Add(new
                        {
                            Id = rel.Id,
                            Type = rel.Type,
                            Direction = direction,
                            Properties = NormalizeDictionary(rel.Properties),
                            Target = new
                            {
                                Id = GetProp(target.Properties, "cccd") ?? 
                                     GetProp(target.Properties, "householdId") ?? 
                                     target.Id.ToString(),
                                Name = GetProp(target.Properties, "hoTen") ?? 
                                       GetProp(target.Properties, "address") ?? 
                                       "Không tên",
                                Label = target.Labels.FirstOrDefault() ?? "Unknown"
                            }
                        });
                    }
                }

                await _logger.LogSuccess(action, "Citizens");

                return Ok(new
                {
                    Person = personDto,
                    Relationships = relationships
                });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Citizens");
                return StatusCode(500, new { message = "Lỗi server", error = ex.Message });
            }
        }

        // =========================================================================================
        // 4. CRUD CÔNG DÂN
        // =========================================================================================
        [HttpPost]
        public async Task<IActionResult> CreateCitizen([FromBody] Dictionary<string, object> rawProps)
        {
            var action = "Tạo công dân mới";
            await _logger.LogProcessing(action, "Citizens");

            try
            {
                var props = ConvertDictionary(rawProps);

                if (!props.ContainsKey("cccd") || !props.ContainsKey("hoTen"))
                    return BadRequest("CCCD và Họ tên là bắt buộc");

                props["createdDate"] ??= DateTime.Now.ToString("yyyy-MM-dd");

                var setClause = string.Join(", ", props.Keys.Select(k => $"n.{k} = ${k}"));
                var query = $"CREATE (n:Person) SET {setClause} RETURN n";

                var result = await _repository.RunAsync(query, props);

                await _logger.LogSuccess(action, "Citizens");
                return Ok(MapNodeToDto(result.First()["n"].As<INode>()));
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Citizens");
                return StatusCode(500, new { message = "Lỗi tạo công dân", error = ex.Message });
            }
        }

        [HttpPut("{cccd}")]
        public async Task<IActionResult> UpdateCitizen(string cccd, [FromBody] Dictionary<string, object> rawProps)
        {
            var action = $"Cập nhật công dân CCCD: {cccd}";
            await _logger.LogProcessing(action, "Citizens");

            try
            {
                var props = ConvertDictionary(rawProps);
                props["targetCccd"] = cccd;

                var setClause = string.Join(", ", props.Keys.Where(k => k != "targetCccd").Select(k => $"n.{k} = ${k}"));
                var query = $"MATCH (n:Person {{cccd: $targetCccd}}) SET {setClause} RETURN n";

                var result = await _repository.RunAsync(query, props);
                if (!result.Any())
                {
                    await _logger.LogFailed($"{action} - Không tìm thấy", "Citizens");
                    return NotFound();
                }

                await _logger.LogSuccess(action, "Citizens");
                return Ok(MapNodeToDto(result.First()["n"].As<INode>()));
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Citizens");
                return StatusCode(500, new { message = "Lỗi cập nhật", error = ex.Message });
            }
        }

        [HttpDelete("{cccd}")]
        public async Task<IActionResult> DeleteCitizen(string cccd)
        {
            var action = $"Xóa công dân CCCD: {cccd}";
            await _logger.LogProcessing(action, "Citizens");

            try
            {
                await _repository.RunAsync("MATCH (n:Person {cccd: $cccd}) DETACH DELETE n", new { cccd });
                await _logger.LogSuccess(action, "Citizens");
                return Ok(new { message = "Đã xóa công dân thành công" });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Citizens");
                return StatusCode(500, new { message = "Lỗi xóa", error = ex.Message });
            }
        }

        // =========================================================================================
        // 3. HELPER FUNCTIONS (ĐÃ SỬA LOGIC MAP)
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
            
            // SỬA LỖI QUAN TRỌNG: Loại bỏ các trường chuẩn ra khỏi Details để tránh trùng lặp và lỗi overwrite ở frontend
            var standardKeys = new HashSet<string> { "cccd", "hoTen", "ngaySinh", "gioiTinh", "queQuan", "maritalStatus", "ngheNghiep", "householdId" };
            var details = new Dictionary<string, object>();
            
            foreach(var kvp in props)
            {
                if(!standardKeys.Contains(kvp.Key))
                {
                    details[kvp.Key] = NormalizeValue(kvp.Value);
                }
            }

            return new PersonDto
            {
                Id = GetProp(props, "cccd") ?? GetProp(props, "householdId") ?? node.Id.ToString(),
                HoTen = GetProp(props, "hoTen") ?? "Không tên",
                NgaySinh = NormalizeValue(GetPropObj(props, "ngaySinh"))?.ToString(),
                GioiTinh = GetProp(props, "gioiTinh"),
                QueQuan = GetProp(props, "queQuan"),
                MaritalStatus = GetProp(props, "maritalStatus"),
                NgheNghiep = GetProp(props, "ngheNghiep"),
                Details = details // Details giờ chỉ chứa các trường phụ (như soDienThoai...)
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