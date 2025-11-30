using Neo4j.Driver;
using System.Text.Json;
using System.Text.RegularExpressions; // Thêm để validate regex

namespace CitizenGraph.Backend.Services
{
    // DTO trả về cho Frontend
    public class TraceGraphResult
    {
        public TraceNodeDto Root { get; set; }
        public List<TraceNodeDto> Nodes { get; set; } = new();
        public List<TraceEdgeDto> Edges { get; set; } = new();
    }

    public class TraceNodeDto
    {
        public string Id { get; set; }
        public string Label { get; set; }
        public string Group { get; set; } // F0, F1, Location...
        public Dictionary<string, object> Info { get; set; }
    }

    public class TraceEdgeDto
    {
        public string From { get; set; }
        public string To { get; set; }
        public string Label { get; set; }
        public Dictionary<string, object> Info { get; set; }
    }

    public class TraceService
    {
        private readonly Neo4jRepository _repo;

        public TraceService(Neo4jRepository repo)
        {
            _repo = repo;
        }

        public async Task<TraceGraphResult?> TraceInfectionAsync(string cccd)
        {
            // [THÊM MỚI] Validate đầu vào CCCD
            if (string.IsNullOrWhiteSpace(cccd) || !Regex.IsMatch(cccd, @"^\d{12}$"))
            {
                throw new ArgumentException("Số CCCD không hợp lệ. Phải bao gồm đúng 12 chữ số.");
            }

            // Query tìm F0 + F1 trực tiếp + F1 gián tiếp (qua địa điểm cùng ngày)
            var query = @"
                MATCH (f0:Person {cccd: $cccd})
                
                // 1. Tìm F1 trực tiếp (CONTACTED)
                OPTIONAL MATCH (f0)-[r1:CONTACTED]-(f1:Person)
                
                // 2. Tìm F1 gián tiếp (VISITED cùng địa điểm, cùng ngày)
                OPTIONAL MATCH (f0)-[v1:VISITED]->(loc:PublicLocation)<-[v2:VISITED]-(f2:Person)
                WHERE v1.visitDate = v2.visitDate

                WITH f0, 
                     collect(DISTINCT {n: f1, r: r1}) as directGroup,
                     collect(DISTINCT {loc: loc, p: f2, v1: v1, v2: v2}) as indirectGroup

                RETURN {
                    root: { id: toString(id(f0)), label: f0.hoTen, group: 'F0', info: properties(f0) },
                    
                    // Danh sách Node
                    nodes: 
                        [x in directGroup WHERE x.n IS NOT NULL | { id: toString(id(x.n)), label: x.n.hoTen, group: 'F1', info: properties(x.n) }] +
                        [x in indirectGroup WHERE x.loc IS NOT NULL | { id: toString(id(x.loc)), label: x.loc.name, group: 'Location', info: properties(x.loc) }] +
                        [x in indirectGroup WHERE x.p IS NOT NULL | { id: toString(id(x.p)), label: x.p.hoTen, group: 'F1_Indirect', info: properties(x.p) }],
                    
                    // Danh sách Edge
                    edges:
                        [x in directGroup WHERE x.r IS NOT NULL | { from: toString(id(f0)), to: toString(id(x.n)), label: 'CONTACTED', info: properties(x.r) }] +
                        [x in indirectGroup WHERE x.v1 IS NOT NULL | { from: toString(id(f0)), to: toString(id(x.loc)), label: 'VISITED', info: properties(x.v1) }] +
                        [x in indirectGroup WHERE x.v2 IS NOT NULL | { from: toString(id(x.p)), to: toString(id(x.loc)), label: 'VISITED', info: properties(x.v2) }]
                } as result
            ";

            var records = await _repo.RunAsync(query, new { cccd });
            
            if (records == null || records.Count == 0) return null;

            // Mapping dữ liệu từ Neo4j Record sang C# Object
            var rawData = records[0]["result"].As<Dictionary<string, object>>();
            var result = new TraceGraphResult();
            
            // Map Root
            var rootDict = rawData["root"] as Dictionary<string, object>;
            result.Root = MapNode(rootDict);
            if (result.Root == null) return null; // Nếu root lỗi thì trả về null luôn

            // Map Nodes (Dùng Dictionary để loại bỏ trùng lặp ID)
            var uniqueNodes = new Dictionary<string, TraceNodeDto>();
            uniqueNodes[result.Root.Id] = result.Root; 

            var rawNodes = rawData["nodes"] as List<object>;
            if (rawNodes != null)
            {
                foreach(var item in rawNodes)
                {
                    var node = MapNode(item as Dictionary<string, object>);
                    // [THÊM MỚI] Validate Node ID không được rỗng
                    if (node != null && !string.IsNullOrEmpty(node.Id) && !uniqueNodes.ContainsKey(node.Id))
                        uniqueNodes[node.Id] = node;
                }
            }
            result.Nodes = uniqueNodes.Values.ToList();

            // Map Edges
            var rawEdges = rawData["edges"] as List<object>;
            if (rawEdges != null)
            {
                foreach (var item in rawEdges)
                {
                    var dict = item as Dictionary<string, object>;
                    if (dict != null)
                    {
                        // [THÊM MỚI] Validate Edge phải có From và To hợp lệ
                        var fromId = dict.ContainsKey("from") ? dict["from"]?.ToString() : null;
                        var toId = dict.ContainsKey("to") ? dict["to"]?.ToString() : null;

                        if (!string.IsNullOrEmpty(fromId) && !string.IsNullOrEmpty(toId))
                        {
                            result.Edges.Add(new TraceEdgeDto
                            {
                                From = fromId,
                                To = toId,
                                Label = dict.ContainsKey("label") ? dict["label"]?.ToString() ?? "UNKNOWN" : "UNKNOWN",
                                Info = dict.ContainsKey("info") ? (dict["info"] as Dictionary<string, object> ?? new()) : new()
                            });
                        }
                    }
                }
            }

            return result;
        }

        private TraceNodeDto MapNode(Dictionary<string, object> dict)
        {
            if (dict == null) return null;
            
            // [THÊM MỚI] Validate dữ liệu node trả về từ DB
            var id = dict.ContainsKey("id") ? dict["id"]?.ToString() : null;
            if (string.IsNullOrEmpty(id)) return null; // Bỏ qua node không có ID

            return new TraceNodeDto
            {
                Id = id,
                Label = dict.ContainsKey("label") && dict["label"] != null ? dict["label"].ToString() : "Unknown",
                Group = dict.ContainsKey("group") && dict["group"] != null ? dict["group"].ToString() : "Other",
                Info = dict.ContainsKey("info") ? (dict["info"] as Dictionary<string, object> ?? new()) : new()
            };
        }
    }
}

// using Neo4j.Driver;
// using System.Text.Json;

// namespace CitizenGraph.Backend.Services
// {
//     // DTO trả về cho Frontend
//     public class TraceGraphResult
//     {
//         public TraceNodeDto Root { get; set; }
//         public List<TraceNodeDto> Nodes { get; set; } = new();
//         public List<TraceEdgeDto> Edges { get; set; } = new();
//     }

//     public class TraceNodeDto
//     {
//         public string Id { get; set; }
//         public string Label { get; set; }
//         public string Group { get; set; } // F0, F1, Location...
//         public Dictionary<string, object> Info { get; set; }
//     }

//     public class TraceEdgeDto
//     {
//         public string From { get; set; }
//         public string To { get; set; }
//         public string Label { get; set; }
//         public Dictionary<string, object> Info { get; set; }
//     }

//     public class TraceService
//     {
//         private readonly Neo4jRepository _repo;

//         public TraceService(Neo4jRepository repo)
//         {
//             _repo = repo;
//         }

//         public async Task<TraceGraphResult?> TraceInfectionAsync(string cccd)
//         {
//             // Query tìm F0 + F1 trực tiếp + F1 gián tiếp (qua địa điểm cùng ngày)
//             var query = @"
//                 MATCH (f0:Person {cccd: $cccd})
                
//                 // 1. Tìm F1 trực tiếp (CONTACTED)
//                 OPTIONAL MATCH (f0)-[r1:CONTACTED]-(f1:Person)
                
//                 // 2. Tìm F1 gián tiếp (VISITED cùng địa điểm, cùng ngày)
//                 OPTIONAL MATCH (f0)-[v1:VISITED]->(loc:PublicLocation)<-[v2:VISITED]-(f2:Person)
//                 WHERE v1.visitDate = v2.visitDate

//                 WITH f0, 
//                      collect(DISTINCT {n: f1, r: r1}) as directGroup,
//                      collect(DISTINCT {loc: loc, p: f2, v1: v1, v2: v2}) as indirectGroup

//                 RETURN {
//                     root: { id: toString(id(f0)), label: f0.hoTen, group: 'F0', info: properties(f0) },
                    
//                     // Danh sách Node
//                     nodes: 
//                         [x in directGroup WHERE x.n IS NOT NULL | { id: toString(id(x.n)), label: x.n.hoTen, group: 'F1', info: properties(x.n) }] +
//                         [x in indirectGroup WHERE x.loc IS NOT NULL | { id: toString(id(x.loc)), label: x.loc.name, group: 'Location', info: properties(x.loc) }] +
//                         [x in indirectGroup WHERE x.p IS NOT NULL | { id: toString(id(x.p)), label: x.p.hoTen, group: 'F1_Indirect', info: properties(x.p) }],
                    
//                     // Danh sách Edge
//                     edges:
//                         [x in directGroup WHERE x.r IS NOT NULL | { from: toString(id(f0)), to: toString(id(x.n)), label: 'CONTACTED', info: properties(x.r) }] +
//                         [x in indirectGroup WHERE x.v1 IS NOT NULL | { from: toString(id(f0)), to: toString(id(x.loc)), label: 'VISITED', info: properties(x.v1) }] +
//                         [x in indirectGroup WHERE x.v2 IS NOT NULL | { from: toString(id(x.p)), to: toString(id(x.loc)), label: 'VISITED', info: properties(x.v2) }]
//                 } as result
//             ";

//             var records = await _repo.RunAsync(query, new { cccd });
            
//             if (records == null || records.Count == 0) return null;

//             // Mapping dữ liệu từ Neo4j Record sang C# Object
//             var rawData = records[0]["result"].As<Dictionary<string, object>>();
//             var result = new TraceGraphResult();
            
//             // Map Root
//             var rootDict = rawData["root"] as Dictionary<string, object>;
//             result.Root = MapNode(rootDict);

//             // Map Nodes (Dùng Dictionary để loại bỏ trùng lặp ID)
//             var uniqueNodes = new Dictionary<string, TraceNodeDto>();
//             uniqueNodes[result.Root.Id] = result.Root; 

//             var rawNodes = rawData["nodes"] as List<object>;
//             if (rawNodes != null)
//             {
//                 foreach(var item in rawNodes)
//                 {
//                     var node = MapNode(item as Dictionary<string, object>);
//                     if (node != null && !uniqueNodes.ContainsKey(node.Id))
//                         uniqueNodes[node.Id] = node;
//                 }
//             }
//             result.Nodes = uniqueNodes.Values.ToList();

//             // Map Edges
//             var rawEdges = rawData["edges"] as List<object>;
//             if (rawEdges != null)
//             {
//                 foreach (var item in rawEdges)
//                 {
//                     var dict = item as Dictionary<string, object>;
//                     if (dict != null)
//                     {
//                         result.Edges.Add(new TraceEdgeDto
//                         {
//                             From = dict["from"].ToString(),
//                             To = dict["to"].ToString(),
//                             Label = dict["label"].ToString(),
//                             Info = dict["info"] as Dictionary<string, object> ?? new()
//                         });
//                     }
//                 }
//             }

//             return result;
//         }

//         private TraceNodeDto MapNode(Dictionary<string, object> dict)
//         {
//             if (dict == null) return null;
//             return new TraceNodeDto
//             {
//                 Id = dict["id"].ToString(),
//                 Label = dict.ContainsKey("label") && dict["label"] != null ? dict["label"].ToString() : "Unknown",
//                 Group = dict["group"].ToString(),
//                 Info = dict["info"] as Dictionary<string, object> ?? new()
//             };
//         }
//     }
// }