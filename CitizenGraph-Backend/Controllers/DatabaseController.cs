using CitizenGraph.Backend.Services;
using Microsoft.AspNetCore.Mvc;
using Neo4j.Driver;

namespace CitizenGraph.Backend.Controllers
{
    [ApiController]
    [Route("api/database")]
    public class DatabaseController : ControllerBase
    {
        private readonly Neo4jRepository _neo4j;
        private readonly ILogger<DatabaseController> _logger;

        public DatabaseController(Neo4jRepository neo4j, ILogger<DatabaseController> logger)
        {
            _neo4j = neo4j;
            _logger = logger;
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            try
            {
                _logger.LogInformation("🔍 Checking Neo4j connection status...");

                // Test connection
                bool isConnected = await _neo4j.RunAsync("RETURN 1") != null;

                if (!isConnected)
                {
                    return Ok(new
                    {
                        isConnected = false,
                        message = "❌ Không thể kết nối tới Neo4j server. Kiểm tra credentials và server đang chạy chưa.",
                        databaseInfo = (object?)null
                    });
                }

                var dbInfo = await _neo4j.GetDatabaseInfoAsync();

                _logger.LogInformation("✅ Connected to Neo4j successfully");

                return Ok(new
                {
                    isConnected = true,
                    message = "✅ Kết nối Neo4j thành công",
                    databaseInfo = new
                    {
                        version = dbInfo.Version,
                        nodeCount = dbInfo.NodeCount,
                        relationshipCount = dbInfo.RelationshipCount,
                        labels = dbInfo.Labels
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error checking database status");
                return Ok(new
                {
                    isConnected = false,
                    message = $"❌ Lỗi: {ex.Message}",
                    databaseInfo = (object?)null
                });
            }
        }

        [HttpGet("info")]
        public async Task<IActionResult> GetDatabaseInfo()
        {
            try
            {
                var dbInfo = await _neo4j.GetDatabaseInfoAsync();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        version = dbInfo.Version,
                        nodeCount = dbInfo.NodeCount,
                        relationshipCount = dbInfo.RelationshipCount,
                        labels = dbInfo.Labels
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error getting database info");
                return BadRequest(new { success = false, error = ex.Message });
            }
        }

        [HttpPost("query")]
        public async Task<IActionResult> RunQuery([FromBody] QueryRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Cypher))
                return BadRequest(new { success = false, error = "Cypher query không được để trống" });

            try
            {
                _logger.LogInformation($"🔍 Running query: {request.Cypher}");

                // Chuyển parameters sang IDictionary<string, object> nếu cần
                var parameters = request.Parameters as IDictionary<string, object>
                                 ?? new Dictionary<string, object>();

                var records = await _neo4j.RunAsync(request.Cypher, parameters);

                var result = records.Select(r =>
                {
                    var dict = new Dictionary<string, object?>();
                    foreach (var key in r.Keys)
                    {
                        dict[key] = r[key] is null ? null : r[key];
                    }
                    return dict;
                }).ToList();

                return Ok(new
                {
                    success = true,
                    data = result,
                    count = result.Count
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error running query");
                return BadRequest(new { success = false, error = ex.Message });
            }
        }
    }

    public class QueryRequest
    {
        public string Cypher { get; set; } = string.Empty;
        public object? Parameters { get; set; }
    }
}


// using CitizenGraph.Backend.Services;
// using Microsoft.AspNetCore.Mvc;

// namespace CitizenGraph.Backend.Controllers
// {
//     /// <summary>
//     /// API Controller cho quản lý kết nối database
//     /// Endpoint: /api/database
//     /// </summary>
//     [ApiController]
//     [Route("api/database")]
//     public class DatabaseController : ControllerBase
//     {
//         private readonly Neo4jService _neo4j;
//         private readonly ILogger<DatabaseController> _logger;

//         public DatabaseController(Neo4jService neo4j, ILogger<DatabaseController> logger)
//         {
//             _neo4j = neo4j;
//             _logger = logger;
//         }

//         /// <summary>
//         /// Kiểm tra trạng thái kết nối Neo4j
//         /// GET: /api/database/status
//         /// </summary>
//         [HttpGet("status")]
//         public async Task<IActionResult> GetStatus()
//         {
//             try
//             {
//                 _logger.LogInformation("🔍 Checking Neo4j connection status...");

//                 // Test connection
//                 bool isConnected = await _neo4j.TestConnectionAsync();

//                 if (!isConnected)
//                 {
//                     return Ok(new
//                     {
//                         isConnected = false,
//                         message = "❌ Không thể kết nối tới Neo4j server. Kiểm tra credentials và server đang chạy chưa.",
//                         databaseInfo = (object?)null
//                     });
//                 }

//                 // Lấy thông tin database
//                 var dbInfo = await _neo4j.GetDatabaseInfoAsync();

//                 _logger.LogInformation("✅ Connected to Neo4j successfully");
//                 _logger.LogInformation($"📊 Database Info: Version={dbInfo.Version}, Nodes={dbInfo.NodeCount}, Relationships={dbInfo.RelationshipCount}");

//                 return Ok(new
//                 {
//                     isConnected = true,
//                     message = "✅ Kết nối Neo4j thành công",
//                     databaseInfo = new
//                     {
//                         version = dbInfo.Version,
//                         nodeCount = dbInfo.NodeCount,
//                         relationshipCount = dbInfo.RelationshipCount,
//                         labels = dbInfo.Labels
//                     }
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError($"❌ Error checking database status: {ex.Message}");
                
//                 return Ok(new
//                 {
//                     isConnected = false,
//                     message = $"❌ Lỗi: {ex.Message}",
//                     databaseInfo = (object?)null
//                 });
//             }
//         }

//         /// <summary>
//         /// Lấy chi tiết thông tin database
//         /// GET: /api/database/info
//         /// </summary>
//         [HttpGet("info")]
//         public async Task<IActionResult> GetDatabaseInfo()
//         {
//             try
//             {
//                 _logger.LogInformation("📊 Fetching database information...");

//                 var dbInfo = await _neo4j.GetDatabaseInfoAsync();

//                 return Ok(new
//                 {
//                     success = true,
//                     data = new
//                     {
//                         version = dbInfo.Version,
//                         nodeCount = dbInfo.NodeCount,
//                         relationshipCount = dbInfo.RelationshipCount,
//                         labels = dbInfo.Labels
//                     }
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError($"❌ Error getting database info: {ex.Message}");
//                 return BadRequest(new { success = false, error = ex.Message });
//             }
//         }

//         /// <summary>
//         /// Chạy query Cypher custom
//         /// POST: /api/database/query
//         /// </summary>
//         [HttpPost("query")]
//         public async Task<IActionResult> RunQuery([FromBody] QueryRequest request)
//         {
//             try
//             {
//                 if (string.IsNullOrEmpty(request.Cypher))
//                 {
//                     return BadRequest(new { success = false, error = "Cypher query không được để trống" });
//                 }

//                 _logger.LogInformation($"🔍 Running query: {request.Cypher}");

//                 var records = await _neo4j.RunAsync(request.Cypher, request.Parameters);

//                 var result = records.Select(r => 
//                 {
//                     var dict = new Dictionary<string, object?>();
//                     foreach (var key in r.Keys)
//                     {
//                         try
//                         {
//                             dict[key] = r[key];
//                         }
//                         catch
//                         {
//                             dict[key] = r[key].ToString();
//                         }
//                     }
//                     return dict;
//                 }).ToList();

//                 return Ok(new
//                 {
//                     success = true,
//                     data = result,
//                     count = result.Count
//                 });
//             }
//             catch (Exception ex)
//             {
//                 _logger.LogError($"❌ Error running query: {ex.Message}");
//                 return BadRequest(new { success = false, error = ex.Message });
//             }
//         }
//     }

//     /// <summary>
//     /// Model cho request query
//     /// </summary>
//     public class QueryRequest
//     {
//         public string Cypher { get; set; } = string.Empty;
//         public object? Parameters { get; set; }
//     }
// }
