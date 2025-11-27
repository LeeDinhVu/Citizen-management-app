public class CrimeGraphDto
{
    public List<GraphNode> nodes { get; set; } = new();
    public List<GraphLink> links { get; set; } = new();
}

public class GraphNode
{
    public string id { get; set; } = "";
    public string label { get; set; } = "";
    public Dictionary<string, object> properties { get; set; } = new();
}

public class GraphLink
{
    public string source { get; set; } = "";
    public string target { get; set; } = "";
    public string type { get; set; } = "";
}
