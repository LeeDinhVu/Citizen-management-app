namespace CitizenGraph.Backend.Models
{
    public class PersonCrimeDto
    {
        public string PersonId { get; set; } = "";
        public string FullName { get; set; } = "";
        public string? CCCD { get; set; }
        public string CaseId { get; set; } = "";
        public string CrimeType { get; set; } = "";
        public string Severity { get; set; } = "";
        public string? OccurredDate { get; set; }
        public string? PrisonName { get; set; }
        public string? SentenceType { get; set; }
        public string? SentenceDate { get; set; }
    }
}
