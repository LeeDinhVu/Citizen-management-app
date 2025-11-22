using Neo4j.Driver;

namespace CitizenGraph.Backend.Services
{
    public class Neo4jRepository
    {
        private readonly Neo4jConnection _connection;

        public Neo4jRepository(Neo4jConnection connection)
        {
            _connection = connection;
        }

        /// <summary>
        /// Lấy thông tin database
        /// </summary>
        public async Task<DatabaseInfo> GetDatabaseInfoAsync()
        {
            var info = new DatabaseInfo();
            var session = _connection.CreateSession();

            try
            {
                // VERSION
                var versionResult = await session.RunAsync(
                    "CALL dbms.components() YIELD name, versions RETURN versions[0] AS version"
                );
                var versionRecords = await versionResult.ToListAsync();
                if (versionRecords.Count > 0)
                    info.Version = versionRecords[0]["version"].As<string>();

                // NODE COUNT
                var nodeResult = await session.RunAsync(
                    "MATCH (n) RETURN count(n) AS count"
                );
                info.NodeCount = (await nodeResult.ToListAsync())[0]["count"].As<long>();

                // REL COUNT
                var relResult = await session.RunAsync(
                    "MATCH ()-[r]->() RETURN count(r) AS count"
                );
                info.RelationshipCount = (await relResult.ToListAsync())[0]["count"].As<long>();

                // LABELS
                var labelResult = await session.RunAsync(
                    "CALL db.labels() YIELD label RETURN label"
                );
                info.Labels = (await labelResult.ToListAsync())
                    .Select(r => r["label"].As<string>())
                    .ToList();
            }
            finally
            {
                await session.CloseAsync();
            }

            return info;
        }

        /// <summary>
        /// Chạy query Cypher tùy ý
        /// </summary>
        public async Task<List<IRecord>> RunAsync(string query, object? parameters = null)
        {
            var session = _connection.CreateSession();

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
    }

    public class DatabaseInfo
    {
        public string? Version { get; set; }
        public long NodeCount { get; set; }
        public long RelationshipCount { get; set; }
        public List<string> Labels { get; set; } = new();
    }
}
