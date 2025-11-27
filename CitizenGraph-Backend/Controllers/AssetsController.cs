using Microsoft.AspNetCore.Mvc;
using CitizenGraph.Backend.Services;
using Neo4j.Driver;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Text.Json; // Cần thiết để xử lý JsonElement trong hàm ConvertDictionary

namespace CitizenGraph.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AssetsController : ControllerBase
    {
        private readonly Neo4jRepository _repository;

        public AssetsController(Neo4jRepository repository)
        {
            _repository = repository;
        }

        // =========================================================================================
        // PHẦN 1: DASHBOARD & DANH SÁCH (VIEW)
        // =========================================================================================

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetOwnershipDashboard()
        {
            // Query Dashboard giữ nguyên vì trả về scalar values (số/chuỗi) nên không bị lỗi LocalDate
            var statsQuery = @"
                MATCH (re:RealEstate) WITH count(re) as CountRE, sum(re.valueVND) as ValRE
                MATCH (v:Vehicle) WITH CountRE, ValRE, count(v) as CountVeh, sum(v.valueVND) as ValVeh
                MATCH (b:Business) WITH CountRE, ValRE, CountVeh, ValVeh, count(b) as CountBiz, sum(b.registeredCapital) as ValBiz
                RETURN CountRE, ValRE, CountVeh, ValVeh, CountBiz, ValBiz";

            var listQuery = @"
                MATCH (p:Person)
                OPTIONAL MATCH (p)-[:OWNS]->(re:RealEstate)
                OPTIONAL MATCH (p)-[:OWNS_VEHICLE]->(v:Vehicle)
                OPTIONAL MATCH (p)-[:OWNS_BUSINESS]->(b:Business)
                WHERE re IS NOT NULL OR v IS NOT NULL OR b IS NOT NULL
                RETURN p.cccd as CCCD, 
                       p.hoTen as HoTen, 
                       count(DISTINCT re) as SlBDS, 
                       count(DISTINCT v) as SlXe, 
                       count(DISTINCT b) as SlDN,
                       toInteger(sum(COALESCE(re.valueVND,0)) + sum(COALESCE(v.valueVND,0)) + sum(COALESCE(b.registeredCapital,0))) as TongTaiSan
                ORDER BY TongTaiSan DESC
                LIMIT 100";

            try
            {
                var statsResult = await _repository.RunAsync(statsQuery);
                var listResult = await _repository.RunAsync(listQuery);

                // --- XỬ LÝ KẾT QUẢ STATS ---
                object processedStats = null;
                var r = statsResult.FirstOrDefault();
                
                if (r != null)
                {
                    processedStats = new
                    {
                        RealEstate = new { 
                            Count = r["CountRE"] != null ? Convert.ToInt64(r["CountRE"]) : 0, 
                            Value = r["ValRE"] != null ? Convert.ToDouble(r["ValRE"]) : 0 
                        },
                        Vehicle = new { 
                            Count = r["CountVeh"] != null ? Convert.ToInt64(r["CountVeh"]) : 0, 
                            Value = r["ValVeh"] != null ? Convert.ToDouble(r["ValVeh"]) : 0 
                        },
                        Business = new { 
                            Count = r["CountBiz"] != null ? Convert.ToInt64(r["CountBiz"]) : 0, 
                            Value = r["ValBiz"] != null ? Convert.ToDouble(r["ValBiz"]) : 0 
                        }
                    };
                }
                else 
                {
                    processedStats = new {
                        RealEstate = new { Count = 0, Value = 0 },
                        Vehicle = new { Count = 0, Value = 0 },
                        Business = new { Count = 0, Value = 0 }
                    };
                }

                // --- XỬ LÝ KẾT QUẢ LIST ---
                var ownersList = listResult.Select(row => new
                {
                    CCCD = row["CCCD"].As<string>(),
                    HoTen = row["HoTen"].As<string>(),
                    SoLuongBDS = Convert.ToInt64(row["SlBDS"]),
                    SoLuongXe = Convert.ToInt64(row["SlXe"]),
                    SoLuongDN = Convert.ToInt64(row["SlDN"]),
                    TongGiaTri = Convert.ToDouble(row["TongTaiSan"])
                });

                return Ok(new
                {
                    Statistics = processedStats,
                    OwnersGrid = ownersList
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi tải dashboard", error = ex.Message });
            }
        }

        [HttpGet("detail/{cccd}")]
        public async Task<IActionResult> GetOwnerDetail(string cccd)
        {
            var query = @"
                MATCH (p:Person {cccd: $cccd})
                OPTIONAL MATCH (p)-[r1:OWNS]->(re:RealEstate)
                OPTIONAL MATCH (p)-[r2:OWNS_VEHICLE]->(v:Vehicle)
                OPTIONAL MATCH (p)-[r3:OWNS_BUSINESS]->(b:Business)
                RETURN p, collect(distinct re) as RealEstates, collect(distinct v) as Vehicles, collect(distinct b) as Businesses";

            try
            {
                var result = await _repository.RunAsync(query, new { cccd });
                if (!result.Any()) return NotFound("Không tìm thấy người này");

                var record = result.First();
                
                // SỬA LỖI: Áp dụng NormalizeDictionary để chuyển LocalDate thành String
                return Ok(new
                {
                    Person = NormalizeDictionary(record["p"].As<INode>().Properties),
                    RealEstates = record["RealEstates"].As<List<INode>>().Select(n => NormalizeDictionary(n.Properties)),
                    Vehicles = record["Vehicles"].As<List<INode>>().Select(n => NormalizeDictionary(n.Properties)),
                    Businesses = record["Businesses"].As<List<INode>>().Select(n => NormalizeDictionary(n.Properties))
                });
            }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        // =========================================================================================
        // PHẦN 2: QUẢN LÝ TÀI SẢN (ASSET NODE CRUD)
        // =========================================================================================

        [HttpGet("assets/{type}")]
        public async Task<IActionResult> GetAllAssetsByType(string type)
        {
            string label = ValidateType(type);
            if (label == null) return BadRequest("Loại tài sản không hợp lệ");

            var query = $"MATCH (n:{label}) RETURN n ORDER BY n.createdDate DESC LIMIT 200";
            try 
            {
                var result = await _repository.RunAsync(query);
                // SỬA LỖI: Áp dụng NormalizeDictionary cho danh sách tài sản
                return Ok(result.Select(r => NormalizeDictionary(r["n"].As<INode>().Properties)));
            }
            catch (Exception ex) 
            {
                Console.WriteLine($"ERROR GetAssets: {ex.Message}");
                return Ok(new List<object>()); 
            }
        }

        [HttpPost("assets/{type}")]
        public async Task<IActionResult> CreateAsset(string type, [FromBody] Dictionary<string, object> properties)
        {
            string label = ValidateType(type);
            if (label == null) return BadRequest("Loại tài sản không hợp lệ");

            // SỬA LỖI: Chuyển đổi JsonElement từ input thành object chuẩn C#
            var cleanProps = ConvertDictionary(properties);

            string idField = GetIdField(type);
            if (!cleanProps.ContainsKey(idField))
                cleanProps[idField] = Guid.NewGuid().ToString().Substring(0, 8).ToUpper();

            if (!cleanProps.ContainsKey("createdDate"))
                cleanProps["createdDate"] = DateTime.Now.ToString("yyyy-MM-dd");

            var setClause = string.Join(", ", cleanProps.Keys.Select(k => $"n.{k} = ${k}"));
            var query = $"CREATE (n:{label}) SET {setClause} RETURN n";

            try
            {
                var result = await _repository.RunAsync(query, cleanProps);
                // SỬA LỖI: Normalize output
                return Ok(new { message = "Tạo tài sản thành công", data = NormalizeDictionary(result.First()["n"].As<INode>().Properties) });
            }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [HttpPut("assets/{type}/{id}")]
        public async Task<IActionResult> UpdateAsset(string type, string id, [FromBody] Dictionary<string, object> properties)
        {
            string label = ValidateType(type);
            string idField = GetIdField(type);
            if (label == null) return BadRequest("Loại tài sản không hợp lệ");

            // SỬA LỖI: Chuyển đổi JsonElement từ input
            var cleanProps = ConvertDictionary(properties);

            var setClause = string.Join(", ", cleanProps.Keys.Select(k => $"n.{k} = ${k}"));
            cleanProps["targetId"] = id;
            var query = $"MATCH (n:{label} {{{idField}: $targetId}}) SET {setClause} RETURN n";

            try
            {
                var result = await _repository.RunAsync(query, cleanProps);
                if (!result.Any()) return NotFound("Không tìm thấy tài sản để cập nhật");
                // SỬA LỖI: Normalize output
                return Ok(new { message = "Cập nhật thành công", data = NormalizeDictionary(result.First()["n"].As<INode>().Properties) });
            }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [HttpDelete("assets/{type}/{id}")]
        public async Task<IActionResult> DeleteAsset(string type, string id)
        {
            string label = ValidateType(type);
            string idField = GetIdField(type);

            var query = $"MATCH (n:{label} {{{idField}: $id}}) DETACH DELETE n";

            try
            {
                await _repository.RunAsync(query, new { id });
                return Ok(new { message = "Đã xóa tài sản và các liên kết sở hữu" });
            }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        // =========================================================================================
        // PHẦN 3: QUẢN LÝ SỞ HỮU
        // =========================================================================================

        [HttpPost("ownership/assign")]
        public async Task<IActionResult> AssignOwnership([FromBody] AssignRequest req)
        {
            string label = ValidateType(req.AssetType);
            string idField = GetIdField(req.AssetType);
            string relType = GetRelType(req.AssetType);

            if (label == null) return BadRequest("Loại tài sản không hợp lệ");

            var query = $@"
                MATCH (p:Person {{cccd: $cccd}})
                MATCH (a:{label} {{{idField}: $assetId}})
                MERGE (p)-[r:{relType}]->(a)
                SET r.assignedDate = date()
                RETURN p, r, a";

            try
            {
                var result = await _repository.RunAsync(query, new { req.cccd, req.assetId });
                if (!result.Any()) return BadRequest("Không tìm thấy Người hoặc Tài sản");
                return Ok(new { message = $"Đã gán quyền sở hữu {label} cho {req.cccd}" });
            }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [HttpPost("ownership/unassign")]
        public async Task<IActionResult> UnassignOwnership([FromBody] AssignRequest req)
        {
            string label = ValidateType(req.AssetType);
            string idField = GetIdField(req.AssetType);
            string relType = GetRelType(req.AssetType);

            var query = $@"
                MATCH (p:Person {{cccd: $cccd}})-[r:{relType}]->(a:{label} {{{idField}: $assetId}})
                DELETE r";

            try
            {
                await _repository.RunAsync(query, new { req.cccd, req.assetId });
                return Ok(new { message = "Đã gỡ quyền sở hữu" });
            }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        // =========================================================================================
        // HELPER FUNCTIONS (ĐÃ CẬP NHẬT)
        // =========================================================================================

        // Helper 1: Xử lý input từ JSON Body (chuyển JsonElement thành native type)
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
                            if(jsonElem.TryGetInt64(out long l)) result[kvp.Key] = l; 
                            else if(jsonElem.TryGetDouble(out double d)) result[kvp.Key] = d; 
                            break; 
                        case JsonValueKind.True: result[kvp.Key] = true; break; 
                        case JsonValueKind.False: result[kvp.Key] = false; break; 
                        default: result[kvp.Key] = jsonElem.ToString(); break; 
                    } 
                } 
                else 
                { 
                    result[kvp.Key] = kvp.Value; 
                } 
            } 
            return result; 
        }

        // Helper 2: Xử lý output từ Neo4j (chuyển LocalDate, ZonedDateTime thành String)
        private object NormalizeValue(object value) 
        { 
            if (value == null) return null; 
            if (value is LocalDate localDate) return localDate.ToString(); // Trả về "yyyy-MM-dd"
            if (value is ZonedDateTime zdt) return zdt.ToString(); 
            if (value is LocalDateTime ldt) return ldt.ToString(); 
            if (value is OffsetTime ot) return ot.ToString(); 
            if (value is LocalTime lt) return lt.ToString(); 
            return value; 
        }

        // Helper 3: Áp dụng NormalizeValue cho cả dictionary
        private Dictionary<string, object> NormalizeDictionary(IReadOnlyDictionary<string, object> input) 
        { 
            var result = new Dictionary<string, object>(); 
            foreach (var kvp in input) result[kvp.Key] = NormalizeValue(kvp.Value); 
            return result; 
        }

        private string ValidateType(string type)
        {
            if (string.Equals(type, "RealEstate", StringComparison.OrdinalIgnoreCase)) return "RealEstate";
            if (string.Equals(type, "Vehicle", StringComparison.OrdinalIgnoreCase)) return "Vehicle";
            if (string.Equals(type, "Business", StringComparison.OrdinalIgnoreCase)) return "Business";
            return null;
        }

        private string GetIdField(string type)
        {
            if (type == "RealEstate") return "assetId";
            if (type == "Vehicle") return "vehicleId";
            return "businessId";
        }

        private string GetRelType(string type)
        {
            if (type == "RealEstate") return "OWNS";
            if (type == "Vehicle") return "OWNS_VEHICLE";
            return "OWNS_BUSINESS";
        }

        public class AssignRequest
        {
            public string cccd { get; set; }
            public string assetId { get; set; }
            public string AssetType { get; set; }
        }
    }
}