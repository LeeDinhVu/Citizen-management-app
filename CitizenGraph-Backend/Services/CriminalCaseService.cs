using CitizenGraph.Backend.Models;
using Neo4j.Driver;

namespace CitizenGraph.Backend.Services
{
    public class CriminalCaseService
    {
        private readonly Neo4jRepository1 _repo;

        public CriminalCaseService(Neo4jRepository1 repo)
        {
            _repo = repo;
        }

        // =========================
        // GET ALL CASES
        // =========================
        public async Task<List<CriminalCaseDto>> GetAllCasesAsync()
        {
            string query = @"
            MATCH (c:CriminalCase)
            RETURN c AS result
            ORDER BY c.occurredDate DESC
            ";

            return await _repo.QueryList<CriminalCaseDto>(query);
        }

        // =========================
        // GET CASE BY ID
        // =========================
        public async Task<CriminalCaseDto?> GetCaseByIdAsync(string caseId)
        {
            string query = @"
                MATCH (c:CriminalCase {caseId: $caseId})
                RETURN c AS result
            ";

            return await _repo.QuerySingle<CriminalCaseDto>(query, new { caseId });
        }

        // =========================
        // UPDATE CASE
        // =========================
        public async Task<bool> UpdateCaseAsync(CriminalCaseDto caseDto)
        {
            string query = @"
                MATCH (c:CriminalCase {caseId: $caseId})
                SET c.caseNumber    = $caseNumber,
                    c.crimeType     = $crimeType,
                    c.description   = $description,
                    c.occurredDate  = date($occurredDate),
                    c.reportedDate  = date($reportedDate),
                    c.location      = $location,
                    c.status        = $status   
                RETURN c
            ";

            var records = await _repo.RunAsync(query, new 
            { 
                caseId = caseDto.CaseId,
                caseNumber = caseDto.CaseNumber,
                crimeType = caseDto.CrimeType,
                description = caseDto.Description,
                occurredDate = caseDto.OccurredDate,
                reportedDate = caseDto.ReportedDate,
                location = caseDto.Location,
                status = caseDto.Status
            });
            
            return records.Count > 0;
        }

        // =========================
        // SEARCH
        // =========================
        public async Task<List<CriminalCaseDto>> SearchCasesAsync(SearchCrimeRequest req)
        {
            string query = @"
            MATCH (c:CriminalCase)
            WHERE ($CaseId    IS NULL OR c.caseId     = $CaseId)
              AND ($CrimeType IS NULL OR c.crimeType  = $CrimeType)
              AND ($Status    IS NULL OR c.status     = $Status)
              AND ($Location  IS NULL OR c.location   = $Location)
              AND ($FromDate  IS NULL OR c.occurredDate >= date($FromDate))
              AND ($ToDate    IS NULL OR c.occurredDate <= date($ToDate))

            RETURN c AS result
            ORDER BY c.occurredDate DESC
            ";

            return await _repo.QueryList<CriminalCaseDto>(query, req);
        }

        // =========================
        // CRIME GRAPH
        // =========================
        // THAY TOÀN BỘ METHOD NÀY TRONG CriminalCaseService
        public async Task<CrimeGraphDto> GetCaseGraphAsync(string caseId)
        {
            const string query = @"
                MATCH (c:CriminalCase {caseId: $caseId})
                WITH c, elementId(c) AS caseNodeId
                OPTIONAL MATCH (p:Person)-[r:SUSPECT_IN|VICTIM_IN|WITNESS_IN]-(c)
                WHERE r IS NOT NULL
                WITH c, caseNodeId, p, r
                WITH c, caseNodeId,
                    collect(DISTINCT {
                        id: elementId(p),
                        label: coalesce(p.fullName, p.cccd, 'Chưa xác định'),
                        displayName: coalesce(p.fullName, 'Chưa xác định'),
                        cccd: p.cccd,
                        role: CASE type(r)
                            WHEN 'SUSPECT_IN' THEN 'Nghi phạm'
                            WHEN 'VICTIM_IN' THEN 'Nạn nhân'
                            WHEN 'WITNESS_IN' THEN 'Nhân chứng'
                            ELSE 'Khác'
                        END
                    }) AS people,
                    collect(DISTINCT {
                        source: elementId(p),
                        target: caseNodeId,
                        type: type(r)
                    }) AS links
                RETURN {
                    nodes: [{
                        id: caseNodeId,
                        label: 'Vụ án ' + coalesce(c.caseNumber, c.caseId),
                        displayName: 'Vụ án ' + coalesce(c.caseNumber, c.caseId),
                        role: 'Vụ án'
                    }] + people,
                    links: links
                } AS result
            ";

            var result = await _repo.QuerySingle<CrimeGraphDto>(query, new { caseId });
            return result ?? new CrimeGraphDto { nodes = new(), links = new() };
        }


        // =========================
        // CRIME HEATMAP
        // =========================
        public async Task<List<CrimeHeatmapDto>> GetCrimeHeatmapAsync()
        {
            string query = @"
                MATCH (c:CriminalCase)
                OPTIONAL MATCH (c)-[:OCCURRED_AT]->(d:District)
                WITH d, count(c) AS count
                WHERE d IS NOT NULL
                RETURN d.name AS name, count AS value
                ORDER BY value DESC
            ";

            return await _repo.QueryList<CrimeHeatmapDto>(query);
        }
        // =========================
        // PERSON CRIME HISTORY
        // =========================
        public async Task<List<PersonCrimeDto>> GetPersonHistoryAsync(string cccd)
        {
            string query = @"
                MATCH (p:Person {cccd: $cccd})
                OPTIONAL MATCH (p)-[r:SUSPECT_IN]->(c:CriminalCase)
                WITH p, r AS rel, c
                WHERE c IS NOT NULL
                
                OPTIONAL MATCH (p)-[rv:VICTIM_IN]->(c)
                WITH p, c,
                    CASE 
                        WHEN rel IS NOT NULL THEN 'SUSPECT'
                        WHEN rv IS NOT NULL THEN 'VICTIM'
                        ELSE null
                    END AS role
                
                OPTIONAL MATCH (p)-[rw:WITNESS_IN]->(c)
                WITH p, c,
                    CASE 
                        WHEN role IS NOT NULL THEN role     // SUSPECT hoặc VICTIM
                        WHEN rw IS NOT NULL THEN 'WITNESS'
                        ELSE 'UNKNOWN'
                    END AS finalRole

                OPTIONAL MATCH (p)-[:IMPRISONED_AT]->(prison:Prison)
                OPTIONAL MATCH (p)-[:RECEIVED_SENTENCE]->(s:Sentence)

                RETURN {
                    personId: p.personId,
                    fullName: p.fullName,
                    cccd: p.cccd,
                    caseId: c.caseId,
                    caseNumber: c.caseNumber,
                    crimeType: c.crimeType,
                    severity: c.severity,
                    status: c.status,
                    occurredDate: c.occurredDate,
                    role: finalRole,
                    prisonName: prison.name,
                    sentenceType: s.type,
                    sentenceDate: s.sentenceDate
                } AS result

                ORDER BY c.occurredDate DESC
            ";

            return await _repo.QueryList<PersonCrimeDto>(query, new { cccd });

        }

        // =========================
        // CREATE NEW CASE
        // =========================
        public async Task<CriminalCaseDto> CreateCaseAsync(CreateCriminalCaseRequest req)
        {
            string caseId = "CASE_" + DateTime.Now.ToString("yyyyMMddHHmmssfff");

            var parameters = new
            {
                caseId,
                caseNumber = req.CaseNumber,
                crimeType = req.CrimeType,
                description = req.Description,
                occurredDate = req.OccurredDate,                           // "2025-11-20"
                reportedDate = req.ReportedDate,                           // null hoặc "2025-11-25"
                location = req.Location,
                status = req.Status ?? "Đang điều tra",
                suspects = req.SuspectCccds,
                victims = req.VictimCccds,
                witnesses = req.WitnessCccds
            };

            string query = @"
                CREATE (c:CriminalCase {
                    caseId: $caseId,
                    caseNumber: $caseNumber,
                    crimeType: $crimeType,
                    description: $description,
                    occurredDate: date($occurredDate),
                    reportedDate: CASE WHEN $reportedDate IS NOT NULL THEN date($reportedDate) ELSE null END,
                    location: $location,
                    status: $status,
                    createdAt: datetime()
                })

                WITH c
                FOREACH (cccd IN $suspects   | 
                    MERGE (p:Person {cccd: cccd}) 
                    MERGE (p)-[:SUSPECT_IN {confirmed: false}]->(c)
                )
                FOREACH (cccd IN $victims    | 
                    MERGE (p:Person {cccd: cccd}) 
                    MERGE (p)-[:VICTIM_IN]->(c)
                )
                FOREACH (cccd IN $witnesses  | 
                    MERGE (p:Person {cccd: cccd}) 
                    MERGE (p)-[:WITNESS_IN]->(c)
                )

                RETURN c {
                    .*,
                    occurredDate: toString(c.occurredDate),
                    reportedDate: toString(c.reportedDate)
                } AS result
            ";

            var result = await _repo.QuerySingle<CriminalCaseDto>(query, parameters);

            if (result == null)
                throw new Exception("Tạo vụ án thất bại");

            return result;
        }
        // THAY TOÀN BỘ METHOD NÀY
        public async Task<List<PersonInCaseDto>> GetPeopleInCaseAsync(string caseId)
        {
            string query = @"
                MATCH (c:CriminalCase {caseId: $caseId})
                MATCH (p:Person)-[r:SUSPECT_IN|VICTIM_IN|WITNESS_IN]-(c)
                RETURN 
                    p.cccd AS cccd,
                    coalesce(p.fullName, 'Chưa xác định') AS fullName,
                    CASE type(r)
                        WHEN 'SUSPECT_IN' THEN 'Nghi phạm'
                        WHEN 'VICTIM_IN'   THEN 'Nạn nhân'
                        WHEN 'WITNESS_IN'  THEN 'Nhân chứng'
                        ELSE 'Khác'
                    END AS role
                ORDER BY role = 'Nghi phạm' DESC, role = 'Nạn nhân' DESC, fullName
            ";

            return await _repo.QueryList<PersonInCaseDto>(query, new { caseId });
        }
    }
}
