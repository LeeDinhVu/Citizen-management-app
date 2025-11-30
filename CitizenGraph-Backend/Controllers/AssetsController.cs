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
    public class AssetsController : ControllerBase
    {
        private readonly Neo4jRepository _repository;
        private readonly AdminActionLogger _logger;

        public AssetsController(Neo4jRepository repository, AdminActionLogger logger)
        {
            _repository = repository;
            _logger = logger;
        }

        // =========================================================================================
        // 1. DASHBOARD
        // =========================================================================================
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetOwnershipDashboard()
        {
            const string action = "Xem Dashboard Tài sản & Sở hữu";
            await _logger.LogProcessing(action, "Assets");

            try
            {
                var statsQuery = @"
                    MATCH (re:RealEstate) 
                    WITH count(re) AS CountRE, sum(toFloat(re.valueVND)) AS ValRE
                    MATCH (v:Vehicle) 
                    WITH CountRE, ValRE, count(v) AS CountVeh, sum(toFloat(v.valueVND)) AS ValVeh
                    MATCH (b:Business) 
                    WITH CountRE, ValRE, CountVeh, ValVeh, count(b) AS CountBiz, sum(toFloat(b.registeredCapital)) AS ValBiz
                    RETURN CountRE, ValRE, CountVeh, ValVeh, CountBiz, ValBiz";

                var listQuery = @"
                    MATCH (p:Person)
                    OPTIONAL MATCH (p)-[:OWNS]->(re:RealEstate)
                    OPTIONAL MATCH (p)-[:OWNS_VEHICLE]->(v:Vehicle)
                    OPTIONAL MATCH (p)-[:OWNS_BUSINESS]->(b:Business)
                    WITH p,
                         collect(DISTINCT re) AS res,
                         collect(DISTINCT v) AS ves,
                         collect(DISTINCT b) AS bus
                    WITH p,
                         res,
                         ves,
                         bus,
                         size(res) AS soLuongBDS,
                         size(ves) AS soLuongXe,
                         size(bus) AS soLuongDN,
                         reduce(total = 0.0, x IN res | total + COALESCE(toFloat(x.valueVND), 0)) +
                         reduce(total = 0.0, x IN ves | total + COALESCE(toFloat(x.valueVND), 0)) +
                         reduce(total = 0.0, x IN bus | total + COALESCE(toFloat(x.registeredCapital), 0)) AS tongGiaTri
                    WHERE soLuongBDS > 0 OR soLuongXe > 0 OR soLuongDN > 0
                    RETURN 
                        p.cccd AS cccd,
                        p.hoTen AS hoTen,
                        soLuongBDS,
                        soLuongXe,
                        soLuongDN,
                        tongGiaTri
                    ORDER BY tongGiaTri DESC
                    LIMIT 100";

                var statsTask = _repository.RunAsync(statsQuery);
                var listTask = _repository.RunAsync(listQuery);
                await Task.WhenAll(statsTask, listTask);

                var statsRec = statsTask.Result.FirstOrDefault();
                var ownersResult = listTask.Result;

                var statistics = statsRec != null
                    ? new
                    {
                        RealEstate = new { Count = statsRec["CountRE"].As<long>(), Value = statsRec["ValRE"].As<double>() },
                        Vehicle    = new { Count = statsRec["CountVeh"].As<long>(), Value = statsRec["ValVeh"].As<double>() },
                        Business   = new { Count = statsRec["CountBiz"].As<long>(), Value = statsRec["ValBiz"].As<double>() }
                    }
                    : new
                    {
                        RealEstate = new { Count = 0L, Value = 0.0 },
                        Vehicle    = new { Count = 0L, Value = 0.0 },
                        Business   = new { Count = 0L, Value = 0.0 }
                    };

                var ownersGrid = ownersResult.Select(r => new
                {
                    cccd = r["cccd"].As<string>(),
                    hoTen = r["hoTen"].As<string>(),
                    soLuongBDS = r["soLuongBDS"].As<long>(),
                    soLuongXe = r["soLuongXe"].As<long>(),
                    soLuongDN = r["soLuongDN"].As<long>(),
                    tongGiaTri = r["tongGiaTri"].As<double>()
                }).ToList();

                await _logger.LogSuccess(action, "Assets");

                return Ok(new
                {
                    statistics,
                    ownersGrid
                });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Assets");
                return StatusCode(500, new { message = "Lỗi tải dashboard", error = ex.Message });
            }
        }

        // =========================================================================================
        // 2. CHI TIẾT CÔNG DÂN
        // =========================================================================================
        [HttpGet("detail/{cccd}")]
        public async Task<IActionResult> GetOwnerDetail(string cccd)
        {
            var action = $"Xem chi tiết sở hữu công dân CCCD: {cccd}";
            await _logger.LogProcessing(action, "Assets");

            try
            {
                var query = @"
                    MATCH (p:Person {cccd: $cccd})
                    OPTIONAL MATCH (p)-[:OWNS]->(re:RealEstate)
                    OPTIONAL MATCH (p)-[:OWNS_VEHICLE]->(v:Vehicle)
                    OPTIONAL MATCH (p)-[:OWNS_BUSINESS]->(b:Business)
                    RETURN p,
                           collect(DISTINCT re) AS realEstates,
                           collect(DISTINCT v)  AS vehicles,
                           collect(DISTINCT b)  AS businesses";

                var result = await _repository.RunAsync(query, new { cccd });
                if (!result.Any())
                {
                    await _logger.LogFailed($"{action} - Không tìm thấy", "Assets");
                    return NotFound("Không tìm thấy người này");
                }

                var r = result.First();
                await _logger.LogSuccess(action, "Assets");

                return Ok(new
                {
                    person = NormalizeDictionary(r["p"].As<INode>().Properties),
                    realEstates = r["realEstates"].As<List<INode>>().Select(n => NormalizeDictionary(n.Properties)),
                    vehicles = r["vehicles"].As<List<INode>>().Select(n => NormalizeDictionary(n.Properties)),
                    businesses = r["businesses"].As<List<INode>>().Select(n => NormalizeDictionary(n.Properties))
                });

            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Assets");
                return StatusCode(500, ex.Message);
            }
        }

        // =========================================================================================
        // 3. QUẢN LÝ TÀI SẢN (CRUD)
        // =========================================================================================
        [HttpGet("assets/{type}")]
        public async Task<IActionResult> GetAllAssetsByType(string type)
        {
            var action = $"Xem danh sách tài sản loại: {type}";
            await _logger.LogProcessing(action, "Assets");

            var label = ValidateType(type);
            if (label == null) return BadRequest("Loại tài sản không hợp lệ");

            var query = $"MATCH (n:{label}) RETURN n ORDER BY n.createdDate DESC LIMIT 200";
            try
            {
                var result = await _repository.RunAsync(query);
                await _logger.LogSuccess(action, "Assets");
                return Ok(result.Select(r => NormalizeDictionary(r["n"].As<INode>().Properties)));
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Assets");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpPost("assets/{type}")]
        public async Task<IActionResult> CreateAsset(string type, [FromBody] Dictionary<string, object> properties)
        {
            var action = $"Tạo tài sản mới loại: {type}";
            await _logger.LogProcessing(action, "Assets");

            var label = ValidateType(type);
            if (label == null) return BadRequest("Loại tài sản không hợp lệ");

            var cleanProps = ConvertDictionary(properties);

            // ---------------------------------------------------------------------
            // THÊM: VALIDATE DỮ LIỆU ĐẦU VÀO THEO TIÊU CHUẨN
            // ---------------------------------------------------------------------
            var validationError = ValidateAssetProperties(label, cleanProps);
            if (validationError != null) return BadRequest(new { message = validationError });

            var idField = GetIdField(type);
            if (!cleanProps.ContainsKey(idField))
                cleanProps[idField] = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();

            cleanProps["createdDate"] = DateTime.Now.ToString("yyyy-MM-dd");

            var setClause = string.Join(", ", cleanProps.Keys.Select(k => $"n.{k} = ${k}"));
            var query = $"CREATE (n:{label}) SET {setClause} RETURN n";

            try
            {
                var result = await _repository.RunAsync(query, cleanProps);
                await _logger.LogSuccess(action, "Assets");
                return Ok(new { message = "Tạo tài sản thành công", data = NormalizeDictionary(result.First()["n"].As<INode>().Properties) });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Assets");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpPut("assets/{type}/{id}")]
        public async Task<IActionResult> UpdateAsset(string type, string id, [FromBody] Dictionary<string, object> properties)
        {
            var action = $"Cập nhật tài sản ID: {id} loại: {type}";
            await _logger.LogProcessing(action, "Assets");

            var label = ValidateType(type);
            var idField = GetIdField(type);
            if (label == null) return BadRequest("Loại tài sản không hợp lệ");

            var cleanProps = ConvertDictionary(properties);

            // ---------------------------------------------------------------------
            // THÊM: VALIDATE DỮ LIỆU KHI UPDATE (Chỉ validate các trường có gửi lên)
            // ---------------------------------------------------------------------
            if (label == "RealEstate")
            {
                if (cleanProps.TryGetValue("valueVND", out var val) && Convert.ToDouble(val) < 0) return BadRequest("Giá trị BĐS không được âm.");
                if (cleanProps.TryGetValue("area", out var area) && Convert.ToDouble(area) <= 0) return BadRequest("Diện tích phải lớn hơn 0.");
            }
            else if (label == "Vehicle")
            {
                if (cleanProps.TryGetValue("valueVND", out var val) && Convert.ToDouble(val) < 0) return BadRequest("Giá trị xe không được âm.");
            }
            else if (label == "Business")
            {
                if (cleanProps.TryGetValue("registeredCapital", out var cap) && Convert.ToDouble(cap) <= 0) return BadRequest("Vốn điều lệ phải lớn hơn 0.");
            }

            cleanProps["targetId"] = id;

            var setClause = string.Join(", ", cleanProps.Keys.Where(k => k != "targetId").Select(k => $"n.{k} = ${k}"));
            var query = $"MATCH (n:{label} {{{idField}: $targetId}}) SET {setClause} RETURN n";

            try
            {
                var result = await _repository.RunAsync(query, cleanProps);
                if (!result.Any())
                {
                    await _logger.LogFailed($"{action} - Không tìm thấy", "Assets");
                    return NotFound("Không tìm thấy tài sản");
                }

                await _logger.LogSuccess(action, "Assets");
                return Ok(new { message = "Cập nhật thành công", data = NormalizeDictionary(result.First()["n"].As<INode>().Properties) });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Assets");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpDelete("assets/{type}/{id}")]
        public async Task<IActionResult> DeleteAsset(string type, string id)
        {
            var action = $"Xóa tài sản ID: {id} loại: {type}";
            await _logger.LogProcessing(action, "Assets");

            var label = ValidateType(type);
            var idField = GetIdField(type);
            if (label == null) return BadRequest("Loại tài sản không hợp lệ");

            var query = $"MATCH (n:{label} {{{idField}: $id}}) DETACH DELETE n";
            try
            {
                await _repository.RunAsync(query, new { id });
                await _logger.LogSuccess(action, "Assets");
                return Ok(new { message = "Đã xóa tài sản và liên kết sở hữu" });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Assets");
                return StatusCode(500, ex.Message);
            }
        }

        // =========================================================================================
        // 4. GÁN / GỠ QUYỀN SỞ HỮU (CÓ CHECK TUỔI)
        // =========================================================================================
        [HttpPost("ownership/assign")]
        public async Task<IActionResult> AssignOwnership([FromBody] AssignRequest req)
        {
            var action = $"Gán quyền sở hữu {req.AssetType} {req.assetId} cho CCCD: {req.cccd}";
            await _logger.LogProcessing(action, "Assets");

            var label = ValidateType(req.AssetType);
            var idField = GetIdField(req.AssetType);
            var relType = GetRelType(req.AssetType);
            if (label == null) return BadRequest("Loại tài sản không hợp lệ");

            // ---------------------------------------------------------------------
            // THÊM: KIỂM TRA ĐỘ TUỔI CÔNG DÂN (PHẢI >= 18)
            // ---------------------------------------------------------------------
            try
            {
                var checkAgeQuery = "MATCH (p:Person {cccd: $cccd}) RETURN p.ngaySinh AS dob";
                var ageResult = await _repository.RunAsync(checkAgeQuery, new { req.cccd });
                
                if (!ageResult.Any()) return BadRequest("Không tìm thấy công dân với số CCCD này.");
                
                var dobStr = ageResult.First()["dob"].As<string>();
                if (DateTime.TryParse(dobStr, out DateTime dob))
                {
                    var age = DateTime.Now.Year - dob.Year;
                    if (dob > DateTime.Now.AddYears(-age)) age--;
                    
                    if (age < 18)
                    {
                        await _logger.LogFailed($"{action} - Từ chối: Chưa đủ 18 tuổi", "Assets");
                        return BadRequest(new { message = $"Công dân chưa đủ 18 tuổi (Tuổi hiện tại: {age}). Không thể đứng tên tài sản." });
                    }
                }
                else 
                {
                    return BadRequest("Dữ liệu ngày sinh của công dân không hợp lệ.");
                }

                // ---------------------------------------------------------------------
                // TIẾN HÀNH GÁN
                // ---------------------------------------------------------------------
                var query = $@"
                    MATCH (p:Person {{cccd: $cccd}})
                    MATCH (a:{label} {{{idField}: $assetId}})
                    MERGE (p)-[r:{relType}]->(a)
                    ON CREATE SET r.assignedDate = date()
                    ON MATCH  SET r.assignedDate = date()
                    RETURN r";

                var result = await _repository.RunAsync(query, new { req.cccd, req.assetId });
                if (!result.Any())
                {
                    await _logger.LogFailed($"{action} - Không tìm thấy tài sản", "Assets");
                    return BadRequest("Không tìm thấy tài sản tương ứng.");
                }

                await _logger.LogSuccess(action, "Assets");
                return Ok(new { message = $"Đã gán {label} cho {req.cccd}" });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Assets");
                return StatusCode(500, ex.Message);
            }
        }

        [HttpPost("ownership/unassign")]
        public async Task<IActionResult> UnassignOwnership([FromBody] AssignRequest req)
        {
            var action = $"Gỡ quyền sở hữu {req.AssetType} {req.assetId} khỏi CCCD: {req.cccd}";
            await _logger.LogProcessing(action, "Assets");

            var label = ValidateType(req.AssetType);
            var idField = GetIdField(req.AssetType);
            var relType = GetRelType(req.AssetType);
            if (label == null) return BadRequest("Loại tài sản không hợp lệ");

            var query = $@"
                MATCH (p:Person {{cccd: $cccd}})-[r:{relType}]->(a:{label} {{{idField}: $assetId}})
                DELETE r";

            try
            {
                await _repository.RunAsync(query, new { req.cccd, req.assetId });
                await _logger.LogSuccess(action, "Assets");
                return Ok(new { message = "Đã gỡ quyền sở hữu" });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{action} - Lỗi: {ex.Message}", "Assets");
                return StatusCode(500, ex.Message);
            }
        }

        // =========================================================================================
        // HELPER FUNCTIONS
        // =========================================================================================

        private string? ValidateAssetProperties(string label, Dictionary<string, object> props)
        {
            if (label == "RealEstate")
            {
                if (!props.ContainsKey("valueVND") || Convert.ToDouble(props["valueVND"]) < 0) return "Giá trị BĐS là bắt buộc và không được âm.";
                if (props.TryGetValue("area", out var area) && Convert.ToDouble(area) <= 0) return "Diện tích phải lớn hơn 0.";
                if (!props.ContainsKey("assetType")) return "Loại tài sản (nhà/đất) là bắt buộc.";
            }
            else if (label == "Vehicle")
            {
                if (!props.ContainsKey("valueVND") || Convert.ToDouble(props["valueVND"]) < 0) return "Giá trị xe là bắt buộc và không được âm.";
                if (!props.ContainsKey("licensePlate") || string.IsNullOrWhiteSpace(props["licensePlate"].ToString())) return "Biển số xe là bắt buộc.";
            }
            else if (label == "Business")
            {
                if (!props.ContainsKey("registeredCapital") || Convert.ToDouble(props["registeredCapital"]) <= 0) return "Vốn điều lệ phải lớn hơn 0.";
                if (!props.ContainsKey("taxCode") || string.IsNullOrWhiteSpace(props["taxCode"].ToString())) return "Mã số thuế là bắt buộc.";
                if (!props.ContainsKey("businessName") || string.IsNullOrWhiteSpace(props["businessName"].ToString())) return "Tên doanh nghiệp là bắt buộc.";
            }
            return null;
        }

        private string? ValidateType(string? type) => type?.ToLower() switch
        {
            "realestate" => "RealEstate",
            "vehicle"    => "Vehicle",
            "business"   => "Business",
            _ => null
        };

        private string GetIdField(string type) => type.ToLower() switch
        {
            "realestate" => "assetId",
            "vehicle"    => "vehicleId",
            _            => "businessId"
        };

        private string GetRelType(string type) => type.ToLower() switch
        {
            "realestate" => "OWNS",
            "vehicle"    => "OWNS_VEHICLE",
            _            => "OWNS_BUSINESS"
        };

        private Dictionary<string, object> ConvertDictionary(Dictionary<string, object> input)
        {
            var result = new Dictionary<string, object>();
            foreach (var kvp in input)
            {
                if (kvp.Value is JsonElement je)
                {
                    result[kvp.Key] = je.ValueKind switch
                    {
                        JsonValueKind.String => je.GetString() ?? "",
                        JsonValueKind.Number => je.TryGetInt64(out long l) ? l : je.GetDouble(),
                        JsonValueKind.True => true,
                        JsonValueKind.False => false,
                        _ => je.ToString()
                    };
                }
                else result[kvp.Key] = kvp.Value;
            }
            return result;
        }

        private object NormalizeValue(object value) { if (value == null) return null; if (value is LocalDate localDate) return localDate.ToString(); if (value is ZonedDateTime zdt) return zdt.ToString(); if (value is LocalDateTime ldt) return ldt.ToString(); if (value is OffsetTime ot) return ot.ToString(); if (value is LocalTime lt) return lt.ToString(); return value; }

        private Dictionary<string, object> NormalizeDictionary(IReadOnlyDictionary<string, object> dict)
        {
            var result = new Dictionary<string, object>();
            foreach (var kvp in dict)
                result[kvp.Key] = NormalizeValue(kvp.Value);
            return result;
        }

        public class AssignRequest
        {
            public string cccd { get; set; } = "";
            public string assetId { get; set; } = "";
            public string AssetType { get; set; } = "";
        }
    }
}