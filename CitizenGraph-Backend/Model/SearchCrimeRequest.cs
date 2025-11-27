public class SearchCrimeRequest
{
    public string? CaseId { get; set; }
    public string? CrimeType { get; set; }
    public string? Status { get; set; }
    public string? Location { get; set; }
    public string? FromDate { get; set; }
    public string? ToDate { get; set; }
}
