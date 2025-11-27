namespace CitizenGraph.Backend.Model
{
    /// <summary>
    /// DTO cho thông tin hộ khẩu
    /// </summary>
    public class HouseholdDTO
    {
        public string Id { get; set; } = string.Empty;
        public string SoHoKhau { get; set; } = string.Empty;
        public string DiaChi { get; set; } = string.Empty;
        public string TenChuHo { get; set; } = string.Empty;
        public int SoLuongThanhVien { get; set; }
    }

    /// <summary>
    /// DTO cho thành viên hộ khẩu
    /// </summary>
    public class HouseholdMemberDTO
    {
        public string HoTen { get; set; } = string.Empty;
        public string CCCD { get; set; } = string.Empty;
        public DateTime? NgaySinh { get; set; }
        public string QuanHe { get; set; } = string.Empty;
        public string LoaiCuTru { get; set; } = string.Empty;
        public DateTime? TuNgay { get; set; }
        public DateTime? DenNgay { get; set; }
    }

    /// <summary>
    /// Request để chuyển khẩu (hỗ trợ nhiều người cùng lúc)
    /// </summary>
    public class MoveHouseholdRequest
    {
        public List<string> CCCDs { get; set; } = new();
        public string TargetHouseholdId { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string LoaiCuTru { get; set; } = "Thường trú";
    }

    /// <summary>
    /// Request để đăng ký hộ khẩu mới
    /// </summary>
    public class CreateHouseholdRequest
    {
        public string HouseholdId { get; set; } = string.Empty;
        public string RegistrationNum { get; set; } = string.Empty;
        public string AddressText { get; set; } = string.Empty;
        public string ResidencyType { get; set; } = "Thường trú";
        public string ChuHoCCCD { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO cho chi tiết hộ khẩu (nested format)
    /// </summary>
    public class HouseholdDetailDTO
    {
        public string HouseholdId { get; set; } = string.Empty;
        public string RegistrationNumber { get; set; } = string.Empty;
        public string ResidencyType { get; set; } = string.Empty;
        public string HeadOfHousehold { get; set; } = string.Empty;
        public List<HouseholdMemberDTO> Members { get; set; } = new();
    }

    /// <summary>
    /// Request để nhập khẩu (thêm thành viên vào hộ khẩu)
    /// </summary>
    public class AddMemberRequest
    {
        public string CCCD { get; set; } = string.Empty;
        public string HouseholdId { get; set; } = string.Empty;
        public string QuanHe { get; set; } = string.Empty;
        public string LoaiCuTru { get; set; } = "Thường trú";
        public DateTime TuNgay { get; set; } = DateTime.Now;
        public string LyDo { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO cho công dân available (chưa thuộc hộ khẩu nào)
    /// </summary>
    public class AvailableCitizenDTO
    {
        public string CCCD { get; set; } = string.Empty;
        public string HoTen { get; set; } = string.Empty;
        public DateTime? NgaySinh { get; set; }
        public string GioiTinh { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request để xóa khẩu (khai tử/định cư nước ngoài)
    /// </summary>
    public class RemoveMemberRequest
    {
        public string CCCD { get; set; } = string.Empty;
        public string HouseholdId { get; set; } = string.Empty;
        public string LyDo { get; set; } = string.Empty;
        public DateTime NgayXoa { get; set; } = DateTime.Now;
        public string LoaiXoa { get; set; } = "Đã chết"; // "Đã chết" hoặc "Định cư nước ngoài"
    }

    /// <summary>
    /// Request để tách khẩu + lập hộ mới
    /// </summary>
    public class SplitNewHouseholdRequest
    {
        public string SourceHouseholdId { get; set; } = string.Empty;
        public List<string> MemberCCCDs { get; set; } = new();
        public string NewHouseholdId { get; set; } = string.Empty;
        public string NewRegistrationNum { get; set; } = string.Empty;
        public string NewAddress { get; set; } = string.Empty;
        public string ResidencyType { get; set; } = "Thường trú";
        public string LyDo { get; set; } = string.Empty;
    }
}

