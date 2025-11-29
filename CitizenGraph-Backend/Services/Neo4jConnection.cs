// Services/Neo4jService.cs
// Services/Neo4jService.cs
using Neo4j.Driver;

namespace CitizenGraph.Backend.Services
{
    public class Neo4jConnection : IDisposable
    {
        private const string DATABASE_NAME = "quanlycongdanfinal-2025-11-22t05-47-57";

        private readonly IDriver _driver;
        public IDriver Driver => _driver;
        private bool _isConnected = false;

        public Neo4jConnection()
        {
            _driver = GraphDatabase.Driver(
                "bolt://127.0.0.1:7687",
                AuthTokens.Basic("neo4j", "12345678")
            );

            _ = TestConnectionAsync();
        }

        /// <summary>
        /// Session mặc định có chọn đúng database
        /// </summary>
        public IAsyncSession CreateSession()
        {
            return _driver.AsyncSession(o => o.WithDatabase(DATABASE_NAME));
        }

        /// <summary>
        /// Test kết nối chung
        /// </summary>
        public async Task<bool> TestConnectionAsync()
        {
            try
            {
                var session = _driver.AsyncSession();
                try
                {
                    var result = await session.RunAsync("RETURN 1");
                    await result.ToListAsync();
                    _isConnected = true;
                    return true;
                }
                finally
                {
                    await session.CloseAsync();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Lỗi kết nối Neo4j: {ex.Message}");
                _isConnected = false;
                return false;
            }
        }

        public bool IsConnected => _isConnected;

        public void Dispose() => _driver?.Dispose();
    }
}


// using Neo4j.Driver;

// namespace CitizenGraph.Backend.Services
// {
//     public class Neo4jService : IDisposable
//     {
//         private readonly IDriver _driver;
//         private bool _isConnected = false;

//         // 🔥 TÊN DATABASE của bạn — sửa tại đây nếu khác
//         private const string DATABASE_NAME = "quanlycongdanfinal-2025-11-22t05-47-57";

//         public Neo4jService()
//         {
//             // ❌ Sai: bolt://host/dbname  (Bolt không hỗ trợ)
//             // ✔️ Đúng: bolt://host:port
//             _driver = GraphDatabase.Driver(
//                 "bolt://127.0.0.1:7687",
//                 AuthTokens.Basic("neo4j", "quanlycongdan")
//             );

//             _ = TestConnectionAsync();
//         }

//         public async Task<bool> TestConnectionAsync()
//         {
//             try
//             {
//                 // ✔️ chỉ test kết nối, không cần chọn DB
//                 var session = _driver.AsyncSession();
//                 try
//                 {
//                     var result = await session.RunAsync("RETURN 1");
//                     await result.ToListAsync();
//                     _isConnected = true;
//                     return true;
//                 }
//                 finally
//                 {
//                     await session.CloseAsync();
//                 }
//             }
//             catch (Exception ex)
//             {
//                 Console.WriteLine($"❌ Lỗi kết nối Neo4j: {ex.Message}");
//                 _isConnected = false;
//                 return false;
//             }
//         }

//         /// <summary>
//         /// Lấy thông tin database tương thích Neo4j 5
//         /// </summary>
//         public async Task<DatabaseInfo> GetDatabaseInfoAsync()
//         {
//             var info = new DatabaseInfo();

//             // 🔥 MỌI QUERY cần chọn đúng database
//             var session = _driver.AsyncSession(o => o.WithDatabase(DATABASE_NAME));

//             try
//             {
//                 // VERSION
//                 var versionResult = await session.RunAsync(
//                     "CALL dbms.components() YIELD name, versions RETURN versions[0] AS version"
//                 );
//                 var versionRecords = await versionResult.ToListAsync();
//                 if (versionRecords.Count > 0)
//                     info.Version = versionRecords[0]["version"].As<string>();

//                 // NODE COUNT
//                 var nodeResult = await session.RunAsync(
//                     "MATCH (n) RETURN count(n) AS count"
//                 );
//                 var nodeRecords = await nodeResult.ToListAsync();
//                 info.NodeCount = nodeRecords.Count > 0
//                     ? nodeRecords[0]["count"].As<long>()
//                     : 0;

//                 // RELATIONSHIP COUNT
//                 var relResult = await session.RunAsync(
//                     "MATCH ()-[r]->() RETURN count(r) AS count"
//                 );
//                 var relRecords = await relResult.ToListAsync();
//                 info.RelationshipCount = relRecords.Count > 0
//                     ? relRecords[0]["count"].As<long>()
//                     : 0;

//                 // LABELS
//                 var labelResult = await session.RunAsync(
//                     "CALL db.labels() YIELD label RETURN label"
//                 );
//                 var labelRecords = await labelResult.ToListAsync();
//                 info.Labels = labelRecords
//                     .Select(r => r["label"].As<string>())
//                     .ToList();
//             }
//             catch (Exception ex)
//             {
//                 Console.WriteLine($"❌ Lỗi lấy thông tin DB: {ex.Message}");
//             }
//             finally
//             {
//                 await session.CloseAsync();
//             }

//             return info;
//         }

//         public async Task<List<IRecord>> RunAsync(string query, object? parameters = null)
//         {
//             // 🔥 Mọi query khác cũng phải chọn đúng DB
//             var session = _driver.AsyncSession(o => o.WithDatabase(DATABASE_NAME));
//             try
//             {
//                 var result = await session.RunAsync(query, parameters ?? new { });
//                 return await result.ToListAsync();
//             }
//             finally
//             {
//                 await session.CloseAsync();
//             }
//         }

//         public bool IsConnected => _isConnected;

//         public void Dispose() => _driver?.Dispose();
//     }

//     public class DatabaseInfo
//     {
//         public string? Version { get; set; }
//         public long NodeCount { get; set; }
//         public long RelationshipCount { get; set; }
//         public List<string> Labels { get; set; } = new();
//     }
// }



// using Neo4j.Driver;

// namespace CitizenGraph.Backend.Services
// {
//     public class Neo4jService : IDisposable
//     {
//         private readonly IDriver _driver;
//         private bool _isConnected = false;

//         public Neo4jService()
//         {
//             // Neo4j Desktop Connection
//             _driver = GraphDatabase.Driver("neo4j://127.0.0.1:7687/quanlycongdanfinal-2025-11-22t05-47-57", AuthTokens.Basic("neo4j", "quanlycongdan"));
            
//             // Test connection khi khởi tạo
//             _ = TestConnectionAsync();
//         }

//         /// <summary>
//         /// Test kết nối tới Neo4j server
//         /// </summary>
//         public async Task<bool> TestConnectionAsync()
//         {
//             try
//             {
//                 var session = _driver.AsyncSession();
//                 try
//                 {
//                     var result = await session.RunAsync("RETURN 1");
//                     await result.ToListAsync();
//                     _isConnected = true;
//                     return true;
//                 }
//                 finally
//                 {
//                     await session.CloseAsync();
//                 }
//             }
//             catch (Exception ex)
//             {
//                 Console.WriteLine($"❌ Lỗi kết nối Neo4j: {ex.Message}");
//                 _isConnected = false;
//                 return false;
//             }
//         }

//         /// <summary>
//         /// Lấy thông tin về database
//         /// </summary>
//         public async Task<DatabaseInfo> GetDatabaseInfoAsync()
//         {
//             var info = new DatabaseInfo();
            
//             var session = _driver.AsyncSession();
//             try
//             {
//                 // Lấy version
//                 var versionResult = await session.RunAsync("CALL db.info() YIELD version RETURN version");
//                 var versionRecords = await versionResult.ToListAsync();
//                 if (versionRecords.Count > 0)
//                     info.Version = versionRecords[0]["version"].As<string>();

//                 // Đếm nodes
//                 var nodeResult = await session.RunAsync("MATCH (n) RETURN count(n) AS count");
//                 var nodeRecords = await nodeResult.ToListAsync();
//                 info.NodeCount = nodeRecords[0]["count"].As<long>();

//                 // Đếm relationships
//                 var relResult = await session.RunAsync("MATCH ()-[r]->() RETURN count(r) AS count");
//                 var relRecords = await relResult.ToListAsync();
//                 info.RelationshipCount = relRecords[0]["count"].As<long>();

//                 // Labels (Neo4j 5)
//                 var labelResult = await session.RunAsync("SHOW LABELS YIELD label RETURN label");
//                 var labelRecords = await labelResult.ToListAsync();
//                 info.Labels = labelRecords.Select(r => r["label"].As<string>()).ToList();
//             }
//             catch (Exception ex)
//             {
//                 Console.WriteLine($"❌ Lỗi lấy thông tin DB: {ex.Message}");
//             }
//             finally
//             {
//                 await session.CloseAsync();
//             }

//             return info;
//         }

//         /// <summary>
//         /// Chạy query Cypher
//         /// </summary>
//         public async Task<List<IRecord>> RunAsync(string query, object? parameters = null)
//         {
//             var session = _driver.AsyncSession();
//             try
//             {
//                 var result = await session.RunAsync(query, parameters ?? new { });
//                 return await result.ToListAsync();
//             }
//             finally
//             {
//                 await session.CloseAsync();
//             }
//         }

//         /// <summary>
//         /// Kiểm tra xem có kết nối không
//         /// </summary>
//         public bool IsConnected => _isConnected;

//         public void Dispose() => _driver?.Dispose();
//     }

//     /// <summary>
//     /// Model chứa thông tin database
//     /// </summary>
//     public class DatabaseInfo
//     {
//         public string? Version { get; set; }
//         public long NodeCount { get; set; }
//         public long RelationshipCount { get; set; }
//         public List<string> Labels { get; set; } = new();
//     }
// }