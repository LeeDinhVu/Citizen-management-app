using Neo4j.Driver;
using System.Text.Json;

namespace CitizenGraph.Backend.Services
{
    public class Neo4jRepository1
    {
        private readonly Neo4jConnection _connection;

        public Neo4jRepository1(Neo4jConnection connection)
        {
            _connection = connection;
        }

        // =============================
        // 1. LẤY THÔNG TIN DATABASE
        // =============================
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

        // =============================
        // 2. RUN QUERY TÙY Ý
        // =============================
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

        // =============================
        // 3. QUERY LIST (TRẢ VỀ DANH SÁCH T)
        // =============================
        public async Task<List<T>> QueryList<T>(string query, object? parameters = null)
        {
            var records = await RunAsync(query, parameters);
            var list = new List<T>();

            foreach (var record in records)
            {
                if (record["result"] is INode node)
                {
                    list.Add(MapToDto<T>(node));
                }
                else if (record["result"] is IReadOnlyDictionary<string, object> dict)
                {
                    list.Add(MapDictionaryToDto<T>(dict));
                }
            }

            return list;
        }

        // =============================
        // 4. QUERY SINGLE (TRẢ VỀ 1 OBJECT)
        // =============================
        public async Task<T?> QuerySingle<T>(string query, object? parameters = null)
        {
            var records = await RunAsync(query, parameters);

            if (records.Count == 0)
                return default;

            var record = records[0];
            
            // Try to get 'result' key first, if not present get first key
            object value;
            if (record.Keys.Contains("result"))
            {
                value = record["result"];
            }
            else if (record.Keys.Count > 0)
            {
                // Get first available key if 'result' not present
                value = record[record.Keys[0]];
            }
            else
            {
                return default;
            }

            // Nếu value là INode, map sang DTO
            if (value is INode node)
            {
                return MapToDto<T>(node);
            }

            // Nếu value là Dictionary, serialize JSON trực tiếp
            if (value is IReadOnlyDictionary<string, object> dict)
            {
                var json = JsonSerializer.Serialize(dict);
                return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
            }

            // Fallback
            var fallbackJson = JsonSerializer.Serialize(value);
            return JsonSerializer.Deserialize<T>(fallbackJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }

        // =============================
        // 5. MAP NODE → DTO
        // =============================
        private T MapToDto<T>(INode node)
        {
            var dto = Activator.CreateInstance<T>();
            var props = node.Properties;

            foreach (var p in typeof(T).GetProperties())
            {
                // Try camelCase first (Neo4j convention)
                string neo4jKey = char.ToLowerInvariant(p.Name[0]) + p.Name.Substring(1);

                object? value = null;
                if (props.ContainsKey(neo4jKey))
                {
                    value = props[neo4jKey];
                }
                // Fallback to exact property name match
                else if (props.ContainsKey(p.Name))
                {
                    value = props[p.Name];
                }
                
                if (value != null)
                {
                    if (value is Neo4j.Driver.LocalDate localDate)
                    {
                        p.SetValue(dto, localDate.ToString());
                    }
                    else
                    {
                        p.SetValue(dto, value.ToString());
                    }
                }
            }

            return dto;
        }

        // =============================
        // 6. MAP DICTIONARY → DTO
        // =============================
        private T MapDictionaryToDto<T>(IReadOnlyDictionary<string, object> dict)
        {
            var dto = Activator.CreateInstance<T>();

            foreach (var prop in typeof(T).GetProperties())
            {
                foreach (var key in dict.Keys)
                {
                    if (string.Equals(key, prop.Name, StringComparison.OrdinalIgnoreCase))
                    {
                        prop.SetValue(dto, dict[key]?.ToString());
                    }
                }
            }

            return dto;
        }

        // =============================
        // 7. DATABASE INFO MODEL
        // =============================
        public class DatabaseInfo
        {
            public string? Version { get; set; }
            public long NodeCount { get; set; }
            public long RelationshipCount { get; set; }
            public List<string> Labels { get; set; } = new();
        }
    }
}
