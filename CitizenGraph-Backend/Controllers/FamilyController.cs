// using Microsoft.AspNetCore.Mvc;
// using Neo4j.Driver;
// using CitizenGraph.Backend.Services;
// using System.Collections.Generic;
// using System.Linq;
// using System.Threading.Tasks;
// using System;
// using System.Text.Json;

// namespace CitizenGraph.Backend.Controllers
// {
//     // --- GIỮ NGUYÊN CÁC DTO ---
//     public class PersonDto { public string Id { get; set; } = ""; public string HoTen { get; set; } = ""; public string? NgaySinh { get; set; } public string? GioiTinh { get; set; } public string? QueQuan { get; set; } public string? MaritalStatus { get; set; } public string? NgheNghiep { get; set; } public Dictionary<string, object> Details { get; set; } = new(); }
//     public class MemberPreviewDto { public string Name { get; set; } public string Cccd { get; set; } }
//     public class HouseholdMemberDetailDto { public PersonDto Member { get; set; } public PersonDto HeadOfHousehold { get; set; } public string RelationToHead { get; set; } public string HouseholdAddress { get; set; } }
//     public class RelationshipDto { public long Id { get; set; } public string Source { get; set; } public string Target { get; set; } public string Type { get; set; } public string Label { get; set; } = ""; public Dictionary<string, object> Properties { get; set; } = new(); }
//     public class RelationshipCreateDto { public string SourceId { get; set; } public string TargetId { get; set; } public string Type { get; set; } public Dictionary<string, object> Properties { get; set; } = new(); }
//     public class PersonDropdownDto { public string Value { get; set; } public string Label { get; set; } }
//     public class HouseholdCreateDto { public string HouseholdId { get; set; } public string HeadCccd { get; set; } public string RegistrationNumber { get; set; } public string Address { get; set; } public string ResidencyType { get; set; } }
//     public class AddMemberDto { public string HouseholdId { get; set; } public string PersonCccd { get; set; } public string RelationToHead { get; set; } public string Role { get; set; } public string FromDate { get; set; } }
//     public class DashboardStatsDto { public long TotalCitizens { get; set; } public long TotalRelationships { get; set; } public long MarriedCount { get; set; } public long SingleCount { get; set; } public double AvgChildrenPerFamily { get; set; } public Dictionary<string, long> GenderDistribution { get; set; } = new(); public Dictionary<string, long> RelationshipBreakdown { get; set; } = new(); }
//     public class AdminLogDto { public string Action { get; set; } public string Time { get; set; } public string Status { get; set; } }

//     [ApiController]
//     [Route("api/[controller]")]
//     public class FamilyController : ControllerBase
//     {
//         private readonly Neo4jRepository _repo;
//         public FamilyController(Neo4jRepository repo) { _repo = repo; }

//         // --- HÀM GHI LOG DÙNG CHUNG ---
//         private async Task LogAction(string action, string status)
//         {
//             // Module 'Family' bao gồm cả việc xem và thao tác dữ liệu
//             var query = @"
//                 CREATE (l:AdminLog {
//                     action: $action, 
//                     time: toString(datetime()), 
//                     status: $status, 
//                     module: 'Family'
//                 })";
//             await _repo.RunAsync(query, new { action, status });
//         }

//         // --- READ OPERATIONS (ĐÃ THÊM LOG) ---

//         [HttpGet("dropdown-list")]
//         public async Task<IActionResult> GetDropdownList() {
//             // Log xem danh sách gợi ý (thường chạy ngầm nên có thể bỏ qua hoặc log nếu muốn chi tiết tuyệt đối)
//             // Ở đây tôi bỏ qua để tránh spam log vì nó gọi rất nhiều lần
//             var r = await _repo.RunAsync(@"MATCH (p:Person) RETURN p.cccd as value, p.hoTen + ' (' + coalesce(toString(p.ngaySinh), '?') + ')' as label ORDER BY p.hoTen");
//             return Ok(new { success = true, data = r.Select(x => new PersonDropdownDto { Value = SafeString(x["value"]), Label = SafeString(x["label"]) }) });
//         }

//         [HttpGet("stats")]
//         public async Task<IActionResult> GetStats() {
//             string action = "Xem thống kê tổng quan (Stats)";
//             await LogAction(action, "Đang xử lý");
//             try {
//                 var nRes = await _repo.RunAsync("MATCH (n:Person) RETURN count(n) as total, sum(CASE WHEN toString(n.maritalStatus) CONTAINS 'kết hôn' THEN 1 ELSE 0 END) as married, sum(CASE WHEN n.gioiTinh='Nam' THEN 1 ELSE 0 END) as male, sum(CASE WHEN n.gioiTinh='Nữ' THEN 1 ELSE 0 END) as female");
//                 if(nRes.Count==0) {
//                      await LogAction(action, "Thành công");
//                      return Ok(new DashboardStatsDto());
//                 }
//                 var nRec = nRes[0];
//                 var rRes = await _repo.RunAsync("MATCH ()-[r]->() RETURN count(r) as totalRel");
//                 var brRes = await _repo.RunAsync("MATCH ()-[r]->() RETURN type(r) as type, count(r) as cnt ORDER BY cnt DESC");
//                 var aRes = await _repo.RunAsync("MATCH (p:Person)-[:FATHER_OF|MOTHER_OF]->(c:Person) WITH p, count(c) as children RETURN avg(children) as avgChildren");
                
//                 await LogAction(action, "Thành công");
//                 return Ok(new DashboardStatsDto {
//                     TotalCitizens = nRec["total"].As<long>(), MarriedCount = nRec["married"].As<long>(), SingleCount = nRec["total"].As<long>() - nRec["married"].As<long>(), TotalRelationships = rRes.Count>0?rRes[0]["totalRel"].As<long>():0, AvgChildrenPerFamily = aRes.Count>0?Math.Round(aRes[0]["avgChildren"].As<double>(), 2):0,
//                     GenderDistribution = new Dictionary<string, long> { { "Nam", nRec["male"].As<long>() }, { "Nữ", nRec["female"].As<long>() }, { "Khác", nRec["total"].As<long>() - (nRec["male"].As<long>() + nRec["female"].As<long>()) } },
//                     RelationshipBreakdown = brRes.ToDictionary(x => x["type"].As<string>(), x => x["cnt"].As<long>())
//                 });
//             } catch(Exception ex) { 
//                 await LogAction(action, "Thất bại");
//                 return StatusCode(500, new { success=false, message=ex.Message }); 
//             }
//         }

//         [HttpGet("citizens")]
//         public async Task<IActionResult> GetCitizens([FromQuery] int limit = 1000, [FromQuery] string search = "") {
//             string action = string.IsNullOrEmpty(search) ? "Xem danh sách toàn bộ công dân" : $"Tìm kiếm công dân với từ khóa: '{search}'";
//             await LogAction(action, "Đang xử lý");
//             try {
//                 var r = await _repo.RunAsync("MATCH (p:Person) WHERE ($search = '' OR toLower(toString(p.hoTen)) CONTAINS toLower($search) OR toString(p.cccd) CONTAINS $search) RETURN p ORDER BY p.hoTen LIMIT $limit", new { limit, search });
//                 await LogAction(action, "Thành công");
//                 return Ok(r.Select(x => MapNodeToDto(x["p"].As<INode>())).ToList());
//             } catch {
//                 await LogAction(action, "Thất bại");
//                 throw;
//             }
//         }

//         [HttpGet("households")]
//         public async Task<IActionResult> GetHouseholds() {
//             string action = "Xem danh sách hộ khẩu";
//             await LogAction(action, "Đang xử lý");
//             try {
//                 var query = @"MATCH (h:Household) OPTIONAL MATCH (h)<-[:CURRENT_RESIDENT]-(p:Person) OPTIONAL MATCH (h)-[:REGISTERED_AT]->(a:Address) WITH h, a, count(p) as cnt, collect({name: p.hoTen, cccd: toString(p.cccd)})[0..6] as members RETURN coalesce(a.addressId, h.householdId, 'N/A') as id, coalesce(toString(a.houseNumber) + ' ' + a.street, h.hoKhauSo, 'Chưa cập nhật') as address, h.registrationNumber as regNum, h.residencyType as resType, cnt, members, h.householdId as householdCode ORDER BY cnt DESC LIMIT 100";
//                 var records = await _repo.RunAsync(query);
//                 await LogAction(action, "Thành công");
//                 return Ok(new { success = true, data = records.Select(r => new { AddressId = SafeString(r["id"]), HouseholdCode = SafeString(r["householdCode"]), RegistrationNumber = SafeString(r["regNum"]), ResidencyType = SafeString(r["resType"]), Address = SafeString(r["address"]), Count = r["cnt"].As<int>(), Members = r["members"].As<List<IDictionary<string, object>>>().Select(m => new MemberPreviewDto { Name = m["name"]?.ToString()??"", Cccd = m["cccd"]?.ToString()??"" }).ToList() }) });
//             } catch {
//                 await LogAction(action, "Thất bại");
//                 throw;
//             }
//         }

//         [HttpGet("member-detail")]
//         public async Task<IActionResult> GetHouseholdMemberDetail([FromQuery] string cccd) {
//             string action = $"Xem chi tiết thành viên CCCD: {cccd}";
//             await LogAction(action, "Đang xử lý");
//             try {
//                 var query = @"MATCH (p:Person {cccd: $cccd}) OPTIONAL MATCH (p)-[r:CURRENT_RESIDENT]->(h:Household) OPTIONAL MATCH (h)-[:REGISTERED_AT]->(a:Address) OPTIONAL MATCH (head:Person {cccd: h.headOfHouseholdCCCD}) RETURN p, r.relationToHead as relation, r as relProps, head, coalesce(toString(a.houseNumber) + ' ' + a.street, h.hoKhauSo) as address";
//                 var records = await _repo.RunAsync(query, new { cccd });
//                 if (!records.Any()) {
//                     await LogAction(action, "Thất bại (Không tìm thấy)");
//                     return NotFound(new { success = false, message = "Không tìm thấy" });
//                 }
//                 var rec = records[0];
//                 INode? head = (rec["head"] != null && rec["head"] is INode) ? rec["head"].As<INode>() : null;
//                 var relProps = (rec["relProps"] != null && rec["relProps"] is IRelationship) ? NormalizeDictionary(rec["relProps"].As<IRelationship>().Properties) : new Dictionary<string,object>();
                
//                 await LogAction(action, "Thành công");
//                 return Ok(new { success = true, data = new { Member = MapNodeToDto(rec["p"].As<INode>()), HeadOfHousehold = head != null ? MapNodeToDto(head) : null, RelationToHead = SafeString(rec["relation"]), HouseholdAddress = SafeString(rec["address"]), ResidentRelProps = relProps } });
//             } catch {
//                 await LogAction(action, "Thất bại");
//                 throw;
//             }
//         }

//         [HttpGet("genealogy-all")]
//         public async Task<IActionResult> GetAllCitizensForGenealogy() {
//             string action = "Xem danh sách phả hệ";
//             await LogAction(action, "Đang xử lý");
//             try {
//                 var r = await _repo.RunAsync("MATCH (p:Person) OPTIONAL MATCH (p)-[:FATHER_OF|MOTHER_OF]->(child:Person) WITH p, count(child) as childrenCount RETURN p.hoTen as name, toString(p.cccd) as id, toString(p.ngaySinh) as dob, childrenCount ORDER BY name ASC LIMIT 1000");
//                 await LogAction(action, "Thành công");
//                 return Ok(new { success = true, data = r.Select(x => new { Cccd = SafeString(x["id"]), HoTen = SafeString(x["name"]), NgaySinh = SafeString(x["dob"]), SoConTrucTiep = x["childrenCount"].As<int>() }) });
//             } catch {
//                 await LogAction(action, "Thất bại");
//                 throw;
//             }
//         }

//         [HttpGet("full-tree")]
//         public async Task<IActionResult> GetFullTree([FromQuery] string cccd) {
//             string action = $"Xem cây phả hệ của CCCD: {cccd}";
//             await LogAction(action, "Đang xử lý");
//             try {
//                 var manualQuery = @"MATCH (root:Person) WHERE toString(root.cccd) = $cccd OPTIONAL MATCH path = (root)-[:FATHER_OF|MOTHER_OF|MARRIED_TO|CHILD_OF|SIBLING*0..3]-(p:Person) WITH root, collect(path) AS paths WITH root, [p IN paths | nodes(p)] AS nodeLists, [p IN paths | relationships(p)] AS relLists UNWIND nodeLists AS nl UNWIND nl AS n WITH root, relLists, collect(DISTINCT n) AS allNodes UNWIND relLists AS rl UNWIND rl AS r WITH root, allNodes, collect(r) AS rawRels UNWIND rawRels AS r WITH root, allNodes, startNode(r) AS s, endNode(r) AS e, r WHERE s = root WITH root, allNodes, s, e, r, apoc.coll.sort([id(s), id(e)]) AS pairKey WITH root, allNodes, pairKey, collect(r)[0] AS uniqRel WITH root, collect(DISTINCT uniqRel) AS rels, allNodes WITH root, rels, [r IN rels | endNode(r)] AS connectedNodes WITH rels, connectedNodes + [root] AS nodes RETURN nodes, rels";
//                 var records = await _repo.RunAsync(manualQuery, new { cccd });
//                 if (!records.Any()) {
//                      await LogAction(action, "Thành công (Không có dữ liệu)");
//                      return Ok(new { success = false , message = "Not found" });
//                 }
//                 await LogAction(action, "Thành công");
//                 return ProcessGraphResult(records[0]);
//             } catch {
//                 await LogAction(action, "Thất bại");
//                 throw;
//             }
//         }

//         [HttpGet("global-graph")]
//         public async Task<IActionResult> GetGlobalGraph() {
//             string action = "Xem toàn cảnh quan hệ (Global Graph)";
//             await LogAction(action, "Đang xử lý");
//             try {
//                 var records = await _repo.RunAsync(@"MATCH (n:Person) OPTIONAL MATCH (n)-[r:FATHER_OF|MOTHER_OF|MARRIED_TO|CHILD_OF|SIBLING]-(m:Person) WHERE elementId(n) <> elementId(m) WITH CASE WHEN elementId(n) < elementId(m) THEN n ELSE m END AS node1, CASE WHEN elementId(n) < elementId(m) THEN m ELSE n END AS node2, collect(r) AS relsBetween WITH node1, node2, head(relsBetween) AS r RETURN collect(distinct node1) + collect(distinct node2) AS nodes, collect(distinct r) AS rels LIMIT 3000");
//                 await LogAction(action, "Thành công");
//                 return ProcessGraphResult(records[0]);
//             } catch {
//                 await LogAction(action, "Thất bại");
//                 throw;
//             }
//         }

//         // --- CRUD OPERATIONS (ĐÃ CÓ LOG TỪ TRƯỚC) ---
//         // (Giữ nguyên logic log đã thêm ở bước trước, chỉ liệt kê lại để đảm bảo file đầy đủ)

//         [HttpPost("relationship")]
//         public async Task<IActionResult> CreateRelationship([FromBody] RelationshipCreateDto input) {
//             string action = $"Tạo quan hệ {input.Type} giữa {input.SourceId} và {input.TargetId}";
//             await LogAction(action, "Đang xử lý");
//             try {
//                 var query = $@"MATCH (a:Person), (b:Person) WHERE toString(a.cccd) = $sourceId AND toString(b.cccd) = $targetId MERGE (a)-[r:{input.Type}]->(b) ON CREATE SET r += $props RETURN r";
//                 var r = await _repo.RunAsync(query, new { sourceId = input.SourceId, targetId = input.TargetId, props = ConvertDictionary(input.Properties) });
//                 if (r.Count == 0) { await LogAction(action, "Thất bại"); return NotFound(new { success = false, message = "Không tìm thấy công dân" }); }
//                 await LogAction(action, "Thành công");
//                 return Ok(new { success = true, message = "Thành công" });
//             } catch (Exception ex) { await LogAction(action, "Thất bại"); return StatusCode(500, new { success = false, message = ex.Message }); }
//         }

//         // ... (Các hàm CRUD khác giữ nguyên việc gọi LogAction như ở câu trả lời trước) ...
//         [HttpPut("relationship/{relId}")]
//         public async Task<IActionResult> UpdateRelationship(long relId, [FromBody] Dictionary<string, object> properties) {
//             string action = $"Cập nhật quan hệ ID:{relId}"; await LogAction(action, "Đang xử lý");
//             try { var safeProps = ConvertDictionary(properties); await _repo.RunAsync("MATCH ()-[r]->() WHERE id(r) = $relId SET r += $props RETURN r", new { relId, props = safeProps }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
//         }

//         [HttpDelete("relationship/{id}")]
//         public async Task<IActionResult> DeleteRelationshipById(long id) {
//             string action = $"Xóa quan hệ ID:{id}"; await LogAction(action, "Đang xử lý");
//             try { await _repo.RunAsync("MATCH ()-[r]->() WHERE id(r) = $id DELETE r", new { id }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
//         }
        
//         [HttpPost("household")]
//         public async Task<IActionResult> CreateHousehold([FromBody] HouseholdCreateDto input) {
//             string action = $"Tạo hộ khẩu {input.HouseholdId} (Chủ hộ: {input.HeadCccd})"; await LogAction(action, "Đang xử lý");
//             try { await _repo.RunAsync("MERGE (h:Household {householdId: $hid}) ON CREATE SET h.headOfHouseholdCCCD=$head, h.registrationNumber=$regNum, h.hoKhauSo=$addr, h.residencyType=$resType, h.registrationDate=toString(date()) RETURN h", new { hid = input.HouseholdId, head = input.HeadCccd, regNum = input.RegistrationNumber, addr = input.Address, resType = input.ResidencyType }); if (!string.IsNullOrEmpty(input.HeadCccd)) await _repo.RunAsync("MATCH (p:Person {cccd: $head}), (h:Household {householdId: $hid}) MERGE (p)-[r:CURRENT_RESIDENT]->(h) SET r.role='Chủ hộ', r.relationToHead='Bản thân', r.fromDate=toString(date())", new { head = input.HeadCccd, hid = input.HouseholdId }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
//         }

//         [HttpPut("household/{householdId}")]
//         public async Task<IActionResult> UpdateHousehold(string householdId, [FromBody] HouseholdCreateDto input) {
//             string action = $"Cập nhật hộ khẩu {householdId}"; await LogAction(action, "Đang xử lý");
//             try { await _repo.RunAsync("MATCH (h:Household {householdId: $hid}) SET h.registrationNumber=$regNum, h.hoKhauSo=$addr, h.residencyType=$resType, h.headOfHouseholdCCCD=$head", new { hid = householdId, regNum = input.RegistrationNumber, addr = input.Address, resType = input.ResidencyType, head = input.HeadCccd }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
//         }

//         [HttpDelete("household/{householdId}")]
//         public async Task<IActionResult> DeleteHousehold(string householdId) {
//             string action = $"Xóa hộ khẩu {householdId}"; await LogAction(action, "Đang xử lý");
//             try { await _repo.RunAsync("MATCH (h:Household {householdId: $hid}) DETACH DELETE h", new { hid = householdId }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
//         }

//         [HttpPost("household/member")]
//         public async Task<IActionResult> AddMemberToHousehold([FromBody] AddMemberDto input) {
//             string action = $"Thêm {input.PersonCccd} vào hộ {input.HouseholdId}"; await LogAction(action, "Đang xử lý");
//             try { var res = await _repo.RunAsync("MATCH (p:Person {cccd: $cccd}), (h:Household {householdId: $hid}) MERGE (p)-[r:CURRENT_RESIDENT]->(h) SET r.role=$role, r.relationToHead=$rel, r.fromDate=$date RETURN r", new { cccd = input.PersonCccd, hid = input.HouseholdId, role = input.Role, rel = input.RelationToHead, date = input.FromDate }); if (res.Count == 0) { await LogAction(action, "Thất bại"); return NotFound(new { success = false }); } await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
//         }

//         [HttpPut("household/member-rel")]
//         public async Task<IActionResult> UpdateMemberRel([FromQuery] string householdId, [FromQuery] string cccd, [FromBody] Dictionary<string,object> props) {
//             string action = $"Cập nhật quan hệ hộ tịch cho {cccd} trong hộ {householdId}"; await LogAction(action, "Đang xử lý");
//             try { var safeProps = ConvertDictionary(props); await _repo.RunAsync("MATCH (p:Person {cccd: $cccd})-[r:CURRENT_RESIDENT]->(h:Household {householdId: $hid}) SET r += $props RETURN r", new { cccd, hid = householdId, props = safeProps }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
//         }

//         [HttpDelete("household/member")]
//         public async Task<IActionResult> RemoveMemberFromHousehold([FromQuery] string householdId, [FromQuery] string cccd) {
//             string action = $"Xóa {cccd} khỏi hộ {householdId}"; await LogAction(action, "Đang xử lý");
//             try { await _repo.RunAsync("MATCH (p:Person {cccd: $cccd})-[r:CURRENT_RESIDENT]->(h:Household {householdId: $hid}) DELETE r", new { cccd, hid = householdId }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
//         }

//         [HttpPut("citizen/{cccd}")]
//         public async Task<IActionResult> UpdateCitizen(string cccd, [FromBody] PersonDto input) {
//             string action = $"Cập nhật thông tin công dân {cccd}"; await LogAction(action, "Đang xử lý");
//             try { await _repo.RunAsync("MATCH (p:Person {cccd: $cccd}) SET p.hoTen=$name, p.ngaySinh=$dob, p.gioiTinh=$gender, p.queQuan=$hometown, p.ngheNghiep=$job, p.maritalStatus=$status", new { cccd, name = input.HoTen, dob = input.NgaySinh, gender = input.GioiTinh, hometown = input.QueQuan, job = input.NgheNghiep, status = input.MaritalStatus }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
//         }

//         // --- HELPERS (Giữ nguyên) ---
//         private Dictionary<string, object> ConvertDictionary(Dictionary<string, object> input) { var result = new Dictionary<string, object>(); foreach (var kvp in input) { if (kvp.Value is JsonElement jsonElem) { switch (jsonElem.ValueKind) { case JsonValueKind.String: result[kvp.Key] = jsonElem.GetString() ?? ""; break; case JsonValueKind.Number: if(jsonElem.TryGetInt64(out long l)) result[kvp.Key] = l; else if(jsonElem.TryGetDouble(out double d)) result[kvp.Key] = d; break; case JsonValueKind.True: result[kvp.Key] = true; break; case JsonValueKind.False: result[kvp.Key] = false; break; default: result[kvp.Key] = jsonElem.ToString(); break; } } else { result[kvp.Key] = kvp.Value; } } return result; }
//         private object NormalizeValue(object value) { if (value == null) return null; if (value is LocalDate localDate) return localDate.ToString(); if (value is ZonedDateTime zdt) return zdt.ToString(); if (value is LocalDateTime ldt) return ldt.ToString(); if (value is OffsetTime ot) return ot.ToString(); if (value is LocalTime lt) return lt.ToString(); return value; }
//         private Dictionary<string, object> NormalizeDictionary(IReadOnlyDictionary<string, object> input) { var result = new Dictionary<string, object>(); foreach (var kvp in input) result[kvp.Key] = NormalizeValue(kvp.Value); return result; }
//         private IActionResult ProcessGraphResult(IRecord rec) { var nodeList = rec["nodes"].As<List<INode>>(); var nodesDict = new Dictionary<string, PersonDto>(); foreach (var n in nodeList) { if (n==null) continue; bool isHousehold = n.Labels.Contains("Household"); string id = isHousehold ? (GetProp(n.Properties, "householdId") ?? n.Id.ToString()) : (GetProp(n.Properties, "cccd") ?? n.Id.ToString()); if (!nodesDict.ContainsKey(id)) { var dto = MapNodeToDto(n); if(isHousehold) { dto.HoTen = "Hộ khẩu: " + (GetProp(n.Properties, "hoKhauSo") ?? id); dto.GioiTinh = "Household"; } nodesDict[id] = dto; } } var relList = rec["rels"].As<List<IRelationship>>(); var finalLinks = new List<RelationshipDto>(); var neoIdToId = new Dictionary<long, string>(); foreach(var n in nodeList) { if(n==null) continue; bool isHousehold = n.Labels.Contains("Household"); string id = isHousehold ? (GetProp(n.Properties, "householdId") ?? n.Id.ToString()) : (GetProp(n.Properties, "cccd") ?? n.Id.ToString()); neoIdToId[n.Id] = id; } foreach (var r in relList) { if (r == null) continue; if (neoIdToId.ContainsKey(r.StartNodeId) && neoIdToId.ContainsKey(r.EndNodeId)) { finalLinks.Add(new RelationshipDto { Id = r.Id, Source = neoIdToId[r.StartNodeId], Target = neoIdToId[r.EndNodeId], Type = r.Type, Label = TranslateRelType(r.Type), Properties = NormalizeDictionary(r.Properties) }); } } return Ok(new { success = true, data = new { nodes = nodesDict.Values.ToList(), links = finalLinks } }); }
//         private PersonDto MapNodeToDto(INode node) { var props = node.Properties; return new PersonDto { Id = GetProp(props, "cccd") ?? GetProp(props, "householdId") ?? node.Id.ToString(), HoTen = GetProp(props, "hoTen") ?? "Không tên", NgaySinh = NormalizeValue(GetPropObj(props, "ngaySinh"))?.ToString(), GioiTinh = GetProp(props, "gioiTinh"), QueQuan = GetProp(props, "queQuan"), MaritalStatus = GetProp(props, "maritalStatus"), NgheNghiep = GetProp(props, "ngheNghiep"), Details = NormalizeDictionary(props) }; }
//         private object? GetPropObj(IReadOnlyDictionary<string, object> props, string key) { if (props.TryGetValue(key, out object? val)) return val; return null; }
//         private string? GetProp(IReadOnlyDictionary<string, object> props, string key) { if (props.TryGetValue(key, out object? val)) return NormalizeValue(val)?.ToString() ?? ""; return ""; }
//         private string SafeString(object? val) { return NormalizeValue(val)?.ToString() ?? ""; }
//         private string TranslateRelType(string type) { return type switch { "FATHER_OF" => "Cha của", "MOTHER_OF" => "Mẹ của", "MARRIED_TO" => "Vợ/Chồng", "CHILD_OF" => "Con của", "SIBLING" => "Anh/Chị/Em", "REGISTERED_AT" => "ĐKTT tại", "CURRENT_RESIDENT" => "Cư trú", _ => type }; }
//     }
// }


using Microsoft.AspNetCore.Mvc;
using Neo4j.Driver;
using CitizenGraph.Backend.Services;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc;
using Neo4j.Driver;
using CitizenGraph.Backend.Services;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;
using System.Text.Json;

namespace CitizenGraph.Backend.Controllers
{
    // --- GIỮ NGUYÊN TẤT CẢ DTO ---
    public class PersonDto { public string Id { get; set; } = ""; public string HoTen { get; set; } = ""; public string? NgaySinh { get; set; } public string? GioiTinh { get; set; } public string? QueQuan { get; set; } public string? MaritalStatus { get; set; } public string? NgheNghiep { get; set; } public Dictionary<string, object> Details { get; set; } = new(); }
    public class MemberPreviewDto { public string Name { get; set; } = ""; public string Cccd { get; set; } = ""; }
    public class HouseholdMemberDetailDto { public PersonDto Member { get; set; } = new(); public PersonDto? HeadOfHousehold { get; set; } public string RelationToHead { get; set; } = ""; public string HouseholdAddress { get; set; } = ""; }
    public class RelationshipDto { public long Id { get; set; } public string Source { get; set; } = ""; public string Target { get; set; } = ""; public string Type { get; set; } = ""; public string Label { get; set; } = ""; public Dictionary<string, object> Properties { get; set; } = new(); }
    public class RelationshipCreateDto { public string SourceId { get; set; } = ""; public string TargetId { get; set; } = ""; public string Type { get; set; } = ""; public Dictionary<string, object> Properties { get; set; } = new(); }
    public class PersonDropdownDto { public string Value { get; set; } = ""; public string Label { get; set; } = ""; }
    public class HouseholdCreateDto { public string HouseholdId { get; set; } = ""; public string HeadCccd { get; set; } = ""; public string RegistrationNumber { get; set; } = ""; public string ResidencyType { get; set; } = ""; public string RegistrationDate { get; set; } = "";}
    public class AddMemberDto { public string HouseholdId { get; set; } = ""; public string PersonCccd { get; set; } = ""; public string RelationToHead { get; set; } = ""; public string Role { get; set; } = ""; public string FromDate { get; set; } = ""; }
    public class DashboardStatsDto 
    { 
        public long TotalCitizens { get; set; } 
        public long TotalRelationships { get; set; } 
        public long MarriedCount { get; set; } 
        public long SingleCount { get; set; } 
        public double AvgChildrenPerFamily { get; set; } 
        public Dictionary<string, long> GenderDistribution { get; set; } = new(); 
        public Dictionary<string, long> RelationshipBreakdown { get; set; } = new(); 
    }

    [ApiController]
    [Route("api/[controller]")]
    public class FamilyController : ControllerBase
    {
        private readonly Neo4jRepository _repo;
        private readonly AdminActionLogger _logger; // Logger dùng chung toàn hệ thống

        public FamilyController(Neo4jRepository repo, AdminActionLogger logger)
        {
            _repo = repo;
            _logger = logger;
        }

        // =========================================================================================
        // READ OPERATIONS – ĐÃ CHUYỂN SANG DÙNG AdminActionLogger
        // =========================================================================================

        [HttpGet("dropdown-list")]
        public async Task<IActionResult> GetDropdownList()
        {
            // Không log vì gọi quá nhiều lần (select2 dropdown)
            var r = await _repo.RunAsync(@"
                MATCH (p:Person) 
                RETURN p.cccd AS value, 
                       p.hoTen + ' (' + coalesce(toString(p.ngaySinh), '?') + ')' AS label 
                ORDER BY p.hoTen");
            return Ok(new { success = true, data = r.Select(x => new PersonDropdownDto 
            { 
                Value = SafeString(x["value"]), 
                Label = SafeString(x["label"]) 
            })});
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            const string action = "Xem thống kê tổng quan (Stats)";
            await _logger.LogProcessing(action, "Family");

            try
            {
                var nRes = await _repo.RunAsync(@"
                    MATCH (n:Person) 
                    RETURN count(n) AS total,
                           sum(CASE WHEN toLower(coalesce(n.maritalStatus,'')) CONTAINS 'kết hôn' THEN 1 ELSE 0 END) AS married,
                           sum(CASE WHEN n.gioiTinh='Nam' THEN 1 ELSE 0 END) AS male,
                           sum(CASE WHEN n.gioiTinh='Nữ' THEN 1 ELSE 0 END) AS female");

                if (!nRes.Any())
                {
                    await _logger.LogSuccess(action, "Family");
                    return Ok(new DashboardStatsDto());
                }

                var nRec = nRes.First();

                var rRes = await _repo.RunAsync("MATCH ()-[r]->() RETURN count(r) AS totalRel");
                var brRes = await _repo.RunAsync("MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS cnt ORDER BY cnt DESC");
                var aRes = await _repo.RunAsync(@"
                    MATCH (p:Person)-[:FATHER_OF|MOTHER_OF]->(c:Person) 
                    WITH p, count(c) AS children 
                    RETURN avg(children) AS avgChildren");

                await _logger.LogSuccess(action, "Family");

                return Ok(new DashboardStatsDto
                {
                    TotalCitizens = nRec["total"].As<long>(),
                    MarriedCount = nRec["married"].As<long>(),
                    SingleCount = nRec["total"].As<long>() - nRec["married"].As<long>(),
                    TotalRelationships = rRes.Any() ? rRes.First()["totalRel"].As<long>() : 0,
                    AvgChildrenPerFamily = aRes.Any() ? Math.Round(aRes.First()["avgChildren"].As<double>(), 2) : 0,
                    GenderDistribution = new Dictionary<string, long>
                    {
                        ["Nam"] = nRec["male"].As<long>(),
                        ["Nữ"] = nRec["female"].As<long>(),
                        ["Khác"] = nRec["total"].As<long>() - nRec["male"].As<long>() - nRec["female"].As<long>()
                    },
                    RelationshipBreakdown = brRes.ToDictionary(x => x["type"].As<string>(), x => x["cnt"].As<long>())
                });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"Xem thống kê thất bại: {ex.Message}", "Family");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("citizens")]
        public async Task<IActionResult> GetCitizens([FromQuery] int limit = 1000, [FromQuery] string search = "")
        {
            var action = string.IsNullOrEmpty(search) 
                ? "Xem danh sách toàn bộ công dân" 
                : $"Tìm kiếm công dân với từ khóa: '{search}'";

            await _logger.LogProcessing(action, "Family");

            try
            {
                var r = await _repo.RunAsync(@"
                    MATCH (p:Person) 
                    WHERE ($search = '' 
                        OR toLower(p.hoTen) CONTAINS toLower($search) 
                        OR p.cccd CONTAINS $search)
                    RETURN p 
                    ORDER BY p.hoTen 
                    LIMIT $limit", new { limit, search });

                await _logger.LogSuccess(action, "Family");
                return Ok(r.Select(x => MapNodeToDto(x["p"].As<INode>())).ToList());
            }
            catch
            {
                await _logger.LogFailed(action, "Family");
                throw;
            }
        }

        [HttpGet("households")]
        public async Task<IActionResult> GetHouseholds()
        {
            await _logger.LogProcessing("Xem danh sách hộ khẩu", "Family");

            try
            {
                const string query = @"
                    MATCH (h:Household) 
                    OPTIONAL MATCH (h)<-[:CURRENT_RESIDENT]-(p:Person)
                    OPTIONAL MATCH (h)-[:REGISTERED_AT]->(a:Address)
                    WITH h, a, count(p) AS cnt, collect({name: p.hoTen, cccd: toString(p.cccd)})[..6] AS members
                    RETURN 
                      coalesce(a.addressId, h.householdId, 'N/A') AS id,
                      coalesce(toString(a.houseNumber) + ' ' + a.street, h.hoKhauSo, 'Chưa cập nhật') AS address,
                      h.registrationNumber AS regNum,
                      h.residencyType AS resType,
                      cnt,
                      members,
                      h.householdId AS householdCode 
                    ORDER BY cnt DESC 
                    LIMIT 100";

                var records = await _repo.RunAsync(query);

                await _logger.LogSuccess("Xem danh sách hộ khẩu", "Family");

                return Ok(new
                {
                    success = true,
                    data = records.Select(r => new
                    {
                        AddressId = SafeString(r["id"]),
                        HouseholdCode = SafeString(r["householdCode"]),
                        RegistrationNumber = SafeString(r["regNum"]),
                        ResidencyType = SafeString(r["resType"]),
                        Address = SafeString(r["address"]),
                        Count = r["cnt"].As<int>(),
                        Members = r["members"].As<List<IDictionary<string, object>>>()
                                         .Select(m => new MemberPreviewDto
                                         {
                                             Name = m["name"]?.ToString() ?? "",
                                             Cccd = m["cccd"]?.ToString() ?? ""
                                         }).ToList()
                    })
                });
            }
            catch
            {
                await _logger.LogFailed("Xem danh sách hộ khẩu", "Family");
                throw;
            }
        }

        [HttpGet("member-detail")]
        public async Task<IActionResult> GetHouseholdMemberDetail([FromQuery] string cccd)
        {
            var action = $"Xem chi tiết thành viên CCCD: {cccd}";
            await _logger.LogProcessing(action, "Family");

            try
            {
                var query = @"
                    MATCH (p:Person {cccd: $cccd}) 
                    OPTIONAL MATCH (p)-[r:CURRENT_RESIDENT]->(h:Household)
                    OPTIONAL MATCH (h)-[:REGISTERED_AT]->(a:Address)
                    OPTIONAL MATCH (head:Person {cccd: h.headOfHouseholdCCCD})
                    RETURN p, r.relationToHead AS relation, r AS relProps, head, 
                           coalesce(toString(a.houseNumber) + ' ' + a.street, h.hoKhauSo) AS address";

                var records = await _repo.RunAsync(query, new { cccd });

                if (!records.Any())
                {
                    await _logger.LogFailed($"{action} - Không tìm thấy", "Family");
                    return NotFound(new { success = false, message = "Không tìm thấy" });
                }

                var rec = records.First();
                var headNode = rec["head"] is INode node ? node : null;
                var relProps = rec["relProps"] is IRelationship rel ? NormalizeDictionary(rel.Properties) : new Dictionary<string, object>();

                await _logger.LogSuccess(action, "Family");

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        Member = MapNodeToDto(rec["p"].As<INode>()),
                        HeadOfHousehold = headNode != null ? MapNodeToDto(headNode) : null,
                        RelationToHead = SafeString(rec["relation"]),
                        HouseholdAddress = SafeString(rec["address"]),
                        ResidentRelProps = relProps
                    }
                });
            }
            catch
            {
                await _logger.LogFailed(action, "Family");
                throw;
            }
        }

        [HttpGet("genealogy-all")]
        public async Task<IActionResult> GetAllCitizensForGenealogy()
        {
            await _logger.LogProcessing("Xem danh sách phả hệ", "Family");

            try
            {
                var r = await _repo.RunAsync(@"
                    MATCH (p:Person) 
                    OPTIONAL MATCH (p)-[:FATHER_OF|MOTHER_OF|CHILD_OF|SIBLING|MARRIED_TO]->(relative:Person)
                    WITH p, count(relative) AS relativeCount
                    RETURN p.hoTen AS name, toString(p.cccd) AS id, toString(p.ngaySinh) AS dob, relativeCount
                    ORDER BY name ASC LIMIT 1000");

                await _logger.LogSuccess("Xem danh sách phả hệ", "Family");

                return Ok(new
                {
                    success = true,
                    data = r.Select(x => new
                    {
                        Cccd = SafeString(x["id"]),
                        HoTen = SafeString(x["name"]),
                        NgaySinh = SafeString(x["dob"]),
                        SoConTrucTiep = x["relativeCount"].As<int>()
                    })
                });
            }
            catch
            {
                await _logger.LogFailed("Xem danh sách phả hệ", "Family");
                throw;
            }
        }

        [HttpGet("full-tree")]
        public async Task<IActionResult> GetFullTree([FromQuery] string cccd)
        {
            var action = $"Xem cây phả hệ của CCCD: {cccd}";
            await _logger.LogProcessing(action, "Family");

            try
            {
                var manualQuery = @"MATCH (root:Person) WHERE toString(root.cccd) = $cccd 
                    OPTIONAL MATCH path = (root)-[:FATHER_OF|MOTHER_OF|MARRIED_TO|CHILD_OF|SIBLING*0..3]-(p:Person) 
                    WITH root, collect(path) AS paths 
                    WITH root, [p IN paths | nodes(p)] AS nodeLists, [p IN paths | relationships(p)] AS relLists 
                    UNWIND nodeLists AS nl UNWIND nl AS n 
                    WITH root, relLists, collect(DISTINCT n) AS allNodes 
                    UNWIND relLists AS rl UNWIND rl AS r 
                    WITH root, allNodes, collect(r) AS rawRels 
                    UNWIND rawRels AS r 
                    WITH root, allNodes, startNode(r) AS s, endNode(r) AS e, r 
                    WHERE s = root 
                    WITH root, allNodes, s, e, r, apoc.coll.sort([id(s), id(e)]) AS pairKey 
                    WITH root, allNodes, pairKey, collect(r)[0] AS uniqRel 
                    WITH root, collect(DISTINCT uniqRel) AS rels, allNodes 
                    WITH root, rels, [r IN rels | endNode(r)] AS connectedNodes 
                    WITH rels, connectedNodes + [root] AS nodes 
                    RETURN nodes, rels";

                var records = await _repo.RunAsync(manualQuery, new { cccd });

                if (!records.Any())
                {
                    await _logger.LogSuccess($"{action} (Không có dữ liệu)", "Family");
                    return Ok(new { success = false, message = "Không tìm thấy" });
                }

                await _logger.LogSuccess(action, "Family");
                return ProcessGraphResult(records.First());
            }
            catch
            {
                await _logger.LogFailed(action, "Family");
                throw;
            }
        }

        [HttpGet("global-graph")]
        public async Task<IActionResult> GetGlobalGraph()
        {
            await _logger.LogProcessing("Xem toàn cảnh quan hệ (Global Graph)", "Family");

            try
            {
                var records = await _repo.RunAsync(@"
                    MATCH (n:Person) 
                    OPTIONAL MATCH (n)-[r:FATHER_OF|MOTHER_OF|MARRIED_TO|CHILD_OF|SIBLING]-(m:Person) 
                    WHERE elementId(n) <> elementId(m) 
                    WITH CASE WHEN elementId(n) < elementId(m) THEN n ELSE m END AS node1,
                         CASE WHEN elementId(n) < elementId(m) THEN m ELSE n END AS node2,
                         collect(r) AS relsBetween
                    WITH node1, node2, head(relsBetween) AS r 
                    RETURN collect(DISTINCT node1) + collect(DISTINCT node2) AS nodes, 
                           collect(DISTINCT r) AS rels 
                    LIMIT 3000");

                await _logger.LogSuccess("Xem toàn cảnh quan hệ (Global Graph)", "Family");
                return ProcessGraphResult(records.First());
            }
            catch
            {
                await _logger.LogFailed("Xem toàn cảnh quan hệ (Global Graph)", "Family");
                throw;
            }
        }

        // =========================================================================================
        // CRUD OPERATIONS – ĐÃ THÊM VALIDATE VÀ DÙNG LOGGER
        // =========================================================================================

// =========================================================================================
        // LOGIC XỬ LÝ QUAN HỆ HAI CHIỀU & SCHEMA (NEW)
        // =========================================================================================

        private Dictionary<string, object> EnsureSchema(string type, Dictionary<string, object> props)
        {
            // Đảm bảo đầy đủ thuộc tính, nếu thiếu thì điền null/default
            var schema = new Dictionary<string, object>();
            switch (type)
            {
                case "FATHER_OF":
                case "MOTHER_OF":
                    schema["recognizedDate"] = null;
                    break;
                case "CHILD_OF":
                    schema["birthOrder"] = null;
                    schema["isAdopted"] = false;
                    break;
                case "MARRIED_TO":
                    schema["marriageDate"] = null;
                    schema["marriagePlace"] = "";
                    schema["certificateNumber"] = "";
                    schema["isActive"] = true;
                    break;
                case "SIBLING":
                    schema["siblingType"] = "Ruột"; // Mặc định
                    schema["olderYounger"] = "";
                    break;
            }

            foreach (var kvp in schema)
            {
                if (!props.ContainsKey(kvp.Key)) props[kvp.Key] = kvp.Value;
            }
            return props;
        }

        private async Task<(string invType, Dictionary<string, object> invProps)> GetInverseRelInfo(string forwardType, Dictionary<string, object> forwardProps, string targetCccd)
        {
            string invType = "";
            var invProps = new Dictionary<string, object>();

            switch (forwardType)
            {
                case "MARRIED_TO":
                    invType = "MARRIED_TO";
                    invProps = new Dictionary<string, object>(forwardProps); // Copy y hệt
                    break;
                case "SIBLING":
                    invType = "SIBLING";
                    invProps = new Dictionary<string, object>(forwardProps);
                    // olderYounger không copy y hệt được vì logic ngược, tạm để trống hoặc xử lý sau nếu cần
                    invProps["olderYounger"] = ""; 
                    break;
                case "FATHER_OF":
                case "MOTHER_OF":
                    invType = "CHILD_OF";
                    // Thuộc tính của con: birthOrder, isAdopted (không suy ra được từ cha mẹ -> để schema default)
                    break;
                case "CHILD_OF":
                    // Cần biết giới tính của Parent (Target) để xác định FATHER_OF hay MOTHER_OF
                    var res = await _repo.RunAsync("MATCH (p:Person {cccd: $id}) RETURN p.gioiTinh as gender", new { id = targetCccd });
                    var gender = res.FirstOrDefault()?["gender"]?.ToString();
                    invType = (gender == "Nam") ? "FATHER_OF" : "MOTHER_OF";
                    // Thuộc tính cha mẹ: recognizedDate (không suy ra được -> để schema default)
                    break;
            }

            // Apply schema cho quan hệ ngược để đảm bảo không thiếu field
            if (!string.IsNullOrEmpty(invType))
            {
                invProps = EnsureSchema(invType, invProps);
            }

            return (invType, invProps);
        }

        // =========================================================================================
        // CRUD OPERATIONS (CẢI TIẾN)
        // =========================================================================================

        [HttpPost("relationship")]
        public async Task<IActionResult> CreateRelationship([FromBody] RelationshipCreateDto input)
        {
            var desc = $"Tạo quan hệ {input.Type} giữa {input.SourceId} → {input.TargetId}";
            await _logger.LogProcessing(desc, "Family");

            try
            {
                if (input.SourceId == input.TargetId)
                    return BadRequest(new { success = false, message = "Không thể tạo quan hệ với chính mình." });

                // 1. Validate tồn tại & Logic kết hôn (Giữ nguyên)
                var checkQuery = @"MATCH (a:Person {cccd: $s}), (b:Person {cccd: $t}) RETURN count(a) as ca, count(b) as cb";
                var checkRes = await _repo.RunAsync(checkQuery, new { s = input.SourceId, t = input.TargetId });
                if (!checkRes.Any() || checkRes.First()["ca"].As<long>() == 0 || checkRes.First()["cb"].As<long>() == 0)
                    return BadRequest(new { success = false, message = "Công dân không tồn tại" });

                if (input.Type == "MARRIED_TO")
                {
                    var checkMarried = await _repo.RunAsync("MATCH (p:Person)-[:MARRIED_TO]-() WHERE p.cccd IN [$s, $t] RETURN count(*) as c", new { s = input.SourceId, t = input.TargetId });
                    if (checkMarried.First()["c"].As<long>() > 0)
                        return BadRequest(new { success = false, message = "Một trong hai người đã kết hôn." });
                }

                // 2. Chuẩn hóa properties xuôi
                var forwardProps = ConvertDictionary(input.Properties);
                forwardProps = EnsureSchema(input.Type, forwardProps);
                forwardProps["createdDate"] = DateTime.Now.ToString("yyyy-MM-dd");

                // 3. Tạo quan hệ xuôi (A -> B)
                await _repo.RunAsync(@"
                    MATCH (a:Person {cccd: $s}), (b:Person {cccd: $t})
                    MERGE (a)-[r:" + input.Type + @"]->(b)
                    SET r = $props", 
                    new { s = input.SourceId, t = input.TargetId, props = forwardProps });

                // 4. Xử lý quan hệ ngược (B -> A)
                var (invType, invProps) = await GetInverseRelInfo(input.Type, forwardProps, input.TargetId); // TargetId là Parent trong CHILD_OF
                
                // Trường hợp đặc biệt: CHILD_OF (A->B) -> Target B là Parent.
                // Hàm GetInverseRelInfo cần TargetId để check giới tính nếu là CHILD_OF -> FATHER/MOTHER
                
                if (!string.IsNullOrEmpty(invType))
                {
                    invProps["createdDate"] = DateTime.Now.ToString("yyyy-MM-dd");
                    await _repo.RunAsync(@"
                        MATCH (a:Person {cccd: $s}), (b:Person {cccd: $t})
                        MERGE (b)-[r:" + invType + @"]->(a)
                        SET r = $props", // Lưu ý hướng b -> a
                        new { s = input.SourceId, t = input.TargetId, props = invProps });
                }

                await _logger.LogSuccess(desc, "Family");
                return Ok(new { success = true, message = "Đã tạo quan hệ hai chiều thành công" });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{desc} - Lỗi: {ex.Message}", "Family");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("relationship/{relId}")]
        public async Task<IActionResult> UpdateRelationship(long relId, [FromBody] Dictionary<string, object> properties)
        {
            var desc = $"Cập nhật quan hệ ID:{relId}";
            await _logger.LogProcessing(desc, "Family");

            try
            {
                var inputProps = ConvertDictionary(properties);

                // 1. Lấy thông tin quan hệ hiện tại để biết Type và Node
                var currentRelRes = await _repo.RunAsync(@"
                    MATCH (a)-[r]->(b) WHERE id(r) = $id 
                    RETURN type(r) as type, a.cccd as sourceCccd, b.cccd as targetCccd, properties(r) as oldProps", 
                    new { id = relId });
                
                if (!currentRelRes.Any()) return NotFound("Quan hệ không tồn tại");
                
                var rec = currentRelRes.First();
                string type = rec["type"].As<string>();
                string sourceCccd = rec["sourceCccd"].As<string>();
                string targetCccd = rec["targetCccd"].As<string>();
                var oldProps = rec["oldProps"].As<Dictionary<string, object>>();

                // Merge props mới vào cũ để đảm bảo schema
                foreach(var k in inputProps.Keys) oldProps[k] = inputProps[k];
                var finalProps = EnsureSchema(type, oldProps);

                // 2. Cập nhật quan hệ xuôi
                await _repo.RunAsync("MATCH ()-[r]->() WHERE id(r) = $id SET r = $props", new { id = relId, props = finalProps });

                // 3. Cập nhật quan hệ ngược (nếu là đối xứng MARRIED_TO hoặc SIBLING)
                // Các quan hệ cha con (FATHER_OF <-> CHILD_OF) có thuộc tính khác nhau nên update 1 chiều không nhất thiết update chiều kia
                // Tuy nhiên, nếu muốn đồng bộ ngày kết hôn, nơi kết hôn... thì cần làm cho MARRIED_TO.
                
                if (type == "MARRIED_TO" || type == "SIBLING")
                {
                    // Tìm quan hệ ngược (B -> A) cùng loại
                    await _repo.RunAsync(@"
                        MATCH (b:Person {cccd: $t})-[r:" + type + @"]->(a:Person {cccd: $s})
                        SET r = $props", 
                        new { s = sourceCccd, t = targetCccd, props = finalProps });
                }

                await _logger.LogSuccess(desc, "Family");
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed(desc, "Family");
                throw;
            }
        }

        [HttpDelete("relationship/{id}")]
        public async Task<IActionResult> DeleteRelationshipById(long id)
        {
            var desc = $"Xóa quan hệ ID:{id} và quan hệ ngược chiều tương ứng";
            await _logger.LogProcessing(desc, "Family");

            try
            {
                // Logic xóa 2 chiều:
                // 1. Tìm quan hệ gốc (r) theo ID để xác định node A và B.
                // 2. Xóa quan hệ gốc (r).
                // 3. Tìm và xóa quan hệ ngược chiều (invR) giữa B và A nếu có (bất kể loại quan hệ là gì để đảm bảo sạch dữ liệu).
                
                var query = @"
                    MATCH (a)-[r]->(b) 
                    WHERE id(r) = $id
                    WITH a, b, r
                    DELETE r
                    WITH a, b
                    OPTIONAL MATCH (b)-[invR]->(a)
                    // Chỉ xóa quan hệ ngược nếu nó thuộc nhóm quan hệ gia đình (để tránh xóa nhầm các quan hệ khác nếu có)
                    WHERE type(invR) IN ['FATHER_OF', 'MOTHER_OF', 'CHILD_OF', 'MARRIED_TO', 'SIBLING']
                    DELETE invR";

                await _repo.RunAsync(query, new { id });
                
                await _logger.LogSuccess(desc, "Family");
                return Ok(new { success = true, message = "Đã xóa quan hệ hai chiều thành công" });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{desc} - Lỗi: {ex.Message}", "Family");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // [HttpDelete("relationship/{id}")]
        // public async Task<IActionResult> DeleteRelationshipById(long id)
        // {
        //     var desc = $"Xóa quan hệ ID:{id}";
        //     await _logger.LogProcessing(desc, "Family");

        //     try
        //     {
        //         await _repo.RunAsync("MATCH ()-[r]->() WHERE id(r) = $id DELETE r", new { id });
        //         await _logger.LogSuccess(desc, "Family");
        //         return Ok(new { success = true });
        //     }
        //     catch
        //     {
        //         await _logger.LogFailed(desc, "Family");
        //         throw;
        //     }
        // }

        [HttpPost("household")]
        public async Task<IActionResult> CreateHousehold([FromBody] HouseholdCreateDto input)
        {
            var desc = $"Tạo hộ khẩu {input.HouseholdId} (Chủ hộ: {input.HeadCccd})";
            await _logger.LogProcessing(desc, "Family");

            try
            {
                // VALIDATE: ID bắt buộc
                if (string.IsNullOrWhiteSpace(input.HouseholdId))
                    return BadRequest(new { success = false, message = "Mã hộ khẩu không được để trống" });

                // VALIDATE: Nếu có chủ hộ, chủ hộ phải tồn tại
                if (!string.IsNullOrEmpty(input.HeadCccd))
                {
                    var checkHead = await _repo.RunAsync("MATCH (p:Person {cccd: $h}) RETURN count(p) as c", new { h = input.HeadCccd });
                    if (checkHead.First()["c"].As<long>() == 0)
                        return BadRequest(new { success = false, message = $"Chủ hộ {input.HeadCccd} không tồn tại trong hệ thống" });
                }

                // BỎ: h.address / h.hoKhauSo (theo template cũ)
                await _repo.RunAsync(@"
                    MERGE (h:Household {householdId: $hid})
                    ON CREATE SET 
                        h.headOfHouseholdCCCD = $head,
                        h.registrationNumber = $regNum,
                        h.residencyType = $resType,
                        h.registrationDate = date()",
                    new 
                    { 
                        hid = input.HouseholdId, 
                        head = input.HeadCccd, 
                        regNum = input.RegistrationNumber,
                        resType = input.ResidencyType 
                    });

                // Tạo quan hệ chủ hộ (giữ nguyên logic cũ)
                if (!string.IsNullOrEmpty(input.HeadCccd))
                {
                    await _repo.RunAsync(@"
                        MATCH (p:Person {cccd: $head}), (h:Household {householdId: $hid})
                        MERGE (p)-[r:CURRENT_RESIDENT]->(h)
                        ON CREATE SET 
                            r.role = 'Chủ hộ',
                            r.relationToHead = 'Bản thân',
                            r.fromDate = date()", 
                        new { head = input.HeadCccd, hid = input.HouseholdId });
                }

                await _logger.LogSuccess(desc, "Family");
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{desc} - Lỗi: {ex.Message}", "Family");
                throw;
            }
        }

        [HttpPut("household/{householdId}")]
        public async Task<IActionResult> UpdateHousehold(string householdId, [FromBody] HouseholdCreateDto input)
        {
            var desc = $"Cập nhật hộ khẩu {householdId}";
            await _logger.LogProcessing(desc, "Family");

            try
            {
                // VALIDATE: Nếu thay đổi chủ hộ, người mới phải tồn tại
                if (!string.IsNullOrEmpty(input.HeadCccd))
                {
                    var checkHead = await _repo.RunAsync("MATCH (p:Person {cccd: $h}) RETURN count(p) as c", new { h = input.HeadCccd });
                    if (checkHead.First()["c"].As<long>() == 0)
                        return BadRequest(new { success = false, message = $"Chủ hộ mới {input.HeadCccd} không tồn tại" });
                }

                // Xử lý ngày đăng ký (tránh lỗi null)
                object regDateParam = null;
                if (!string.IsNullOrEmpty(input.RegistrationDate)) regDateParam = input.RegistrationDate;

                var updateQuery = @"
                    MATCH (h:Household {householdId: $hid})
                    SET h.registrationNumber = $regNum,
                        h.residencyType = $resType,
                        h.headOfHouseholdCCCD = $head";
                
                if (regDateParam != null) updateQuery += ", h.registrationDate = date($regDate)";

                await _repo.RunAsync(updateQuery, 
                    new
                    {
                        hid = householdId,
                        regNum = input.RegistrationNumber,
                        resType = input.ResidencyType,
                        head = input.HeadCccd,
                        regDate = regDateParam
                    });

                await _logger.LogSuccess(desc, "Family");
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{desc} - Lỗi: {ex.Message}", "Family");
                throw;
            }
        }

        [HttpDelete("household/{householdId}")]
        public async Task<IActionResult> DeleteHousehold(string householdId)
        {
            var desc = $"Xóa hộ khẩu {householdId}";
            await _logger.LogProcessing(desc, "Family");

            try
            {
                await _repo.RunAsync("MATCH (h:Household {householdId: $hid}) DETACH DELETE h", new { hid = householdId });
                await _logger.LogSuccess(desc, "Family");
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{desc} - Lỗi: {ex.Message}", "Family");
                throw;
            }
        }

        [HttpPost("household/member")]
        public async Task<IActionResult> AddMemberToHousehold([FromBody] AddMemberDto input)
        {
            var desc = $"Thêm thành viên {input.PersonCccd} vào hộ {input.HouseholdId}";
            await _logger.LogProcessing(desc, "Family");

            try
            {
                // VALIDATE: Kiểm tra tồn tại trước khi thêm
                var checkQuery = @"
                    MATCH (p:Person {cccd: $p})
                    MATCH (h:Household {householdId: $h})
                    RETURN count(p) as cp, count(h) as ch";
                
                var checkRes = await _repo.RunAsync(checkQuery, new { p = input.PersonCccd, h = input.HouseholdId });
                if (!checkRes.Any()) return NotFound("Lỗi truy vấn");

                var cr = checkRes.First();
                if (cr["cp"].As<long>() == 0) return BadRequest(new { success = false, message = "Công dân không tồn tại" });
                if (cr["ch"].As<long>() == 0) return BadRequest(new { success = false, message = "Hộ khẩu không tồn tại" });

                var result = await _repo.RunAsync(@"
                    MATCH (p:Person {cccd: $cccd}), (h:Household {householdId: $hid})
                    MERGE (p)-[r:CURRENT_RESIDENT]->(h)
                    ON CREATE SET 
                        r.role = $role,
                        r.relationToHead = $rel,
                        r.fromDate = $date
                    RETURN r",
                    new
                    {
                        cccd = input.PersonCccd,
                        hid = input.HouseholdId,
                        role = input.Role,
                        rel = input.RelationToHead,
                        date = input.FromDate
                    });

                await _logger.LogSuccess(desc, "Family");
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{desc} - Lỗi: {ex.Message}", "Family");
                throw;
            }
        }

        [HttpPut("household/member-rel")]
        public async Task<IActionResult> UpdateMemberRel([FromQuery] string householdId, [FromQuery] string cccd, [FromBody] Dictionary<string, object> props)
        {
            var desc = $"Cập nhật quan hệ hộ tịch cho {cccd} trong hộ {householdId}";
            await _logger.LogProcessing(desc, "Family");

            try
            {
                var safeProps = ConvertDictionary(props);
                await _repo.RunAsync(@"
                    MATCH (p:Person {cccd: $cccd})-[r:CURRENT_RESIDENT]->(:Household {householdId: $hid})
                    SET r += $props",
                    new { cccd, hid = householdId, props = safeProps });

                await _logger.LogSuccess(desc, "Family");
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{desc} - Lỗi: {ex.Message}", "Family");
                throw;
            }
        }

        [HttpDelete("household/member")]
        public async Task<IActionResult> RemoveMemberFromHousehold([FromQuery] string householdId, [FromQuery] string cccd)
        {
            var desc = $"Xóa thành viên {cccd} khỏi hộ {householdId}";
            await _logger.LogProcessing(desc, "Family");

            try
            {
                await _repo.RunAsync(@"
                    MATCH (p:Person {cccd: $cccd})-[r:CURRENT_RESIDENT]->(:Household {householdId: $hid})
                    DELETE r",
                    new { cccd, hid = householdId });

                await _logger.LogSuccess(desc, "Family");
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{desc} - Lỗi: {ex.Message}", "Family");
                throw;
            }
        }

        [HttpPut("citizen/{cccd}")]
        public async Task<IActionResult> UpdateCitizen(string cccd, [FromBody] PersonDto input)
        {
            var desc = $"Cập nhật thông tin công dân {cccd}";
            await _logger.LogProcessing(desc, "Family");

            try
            {
                // VALIDATE: Tên không được để trống
                if (string.IsNullOrWhiteSpace(input.HoTen))
                    return BadRequest(new { success = false, message = "Họ tên không được để trống" });

                await _repo.RunAsync(@"
                    MATCH (p:Person {cccd: $cccd})
                    SET p.hoTen = $name,
                        p.ngaySinh = $dob,
                        p.gioiTinh = $gender,
                        p.queQuan = $hometown,
                        p.ngheNghiep = $job,
                        p.maritalStatus = $status",
                    new
                    {
                        cccd,
                        name = input.HoTen,
                        dob = input.NgaySinh,
                        gender = input.GioiTinh,
                        hometown = input.QueQuan,
                        job = input.NgheNghiep,
                        status = input.MaritalStatus
                    });

                await _logger.LogSuccess(desc, "Family");
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                await _logger.LogFailed($"{desc} - Lỗi: {ex.Message}", "Family");
                throw;
            }
        }
        // --- HELPERS (Giữ nguyên) ---
        private Dictionary<string, object> ConvertDictionary(Dictionary<string, object> input) { var result = new Dictionary<string, object>(); foreach (var kvp in input) { if (kvp.Value is JsonElement jsonElem) { switch (jsonElem.ValueKind) { case JsonValueKind.String: result[kvp.Key] = jsonElem.GetString() ?? ""; break; case JsonValueKind.Number: if (jsonElem.TryGetInt64(out long l)) result[kvp.Key] = l; else if (jsonElem.TryGetDouble(out double d)) result[kvp.Key] = d; break; case JsonValueKind.True: result[kvp.Key] = true; break; case JsonValueKind.False: result[kvp.Key] = false; break; case JsonValueKind.Null: result[kvp.Key] = null; break; default: result[kvp.Key] = jsonElem.ToString(); break; } } else { result[kvp.Key] = kvp.Value; } } return result; }        private object NormalizeValue(object value) { if (value == null) return null; if (value is LocalDate localDate) return localDate.ToString(); if (value is ZonedDateTime zdt) return zdt.ToString(); if (value is LocalDateTime ldt) return ldt.ToString(); if (value is OffsetTime ot) return ot.ToString(); if (value is LocalTime lt) return lt.ToString(); return value; }
        private Dictionary<string, object> NormalizeDictionary(IReadOnlyDictionary<string, object> input) { var result = new Dictionary<string, object>(); foreach (var kvp in input) result[kvp.Key] = NormalizeValue(kvp.Value); return result; }
        private IActionResult ProcessGraphResult(IRecord rec) { var nodeList = rec["nodes"].As<List<INode>>(); var nodesDict = new Dictionary<string, PersonDto>(); foreach (var n in nodeList) { if (n==null) continue; bool isHousehold = n.Labels.Contains("Household"); string id = isHousehold ? (GetProp(n.Properties, "householdId") ?? n.Id.ToString()) : (GetProp(n.Properties, "cccd") ?? n.Id.ToString()); if (!nodesDict.ContainsKey(id)) { var dto = MapNodeToDto(n); if(isHousehold) { dto.HoTen = "Hộ khẩu: " + (GetProp(n.Properties, "hoKhauSo") ?? id); dto.GioiTinh = "Household"; } nodesDict[id] = dto; } } var relList = rec["rels"].As<List<IRelationship>>(); var finalLinks = new List<RelationshipDto>(); var neoIdToId = new Dictionary<long, string>(); foreach(var n in nodeList) { if(n==null) continue; bool isHousehold = n.Labels.Contains("Household"); string id = isHousehold ? (GetProp(n.Properties, "householdId") ?? n.Id.ToString()) : (GetProp(n.Properties, "cccd") ?? n.Id.ToString()); neoIdToId[n.Id] = id; } foreach (var r in relList) { if (r == null) continue; if (neoIdToId.ContainsKey(r.StartNodeId) && neoIdToId.ContainsKey(r.EndNodeId)) { finalLinks.Add(new RelationshipDto { Id = r.Id, Source = neoIdToId[r.StartNodeId], Target = neoIdToId[r.EndNodeId], Type = r.Type, Label = TranslateRelType(r.Type), Properties = NormalizeDictionary(r.Properties) }); } } return Ok(new { success = true, data = new { nodes = nodesDict.Values.ToList(), links = finalLinks } }); }
        private PersonDto MapNodeToDto(INode node) { var props = node.Properties; return new PersonDto { Id = GetProp(props, "cccd") ?? GetProp(props, "householdId") ?? node.Id.ToString(), HoTen = GetProp(props, "hoTen") ?? "Không tên", NgaySinh = NormalizeValue(GetPropObj(props, "ngaySinh"))?.ToString(), GioiTinh = GetProp(props, "gioiTinh"), QueQuan = GetProp(props, "queQuan"), MaritalStatus = GetProp(props, "maritalStatus"), NgheNghiep = GetProp(props, "ngheNghiep"), Details = NormalizeDictionary(props) }; }
        private object? GetPropObj(IReadOnlyDictionary<string, object> props, string key) { if (props.TryGetValue(key, out object? val)) return val; return null; }
        private string? GetProp(IReadOnlyDictionary<string, object> props, string key) { if (props.TryGetValue(key, out object? val)) return NormalizeValue(val)?.ToString() ?? ""; return ""; }
        private string SafeString(object? val) { return NormalizeValue(val)?.ToString() ?? ""; }
        private string TranslateRelType(string type) { return type switch { "FATHER_OF" => "Cha của", "MOTHER_OF" => "Mẹ của", "MARRIED_TO" => "Vợ/Chồng", "CHILD_OF" => "Con của", "SIBLING" => "Anh/Chị/Em", "REGISTERED_AT" => "ĐKTT tại", "CURRENT_RESIDENT" => "Cư trú", _ => type }; }
    }
}




// using Microsoft.AspNetCore.Mvc;
// using Neo4j.Driver;
// using CitizenGraph.Backend.Services;
// using System.Collections.Generic;
// using System.Linq;
// using System.Threading.Tasks;
// using System;
// using System.Text.Json;

// namespace CitizenGraph.Backend.Controllers
// {
//     // DTOs
//     public class PersonDto { public string Id { get; set; } = ""; public string HoTen { get; set; } = ""; public string? NgaySinh { get; set; } public string? GioiTinh { get; set; } public string? QueQuan { get; set; } public string? MaritalStatus { get; set; } public string? NgheNghiep { get; set; } public Dictionary<string, object> Details { get; set; } = new(); }
//     public class MemberPreviewDto { public string Name { get; set; } public string Cccd { get; set; } }
//     public class HouseholdMemberDetailDto { public PersonDto Member { get; set; } public PersonDto HeadOfHousehold { get; set; } public string RelationToHead { get; set; } public string HouseholdAddress { get; set; } }
//     public class RelationshipDto { public long Id { get; set; } public string Source { get; set; } public string Target { get; set; } public string Type { get; set; } public string Label { get; set; } = ""; public Dictionary<string, object> Properties { get; set; } = new(); }
//     public class RelationshipCreateDto { public string SourceId { get; set; } public string TargetId { get; set; } public string Type { get; set; } public Dictionary<string, object> Properties { get; set; } = new(); }
//     public class PersonDropdownDto { public string Value { get; set; } public string Label { get; set; } }
//     public class HouseholdCreateDto { public string HouseholdId { get; set; } public string HeadCccd { get; set; } public string RegistrationNumber { get; set; } public string Address { get; set; } public string ResidencyType { get; set; } }
//     public class AddMemberDto { public string HouseholdId { get; set; } public string PersonCccd { get; set; } public string RelationToHead { get; set; } public string Role { get; set; } public string FromDate { get; set; } }
//     public class DashboardStatsDto { public long TotalCitizens { get; set; } public long TotalRelationships { get; set; } public long MarriedCount { get; set; } public long SingleCount { get; set; } public double AvgChildrenPerFamily { get; set; } public Dictionary<string, long> GenderDistribution { get; set; } = new(); public Dictionary<string, long> RelationshipBreakdown { get; set; } = new(); }

//     [ApiController]
//     [Route("api/[controller]")]
//     public class FamilyController : ControllerBase
//     {
//         private readonly Neo4jRepository _repo;
//         public FamilyController(Neo4jRepository repo) { _repo = repo; }

//         // --- READ ---
//         [HttpGet("dropdown-list")]
//         public async Task<IActionResult> GetDropdownList() {
//             var r = await _repo.RunAsync(@"MATCH (p:Person) RETURN p.cccd as value, p.hoTen + ' (' + coalesce(toString(p.ngaySinh), '?') + ')' as label ORDER BY p.hoTen");
//             return Ok(new { success = true, data = r.Select(x => new PersonDropdownDto { Value = SafeString(x["value"]), Label = SafeString(x["label"]) }) });
//         }

//         [HttpGet("stats")]
//         public async Task<IActionResult> GetStats() {
//             try {
//                 var nRes = await _repo.RunAsync("MATCH (n:Person) RETURN count(n) as total, sum(CASE WHEN toString(n.maritalStatus) CONTAINS 'kết hôn' THEN 1 ELSE 0 END) as married, sum(CASE WHEN n.gioiTinh='Nam' THEN 1 ELSE 0 END) as male, sum(CASE WHEN n.gioiTinh='Nữ' THEN 1 ELSE 0 END) as female");
//                 if(nRes.Count==0) return Ok(new DashboardStatsDto());
//                 var nRec = nRes[0];
//                 var rRes = await _repo.RunAsync("MATCH ()-[r]->() RETURN count(r) as totalRel");
//                 var brRes = await _repo.RunAsync("MATCH ()-[r]->() RETURN type(r) as type, count(r) as cnt ORDER BY cnt DESC");
//                 var aRes = await _repo.RunAsync("MATCH (p:Person)-[:FATHER_OF|MOTHER_OF]->(c:Person) WITH p, count(c) as children RETURN avg(children) as avgChildren");
//                 return Ok(new DashboardStatsDto {
//                     TotalCitizens = nRec["total"].As<long>(), MarriedCount = nRec["married"].As<long>(), SingleCount = nRec["total"].As<long>() - nRec["married"].As<long>(), TotalRelationships = rRes.Count>0?rRes[0]["totalRel"].As<long>():0, AvgChildrenPerFamily = aRes.Count>0?Math.Round(aRes[0]["avgChildren"].As<double>(), 2):0,
//                     GenderDistribution = new Dictionary<string, long> { { "Nam", nRec["male"].As<long>() }, { "Nữ", nRec["female"].As<long>() }, { "Khác", nRec["total"].As<long>() - (nRec["male"].As<long>() + nRec["female"].As<long>()) } },
//                     RelationshipBreakdown = brRes.ToDictionary(x => x["type"].As<string>(), x => x["cnt"].As<long>())
//                 });
//             } catch(Exception ex) { return StatusCode(500, new { success=false, message=ex.Message }); }
//         }

//         [HttpGet("citizens")]
//         public async Task<IActionResult> GetCitizens([FromQuery] int limit = 1000, [FromQuery] string search = "") {
//             var r = await _repo.RunAsync("MATCH (p:Person) WHERE ($search = '' OR toLower(toString(p.hoTen)) CONTAINS toLower($search) OR toString(p.cccd) CONTAINS $search) RETURN p ORDER BY p.hoTen LIMIT $limit", new { limit, search });
//             return Ok(r.Select(x => MapNodeToDto(x["p"].As<INode>())).ToList());
//         }

//         [HttpGet("households")]
//         public async Task<IActionResult> GetHouseholds() {
//             // FIX: Dùng toString() cho houseNumber để tránh lỗi ghép chuỗi nếu nó là số
//             var query = @"
//                 MATCH (h:Household) 
//                 OPTIONAL MATCH (h)<-[:CURRENT_RESIDENT]-(p:Person) 
//                 OPTIONAL MATCH (h)-[:REGISTERED_AT]->(a:Address) 
//                 WITH h, a, count(p) as cnt, collect({name: p.hoTen, cccd: toString(p.cccd)})[0..6] as members 
//                 RETURN coalesce(a.addressId, h.householdId, 'N/A') as id, 
//                        coalesce(toString(a.houseNumber) + ' ' + a.street, h.hoKhauSo, 'Chưa cập nhật') as address, 
//                        h.registrationNumber as regNum, 
//                        h.residencyType as resType, 
//                        cnt, members, 
//                        h.householdId as householdCode 
//                 ORDER BY cnt DESC LIMIT 100";
            
//             var records = await _repo.RunAsync(query);
//             return Ok(new { success = true, data = records.Select(r => new { AddressId = SafeString(r["id"]), HouseholdCode = SafeString(r["householdCode"]), RegistrationNumber = SafeString(r["regNum"]), ResidencyType = SafeString(r["resType"]), Address = SafeString(r["address"]), Count = r["cnt"].As<int>(), Members = r["members"].As<List<IDictionary<string, object>>>().Select(m => new MemberPreviewDto { Name = m["name"]?.ToString()??"", Cccd = m["cccd"]?.ToString()??"" }).ToList() }) });
//         }

//         [HttpGet("member-detail")]
//         public async Task<IActionResult> GetHouseholdMemberDetail([FromQuery] string cccd) {
//             // FIX: toString() cho address
//             var query = @"
//                 MATCH (p:Person {cccd: $cccd}) 
//                 OPTIONAL MATCH (p)-[r:CURRENT_RESIDENT]->(h:Household) 
//                 OPTIONAL MATCH (h)-[:REGISTERED_AT]->(a:Address) 
//                 OPTIONAL MATCH (head:Person {cccd: h.headOfHouseholdCCCD}) 
//                 RETURN p, r.relationToHead as relation, head, 
//                        coalesce(toString(a.houseNumber) + ' ' + a.street, h.hoKhauSo) as address";
            
//             var records = await _repo.RunAsync(query, new { cccd });
//             if (!records.Any()) return NotFound(new { success = false, message = "Không tìm thấy" });
//             var rec = records[0];
//             INode? head = (rec["head"] != null && rec["head"] is INode) ? rec["head"].As<INode>() : null;
//             return Ok(new { success = true, data = new HouseholdMemberDetailDto { Member = MapNodeToDto(rec["p"].As<INode>()), HeadOfHousehold = head != null ? MapNodeToDto(head) : null, RelationToHead = SafeString(rec["relation"]), HouseholdAddress = SafeString(rec["address"]) } });
//         }

//         [HttpGet("genealogy-all")]
//         public async Task<IActionResult> GetAllCitizensForGenealogy() {
//             var r = await _repo.RunAsync("MATCH (p:Person) OPTIONAL MATCH (p)-[:FATHER_OF|MOTHER_OF]->(child:Person) WITH p, count(child) as childrenCount RETURN p.hoTen as name, toString(p.cccd) as id, toString(p.ngaySinh) as dob, childrenCount ORDER BY name ASC LIMIT 1000");
//             return Ok(new { success = true, data = r.Select(x => new { Cccd = SafeString(x["id"]), HoTen = SafeString(x["name"]), NgaySinh = SafeString(x["dob"]), SoConTrucTiep = x["childrenCount"].As<int>() }) });
//         }

//         [HttpGet("full-tree")]
//         public async Task<IActionResult> GetFullTree([FromQuery] string cccd) {
//             // SỬA: Dùng 2 bước. Bước 1 lấy tất cả người liên quan (vô hướng) để gom nhóm. 
//             // Bước 2 dùng quan hệ CÓ HƯỚNG -> để lấy đúng source/target
//             var manualQuery = @"
//                 MATCH (root:Person)
//                 WHERE toString(root.cccd) = $cccd

//                 // Lấy tất cả path trong bán kính 3
//                 OPTIONAL MATCH path = (
//                     root)-[:FATHER_OF|MOTHER_OF|MARRIED_TO|CHILD_OF|SIBLING*0..3]-(p:Person)

//                 WITH root, collect(path) AS paths
//                 WITH root,
//                     [p IN paths | nodes(p)] AS nodeLists,
//                     [p IN paths | relationships(p)] AS relLists

//                 // Tập node duy nhất
//                 UNWIND nodeLists AS nl
//                 UNWIND nl AS n
//                 WITH root, relLists, collect(DISTINCT n) AS allNodes

//                 // Quan hệ thô
//                 UNWIND relLists AS rl
//                 UNWIND rl AS r

//                 WITH root, allNodes, collect(r) AS rawRels
//                 UNWIND rawRels AS r

//                 WITH root, allNodes,
//                     startNode(r) AS s,
//                     endNode(r) AS e,
//                     r

//                 // chỉ giữ quan hệ có start = root
//                 WHERE s = root

//                 // tạo key duy nhất
//                 WITH root, allNodes, s, e, r,
//                     apoc.coll.sort([id(s), id(e)]) AS pairKey

//                 WITH root, allNodes, pairKey, collect(r)[0] AS uniqRel

//                 // gom lại danh sách quan hệ duy nhất
//                 WITH root, collect(DISTINCT uniqRel) AS rels, allNodes

//                 // tách bước: tạo list các node có quan hệ trực tiếp
//                 WITH root, rels, [r IN rels | endNode(r)] AS connectedNodes

//                 // tách ra bước riêng để tránh lỗi implicit grouping
//                 WITH root, connectedNodes, rels
//                 WITH rels, connectedNodes + [root] AS nodes

//                 RETURN nodes, rels";

            
//             var records = await _repo.RunAsync(manualQuery, new { cccd });
//             if (!records.Any()) return Ok(new { success = false, message = "Not found" });
//             return ProcessGraphResult(records[0]);
//         }

//         [HttpGet("global-graph")]
//         public async Task<IActionResult> GetGlobalGraph() {
//             // SỬA: Dùng có hướng -> để đảm bảo vẽ đúng
//             var records = await _repo.RunAsync(@"
//                 MATCH (n:Person)
//                 OPTIONAL MATCH (n)-[r:FATHER_OF|MOTHER_OF|MARRIED_TO|CHILD_OF|SIBLING]-(m:Person)
//                 WHERE elementId(n) <> elementId(m)  // loại bỏ quan hệ tự loop
//                 WITH 
//                     CASE WHEN elementId(n) < elementId(m) THEN n ELSE m END AS node1,
//                     CASE WHEN elementId(n) < elementId(m) THEN m ELSE n END AS node2,
//                     collect(r) AS relsBetween
//                 WITH node1, node2, head(relsBetween) AS r  // chỉ giữ 1 rel giữa cặp node
//                 RETURN collect(distinct node1) + collect(distinct node2) AS nodes, 
//                     collect(distinct r) AS rels
//                 LIMIT 3000"
//             );
//             return ProcessGraphResult(records[0]);
//         }

//         // --- CRUD --- (Giữ nguyên như trước)
//         [HttpPost("relationship")]
//         public async Task<IActionResult> CreateRelationship([FromBody] RelationshipCreateDto input) {
//             try {
//                 var query = $@"MATCH (a:Person), (b:Person) WHERE toString(a.cccd) = $sourceId AND toString(b.cccd) = $targetId MERGE (a)-[r:{input.Type}]->(b) ON CREATE SET r += $props RETURN r";
//                 var r = await _repo.RunAsync(query, new { sourceId = input.SourceId, targetId = input.TargetId, props = ConvertDictionary(input.Properties) });
//                 if (r.Count == 0) return NotFound(new { success = false, message = "Không tìm thấy công dân" });
//                 return Ok(new { success = true, message = "Thành công" });
//             } catch (Exception ex) { return StatusCode(500, new { success = false, message = ex.Message }); }
//         }
//         [HttpPut("relationship/{relId}")]
//         public async Task<IActionResult> UpdateRelationship(long relId, [FromBody] Dictionary<string, object> properties) {
//             var safeProps = ConvertDictionary(properties);
//             await _repo.RunAsync("MATCH ()-[r]->() WHERE id(r) = $relId SET r += $props RETURN r", new { relId, props = safeProps });
//             return Ok(new { success = true, message = "Cập nhật thành công" });
//         }
//         [HttpDelete("relationship/{id}")]
//         public async Task<IActionResult> DeleteRelationshipById(long id) {
//             await _repo.RunAsync("MATCH ()-[r]->() WHERE id(r) = $id DELETE r", new { id });
//             return Ok(new { success = true, message = "Đã xóa" });
//         }
//         [HttpDelete("relationship")]
//         public async Task<IActionResult> DeleteRelationship([FromQuery] string sourceId, [FromQuery] string targetId, [FromQuery] string type) {
//             await _repo.RunAsync($"MATCH (a:Person {{cccd: $sourceId}})-[r:{type}]->(b:Person {{cccd: $targetId}}) DELETE r", new { sourceId, targetId });
//             return Ok(new { success = true, message = "Đã xóa" });
//         }
//         [HttpPost("household")]
//         public async Task<IActionResult> CreateHousehold([FromBody] HouseholdCreateDto input) {
//             await _repo.RunAsync("MERGE (h:Household {householdId: $hid}) ON CREATE SET h.headOfHouseholdCCCD=$head, h.registrationNumber=$regNum, h.hoKhauSo=$addr, h.residencyType=$resType, h.registrationDate=toString(date()) RETURN h", new { hid = input.HouseholdId, head = input.HeadCccd, regNum = input.RegistrationNumber, addr = input.Address, resType = input.ResidencyType });
//             if (!string.IsNullOrEmpty(input.HeadCccd)) await _repo.RunAsync("MATCH (p:Person {cccd: $head}), (h:Household {householdId: $hid}) MERGE (p)-[r:CURRENT_RESIDENT]->(h) SET r.role='Chủ hộ', r.relationToHead='Bản thân', r.fromDate=toString(date())", new { head = input.HeadCccd, hid = input.HouseholdId });
//             return Ok(new { success = true, message = "Tạo thành công" });
//         }
//         [HttpPut("household/{householdId}")]
//         public async Task<IActionResult> UpdateHousehold(string householdId, [FromBody] HouseholdCreateDto input) {
//             await _repo.RunAsync("MATCH (h:Household {householdId: $hid}) SET h.registrationNumber=$regNum, h.hoKhauSo=$addr, h.residencyType=$resType, h.headOfHouseholdCCCD=$head", new { hid = householdId, regNum = input.RegistrationNumber, addr = input.Address, resType = input.ResidencyType, head = input.HeadCccd });
//             return Ok(new { success = true, message = "Cập nhật thành công" });
//         }
//         [HttpDelete("household/{householdId}")]
//         public async Task<IActionResult> DeleteHousehold(string householdId) {
//             await _repo.RunAsync("MATCH (h:Household {householdId: $hid}) DETACH DELETE h", new { hid = householdId });
//             return Ok(new { success = true, message = "Đã xóa" });
//         }
//         [HttpPost("household/member")]
//         public async Task<IActionResult> AddMemberToHousehold([FromBody] AddMemberDto input) {
//             var res = await _repo.RunAsync("MATCH (p:Person {cccd: $cccd}), (h:Household {householdId: $hid}) MERGE (p)-[r:CURRENT_RESIDENT]->(h) SET r.role=$role, r.relationToHead=$rel, r.fromDate=$date RETURN r", new { cccd = input.PersonCccd, hid = input.HouseholdId, role = input.Role, rel = input.RelationToHead, date = input.FromDate });
//             if (res.Count == 0) return NotFound(new { success = false, message = "Lỗi" });
//             return Ok(new { success = true, message = "Thành công" });
//         }
//         [HttpDelete("household/member")]
//         public async Task<IActionResult> RemoveMemberFromHousehold([FromQuery] string householdId, [FromQuery] string cccd) {
//             await _repo.RunAsync("MATCH (p:Person {cccd: $cccd})-[r:CURRENT_RESIDENT]->(h:Household {householdId: $hid}) DELETE r", new { cccd, hid = householdId });
//             return Ok(new { success = true, message = "Đã xóa" });
//         }
//         [HttpPut("citizen/{cccd}")]
//         public async Task<IActionResult> UpdateCitizen(string cccd, [FromBody] PersonDto input) {
//             await _repo.RunAsync("MATCH (p:Person {cccd: $cccd}) SET p.hoTen=$name, p.ngaySinh=$dob, p.gioiTinh=$gender, p.queQuan=$hometown, p.ngheNghiep=$job, p.maritalStatus=$status", new { cccd, name = input.HoTen, dob = input.NgaySinh, gender = input.GioiTinh, hometown = input.QueQuan, job = input.NgheNghiep, status = input.MaritalStatus });
//             return Ok(new { success = true, message = "Cập nhật thành công" });
//         }

//         // --- HELPERS ---
//         private Dictionary<string, object> ConvertDictionary(Dictionary<string, object> input) {
//             var result = new Dictionary<string, object>();
//             foreach (var kvp in input) {
//                 if (kvp.Value is JsonElement jsonElem) {
//                     switch (jsonElem.ValueKind) {
//                         case JsonValueKind.String: result[kvp.Key] = jsonElem.GetString() ?? ""; break;
//                         case JsonValueKind.Number: if(jsonElem.TryGetInt64(out long l)) result[kvp.Key] = l; else if(jsonElem.TryGetDouble(out double d)) result[kvp.Key] = d; break;
//                         case JsonValueKind.True: result[kvp.Key] = true; break;
//                         case JsonValueKind.False: result[kvp.Key] = false; break;
//                         default: result[kvp.Key] = jsonElem.ToString(); break;
//                     }
//                 } else { result[kvp.Key] = kvp.Value; }
//             }
//             return result;
//         }
//         private object NormalizeValue(object value) {
//             if (value == null) return null;
//             if (value is LocalDate localDate) return localDate.ToString();
//             if (value is ZonedDateTime zdt) return zdt.ToString();
//             if (value is LocalDateTime ldt) return ldt.ToString();
//             if (value is OffsetTime ot) return ot.ToString();
//             if (value is LocalTime lt) return lt.ToString();
//             return value;
//         }
//         private Dictionary<string, object> NormalizeDictionary(IReadOnlyDictionary<string, object> input) {
//             var result = new Dictionary<string, object>();
//             foreach (var kvp in input) result[kvp.Key] = NormalizeValue(kvp.Value);
//             return result;
//         }
//         private IActionResult ProcessGraphResult(IRecord rec) {
//             var nodeList = rec["nodes"].As<List<INode>>(); var nodesDict = new Dictionary<string, PersonDto>();
//             foreach (var n in nodeList) { 
//                 if (n==null) continue; 
                
//                 // FIX: Xử lý cho cả Node Person và Household
//                 bool isHousehold = n.Labels.Contains("Household");
//                 string id = isHousehold 
//                     ? (GetProp(n.Properties, "householdId") ?? n.Id.ToString())
//                     : (GetProp(n.Properties, "cccd") ?? n.Id.ToString());
                
//                 if (!nodesDict.ContainsKey(id)) {
//                     var dto = MapNodeToDto(n);
//                     // Đánh dấu loại node để frontend vẽ khác đi
//                     if(isHousehold) {
//                         dto.HoTen = "Hộ khẩu: " + (GetProp(n.Properties, "hoKhauSo") ?? id);
//                         dto.GioiTinh = "Household"; // Cờ hiệu để tô màu
//                     }
//                     nodesDict[id] = dto;
//                 }
//             }
//             var relList = rec["rels"].As<List<IRelationship>>(); var finalLinks = new List<RelationshipDto>(); var neoIdToId = new Dictionary<long, string>();
//             foreach(var n in nodeList) { 
//                 if(n==null) continue; 
//                 bool isHousehold = n.Labels.Contains("Household");
//                 string id = isHousehold ? (GetProp(n.Properties, "householdId") ?? n.Id.ToString()) : (GetProp(n.Properties, "cccd") ?? n.Id.ToString());
//                 neoIdToId[n.Id] = id; 
//             }
//             foreach (var r in relList) {
//                 if (r == null) continue;
//                 if (neoIdToId.ContainsKey(r.StartNodeId) && neoIdToId.ContainsKey(r.EndNodeId)) {
//                     finalLinks.Add(new RelationshipDto { Id = r.Id, Source = neoIdToId[r.StartNodeId], Target = neoIdToId[r.EndNodeId], Type = r.Type, Label = TranslateRelType(r.Type), Properties = NormalizeDictionary(r.Properties) });
//                 }
//             }
//             return Ok(new { success = true, data = new { nodes = nodesDict.Values.ToList(), links = finalLinks } });
//         }
//         private PersonDto MapNodeToDto(INode node) { var props = node.Properties; return new PersonDto { Id = GetProp(props, "cccd") ?? GetProp(props, "householdId") ?? node.Id.ToString(), HoTen = GetProp(props, "hoTen") ?? "Không tên", NgaySinh = NormalizeValue(GetPropObj(props, "ngaySinh"))?.ToString(), GioiTinh = GetProp(props, "gioiTinh"), QueQuan = GetProp(props, "queQuan"), MaritalStatus = GetProp(props, "maritalStatus"), NgheNghiep = GetProp(props, "ngheNghiep"), Details = NormalizeDictionary(props) }; }
//         private object? GetPropObj(IReadOnlyDictionary<string, object> props, string key) { if (props.TryGetValue(key, out object? val)) return val; return null; }
//         private string? GetProp(IReadOnlyDictionary<string, object> props, string key) { if (props.TryGetValue(key, out object? val)) return NormalizeValue(val)?.ToString() ?? ""; return ""; }
//         private string SafeString(object? val) { return NormalizeValue(val)?.ToString() ?? ""; }
//         private string TranslateRelType(string type) { return type switch { "FATHER_OF" => "Cha của", "MOTHER_OF" => "Mẹ của", "MARRIED_TO" => "Vợ/Chồng", "CHILD_OF" => "Con của", "SIBLING" => "Anh/Chị/Em", "REGISTERED_AT" => "ĐKTT tại", "CURRENT_RESIDENT" => "Cư trú", _ => type }; }
//     }
// }
