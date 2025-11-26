using Microsoft.AspNetCore.Mvc;
using CitizenGraph.Backend.Services;
using Neo4j.Driver;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace CitizenGraph.Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly Neo4jRepository _repository;
        public DashboardController(Neo4jRepository repository) { _repository = repository; }

        [HttpGet("overview")]
        public async Task<IActionResult> GetDashboardOverview()
        {
            // 1. Thống kê cơ bản
            var basicQuery = @"MATCH (p:Person) WITH count(p) AS TotalPop MATCH (a:Address) WITH TotalPop, count(a) AS TotalHouseholds MATCH (v:Vehicle) WITH TotalPop, TotalHouseholds, count(v) AS TotalVehicles MATCH (p2:Person) WHERE p2.covidStatus IN ['F0','F1'] OR p2.trangThai = 'Cách ly' RETURN TotalPop, TotalHouseholds, TotalVehicles, count(p2) AS SecurityAlerts";
            
            // 2. Thống kê Giới tính
            var genderQuery = @"MATCH (p:Person) RETURN p.gioiTinh as Gender, count(p) as Count";
            
            // 3. Thống kê Độ tuổi
            var ageQuery = @"MATCH (p:Person) WHERE p.ngaySinh IS NOT NULL WITH p, date().year - date(p.ngaySinh).year as Age RETURN sum(CASE WHEN Age >= 18 AND Age <= 60 THEN 1 ELSE 0 END) as LaborCount, count(p) as TotalCountWithAge";
            
            // 4. LẤY LOG HOẠT ĐỘNG (AdminLog) - Sắp xếp mới nhất
            var logQuery = @"
                MATCH (l:AdminLog) 
                RETURN l.action as Action, l.time as Time, l.status as Status 
                ORDER BY l.time DESC LIMIT 5";

            try {
                var basicResult = await _repository.RunAsync(basicQuery);
                var genderResult = await _repository.RunAsync(genderQuery);
                var ageResult = await _repository.RunAsync(ageQuery);
                var logResult = await _repository.RunAsync(logQuery); 

                var basicRec = basicResult.FirstOrDefault();
                var ageRec = ageResult.FirstOrDefault();

                long totalPop = basicRec != null ? basicRec["TotalPop"].As<long>() : 0;
                long households = basicRec != null ? basicRec["TotalHouseholds"].As<long>() : 0;
                long vehicles = basicRec != null ? basicRec["TotalVehicles"].As<long>() : 0; 
                long alerts = basicRec != null ? basicRec["SecurityAlerts"].As<long>() : 0;
                
                long maleCount = 0; long femaleCount = 0;
                foreach(var rec in genderResult) { string g = rec["Gender"].As<string>(); long c = rec["Count"].As<long>(); if (g == "Nam") maleCount += c; else if (g == "Nữ") femaleCount += c; }

                long laborCount = ageRec != null ? ageRec["LaborCount"].As<long>() : 0;
                long totalWithAge = ageRec != null ? ageRec["TotalCountWithAge"].As<long>() : 1;

                // Map kết quả log
                var recentLogs = logResult.Select(r => new {
                    action = r["Action"].As<string>(),
                    time = r["Time"].As<string>(), // Chuỗi ISO datetime từ Neo4j
                    status = r["Status"].As<string>()
                }).ToList();

                return Ok(new {
                    statistics = new { population = totalPop, households = households, vehicles = vehicles, alerts = alerts },
                    demographics = new { maleCount = maleCount, femaleCount = femaleCount, totalClassified = maleCount + femaleCount, laborAgeCount = laborCount, totalAgeClassified = totalWithAge },
                    recentLogs = recentLogs 
                });
            } catch (Exception ex) { return StatusCode(500, new { message = "Lỗi server", error = ex.Message }); }
        }
    }
}


// using Microsoft.AspNetCore.Mvc;
// using CitizenGraph.Backend.Services;
// using Neo4j.Driver;
// using System;
// using System.Linq;
// using System.Threading.Tasks;
// using System.Collections.Generic;

// namespace CitizenGraph.Backend.Controllers
// {
//     [Route("api/[controller]")]
//     [ApiController]
//     public class DashboardController : ControllerBase
//     {
//         private readonly Neo4jRepository _repository;

//         public DashboardController(Neo4jRepository repository)
//         {
//             _repository = repository;
//         }

//         // API Duy nhất lấy toàn bộ số liệu cho Dashboard
//         [HttpGet("overview")]
//         public async Task<IActionResult> GetDashboardOverview()
//         {
//             // 1. Query thống kê cơ bản (Dân số, Hộ gia đình (Address), Cảnh báo (F0/F1))
//             var basicQuery = @"
//                 MATCH (p:Person)
//                 WITH count(p) AS TotalPop

//                 MATCH (a:Address)
//                 WITH TotalPop, count(a) AS TotalHouseholds

//                 MATCH (v:Vehicle)
//                 WITH TotalPop, TotalHouseholds, count(v) AS TotalVehicles

//                 MATCH (p2:Person)
//                 WHERE p2.covidStatus IN ['F0','F1'] OR p2.trangThai = 'Cách ly'
//                 RETURN TotalPop, TotalHouseholds, TotalVehicles, count(p2) AS SecurityAlerts
//             ";

//             // 2. Query thống kê Giới tính
//             var genderQuery = @"
//                 MATCH (p:Person)
//                 RETURN p.gioiTinh as Gender, count(p) as Count
//             ";

//             // 3. Query thống kê Độ tuổi (Dựa trên ngaySinh)
//             // Giả định ngaySinh format YYYY-MM-DD
//             var ageQuery = @"
//                 MATCH (p:Person)
//                 WHERE p.ngaySinh IS NOT NULL
//                 WITH p, date().year - date(p.ngaySinh).year as Age
//                 RETURN 
//                     sum(CASE WHEN Age >= 18 AND Age <= 60 THEN 1 ELSE 0 END) as LaborCount,
//                     count(p) as TotalCountWithAge
//             ";

//             try 
//             {
//                 var basicResult = await _repository.RunAsync(basicQuery);
//                 var genderResult = await _repository.RunAsync(genderQuery);
//                 var ageResult = await _repository.RunAsync(ageQuery);

//                 var basicRec = basicResult.FirstOrDefault();
//                 var ageRec = ageResult.FirstOrDefault();

//                 // Xử lý dữ liệu Basic
//                 long totalPop = basicRec != null ? basicRec["TotalPop"].As<long>() : 0;
//                 long households = basicRec != null ? basicRec["TotalHouseholds"].As<long>() : 0;
//                 long vehicles = basicRec != null ? basicRec["TotalVehicles"].As<long>() : 0; 
//                 long alerts = basicRec != null ? basicRec["SecurityAlerts"].As<long>() : 0;
                
//                 // Xử lý dữ liệu Giới tính
//                 long maleCount = 0;
//                 long femaleCount = 0;
//                 foreach(var rec in genderResult)
//                 {
//                     string g = rec["Gender"].As<string>();
//                     long c = rec["Count"].As<long>();
//                     if (g == "Nam") maleCount += c;
//                     else if (g == "Nữ") femaleCount += c;
//                 }

//                 // Xử lý dữ liệu Độ tuổi
//                 long laborCount = ageRec != null ? ageRec["LaborCount"].As<long>() : 0;
//                 long totalWithAge = ageRec != null ? ageRec["TotalCountWithAge"].As<long>() : 1; // Avoid div by 0

//                 return Ok(new
//                 {
//                     Statistics = new
//                     {
//                         Population = totalPop,
//                         Households = households,
//                         Vehicles = vehicles,
//                         Alerts = alerts
//                     },
//                     Demographics = new
//                     {
//                         MaleCount = maleCount,
//                         FemaleCount = femaleCount,
//                         TotalClassified = maleCount + femaleCount, // Tổng số người có thông tin giới tính
//                         LaborAgeCount = laborCount,
//                         TotalAgeClassified = totalWithAge
//                     }
//                 });
//             }
//             catch (Exception ex)
//             {
//                 return StatusCode(500, new { message = "Lỗi server", error = ex.Message });
//             }
//         }
//     }
// }