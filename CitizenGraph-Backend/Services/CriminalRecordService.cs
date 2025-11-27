using Neo4j.Driver;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CitizenGraph.Backend.Models;

namespace CitizenGraph.Backend.Services
{
    public class CriminalRecordService : ICriminalRecordService
    {
        private readonly IDriver _driver;

        public CriminalRecordService(IDriver driver)
        {
            _driver = driver;
        }

        public async Task<CriminalRecordDto> GetCriminalRecordByCccdAsync(string cccd)
        {
            var query = @"
                MATCH (p:Person {cccd: $cccd})

                OPTIONAL MATCH (p)-[:RECEIVED_SENTENCE]->(s:Sentence)
                OPTIONAL MATCH (s)-[:IMPRISONED_AT]->(prison:Prison)

                OPTIONAL MATCH (p)-[:SUSPECT_IN]->(case:CriminalCase)
                OPTIONAL MATCH (p)-[:VICTIM_IN]->(vcase:CriminalCase)
                OPTIONAL MATCH (p)-[:WITNESS_IN]->(wcase:CriminalCase)

                OPTIONAL MATCH (p)-[:HAS_MEDICAL_RECORD]->(mr:MedicalRecord)
                OPTIONAL MATCH (p)-[:HAS_CONDITION]->(cc:ChronicCondition)
                    WHERE cc.conditionName CONTAINS 'Tiền án' OR cc.conditionName CONTAINS 'tù tội' OR cc.conditionName CONTAINS 'Tiền sự'

                WITH p, s, prison, case, vcase, wcase, mr, cc

                RETURN {
                    cccd: p.cccd,
                    fullName: p.fullName,
                    ngaySinh: p.ngaySinh,
                    gioiTinh: p.gioiTinh,
                    hasCriminalRecord: count(s) > 0 
                        OR any(x IN collect(mr.hasCriminalRecord) WHERE x = true)
                        OR count(cc) > 0,
                    totalConvictions: count(s),
                    convictions: collect({
                        caseNumber: case.caseNumber,
                        crimeType: case.crimeType,
                        sentenceDate: s.sentenceDate,
                        prisonTerm: s.prisonTerm,
                        fineAmount: s.fineAmount,
                        prisonName: COALESCE(prison.prisonName, 'Chưa xác định'),
                        status: CASE 
                            WHEN s.releaseDate IS NULL THEN 'Đang thi hành án'
                            WHEN s.releaseDate > date() THEN 'Đang thi hành án'
                            ELSE 'Đã mãn hạn án'
                        END
                    }),
                    victimInCases: collect(DISTINCT vcase.caseNumber),
                    witnessInCases: collect(DISTINCT wcase.caseNumber),
                    chronicCriminalNotes: collect(DISTINCT cc.conditionName)
                } AS result";

            var parameters = new { cccd };

            await using var session = _driver.AsyncSession();
            var cursor = await session.RunAsync(query, parameters);
            var record = await cursor.SingleAsync();

            var raw = record["result"].As<INode>()["result"].As<IDictionary<string, object>>();

            return new CriminalRecordDto
            {
                Cccd = raw["cccd"].ToString(),
                FullName = raw["fullName"]?.ToString() ?? "Chưa có thông tin",
                NgaySinh = raw["ngaySinh"]?.ToString() ?? "",
                GioiTinh = raw["gioiTinh"]?.ToString() ?? "",
                HasCriminalRecord = (bool)raw["hasCriminalRecord"],
                TotalConvictions = (int)(long)raw["totalConvictions"],
                Convictions = ((List<object>)raw["convictions"]).Select(x =>
                {
                    var dict = x.As<IDictionary<string, object>>();
                    return new ConvictionDetailDto
                    {
                        CaseNumber = dict["caseNumber"]?.ToString() ?? "",
                        CrimeType = dict["crimeType"]?.ToString() ?? "",
                        SentenceDate = dict["sentenceDate"]?.ToString() ?? "",
                        PrisonTerm = dict["prisonTerm"]?.ToString() ?? "",
                        FineAmount = dict.ContainsKey("fineAmount") && dict["fineAmount"] != null 
                            ? (long?)Convert.ToInt64(dict["fineAmount"]) 
                            : null,
                        PrisonName = dict["prisonName"]?.ToString() ?? "",
                        Status = dict["status"]?.ToString() ?? ""
                    };
                }).ToList(),
                VictimInCases = ((List<object>)raw["victimInCases"]).Select(x => x?.ToString() ?? "").Where(s => !string.IsNullOrEmpty(s)).ToList(),
                WitnessInCases = ((List<object>)raw["witnessInCases"]).Select(x => x?.ToString() ?? "").Where(s => !string.IsNullOrEmpty(s)).ToList(),
                ChronicCriminalNotes = ((List<object>)raw["chronicCriminalNotes"]).Select(x => x?.ToString() ?? "").Where(s => !string.IsNullOrEmpty(s)).ToList()
            };
        }
    }
}