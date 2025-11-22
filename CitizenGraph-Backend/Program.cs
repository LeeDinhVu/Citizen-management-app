using CitizenGraph.Backend.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<Neo4jConnection>();

// Đăng ký repository dùng connection
builder.Services.AddScoped<Neo4jRepository>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Dev", p => p.WithOrigins("http://localhost:5173")
                                   .AllowAnyHeader()
                                   .AllowAnyMethod()
                                   .AllowCredentials());
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("Dev");
app.UseHttpsRedirection();
app.MapControllers();

app.Run();