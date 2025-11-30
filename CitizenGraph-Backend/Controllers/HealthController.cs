using Microsoft.AspNetCore.Mvc;
using CitizenGraph.Backend.Services;
using Neo4j.Driver;

namespace CitizenGraph.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly Neo4jService _neo4jService;

        public HealthController(Neo4jService neo4jService)
        {
            _neo4jService = neo4jService;
        }

        // 1. DASHBOARD
        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetStats()
        {
            var query = @"
                MATCH (p:Person)
                RETURN 
                    sum(CASE WHEN p.covidStatus = 'F0' THEN 1 ELSE 0 END) AS F0,
                    sum(CASE WHEN p.covidStatus = 'F1' THEN 1 ELSE 0 END) AS F1,
                    sum(CASE WHEN p.covidStatus = 'Bình thường' OR p.covidStatus IS NULL THEN 1 ELSE 0 END) AS Safe,
                    count(p) AS Total";
            var result = await _neo4jService.RunAsync(query);
            if (result == null || result.Count == 0) return Ok(new { F0 = 0, F1 = 0, Safe = 0, Total = 0 });
            var record = result[0];
            return Ok(new { F0 = record["F0"].As<int>(), F1 = record["F1"].As<int>(), Safe = record["Safe"].As<int>(), Total = record["Total"].As<int>() });
        }

        // 2. TRUY VẾT F1/F2
        [HttpGet("trace-infection/{cccd}")]
        public async Task<IActionResult> TraceInfection(string cccd)
        {
            var query = @"
                MATCH (source:Person) WHERE toString(source.cccd) = $cccd
                OPTIONAL MATCH (source)-[r1:CONTACTED]-(f1:Person)
                OPTIONAL MATCH (f1)-[r2:CONTACTED]-(f2:Person) 
                WHERE elementId(f2) <> elementId(source)
                RETURN 
                    source.hoTen AS SourceName, source.covidStatus AS SourceStatus,
                    collect(DISTINCT { name: f1.hoTen, cccd: toString(f1.cccd), status: f1.covidStatus, contactDate: toString(r1.date), location: r1.location }) AS F1List,
                    collect(DISTINCT { name: f2.hoTen, cccd: toString(f2.cccd), status: f2.covidStatus, verifySource: f1.hoTen }) AS F2List";
            var result = await _neo4jService.RunAsync(query, new { cccd });
            if (result == null || result.Count == 0) return NotFound(new { message = "Không tìm thấy" });
            var r = result[0];
            return Ok(new { Name = r["SourceName"].As<string>(), Status = r["SourceStatus"].As<string>(), F1 = r["F1List"].As<List<object>>(), F2 = r["F2List"].As<List<object>>() });
        }

        // 3. CẬP NHẬT TRẠNG THÁI
        [HttpPost("update-status")]
        public async Task<IActionResult> UpdateStatus([FromBody] UpdateStatusRequest req)
        {
            var query = @"MATCH (p:Person) WHERE toString(p.cccd) = $cccd SET p.covidStatus = $status, p.lastTestDate = toString(date()) RETURN p.hoTen";
            await _neo4jService.RunAsync(query, new { cccd = req.Cccd, status = req.Status });
            return Ok(new { message = "Thành công" });
        }

        // --- CÁC CHỨC NĂNG MỚI BỔ SUNG ---

        // 4. TRA CỨU TIÊM CHỦNG
        [HttpGet("vaccine-history/{cccd}")]
        public async Task<IActionResult> GetVaccineHistory(string cccd)
        {
            var query = @"
                MATCH (p:Person) WHERE toString(p.cccd) = $cccd
                OPTIONAL MATCH (p)-[r:VACCINATED]->(v:Vaccine)
                RETURN p.hoTen AS Name, p.covidStatus AS Status,
                       collect({ vaccine: v.name, date: toString(r.date), dose: r.dose }) AS History";
            var result = await _neo4jService.RunAsync(query, new { cccd });
            if (result.Count == 0) return NotFound();
            var r = result[0];
            return Ok(new { Name = r["Name"].As<string>(), Status = r["Status"].As<string>(), History = r["History"].As<List<object>>() });
        }

        // 5. CẢNH BÁO HỘ GIA ĐÌNH (Có F0)
        [HttpGet("household-warning")]
        public async Task<IActionResult> GetHouseholdWarnings()
        {
            var query = @"
                MATCH (h:Household)<-[:CURRENT_RESIDENT]-(p:Person) WHERE p.covidStatus = 'F0'
                MATCH (h)<-[:CURRENT_RESIDENT]-(member:Person)
                RETURN h.hoKhauSo AS SoHoKhau, h.address AS DiaChi, p.hoTen AS F0, collect(member.hoTen) AS ThanhVien LIMIT 20";
            var result = await _neo4jService.RunAsync(query);
            var list = result.Select(r => new {
                SoHoKhau = r["SoHoKhau"].As<string>(),
                DiaChi = r.ContainsKey("DiaChi") ? r["DiaChi"].As<string>() : "Chưa cập nhật",
                F0 = r["F0"].As<string>(),
                ThanhVien = r["ThanhVien"].As<List<string>>()
            });
            return Ok(list);
        }

        // 6. KHAI BÁO DỊCH TỄ (Thêm tiếp xúc)
        [HttpPost("add-contact")]
        public async Task<IActionResult> AddContact([FromBody] AddContactRequest req)
        {
            var query = @"
                MATCH (a:Person {cccd: $cccd1}), (b:Person {cccd: $cccd2})
                MERGE (a)-[r:CONTACTED]->(b)
                SET r.date = $date, r.location = $location
                RETURN r";
            await _neo4jService.RunAsync(query, new { cccd1 = req.Cccd1, cccd2 = req.Cccd2, date = req.Date, location = req.Location });
            return Ok(new { message = "Đã thêm lịch sử tiếp xúc" });
        }

        // 7. THÊM MŨI TIÊM
        [HttpPost("add-vaccine")]
        public async Task<IActionResult> AddVaccine([FromBody] AddVaccineRequest req)
        {
            var query = @"
                MATCH (p:Person {cccd: $cccd})
                MERGE (v:Vaccine {name: $vaccineName})
                MERGE (p)-[r:VACCINATED_WITH]->(v)
                SET r.date = $date, r.dose = $dose
                RETURN p.hoTen";
            await _neo4jService.RunAsync(query, new { cccd = req.Cccd, vaccineName = req.VaccineName, date = req.Date, dose = req.Dose });
            return Ok(new { message = "Đã cập nhật mũi tiêm" });
        }
    }

    public class UpdateStatusRequest { public string Cccd { get; set; } = ""; public string Status { get; set; } = ""; }
    public class AddContactRequest { public string Cccd1 { get; set; } = ""; public string Cccd2 { get; set; } = ""; public string Date { get; set; } = ""; public string Location { get; set; } = ""; }
    public class AddVaccineRequest { public string Cccd { get; set; } = ""; public string VaccineName { get; set; } = ""; public string Date { get; set; } = ""; public int Dose { get; set; } }
}