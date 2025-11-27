// Models/CreateCriminalCaseRequest.cs
namespace CitizenGraph.Backend.Models;

public class CreateCriminalCaseRequest
{
    public string CaseNumber { get; set; } = null!;
    public string CrimeType { get; set; } = null!;
    public string? Description { get; set; }
    public string OccurredDate { get; set; } = null!;
    public string? ReportedDate { get; set; }
    public string Location { get; set; } = null!;
    public string? Status { get; set; } = "Đang điều tra";

    // Danh sách nghi phạm (CCCD)
    public List<string> SuspectCccds { get; set; } = new();
    // Danh sách nạn nhân
    public List<string> VictimCccds { get; set; } = new();
    // Danh sách nhân chứng
    public List<string> WitnessCccds { get; set; } = new();
}