using Microsoft.AspNetCore.Mvc;
using CitizenGraph.Backend.Services;
using CitizenGraph.Backend.Model;

namespace CitizenGraph.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ResidencyController : ControllerBase
    {
        private readonly ResidencyService _residencyService;

        public ResidencyController(ResidencyService residencyService)
        {
            _residencyService = residencyService;
        }

        /// <summary>
        /// Lấy tất cả hộ khẩu
        /// GET: api/residency/households
        /// </summary>
        [HttpGet("households")]
        public async Task<ActionResult<List<HouseholdDTO>>> GetAllHouseholds()
        {
            try
            {
                var households = await _residencyService.GetAllHouseholdsAsync();
                return Ok(households);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy danh sách hộ khẩu", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách thành viên của một hộ khẩu
        /// GET: api/residency/households/{soHoKhau}/members
        /// </summary>
        [HttpGet("households/{soHoKhau}/members")]
        public async Task<ActionResult<List<HouseholdMemberDTO>>> GetMembersByHousehold(string soHoKhau)
        {
            try
            {
                var members = await _residencyService.GetMembersByHouseholdAsync(soHoKhau);
                return Ok(members);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy danh sách thành viên", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy chi tiết hộ khẩu dạng nested object
        /// GET: api/residency/households/{soHoKhau}/detail
        /// </summary>
        [HttpGet("households/{soHoKhau}/detail")]
        public async Task<ActionResult<HouseholdDetailDTO>> GetHouseholdDetail(string soHoKhau)
        {
            try
            {
                var detail = await _residencyService.GetHouseholdDetailAsync(soHoKhau);
                if (detail == null)
                {
                    return NotFound(new { message = "Không tìm thấy hộ khẩu" });
                }
                return Ok(detail);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy chi tiết hộ khẩu", error = ex.Message });
            }
        }

        /// <summary>
        /// Đăng ký hộ khẩu mới
        /// POST: api/residency/households
        /// </summary>
        [HttpPost("households")]
        public async Task<ActionResult<HouseholdDTO>> CreateHousehold([FromBody] CreateHouseholdRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.HouseholdId))
                {
                    return BadRequest(new { message = "Mã hộ khẩu không được để trống" });
                }

                if (string.IsNullOrEmpty(request.ChuHoCCCD))
                {
                    return BadRequest(new { message = "CCCD chủ hộ không được để trống" });
                }

                var household = await _residencyService.CreateHouseholdAsync(
                    request.HouseholdId,
                    request.RegistrationNum,
                    request.AddressText,
                    request.ResidencyType,
                    request.ChuHoCCCD
                );

                if (household == null)
                {
                    return BadRequest(new { message = "Tạo hộ khẩu thất bại" });
                }

                return CreatedAtAction(
                    nameof(GetMembersByHousehold),
                    new { soHoKhau = household.SoHoKhau },
                    household
                );
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi tạo hộ khẩu", error = ex.Message });
            }
        }

        /// <summary>
        /// Chuyển khẩu người dân (hỗ trợ nhiều người)
        /// POST: api/residency/move
        /// </summary>
        [HttpPost("move")]
        public async Task<ActionResult> MoveMember([FromBody] MoveHouseholdRequest request)
        {
            try
            {
                if (request.CCCDs == null || request.CCCDs.Count == 0 || string.IsNullOrEmpty(request.TargetHouseholdId))
                {
                    return BadRequest(new { message = "Danh sách CCCD và TargetHouseholdId không được để trống" });
                }

                var success = await _residencyService.MoveMembersAsync(
                    request.CCCDs, 
                    request.TargetHouseholdId, 
                    request.Reason,
                    request.LoaiCuTru
                );

                if (success)
                {
                    return Ok(new { message = "Chuyển khẩu thành công" });
                }
                else
                {
                    return BadRequest(new { message = "Chuyển khẩu thất bại" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi chuyển khẩu", error = ex.Message });
            }
        }

        /// <summary>
        /// Nhập khẩu - Thêm thành viên vào hộ khẩu
        /// POST: api/residency/add-member
        /// </summary>
        [HttpPost("add-member")]
        public async Task<ActionResult> AddMember([FromBody] AddMemberRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.CCCD))
                {
                    return BadRequest(new { message = "CCCD không được để trống" });
                }

                if (string.IsNullOrEmpty(request.HouseholdId))
                {
                    return BadRequest(new { message = "Mã hộ khẩu không được để trống" });
                }

                if (string.IsNullOrEmpty(request.QuanHe))
                {
                    return BadRequest(new { message = "Quan hệ với chủ hộ không được để trống" });
                }

                var success = await _residencyService.AddMemberAsync(request);

                if (success)
                {
                    return Ok(new { message = "Thêm thành viên vào hộ khẩu thành công" });
                }
                else
                {
                    return BadRequest(new { message = "Thêm thành viên thất bại" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi thêm thành viên", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy lịch sử cư trú của một người
        /// GET: api/residency/history/{cccd}
        /// </summary>
        [HttpGet("history/{cccd}")]
        public async Task<ActionResult<List<HouseholdMemberDTO>>> GetResidencyHistory(string cccd)
        {
            try
            {
                var history = await _residencyService.GetResidencyHistoryAsync(cccd);
                return Ok(history);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy lịch sử cư trú", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy danh sách công dân chưa thuộc hộ khẩu nào (available cho nhập khẩu)
        /// GET: api/residency/available-citizens
        /// </summary>
        [HttpGet("available-citizens")]
        public async Task<ActionResult<List<AvailableCitizenDTO>>> GetAvailableCitizens()
        {
            try
            {
                var citizens = await _residencyService.GetAvailableCitizensAsync();
                return Ok(citizens);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy danh sách công dân available", error = ex.Message });
            }
        }

        /// <summary>
        /// Xóa khẩu - Khai tử hoặc định cư nước ngoài
        /// POST: api/residency/remove-member
        /// </summary>
        [HttpPost("remove-member")]
        public async Task<ActionResult> RemoveMember([FromBody] RemoveMemberRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.CCCD))
                {
                    return BadRequest(new { message = "CCCD không được để trống" });
                }

                if (string.IsNullOrEmpty(request.HouseholdId))
                {
                    return BadRequest(new { message = "Mã hộ khẩu không được để trống" });
                }

                if (string.IsNullOrEmpty(request.LyDo))
                {
                    return BadRequest(new { message = "Lý do xóa không được để trống" });
                }

                var success = await _residencyService.RemoveMemberAsync(request);

                if (success)
                {
                    return Ok(new { message = "Xóa khẩu thành công" });
                }
                else
                {
                    return BadRequest(new { message = "Xóa khẩu thất bại" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi xóa khẩu", error = ex.Message });
            }
        }

        /// <summary>
        /// Tách khẩu + lập hộ mới
        /// POST: api/residency/split-new-household
        /// </summary>
        [HttpPost("split-new-household")]
        public async Task<ActionResult<HouseholdDTO>> SplitNewHousehold([FromBody] SplitNewHouseholdRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.SourceHouseholdId))
                {
                    return BadRequest(new { message = "Mã hộ khẩu nguồn không được để trống" });
                }

                if (string.IsNullOrEmpty(request.NewHouseholdId))
                {
                    return BadRequest(new { message = "Mã hộ khẩu mới không được để trống" });
                }

                if (request.MemberCCCDs == null || request.MemberCCCDs.Count == 0)
                {
                    return BadRequest(new { message = "Phải chọn ít nhất 1 thành viên để tách khẩu" });
                }

                var household = await _residencyService.SplitNewHouseholdAsync(request);

                if (household == null)
                {
                    return BadRequest(new { message = "Tách khẩu + lập hộ mới thất bại" });
                }

                return CreatedAtAction(
                    nameof(GetMembersByHousehold),
                    new { soHoKhau = household.SoHoKhau },
                    household
                );
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi tách khẩu + lập hộ mới", error = ex.Message });
            }
        }

        /// <summary>
        /// Debug: Lấy dữ liệu thô từ Neo4j
        /// GET: api/residency/debug
        /// </summary>
        [HttpGet("debug")]
        public async Task<ActionResult> DebugData()
        {
            try
            {
                var debugInfo = await _residencyService.GetDebugInfoAsync();
                return Ok(debugInfo);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi debug", error = ex.Message, stackTrace = ex.StackTrace });
            }
        }
    }
}

