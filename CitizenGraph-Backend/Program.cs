using CitizenGraph.Backend.Services;
using System.Text.Json.Serialization;
using Neo4j.Driver;

var builder = WebApplication.CreateBuilder(args);

// 1. Cấu hình Services
builder.Services.AddSingleton<IDriver>(sp => 
    GraphDatabase.Driver("bolt://127.0.0.1:7687", AuthTokens.Basic("neo4j", "quanlycongdan")));
builder.Services.AddSingleton<Neo4jConnection>();
builder.Services.AddScoped<Neo4jRepository>();
builder.Services.AddScoped<AdminActionLogger>();
builder.Services.AddScoped<ResidencyService>();
builder.Services.AddScoped<ICriminalRecordService, CriminalRecordService>();
builder.Services.AddScoped<CriminalCaseService>();
builder.Services.AddScoped<Neo4jRepository1>();

// Fix lỗi dữ liệu số (Infinity/NaN) và cấu hình JSON
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.NumberHandling = 
            JsonNumberHandling.AllowNamedFloatingPointLiterals | 
            JsonNumberHandling.WriteAsString;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Cấu hình CORS cho phép Frontend (cổng 5173) gọi vào
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", p => p
        .WithOrigins("http://localhost:5173") // Port của Vite React
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

var app = builder.Build();

// 2. Cấu hình Pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Quan trọng: CORS phải đứng trước MapControllers
app.UseCors("AllowReactApp");

// Tắt HTTPS redirection ở local để tránh lỗi SSL
// app.UseHttpsRedirection();

app.UseAuthorization();
app.MapControllers();

// --- QUAN TRỌNG NHẤT: ÉP CHẠY PORT 5000 ---
app.Run("http://localhost:5000");

// using CitizenGraph.Backend.Services;

// var builder = WebApplication.CreateBuilder(args);

// // === THÊM DÒNG NÀY ĐỂ FIX LỖI POINT + INFINITY ===
// builder.Services.AddControllers()  // Dòng này PHẢI CÓ TRƯỚC
//     .AddJsonOptions(options =>
//     {
//         options.JsonSerializerOptions.NumberHandling = 
//             System.Text.Json.Serialization.JsonNumberHandling.AllowNamedFloatingPointLiterals |
//             System.Text.Json.Serialization.JsonNumberHandling.WriteAsString;
//     });
// builder.Services.AddSingleton<Neo4jConnection>();

// // Đăng ký repository dùng connection
// builder.Services.AddScoped<Neo4jRepository>();
// // builder.Services.AddControllers();
// builder.Services.AddEndpointsApiExplorer();
// builder.Services.AddSwaggerGen();

// builder.Services.AddCors(options =>
// {
//     options.AddPolicy("Dev", p => p.WithOrigins("http://localhost:5173")
//                                    .AllowAnyHeader()
//                                    .AllowAnyMethod()
//                                    .AllowCredentials());
// });

// var app = builder.Build();

// app.UseSwagger();
// app.UseSwaggerUI();
// app.UseCors("Dev");
// app.UseHttpsRedirection();
// app.MapControllers();

// app.Run();