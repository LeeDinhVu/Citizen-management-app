using Neo4j.Driver;
using Microsoft.Extensions.Configuration;

namespace CitizenGraph.Backend.Services
{
    // 👇 QUAN TRỌNG: Tên class phải là Neo4jService (khớp với Controller)
    public class Neo4jService : IDisposable
    {
        private readonly IDriver _driver;
        private readonly string _databaseName;

        public Neo4jService(IConfiguration configuration)
        {
            // Đọc từ appsettings.json
            var uri = configuration["Neo4j:Uri"] ?? "bolt://localhost:7687";
            var user = configuration["Neo4j:Username"] ?? "neo4j";
            var pass = configuration["Neo4j:Password"] ?? "quanlycongdan";
            _databaseName = configuration["Neo4j:Database"] ?? "quanlycongdanfinal-2025-11-22t05-47-57";

            _driver = GraphDatabase.Driver(uri, AuthTokens.Basic(user, pass));
        }

        public IAsyncSession CreateSession()
        {
            return _driver.AsyncSession(o => o.WithDatabase(_databaseName));
        }

        public async Task<List<IRecord>> RunAsync(string query, object? parameters = null)
        {
            var session = CreateSession();
            try
            {
                var result = await session.RunAsync(query, parameters ?? new { });
                return await result.ToListAsync();
            }
            finally
            {
                await session.CloseAsync();
            }
        }

        public void Dispose()
        {
            _driver?.Dispose();
        }
    }
}