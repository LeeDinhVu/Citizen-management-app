// // File: Services/AdminActionLogger.cs
// using Neo4j.Driver;
// using System;
// using System.Threading.Tasks;

// namespace CitizenGraph.Backend.Services
// {
//     public class AdminActionLogger
//     {
//         private readonly Neo4jRepository _repo;

//         public AdminActionLogger(Neo4jRepository repo)
//         {
//             _repo = repo;
//         }

//         /// <summary>
//         /// Ghi log hành chính - dùng chung cho tất cả Controller
//         /// </summary>
//         /// <param name="action">Mô tả hành động (VD: "Xem danh sách hộ khẩu")</param>
//         /// <param name="status">Trạng thái: "Đang xử lý", "Thành công", "Thất bại"</param>
//         /// <param name="module">Tên module: Family, Assets, Citizen, Security...</param>
//         /// <param name="userId">Tùy chọn: CCCD hoặc username của admin (nếu có)</param>
//         public async Task LogAsync(string action, string status, string module = "Unknown", string? userId = null)
//         {
//             try
//             {
//                 var query = @"
//                     CREATE (l:AdminLog {
//                         action: $action,
//                         status: $status,
//                         module: $module,
//                         userId: $userId,
//                         timestamp: datetime(),
//                         dateStr: date()
//                     })";

//                 await _repo.RunAsync(query, new
//                 {
//                     action,
//                     status,
//                     module,
//                     userId = userId ?? "SYSTEM"
//                 });
//             }
//             catch (Exception ex)
//             {
//                 // Không được để lỗi log làm crash hệ thống chính
//                 Console.WriteLine($"[LOG ERROR] Không thể ghi log: {ex.Message}");
//             }
//         }

//         // Các overload tiện lợi
//         public Task LogSuccess(string action, string module = "Unknown", string? userId = null)
//             => LogAsync(action, "Thành công", module, userId);

//         public Task LogProcessing(string action, string module = "Unknown", string? userId = null)
//             => LogAsync(action, "Đang xử lý", module, userId);

//         public Task LogFailed(string action, string module = "Unknown", string? userId = null)
//             => LogAsync(action, "Thất bại", module, userId);
//     }
// }