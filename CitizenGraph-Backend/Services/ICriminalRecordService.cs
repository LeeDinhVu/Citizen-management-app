using System.Threading.Tasks;

namespace CitizenGraph.Backend.Services
{
    public interface ICriminalRecordService
    {
        Task<CriminalRecordDto> GetCriminalRecordByCccdAsync(string cccd);
    }

    public class CriminalRecordDto
    {
        public string Cccd { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string NgaySinh { get; set; } = string.Empty;
        public string GioiTinh { get; set; } = string.Empty;
        public bool HasCriminalRecord { get; set; }
        public int TotalConvictions { get; set; }
        public List<ConvictionDetailDto> Convictions { get; set; } = new();
        public List<string> VictimInCases { get; set; } = new();
        public List<string> WitnessInCases { get; set; } = new();
        public List<string> ChronicCriminalNotes { get; set; } = new();
    }

    public class ConvictionDetailDto
    {
        public string CaseNumber { get; set; } = string.Empty;
        public string CrimeType { get; set; } = string.Empty;
        public string SentenceDate { get; set; } = string.Empty;
        public string PrisonTerm { get; set; } = string.Empty;
        public long? FineAmount { get; set; }
        public string PrisonName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // Đang thi hành / Đã mãn hạn
    }
}