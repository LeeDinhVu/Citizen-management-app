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
    // --- GIỮ NGUYÊN CÁC DTO ---
    public class PersonDto { public string Id { get; set; } = ""; public string HoTen { get; set; } = ""; public string? NgaySinh { get; set; } public string? GioiTinh { get; set; } public string? QueQuan { get; set; } public string? MaritalStatus { get; set; } public string? NgheNghiep { get; set; } public Dictionary<string, object> Details { get; set; } = new(); }
    public class MemberPreviewDto { public string Name { get; set; } public string Cccd { get; set; } }
    public class HouseholdMemberDetailDto { public PersonDto Member { get; set; } public PersonDto HeadOfHousehold { get; set; } public string RelationToHead { get; set; } public string HouseholdAddress { get; set; } }
    public class RelationshipDto { public long Id { get; set; } public string Source { get; set; } public string Target { get; set; } public string Type { get; set; } public string Label { get; set; } = ""; public Dictionary<string, object> Properties { get; set; } = new(); }
    public class RelationshipCreateDto { public string SourceId { get; set; } public string TargetId { get; set; } public string Type { get; set; } public Dictionary<string, object> Properties { get; set; } = new(); }
    public class PersonDropdownDto { public string Value { get; set; } public string Label { get; set; } }
    public class HouseholdCreateDto { public string HouseholdId { get; set; } public string HeadCccd { get; set; } public string RegistrationNumber { get; set; } public string Address { get; set; } public string ResidencyType { get; set; } }
    public class AddMemberDto { public string HouseholdId { get; set; } public string PersonCccd { get; set; } public string RelationToHead { get; set; } public string Role { get; set; } public string FromDate { get; set; } }
    public class DashboardStatsDto { public long TotalCitizens { get; set; } public long TotalRelationships { get; set; } public long MarriedCount { get; set; } public long SingleCount { get; set; } public double AvgChildrenPerFamily { get; set; } public Dictionary<string, long> GenderDistribution { get; set; } = new(); public Dictionary<string, long> RelationshipBreakdown { get; set; } = new(); }
    public class AdminLogDto { public string Action { get; set; } public string Time { get; set; } public string Status { get; set; } }

    [ApiController]
    [Route("api/[controller]")]
    public class FamilyController : ControllerBase
    {
        private readonly Neo4jRepository _repo;
        public FamilyController(Neo4jRepository repo) { _repo = repo; }

        // --- HÀM GHI LOG DÙNG CHUNG ---
        private async Task LogAction(string action, string status)
        {
            // Module 'Family' bao gồm cả việc xem và thao tác dữ liệu
            var query = @"
                CREATE (l:AdminLog {
                    action: $action, 
                    time: toString(datetime()), 
                    status: $status, 
                    module: 'Family'
                })";
            await _repo.RunAsync(query, new { action, status });
        }

        // --- READ OPERATIONS (ĐÃ THÊM LOG) ---

        [HttpGet("dropdown-list")]
        public async Task<IActionResult> GetDropdownList() {
            // Log xem danh sách gợi ý (thường chạy ngầm nên có thể bỏ qua hoặc log nếu muốn chi tiết tuyệt đối)
            // Ở đây tôi bỏ qua để tránh spam log vì nó gọi rất nhiều lần
            var r = await _repo.RunAsync(@"MATCH (p:Person) RETURN p.cccd as value, p.hoTen + ' (' + coalesce(toString(p.ngaySinh), '?') + ')' as label ORDER BY p.hoTen");
            return Ok(new { success = true, data = r.Select(x => new PersonDropdownDto { Value = SafeString(x["value"]), Label = SafeString(x["label"]) }) });
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats() {
            string action = "Xem thống kê tổng quan (Stats)";
            await LogAction(action, "Đang xử lý");
            try {
                var nRes = await _repo.RunAsync("MATCH (n:Person) RETURN count(n) as total, sum(CASE WHEN toString(n.maritalStatus) CONTAINS 'kết hôn' THEN 1 ELSE 0 END) as married, sum(CASE WHEN n.gioiTinh='Nam' THEN 1 ELSE 0 END) as male, sum(CASE WHEN n.gioiTinh='Nữ' THEN 1 ELSE 0 END) as female");
                if(nRes.Count==0) {
                     await LogAction(action, "Thành công");
                     return Ok(new DashboardStatsDto());
                }
                var nRec = nRes[0];
                var rRes = await _repo.RunAsync("MATCH ()-[r]->() RETURN count(r) as totalRel");
                var brRes = await _repo.RunAsync("MATCH ()-[r]->() RETURN type(r) as type, count(r) as cnt ORDER BY cnt DESC");
                var aRes = await _repo.RunAsync("MATCH (p:Person)-[:FATHER_OF|MOTHER_OF]->(c:Person) WITH p, count(c) as children RETURN avg(children) as avgChildren");
                
                await LogAction(action, "Thành công");
                return Ok(new DashboardStatsDto {
                    TotalCitizens = nRec["total"].As<long>(), MarriedCount = nRec["married"].As<long>(), SingleCount = nRec["total"].As<long>() - nRec["married"].As<long>(), TotalRelationships = rRes.Count>0?rRes[0]["totalRel"].As<long>():0, AvgChildrenPerFamily = aRes.Count>0?Math.Round(aRes[0]["avgChildren"].As<double>(), 2):0,
                    GenderDistribution = new Dictionary<string, long> { { "Nam", nRec["male"].As<long>() }, { "Nữ", nRec["female"].As<long>() }, { "Khác", nRec["total"].As<long>() - (nRec["male"].As<long>() + nRec["female"].As<long>()) } },
                    RelationshipBreakdown = brRes.ToDictionary(x => x["type"].As<string>(), x => x["cnt"].As<long>())
                });
            } catch(Exception ex) { 
                await LogAction(action, "Thất bại");
                return StatusCode(500, new { success=false, message=ex.Message }); 
            }
        }

        [HttpGet("citizens")]
        public async Task<IActionResult> GetCitizens([FromQuery] int limit = 1000, [FromQuery] string search = "") {
            string action = string.IsNullOrEmpty(search) ? "Xem danh sách toàn bộ công dân" : $"Tìm kiếm công dân với từ khóa: '{search}'";
            await LogAction(action, "Đang xử lý");
            try {
                var r = await _repo.RunAsync("MATCH (p:Person) WHERE ($search = '' OR toLower(toString(p.hoTen)) CONTAINS toLower($search) OR toString(p.cccd) CONTAINS $search) RETURN p ORDER BY p.hoTen LIMIT $limit", new { limit, search });
                await LogAction(action, "Thành công");
                return Ok(r.Select(x => MapNodeToDto(x["p"].As<INode>())).ToList());
            } catch {
                await LogAction(action, "Thất bại");
                throw;
            }
        }

        [HttpGet("households")]
        public async Task<IActionResult> GetHouseholds() {
            string action = "Xem danh sách hộ khẩu";
            await LogAction(action, "Đang xử lý");
            try {
                var query = @"MATCH (h:Household) OPTIONAL MATCH (h)<-[:CURRENT_RESIDENT]-(p:Person) OPTIONAL MATCH (h)-[:REGISTERED_AT]->(a:Address) WITH h, a, count(p) as cnt, collect({name: p.hoTen, cccd: toString(p.cccd)})[0..6] as members RETURN coalesce(a.addressId, h.householdId, 'N/A') as id, coalesce(toString(a.houseNumber) + ' ' + a.street, h.hoKhauSo, 'Chưa cập nhật') as address, h.registrationNumber as regNum, h.residencyType as resType, cnt, members, h.householdId as householdCode ORDER BY cnt DESC LIMIT 100";
                var records = await _repo.RunAsync(query);
                await LogAction(action, "Thành công");
                return Ok(new { success = true, data = records.Select(r => new { AddressId = SafeString(r["id"]), HouseholdCode = SafeString(r["householdCode"]), RegistrationNumber = SafeString(r["regNum"]), ResidencyType = SafeString(r["resType"]), Address = SafeString(r["address"]), Count = r["cnt"].As<int>(), Members = r["members"].As<List<IDictionary<string, object>>>().Select(m => new MemberPreviewDto { Name = m["name"]?.ToString()??"", Cccd = m["cccd"]?.ToString()??"" }).ToList() }) });
            } catch {
                await LogAction(action, "Thất bại");
                throw;
            }
        }

        [HttpGet("member-detail")]
        public async Task<IActionResult> GetHouseholdMemberDetail([FromQuery] string cccd) {
            string action = $"Xem chi tiết thành viên CCCD: {cccd}";
            await LogAction(action, "Đang xử lý");
            try {
                var query = @"MATCH (p:Person {cccd: $cccd}) OPTIONAL MATCH (p)-[r:CURRENT_RESIDENT]->(h:Household) OPTIONAL MATCH (h)-[:REGISTERED_AT]->(a:Address) OPTIONAL MATCH (head:Person {cccd: h.headOfHouseholdCCCD}) RETURN p, r.relationToHead as relation, r as relProps, head, coalesce(toString(a.houseNumber) + ' ' + a.street, h.hoKhauSo) as address";
                var records = await _repo.RunAsync(query, new { cccd });
                if (!records.Any()) {
                    await LogAction(action, "Thất bại (Không tìm thấy)");
                    return NotFound(new { success = false, message = "Không tìm thấy" });
                }
                var rec = records[0];
                INode? head = (rec["head"] != null && rec["head"] is INode) ? rec["head"].As<INode>() : null;
                var relProps = (rec["relProps"] != null && rec["relProps"] is IRelationship) ? NormalizeDictionary(rec["relProps"].As<IRelationship>().Properties) : new Dictionary<string,object>();
                
                await LogAction(action, "Thành công");
                return Ok(new { success = true, data = new { Member = MapNodeToDto(rec["p"].As<INode>()), HeadOfHousehold = head != null ? MapNodeToDto(head) : null, RelationToHead = SafeString(rec["relation"]), HouseholdAddress = SafeString(rec["address"]), ResidentRelProps = relProps } });
            } catch {
                await LogAction(action, "Thất bại");
                throw;
            }
        }

        [HttpGet("genealogy-all")]
        public async Task<IActionResult> GetAllCitizensForGenealogy() {
            string action = "Xem danh sách phả hệ";
            await LogAction(action, "Đang xử lý");
            try {
                var r = await _repo.RunAsync("MATCH (p:Person) OPTIONAL MATCH (p)-[:FATHER_OF|MOTHER_OF]->(child:Person) WITH p, count(child) as childrenCount RETURN p.hoTen as name, toString(p.cccd) as id, toString(p.ngaySinh) as dob, childrenCount ORDER BY name ASC LIMIT 1000");
                await LogAction(action, "Thành công");
                return Ok(new { success = true, data = r.Select(x => new { Cccd = SafeString(x["id"]), HoTen = SafeString(x["name"]), NgaySinh = SafeString(x["dob"]), SoConTrucTiep = x["childrenCount"].As<int>() }) });
            } catch {
                await LogAction(action, "Thất bại");
                throw;
            }
        }

        [HttpGet("full-tree")]
        public async Task<IActionResult> GetFullTree([FromQuery] string cccd) {
            string action = $"Xem cây phả hệ của CCCD: {cccd}";
            await LogAction(action, "Đang xử lý");
            try {
                var manualQuery = @"MATCH (root:Person) WHERE toString(root.cccd) = $cccd OPTIONAL MATCH path = (root)-[:FATHER_OF|MOTHER_OF|MARRIED_TO|CHILD_OF|SIBLING*0..3]-(p:Person) WITH root, collect(path) AS paths WITH root, [p IN paths | nodes(p)] AS nodeLists, [p IN paths | relationships(p)] AS relLists UNWIND nodeLists AS nl UNWIND nl AS n WITH root, relLists, collect(DISTINCT n) AS allNodes UNWIND relLists AS rl UNWIND rl AS r WITH root, allNodes, collect(r) AS rawRels UNWIND rawRels AS r WITH root, allNodes, startNode(r) AS s, endNode(r) AS e, r WHERE s = root WITH root, allNodes, s, e, r, apoc.coll.sort([id(s), id(e)]) AS pairKey WITH root, allNodes, pairKey, collect(r)[0] AS uniqRel WITH root, collect(DISTINCT uniqRel) AS rels, allNodes WITH root, rels, [r IN rels | endNode(r)] AS connectedNodes WITH rels, connectedNodes + [root] AS nodes RETURN nodes, rels";
                var records = await _repo.RunAsync(manualQuery, new { cccd });
                if (!records.Any()) {
                     await LogAction(action, "Thành công (Không có dữ liệu)");
                     return Ok(new { success = false, message = "Not found" });
                }
                await LogAction(action, "Thành công");
                return ProcessGraphResult(records[0]);
            } catch {
                await LogAction(action, "Thất bại");
                throw;
            }
        }

        [HttpGet("global-graph")]
        public async Task<IActionResult> GetGlobalGraph() {
            string action = "Xem toàn cảnh quan hệ (Global Graph)";
            await LogAction(action, "Đang xử lý");
            try {
                var records = await _repo.RunAsync(@"MATCH (n:Person) OPTIONAL MATCH (n)-[r:FATHER_OF|MOTHER_OF|MARRIED_TO|CHILD_OF|SIBLING]-(m:Person) WHERE elementId(n) <> elementId(m) WITH CASE WHEN elementId(n) < elementId(m) THEN n ELSE m END AS node1, CASE WHEN elementId(n) < elementId(m) THEN m ELSE n END AS node2, collect(r) AS relsBetween WITH node1, node2, head(relsBetween) AS r RETURN collect(distinct node1) + collect(distinct node2) AS nodes, collect(distinct r) AS rels LIMIT 3000");
                await LogAction(action, "Thành công");
                return ProcessGraphResult(records[0]);
            } catch {
                await LogAction(action, "Thất bại");
                throw;
            }
        }

        // --- CRUD OPERATIONS (ĐÃ CÓ LOG TỪ TRƯỚC) ---
        // (Giữ nguyên logic log đã thêm ở bước trước, chỉ liệt kê lại để đảm bảo file đầy đủ)

        [HttpPost("relationship")]
        public async Task<IActionResult> CreateRelationship([FromBody] RelationshipCreateDto input) {
            string action = $"Tạo quan hệ {input.Type} giữa {input.SourceId} và {input.TargetId}";
            await LogAction(action, "Đang xử lý");
            try {
                var query = $@"MATCH (a:Person), (b:Person) WHERE toString(a.cccd) = $sourceId AND toString(b.cccd) = $targetId MERGE (a)-[r:{input.Type}]->(b) ON CREATE SET r += $props RETURN r";
                var r = await _repo.RunAsync(query, new { sourceId = input.SourceId, targetId = input.TargetId, props = ConvertDictionary(input.Properties) });
                if (r.Count == 0) { await LogAction(action, "Thất bại"); return NotFound(new { success = false, message = "Không tìm thấy công dân" }); }
                await LogAction(action, "Thành công");
                return Ok(new { success = true, message = "Thành công" });
            } catch (Exception ex) { await LogAction(action, "Thất bại"); return StatusCode(500, new { success = false, message = ex.Message }); }
        }

        // ... (Các hàm CRUD khác giữ nguyên việc gọi LogAction như ở câu trả lời trước) ...
        [HttpPut("relationship/{relId}")]
        public async Task<IActionResult> UpdateRelationship(long relId, [FromBody] Dictionary<string, object> properties) {
            string action = $"Cập nhật quan hệ ID:{relId}"; await LogAction(action, "Đang xử lý");
            try { var safeProps = ConvertDictionary(properties); await _repo.RunAsync("MATCH ()-[r]->() WHERE id(r) = $relId SET r += $props RETURN r", new { relId, props = safeProps }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
        }

        [HttpDelete("relationship/{id}")]
        public async Task<IActionResult> DeleteRelationshipById(long id) {
            string action = $"Xóa quan hệ ID:{id}"; await LogAction(action, "Đang xử lý");
            try { await _repo.RunAsync("MATCH ()-[r]->() WHERE id(r) = $id DELETE r", new { id }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
        }
        
        [HttpPost("household")]
        public async Task<IActionResult> CreateHousehold([FromBody] HouseholdCreateDto input) {
            string action = $"Tạo hộ khẩu {input.HouseholdId} (Chủ hộ: {input.HeadCccd})"; await LogAction(action, "Đang xử lý");
            try { await _repo.RunAsync("MERGE (h:Household {householdId: $hid}) ON CREATE SET h.headOfHouseholdCCCD=$head, h.registrationNumber=$regNum, h.hoKhauSo=$addr, h.residencyType=$resType, h.registrationDate=toString(date()) RETURN h", new { hid = input.HouseholdId, head = input.HeadCccd, regNum = input.RegistrationNumber, addr = input.Address, resType = input.ResidencyType }); if (!string.IsNullOrEmpty(input.HeadCccd)) await _repo.RunAsync("MATCH (p:Person {cccd: $head}), (h:Household {householdId: $hid}) MERGE (p)-[r:CURRENT_RESIDENT]->(h) SET r.role='Chủ hộ', r.relationToHead='Bản thân', r.fromDate=toString(date())", new { head = input.HeadCccd, hid = input.HouseholdId }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
        }

        [HttpPut("household/{householdId}")]
        public async Task<IActionResult> UpdateHousehold(string householdId, [FromBody] HouseholdCreateDto input) {
            string action = $"Cập nhật hộ khẩu {householdId}"; await LogAction(action, "Đang xử lý");
            try { await _repo.RunAsync("MATCH (h:Household {householdId: $hid}) SET h.registrationNumber=$regNum, h.hoKhauSo=$addr, h.residencyType=$resType, h.headOfHouseholdCCCD=$head", new { hid = householdId, regNum = input.RegistrationNumber, addr = input.Address, resType = input.ResidencyType, head = input.HeadCccd }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
        }

        [HttpDelete("household/{householdId}")]
        public async Task<IActionResult> DeleteHousehold(string householdId) {
            string action = $"Xóa hộ khẩu {householdId}"; await LogAction(action, "Đang xử lý");
            try { await _repo.RunAsync("MATCH (h:Household {householdId: $hid}) DETACH DELETE h", new { hid = householdId }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
        }

        [HttpPost("household/member")]
        public async Task<IActionResult> AddMemberToHousehold([FromBody] AddMemberDto input) {
            string action = $"Thêm {input.PersonCccd} vào hộ {input.HouseholdId}"; await LogAction(action, "Đang xử lý");
            try { var res = await _repo.RunAsync("MATCH (p:Person {cccd: $cccd}), (h:Household {householdId: $hid}) MERGE (p)-[r:CURRENT_RESIDENT]->(h) SET r.role=$role, r.relationToHead=$rel, r.fromDate=$date RETURN r", new { cccd = input.PersonCccd, hid = input.HouseholdId, role = input.Role, rel = input.RelationToHead, date = input.FromDate }); if (res.Count == 0) { await LogAction(action, "Thất bại"); return NotFound(new { success = false }); } await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
        }

        [HttpPut("household/member-rel")]
        public async Task<IActionResult> UpdateMemberRel([FromQuery] string householdId, [FromQuery] string cccd, [FromBody] Dictionary<string,object> props) {
            string action = $"Cập nhật quan hệ hộ tịch cho {cccd} trong hộ {householdId}"; await LogAction(action, "Đang xử lý");
            try { var safeProps = ConvertDictionary(props); await _repo.RunAsync("MATCH (p:Person {cccd: $cccd})-[r:CURRENT_RESIDENT]->(h:Household {householdId: $hid}) SET r += $props RETURN r", new { cccd, hid = householdId, props = safeProps }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
        }

        [HttpDelete("household/member")]
        public async Task<IActionResult> RemoveMemberFromHousehold([FromQuery] string householdId, [FromQuery] string cccd) {
            string action = $"Xóa {cccd} khỏi hộ {householdId}"; await LogAction(action, "Đang xử lý");
            try { await _repo.RunAsync("MATCH (p:Person {cccd: $cccd})-[r:CURRENT_RESIDENT]->(h:Household {householdId: $hid}) DELETE r", new { cccd, hid = householdId }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
        }

        [HttpPut("citizen/{cccd}")]
        public async Task<IActionResult> UpdateCitizen(string cccd, [FromBody] PersonDto input) {
            string action = $"Cập nhật thông tin công dân {cccd}"; await LogAction(action, "Đang xử lý");
            try { await _repo.RunAsync("MATCH (p:Person {cccd: $cccd}) SET p.hoTen=$name, p.ngaySinh=$dob, p.gioiTinh=$gender, p.queQuan=$hometown, p.ngheNghiep=$job, p.maritalStatus=$status", new { cccd, name = input.HoTen, dob = input.NgaySinh, gender = input.GioiTinh, hometown = input.QueQuan, job = input.NgheNghiep, status = input.MaritalStatus }); await LogAction(action, "Thành công"); return Ok(new { success = true }); } catch { await LogAction(action, "Thất bại"); throw; }
        }

        // --- HELPERS (Giữ nguyên) ---
        private Dictionary<string, object> ConvertDictionary(Dictionary<string, object> input) { var result = new Dictionary<string, object>(); foreach (var kvp in input) { if (kvp.Value is JsonElement jsonElem) { switch (jsonElem.ValueKind) { case JsonValueKind.String: result[kvp.Key] = jsonElem.GetString() ?? ""; break; case JsonValueKind.Number: if(jsonElem.TryGetInt64(out long l)) result[kvp.Key] = l; else if(jsonElem.TryGetDouble(out double d)) result[kvp.Key] = d; break; case JsonValueKind.True: result[kvp.Key] = true; break; case JsonValueKind.False: result[kvp.Key] = false; break; default: result[kvp.Key] = jsonElem.ToString(); break; } } else { result[kvp.Key] = kvp.Value; } } return result; }
        private object NormalizeValue(object value) { if (value == null) return null; if (value is LocalDate localDate) return localDate.ToString(); if (value is ZonedDateTime zdt) return zdt.ToString(); if (value is LocalDateTime ldt) return ldt.ToString(); if (value is OffsetTime ot) return ot.ToString(); if (value is LocalTime lt) return lt.ToString(); return value; }
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
