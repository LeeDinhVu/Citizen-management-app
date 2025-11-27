using Microsoft.AspNetCore.Mvc;
using CitizenGraph.Backend.Services;
using CitizenGraph.Backend.Models;

namespace CitizenGraph.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CriminalCaseController : ControllerBase
    {
        private readonly CriminalCaseService _svc;

        public CriminalCaseController(CriminalCaseService svc)  // ĐÚNG: Inject service, không phải repo
        {
            _svc = svc;
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCase(string id, [FromBody] CriminalCaseDto caseDto)
        {
            try
            {
                if (id != caseDto.CaseId)
                {
                    return BadRequest("Case ID trong URL và body không khớp.");
                }

                bool updated = await _svc.UpdateCaseAsync(caseDto);

                if (!updated)
                    return NotFound($"Không tìm thấy vụ án với ID: {id}");

                return Ok(caseDto); // trả về dữ liệu đã cập nhật
            }
            catch (Exception ex)
            {
                Console.WriteLine("ERROR: " + ex);
                return StatusCode(500, ex.ToString());
            }
}
        // =============================
        // GET ALL
        // =============================
        [HttpGet]
        public Task<List<CriminalCaseDto>> GetAll()
            => _svc.GetAllCasesAsync();

        // =============================
        // GET BY ID
        // =============================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var result = await _svc.GetCaseByIdAsync(id);
                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine("ERROR: " + ex);
                return StatusCode(500, ex.ToString());
            }
        }

        // =============================
        // SEARCH
        // =============================
        [HttpPost("search")]
        public Task<List<CriminalCaseDto>> Search([FromBody] SearchCrimeRequest req)
            => _svc.SearchCasesAsync(req);

        // =============================
        // PERSON CRIME HISTORY
        // =============================
        [HttpGet("person/{cccd}")]
        public Task<List<PersonCrimeDto>> GetPersonHistory(string cccd)
            => _svc.GetPersonHistoryAsync(cccd);

        // =============================
        // CASE GRAPH
        // =============================
        [HttpGet("{id}/graph")]
        public Task<CrimeGraphDto> GetCaseGraph(string id)
            => _svc.GetCaseGraphAsync(id);

        // =============================
        // HEATMAP
        // =============================
        [HttpGet("heatmap")]
        public Task<List<CrimeHeatmapDto>> GetHeatmap()
            => _svc.GetCrimeHeatmapAsync();

        // =============================
        // CREATE NEW CASE
        // =============================
        [HttpPost]  // <--- BẮT BUỘC PHẢI CÓ
        public async Task<IActionResult> Create([FromBody] CreateCriminalCaseRequest req)
        {
            var result = await _svc.CreateCaseAsync(req);
            return Ok(result);
        }

        
    }
}
