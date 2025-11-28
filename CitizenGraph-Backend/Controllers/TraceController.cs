using CitizenGraph.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace CitizenGraph.Backend.Controllers
{
    [ApiController]
    // QUAN TRỌNG: Route chữ thường chính xác theo yêu cầu
    [Route("api/[controller]")]
    public class TraceController : ControllerBase
    {
        private readonly TraceService _service;

        public TraceController(TraceService service)
        {
            _service = service;
        }

        // URL gọi sẽ là: GET http://localhost:5000/api/trace/{cccd}
        [HttpGet("{cccd}")]
        public async Task<IActionResult> Trace(string cccd)
        {
            try 
            {
                var result = await _service.TraceInfectionAsync(cccd);
                if (result == null) return NotFound(new { message = "Không tìm thấy dữ liệu truy vết." });
                return Ok(result);
            }
            catch(Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}