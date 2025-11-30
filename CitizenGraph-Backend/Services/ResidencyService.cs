using Neo4j.Driver;
using CitizenGraph.Backend.Model;

namespace CitizenGraph.Backend.Services
{
    public class ResidencyService
    {
        private readonly Neo4jConnection _connection;

        public ResidencyService(Neo4jConnection connection)
        {
            _connection = connection;
        }

        /// <summary>
        /// Lấy tất cả hộ khẩu với thông tin chủ hộ và số lượng thành viên
        /// </summary>
        public async Task<List<HouseholdDTO>> GetAllHouseholdsAsync()
        {
            var session = _connection.CreateSession();
            var households = new List<HouseholdDTO>();

            try
            {
                var query = @"
                    MATCH (h:Household)
                    OPTIONAL MATCH (chuHo:Person {cccd: h.headOfHouseholdCCCD})
                    CALL {
                        WITH h
                        OPTIONAL MATCH (p:Person)-[rel:CURRENT_RESIDENT]->(h)
                        WHERE rel.toDate IS NULL
                        RETURN count(DISTINCT p) as memberCount
                    }
                    RETURN 
                        elementId(h) AS id,
                        h.householdId AS soHoKhau,
                        COALESCE(h.addressText, h.address, h.registrationNumber, 'Chưa có địa chỉ') AS diaChi,
                        COALESCE(chuHo.hoTen, 'Chưa xác định') AS tenChuHo,
                        memberCount AS soLuongThanhVien
                    ORDER BY h.householdId
                ";

                var result = await session.RunAsync(query);
                var records = await result.ToListAsync();

                Console.WriteLine($"📊 [ResidencyService] Found {records.Count} households");
                
                int totalMembers = 0;
                foreach (var record in records)
                {
                    var memberCount = record["soLuongThanhVien"].As<int>();
                    totalMembers += memberCount;
                    
                    var household = new HouseholdDTO
                    {
                        Id = record["id"].As<string>(),
                        SoHoKhau = record["soHoKhau"].As<string>(),
                        DiaChi = record["diaChi"].As<string>(),
                        TenChuHo = record["tenChuHo"].As<string>(),
                        SoLuongThanhVien = memberCount
                    };
                    
                    households.Add(household);
                    Console.WriteLine($"  - Hộ {household.SoHoKhau}: {memberCount} thành viên");
                }
                
                Console.WriteLine($"📊 [ResidencyService] TỔNG: {totalMembers} thành viên trong {records.Count} hộ");
                Console.WriteLine($"📊 [ResidencyService] TRUNG BÌNH: {(records.Count > 0 ? (double)totalMembers / records.Count : 0):F1} người/hộ");
            }
            finally
            {
                await session.CloseAsync();
            }

            return households;
        }

        /// <summary>
        /// Lấy danh sách thành viên của một hộ khẩu
        /// </summary>
        public async Task<List<HouseholdMemberDTO>> GetMembersByHouseholdAsync(string soHoKhau)
        {
            var session = _connection.CreateSession();
            var members = new List<HouseholdMemberDTO>();

            try
            {
                // Lấy tất cả thành viên qua relationship CURRENT_RESIDENT (chỉ lấy đang cư trú)
                var query = @"
                    MATCH (h:Household {householdId: $soHoKhau})
                    OPTIONAL MATCH (p:Person)-[rel:CURRENT_RESIDENT]->(h)
                    WHERE rel.toDate IS NULL
                    OPTIONAL MATCH (chuHo:Person {cccd: h.headOfHouseholdCCCD})
                    RETURN 
                        p.hoTen AS hoTen,
                        p.cccd AS cccd,
                        p.ngaySinh AS ngaySinh,
                        CASE 
                            WHEN p.cccd = h.headOfHouseholdCCCD THEN 'Chủ hộ'
                            ELSE 'Thành viên'
                        END AS quanHe,
                        h.residencyType AS loaiCuTru,
                        rel.fromDate AS tuNgay,
                        rel.toDate AS denNgay
                    ORDER BY 
                        CASE WHEN p.cccd = h.headOfHouseholdCCCD THEN 0 ELSE 1 END,
                        p.hoTen
                ";

                var result = await session.RunAsync(query, new { soHoKhau });
                var records = await result.ToListAsync();

                foreach (var record in records)
                {
                    // Skip null records (when no members found)
                    if (record["hoTen"] == null || record["hoTen"].As<object>() == null)
                        continue;

                    DateTime? ngaySinh = null;
                    DateTime? tuNgay = null;
                    DateTime? denNgay = null;
                    
                    try
                    {
                        // Neo4j LocalDate can be cast directly to LocalDate type
                        if (record["ngaySinh"] != null && record["ngaySinh"].As<object>() != null)
                        {
                            try
                            {
                                var localDate = record["ngaySinh"].As<Neo4j.Driver.LocalDate>();
                                ngaySinh = new DateTime(localDate.Year, localDate.Month, localDate.Day);
                            }
                            catch
                            {
                                // Try dictionary format as fallback
                                var dateDict = record["ngaySinh"].As<Dictionary<string, object>>();
                                if (dateDict != null && dateDict.ContainsKey("year"))
                                {
                                    ngaySinh = new DateTime(
                                        Convert.ToInt32(dateDict["year"]),
                                        Convert.ToInt32(dateDict["month"]),
                                        Convert.ToInt32(dateDict["day"])
                                    );
                                }
                            }
                        }

                        if (record["tuNgay"] != null && record["tuNgay"].As<object>() != null)
                        {
                            try
                            {
                                var localDate = record["tuNgay"].As<Neo4j.Driver.LocalDate>();
                                tuNgay = new DateTime(localDate.Year, localDate.Month, localDate.Day);
                            }
                            catch
                            {
                                var dateDict = record["tuNgay"].As<Dictionary<string, object>>();
                                if (dateDict != null && dateDict.ContainsKey("year"))
                                {
                                    tuNgay = new DateTime(
                                        Convert.ToInt32(dateDict["year"]),
                                        Convert.ToInt32(dateDict["month"]),
                                        Convert.ToInt32(dateDict["day"])
                                    );
                                }
                            }
                        }

                        if (record["denNgay"] != null && record["denNgay"].As<object>() != null)
                        {
                            try
                            {
                                var localDate = record["denNgay"].As<Neo4j.Driver.LocalDate>();
                                denNgay = new DateTime(localDate.Year, localDate.Month, localDate.Day);
                            }
                            catch
                            {
                                var dateDict = record["denNgay"].As<Dictionary<string, object>>();
                                if (dateDict != null && dateDict.ContainsKey("year"))
                                {
                                    denNgay = new DateTime(
                                        Convert.ToInt32(dateDict["year"]),
                                        Convert.ToInt32(dateDict["month"]),
                                        Convert.ToInt32(dateDict["day"])
                                    );
                                }
                            }
                        }
                    }
                    catch
                    {
                        // Ignore date parsing errors
                    }

                    members.Add(new HouseholdMemberDTO
                    {
                        HoTen = record["hoTen"].As<string>(),
                        CCCD = record["cccd"].As<string>(),
                        NgaySinh = ngaySinh,
                        QuanHe = record["quanHe"].As<string>(),
                        LoaiCuTru = record["loaiCuTru"].As<string>(),
                        TuNgay = tuNgay,
                        DenNgay = denNgay
                    });
                }
            }
            finally
            {
                await session.CloseAsync();
            }

            return members;
        }

        /// <summary>
        /// Lấy chi tiết hộ khẩu dạng nested object
        /// </summary>
        public async Task<HouseholdDetailDTO?> GetHouseholdDetailAsync(string soHoKhau)
        {
            var session = _connection.CreateSession();
            HouseholdDetailDTO? detail = null;

            try
            {
                var query = @"
                    MATCH (h:Household {householdId: $soHoKhau})
                    OPTIONAL MATCH (p:Person)-[rel:CURRENT_RESIDENT]->(h)
                    WHERE rel.toDate IS NULL
                    OPTIONAL MATCH (chuHo:Person {cccd: h.headOfHouseholdCCCD})
                    WITH h, chuHo,
                         collect({
                           hoTen:   p.hoTen,
                           cccd:    p.cccd,
                           ngaySinh: p.ngaySinh,
                           quanHe:  CASE
                                      WHEN p.cccd = h.headOfHouseholdCCCD THEN 'Chủ hộ'
                                      ELSE 'Thành viên'
                                    END,
                           loaiCuTru: h.residencyType,
                           tuNgay:    rel.fromDate,
                           denNgay:   rel.toDate
                         }) AS members
                    RETURN {
                      householdId:       h.householdId,
                      registrationNumber: h.registrationNum,
                      residencyType:     h.residencyType,
                      headOfHousehold:   chuHo.hoTen,
                      members:           members
                    } AS detail
                ";

                var result = await session.RunAsync(query, new { soHoKhau });
                var records = await result.ToListAsync();

                if (records.Count == 0)
                    return null;

                var record = records[0];
                var detailDict = record["detail"].As<Dictionary<string, object>>();

                detail = new HouseholdDetailDTO
                {
                    HouseholdId = detailDict["householdId"]?.ToString() ?? string.Empty,
                    RegistrationNumber = detailDict["registrationNumber"]?.ToString() ?? string.Empty,
                    ResidencyType = detailDict["residencyType"]?.ToString() ?? string.Empty,
                    HeadOfHousehold = detailDict["headOfHousehold"]?.ToString() ?? "Chưa xác định",
                    Members = new List<HouseholdMemberDTO>()
                };

                // Parse members array
                if (detailDict["members"] is List<object> membersList)
                {
                    foreach (var memberObj in membersList)
                    {
                        if (memberObj is Dictionary<string, object> memberDict)
                        {
                            // Skip empty members
                            if (memberDict["hoTen"] == null || memberDict["hoTen"].ToString() == string.Empty)
                                continue;

                            DateTime? ngaySinh = null;
                            DateTime? tuNgay = null;
                            DateTime? denNgay = null;

                            try
                            {
                                // Parse ngaySinh
                                if (memberDict.ContainsKey("ngaySinh") && memberDict["ngaySinh"] != null)
                                {
                                    try
                                    {
                                        var localDate = (memberDict["ngaySinh"] as Neo4j.Driver.LocalDate);
                                        if (localDate != null)
                                        {
                                            ngaySinh = new DateTime(localDate.Year, localDate.Month, localDate.Day);
                                        }
                                    }
                                    catch
                                    {
                                        var dateDict = memberDict["ngaySinh"] as Dictionary<string, object>;
                                        if (dateDict != null && dateDict.ContainsKey("year"))
                                        {
                                            ngaySinh = new DateTime(
                                                Convert.ToInt32(dateDict["year"]),
                                                Convert.ToInt32(dateDict["month"]),
                                                Convert.ToInt32(dateDict["day"])
                                            );
                                        }
                                    }
                                }

                                // Parse tuNgay
                                if (memberDict.ContainsKey("tuNgay") && memberDict["tuNgay"] != null)
                                {
                                    try
                                    {
                                        var localDate = (memberDict["tuNgay"] as Neo4j.Driver.LocalDate);
                                        if (localDate != null)
                                        {
                                            tuNgay = new DateTime(localDate.Year, localDate.Month, localDate.Day);
                                        }
                                    }
                                    catch
                                    {
                                        var dateDict = memberDict["tuNgay"] as Dictionary<string, object>;
                                        if (dateDict != null && dateDict.ContainsKey("year"))
                                        {
                                            tuNgay = new DateTime(
                                                Convert.ToInt32(dateDict["year"]),
                                                Convert.ToInt32(dateDict["month"]),
                                                Convert.ToInt32(dateDict["day"])
                                            );
                                        }
                                    }
                                }

                                // Parse denNgay
                                if (memberDict.ContainsKey("denNgay") && memberDict["denNgay"] != null)
                                {
                                    try
                                    {
                                        var localDate = (memberDict["denNgay"] as Neo4j.Driver.LocalDate);
                                        if (localDate != null)
                                        {
                                            denNgay = new DateTime(localDate.Year, localDate.Month, localDate.Day);
                                        }
                                    }
                                    catch
                                    {
                                        var dateDict = memberDict["denNgay"] as Dictionary<string, object>;
                                        if (dateDict != null && dateDict.ContainsKey("year"))
                                        {
                                            denNgay = new DateTime(
                                                Convert.ToInt32(dateDict["year"]),
                                                Convert.ToInt32(dateDict["month"]),
                                                Convert.ToInt32(dateDict["day"])
                                            );
                                        }
                                    }
                                }
                            }
                            catch
                            {
                                // Ignore date parsing errors
                            }

                            detail.Members.Add(new HouseholdMemberDTO
                            {
                                HoTen = memberDict["hoTen"]?.ToString() ?? string.Empty,
                                CCCD = memberDict["cccd"]?.ToString() ?? string.Empty,
                                NgaySinh = ngaySinh,
                                QuanHe = memberDict["quanHe"]?.ToString() ?? "Thành viên",
                                LoaiCuTru = memberDict["loaiCuTru"]?.ToString() ?? "Thường trú",
                                TuNgay = tuNgay,
                                DenNgay = denNgay
                            });
                        }
                    }
                }

                // Sort members: Chủ hộ first
                detail.Members = detail.Members
                    .OrderBy(m => m.QuanHe == "Chủ hộ" ? 0 : 1)
                    .ThenBy(m => m.HoTen)
                    .ToList();
            }
            finally
            {
                await session.CloseAsync();
            }

            return detail;
        }

        /// <summary>
        /// Đăng ký hộ khẩu mới
        /// </summary>
        public async Task<HouseholdDTO?> CreateHouseholdAsync(string householdId, string registrationNum, string addressText, string residencyType, string chuHoCCCD)
        {
            var session = _connection.CreateSession();

            try
            {
                return await session.ExecuteWriteAsync(async tx =>
                {
                    // Kiểm tra chủ hộ có tồn tại không
                    var checkQuery = @"
                        MATCH (chuHo:Person {cccd: $chuHoCCCD})
                        RETURN chuHo.hoTen AS hoTen
                    ";

                    var checkResult = await tx.RunAsync(checkQuery, new { chuHoCCCD });
                    var checkRecords = await checkResult.ToListAsync();

                    if (checkRecords.Count == 0)
                    {
                        throw new Exception($"Không tìm thấy chủ hộ với CCCD: {chuHoCCCD}");
                    }

                    var chuHoName = checkRecords[0]["hoTen"].As<string>();

                    // Kiểm tra householdId đã tồn tại chưa
                    var existQuery = @"
                        MATCH (h:Household {householdId: $householdId})
                        RETURN h
                    ";

                    var existResult = await tx.RunAsync(existQuery, new { householdId });
                    var existRecords = await existResult.ToListAsync();

                    if (existRecords.Count > 0)
                    {
                        throw new Exception($"Hộ khẩu {householdId} đã tồn tại");
                    }

                    // Tạo hộ khẩu mới
                    var now = DateTime.Now;
                    var today = new Neo4j.Driver.LocalDate(now.Year, now.Month, now.Day);
                    
                    var createQuery = @"
                        MATCH (chuHo:Person {cccd: $chuHoCCCD})
                        CREATE (h:Household {
                          householdId:         $householdId,
                          registrationNum:     $registrationNum,
                          residencyType:       $residencyType,
                          headOfHouseholdCCCD: $chuHoCCCD,
                          addressText:         $addressText,
                          registrationDate:    $today
                        })
                        MERGE (chuHo)-[:HEAD_OF]->(h)
                        MERGE (chuHo)-[rel:LIVES_IN]->(h)
                        ON CREATE SET
                          rel.fromDate       = $today,
                          rel.relationToHead = 'Chủ hộ',
                          rel.residencyType  = $residencyType,
                          rel.reason         = 'Đăng ký hộ khẩu mới'
                        RETURN elementId(h) AS id, h.householdId AS householdId
                    ";

                    var createResult = await tx.RunAsync(createQuery, new
                    {
                        householdId,
                        registrationNum,
                        residencyType,
                        chuHoCCCD,
                        addressText,
                        today
                    });

                    var createRecords = await createResult.ToListAsync();

                    if (createRecords.Count == 0)
                    {
                        throw new Exception("Tạo hộ khẩu thất bại");
                    }

                    return new HouseholdDTO
                    {
                        Id = createRecords[0]["id"].As<string>(),
                        SoHoKhau = createRecords[0]["householdId"].As<string>(),
                        DiaChi = addressText,
                        TenChuHo = chuHoName,
                        SoLuongThanhVien = 1
                    };
                });
            }
            finally
            {
                await session.CloseAsync();
            }
        }

        /// <summary>
        /// Chuyển khẩu người dân - Cập nhật quan hệ cũ và tạo quan hệ mới
        /// </summary>
        /// <summary>
        /// Chuyển khẩu nhiều người cùng lúc
        /// </summary>
        public async Task<bool> MoveMembersAsync(List<string> cccds, string targetHouseholdId, string reason, string loaiCuTru = "Thường trú")
        {
            var session = _connection.CreateSession();

            try
            {
                if (cccds == null || cccds.Count == 0)
                {
                    throw new Exception("Danh sách CCCD không được trống");
                }

                var today = new Neo4j.Driver.LocalDate(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day);

                // Query chuyển khẩu nhiều người - hỗ trợ cả LIVES_IN và CURRENT_RESIDENT
                var moveBatchQuery = @"
                    MATCH (newH:Household {householdId: $toHouseholdId})
                    
                    UNWIND $cccds AS cccd
                    MATCH (p:Person {cccd: cccd})
                    MATCH (oldH:Household)

                    // Tìm quan hệ cư trú hiện tại (hỗ trợ cả 2 loại)
                    OPTIONAL MATCH (p)-[oldLivesIn:LIVES_IN]->(oldH)
                    WHERE oldLivesIn.toDate IS NULL
                    
                    OPTIONAL MATCH (p)-[oldCurrentRes:CURRENT_RESIDENT]->(oldH)
                    WHERE oldCurrentRes.toDate IS NULL

                    // Đóng lịch sử ở hộ cũ
                    FOREACH (_ IN CASE WHEN oldLivesIn IS NOT NULL THEN [1] ELSE [] END |
                        SET oldLivesIn.toDate = $today,
                            oldLivesIn.reason = $reason
                    )
                    FOREACH (_ IN CASE WHEN oldCurrentRes IS NOT NULL THEN [1] ELSE [] END |
                        SET oldCurrentRes.toDate = $today,
                            oldCurrentRes.lyDoKetThuc = $reason
                    )

                    // Tạo quan hệ cư trú mới sang hộ mới
                    FOREACH (_ IN CASE WHEN oldLivesIn IS NOT NULL THEN [1] ELSE [] END |
                        MERGE (p)-[newLivesIn:LIVES_IN]->(newH)
                        ON CREATE SET
                            newLivesIn.fromDate = $today,
                            newLivesIn.reason = $reason,
                            newLivesIn.residencyType = newH.residencyType,
                            newLivesIn.relationToHead = oldLivesIn.relationToHead
                    )
                    
                    FOREACH (_ IN CASE WHEN oldCurrentRes IS NOT NULL THEN [1] ELSE [] END |
                        MERGE (p)-[newCurrentRes:CURRENT_RESIDENT]->(newH)
                        ON CREATE SET
                            newCurrentRes.fromDate = $today,
                            newCurrentRes.toDate = null,
                            newCurrentRes.loaiCuTru = $loaiCuTru,
                            newCurrentRes.quanHe = oldCurrentRes.quanHe,
                            newCurrentRes.lyDoChuyen = $reason
                    )

                    RETURN collect({cccd: p.cccd, hoTen: p.hoTen, oldHousehold: oldH.householdId}) AS movedMembers
                ";

                var result = await session.RunAsync(moveBatchQuery, new
                {
                    cccds = cccds,
                    toHouseholdId = targetHouseholdId,
                    today = today,
                    reason = reason,
                    loaiCuTru = loaiCuTru
                });

                var records = await result.ToListAsync();
                return records.Count > 0;
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi chuyển khẩu: {ex.Message}", ex);
            }
            finally
            {
                await session.CloseAsync();
            }
        }

        /// <summary>
        /// Chuyển khẩu 1 người (backward compatibility)
        /// </summary>
        public async Task<bool> MoveMemberAsync(string cccd, string targetHouseholdId, string reason, string loaiCuTru = "Thường trú")
        {
            return await MoveMembersAsync(new List<string> { cccd }, targetHouseholdId, reason, loaiCuTru);
        }

        /// <summary>
        /// Chuyển khẩu 1 người (legacy implementation - giữ lại để tham khảo)
        /// </summary>
        private async Task<bool> MoveMemberAsync_Old(string cccd, string targetHouseholdId, string reason, string loaiCuTru = "Thường trú")
        {
            var session = _connection.CreateSession();

            try
            {
                var today = new Neo4j.Driver.LocalDate(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day);

                // Query chuyển khẩu - hỗ trợ cả LIVES_IN và CURRENT_RESIDENT
                var moveQuery = @"
                    MATCH (oldH:Household)
                    MATCH (newH:Household {householdId: $toHouseholdId})
                    MATCH (p:Person {cccd: $cccd})

                    // Tìm quan hệ cư trú hiện tại (hỗ trợ cả 2 loại)
                    OPTIONAL MATCH (p)-[oldLivesIn:LIVES_IN]->(oldH)
                    WHERE oldLivesIn.toDate IS NULL
                    
                    OPTIONAL MATCH (p)-[oldCurrentRes:CURRENT_RESIDENT]->(oldH)
                    WHERE oldCurrentRes.toDate IS NULL

                    // Đóng lịch sử ở hộ cũ
                    FOREACH (_ IN CASE WHEN oldLivesIn IS NOT NULL THEN [1] ELSE [] END |
                        SET oldLivesIn.toDate = $today,
                            oldLivesIn.reason = $reason
                    )
                    FOREACH (_ IN CASE WHEN oldCurrentRes IS NOT NULL THEN [1] ELSE [] END |
                        SET oldCurrentRes.toDate = $today,
                            oldCurrentRes.lyDoKetThuc = $reason
                    )

                    // Tạo quan hệ cư trú mới sang hộ mới
                    FOREACH (_ IN CASE WHEN oldLivesIn IS NOT NULL THEN [1] ELSE [] END |
                        MERGE (p)-[newLivesIn:LIVES_IN]->(newH)
                        ON CREATE SET
                            newLivesIn.fromDate = $today,
                            newLivesIn.reason = $reason,
                            newLivesIn.residencyType = newH.residencyType,
                            newLivesIn.relationToHead = oldLivesIn.relationToHead
                    )
                    
                    FOREACH (_ IN CASE WHEN oldCurrentRes IS NOT NULL THEN [1] ELSE [] END |
                        MERGE (p)-[newCurrentRes:CURRENT_RESIDENT]->(newH)
                        ON CREATE SET
                            newCurrentRes.fromDate = $today,
                            newCurrentRes.toDate = null,
                            newCurrentRes.loaiCuTru = $loaiCuTru,
                            newCurrentRes.quanHe = oldCurrentRes.quanHe,
                            newCurrentRes.lyDoChuyen = $reason
                    )

                    RETURN p, oldH, newH, oldLivesIn, oldCurrentRes
                ";

                var result = await session.RunAsync(moveQuery, new
                {
                    cccd = cccd,
                    toHouseholdId = targetHouseholdId,
                    today = today,
                    reason = reason,
                    loaiCuTru = loaiCuTru
                });

                var records = await result.ToListAsync();
                return records.Count > 0;
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi chuyển khẩu: {ex.Message}", ex);
            }
            finally
            {
                await session.CloseAsync();
            }
        }

        /// <summary>
        /// Lấy lịch sử cư trú của một người
        /// </summary>
        public async Task<List<HouseholdMemberDTO>> GetResidencyHistoryAsync(string cccd)
        {
            var session = _connection.CreateSession();
            var history = new List<HouseholdMemberDTO>();

            try
            {
                var query = @"
                    MATCH (p:Person {cccd: $cccd})-[r:MEMBER_OF]->(h:Household)
                    RETURN 
                        p.hoTen AS hoTen,
                        p.cccd AS cccd,
                        h.householdId AS diaChi,
                        COALESCE(r.residencyType, h.residencyType) AS loaiCuTru,
                        r.fromDate AS tuNgay,
                        r.toDate AS denNgay
                    ORDER BY r.fromDate DESC
                ";

                var result = await session.RunAsync(query, new { cccd });
                var records = await result.ToListAsync();

                foreach (var record in records)
                {
                    history.Add(new HouseholdMemberDTO
                    {
                        HoTen = record["hoTen"].As<string>(),
                        CCCD = record["cccd"].As<string>(),
                        QuanHe = record["diaChi"].As<string>(), // Tạm dùng QuanHe để lưu household ID
                        LoaiCuTru = record["loaiCuTru"].As<string>(),
                        TuNgay = record["tuNgay"].As<DateTime?>(),
                        DenNgay = record["denNgay"].As<DateTime?>()
                    });
                }
            }
            finally
            {
                await session.CloseAsync();
            }

            return history;
        }

        /// <summary>
        /// Debug: Lấy thông tin cấu trúc database
        /// </summary>
        public async Task<object> GetDebugInfoAsync()
        {
            var session = _connection.CreateSession();

            try
            {
                // Kiểm tra Household nodes
                var householdQuery = @"
                    MATCH (h:Household)
                    RETURN h
                    LIMIT 3
                ";
                var householdResult = await session.RunAsync(householdQuery);
                var households = await householdResult.ToListAsync();

                // Kiểm tra Person nodes
                var personQuery = @"
                    MATCH (p:Person)
                    RETURN p
                    LIMIT 3
                ";
                var personResult = await session.RunAsync(personQuery);
                var persons = await personResult.ToListAsync();

                // Kiểm tra quan hệ HEAD_OF
                var headOfQuery = @"
                    MATCH (p:Person)-[r:HEAD_OF]->(h:Household)
                    RETURN p, r, h
                    LIMIT 3
                ";
                var headOfResult = await session.RunAsync(headOfQuery);
                var headOfRels = await headOfResult.ToListAsync();

                // Kiểm tra quan hệ LIVES_IN
                var livesInQuery = @"
                    MATCH (p:Person)-[r:LIVES_IN]->(h:Household)
                    RETURN p, r, h
                    LIMIT 3
                ";
                var livesInResult = await session.RunAsync(livesInQuery);
                var livesInRels = await livesInResult.ToListAsync();

                // Kiểm tra TẤT CẢ các loại quan hệ Person->Household
                var allRelsQuery = @"
                    MATCH (p:Person)-[r]->(h:Household)
                    RETURN type(r) AS relType, count(*) AS count
                ";
                var allRelsResult = await session.RunAsync(allRelsQuery);
                var allRels = await allRelsResult.ToListAsync();

                return new
                {
                    householdCount = households.Count,
                    householdSample = households.Select(r => r["h"].As<INode>().Properties).ToList(),
                    personCount = persons.Count,
                    personSample = persons.Select(r => r["p"].As<INode>().Properties).ToList(),
                    headOfCount = headOfRels.Count,
                    headOfSample = headOfRels.Select(r => new
                    {
                        person = r["p"].As<INode>().Properties,
                        relationship = r["r"].As<IRelationship>().Properties,
                        household = r["h"].As<INode>().Properties
                    }).ToList(),
                    livesInCount = livesInRels.Count,
                    livesInSample = livesInRels.Select(r => new
                    {
                        person = r["p"].As<INode>().Properties,
                        relationship = r["r"].As<IRelationship>().Properties,
                        household = r["h"].As<INode>().Properties
                    }).ToList(),
                    allRelationshipTypes = allRels.Select(r => new
                    {
                        type = r["relType"].As<string>(),
                        count = r["count"].As<int>()
                    }).ToList()
                };
            }
            finally
            {
                await session.CloseAsync();
            }
        }

        /// <summary>
        /// Thêm thành viên vào hộ khẩu (Nhập khẩu)
        /// </summary>
        public async Task<bool> AddMemberAsync(AddMemberRequest request)
        {
            var session = _connection.CreateSession();
            
            try
            {
                // Kiểm tra Person tồn tại
                var checkPersonQuery = @"
                    MATCH (p:Person {cccd: $cccd})
                    RETURN p
                ";
                var personResult = await session.RunAsync(checkPersonQuery, new { cccd = request.CCCD });
                var personExists = await personResult.FetchAsync();
                
                if (!personExists)
                {
                    throw new Exception($"Không tìm thấy công dân với CCCD: {request.CCCD}");
                }

                // Kiểm tra Household tồn tại
                var checkHouseholdQuery = @"
                    MATCH (h:Household {householdId: $householdId})
                    RETURN h
                ";
                var householdResult = await session.RunAsync(checkHouseholdQuery, new { householdId = request.HouseholdId });
                var householdExists = await householdResult.FetchAsync();
                
                if (!householdExists)
                {
                    throw new Exception($"Không tìm thấy hộ khẩu: {request.HouseholdId}");
                }

                // Kiểm tra Person đã thuộc hộ khẩu nào chưa (đang có relationship CURRENT_RESIDENT)
                var checkCurrentQuery = @"
                    MATCH (p:Person {cccd: $cccd})-[r:CURRENT_RESIDENT]->(h:Household)
                    WHERE r.toDate IS NULL
                    RETURN h.householdId AS currentHousehold
                ";
                var currentResult = await session.RunAsync(checkCurrentQuery, new { cccd = request.CCCD });
                var hasCurrentHousehold = await currentResult.FetchAsync();
                
                if (hasCurrentHousehold)
                {
                    var currentHouseholdId = currentResult.Current["currentHousehold"].As<string>();
                    throw new Exception($"Công dân này đã thuộc hộ khẩu {currentHouseholdId}. Vui lòng xóa khỏi hộ khẩu hiện tại trước khi thêm vào hộ khẩu mới.");
                }

                // Tạo relationship CURRENT_RESIDENT
                var now = DateTime.Now;
                var localDate = new Neo4j.Driver.LocalDate(now.Year, now.Month, now.Day);
                var tuNgayLocal = new Neo4j.Driver.LocalDate(request.TuNgay.Year, request.TuNgay.Month, request.TuNgay.Day);

                var addMemberQuery = @"
                    MATCH (p:Person {cccd: $cccd})
                    MATCH (h:Household {householdId: $householdId})
                    CREATE (p)-[r:CURRENT_RESIDENT {
                        fromDate: $tuNgay,
                        toDate: null,
                        loaiCuTru: $loaiCuTru,
                        quanHe: $quanHe,
                        lyDoChuyen: $lyDo
                    }]->(h)
                    RETURN r
                ";

                await session.RunAsync(addMemberQuery, new
                {
                    cccd = request.CCCD,
                    householdId = request.HouseholdId,
                    tuNgay = tuNgayLocal,
                    loaiCuTru = request.LoaiCuTru,
                    quanHe = request.QuanHe,
                    lyDo = request.LyDo
                });

                return true;
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi thêm thành viên vào hộ khẩu: {ex.Message}", ex);
            }
            finally
            {
                await session.CloseAsync();
            }
        }

        /// <summary>
        /// Lấy danh sách công dân chưa thuộc hộ khẩu nào (available cho nhập khẩu)
        /// </summary>
        public async Task<List<AvailableCitizenDTO>> GetAvailableCitizensAsync()
        {
            var session = _connection.CreateSession();
            var citizens = new List<AvailableCitizenDTO>();

            try
            {
                var query = @"
                    MATCH (p:Person)
                    WHERE NOT EXISTS {
                        MATCH (p)-[r:CURRENT_RESIDENT]->(h:Household)
                        WHERE r.denNgay IS NULL
                    }
                    RETURN 
                        p.cccd AS cccd,
                        p.hoTen AS hoTen,
                        p.ngaySinh AS ngaySinh,
                        p.gioiTinh AS gioiTinh
                    ORDER BY p.hoTen
                    LIMIT 100
                ";

                var result = await session.RunAsync(query);
                var records = await result.ToListAsync();

                foreach (var record in records)
                {
                    DateTime? ngaySinh = null;
                    try
                    {
                        if (record["ngaySinh"] != null)
                        {
                            var localDate = record["ngaySinh"].As<Neo4j.Driver.LocalDate>();
                            ngaySinh = new DateTime(localDate.Year, localDate.Month, localDate.Day);
                        }
                    }
                    catch
                    {
                        try
                        {
                            var dateDict = record["ngaySinh"].As<Dictionary<string, object>>();
                            if (dateDict != null && dateDict.ContainsKey("year") && dateDict.ContainsKey("month") && dateDict.ContainsKey("day"))
                            {
                                ngaySinh = new DateTime(
                                    Convert.ToInt32(dateDict["year"]),
                                    Convert.ToInt32(dateDict["month"]),
                                    Convert.ToInt32(dateDict["day"])
                                );
                            }
                        }
                        catch { }
                    }

                    citizens.Add(new AvailableCitizenDTO
                    {
                        CCCD = record["cccd"].As<string>(),
                        HoTen = record["hoTen"].As<string>(),
                        NgaySinh = ngaySinh,
                        GioiTinh = record["gioiTinh"]?.As<string>() ?? ""
                    });
                }
            }
            finally
            {
                await session.CloseAsync();
            }

            return citizens;
        }

        /// <summary>
        /// Xóa khẩu - Đặt denNgay cho CURRENT_RESIDENT và cập nhật trạng thái Person
        /// </summary>
        public async Task<bool> RemoveMemberAsync(RemoveMemberRequest request)
        {
            var session = _connection.CreateSession();
            
            try
            {
                // Kiểm tra Person tồn tại
                var checkPersonQuery = @"
                    MATCH (p:Person {cccd: $cccd})
                    RETURN p
                ";
                var personResult = await session.RunAsync(checkPersonQuery, new { cccd = request.CCCD });
                var personExists = await personResult.FetchAsync();
                
                if (!personExists)
                {
                    throw new Exception($"Không tìm thấy công dân với CCCD: {request.CCCD}");
                }

                // Kiểm tra có phải chủ hộ không (nếu có householdId)
                if (!string.IsNullOrEmpty(request.HouseholdId))
                {
                    var checkHeadQuery = @"
                        MATCH (p:Person {cccd: $cccd})-[:HEAD_OF]->(h:Household {householdId: $householdId})
                        RETURN p
                    ";
                    var headResult = await session.RunAsync(checkHeadQuery, new { 
                        cccd = request.CCCD,
                        householdId = request.HouseholdId
                    });
                    var isHead = await headResult.FetchAsync();
                    
                    if (isHead)
                    {
                        throw new Exception("Không thể xóa chủ hộ. Vui lòng chuyển quyền chủ hộ cho người khác trước.");
                    }
                }

                var ngayXoaLocal = new Neo4j.Driver.LocalDate(request.NgayXoa.Year, request.NgayXoa.Month, request.NgayXoa.Day);

                // Cập nhật trạng thái Person và kết thúc tất cả quan hệ cư trú (LIVES_IN và CURRENT_RESIDENT)
                var updateQuery = @"
                    MATCH (p:Person {cccd: $cccd})
                    SET p.trangThai = $trangThai
                    
                    WITH p
                    OPTIONAL MATCH (p)-[rel:LIVES_IN]->(h:Household)
                    WHERE rel.toDate IS NULL
                    SET rel.toDate = $today,
                        rel.reason = $lyDo
                    
                    WITH p, collect(rel) as livesInRels
                    OPTIONAL MATCH (p)-[rel2:CURRENT_RESIDENT]->(h2:Household)
                    WHERE rel2.toDate IS NULL
                    SET rel2.toDate = $today,
                        rel2.lyDoKetThuc = $lyDo
                    
                    RETURN p, livesInRels, collect(rel2) as currentRels
                ";

                await session.RunAsync(updateQuery, new
                {
                    cccd = request.CCCD,
                    today = ngayXoaLocal,
                    lyDo = request.LyDo,
                    trangThai = request.LoaiXoa
                });

                return true;
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi xóa khẩu: {ex.Message}", ex);
            }
            finally
            {
                await session.CloseAsync();
            }
        }

        /// <summary>
        /// Tách khẩu + lập hộ mới - Tạo household mới và chuyển thành viên
        /// </summary>
        public async Task<HouseholdDTO?> SplitNewHouseholdAsync(SplitNewHouseholdRequest request)
        {
            var session = _connection.CreateSession();
            
            try
            {
                if (request.MemberCCCDs == null || request.MemberCCCDs.Count == 0)
                {
                    throw new Exception("Phải chọn ít nhất 1 thành viên để tách khẩu");
                }

                // Lấy thành viên đầu tiên làm chủ hộ mới
                var headCCCD = request.MemberCCCDs[0];
                var today = new Neo4j.Driver.LocalDate(DateTime.Now.Year, DateTime.Now.Month, DateTime.Now.Day);

                // Query tách khẩu - tạo hộ mới và chuyển thành viên
                var splitQuery = @"
                    // 1. Tìm hộ cũ + người làm chủ hộ mới
                    MATCH (oldH:Household {householdId: $fromHouseholdId})
                    MATCH (newHead:Person {cccd: $headCCCD})

                    // 2. Tạo hộ mới
                    CREATE (newH:Household {
                        householdId:         $newHouseholdId,
                        registrationNum:     $newRegistrationNum,
                        residencyType:       $newResidencyType,
                        headOfHouseholdCCCD: $headCCCD,
                        address:             $newAddressText,
                        registrationDate:    $today
                    })

                    // 3. Gắn quan hệ chủ hộ cho hộ mới
                    MERGE (newHead)-[:HEAD_OF]->(newH)

                    // 4. Tách các thành viên được chọn khỏi hộ cũ và chuyển sang hộ mới
                    WITH oldH, newH
                    UNWIND $memberCCCDs AS cccd
                    MATCH (p:Person {cccd: cccd})

                    // Tìm quan hệ cư trú hiện tại ở hộ cũ (hỗ trợ cả LIVES_IN và CURRENT_RESIDENT)
                    OPTIONAL MATCH (p)-[oldLivesIn:LIVES_IN]->(oldH)
                    WHERE oldLivesIn.toDate IS NULL
                    
                    OPTIONAL MATCH (p)-[oldCurrentRes:CURRENT_RESIDENT]->(oldH)
                    WHERE oldCurrentRes.toDate IS NULL

                    // Đóng lịch sử ở hộ cũ
                    FOREACH (_ IN CASE WHEN oldLivesIn IS NOT NULL THEN [1] ELSE [] END |
                        SET oldLivesIn.toDate = $today,
                            oldLivesIn.reason = $reason
                    )
                    FOREACH (_ IN CASE WHEN oldCurrentRes IS NOT NULL THEN [1] ELSE [] END |
                        SET oldCurrentRes.toDate = $today,
                            oldCurrentRes.lyDoKetThuc = $reason
                    )

                    // Tạo quan hệ cư trú mới sang hộ mới (ưu tiên LIVES_IN nếu đã có)
                    FOREACH (_ IN CASE WHEN oldLivesIn IS NOT NULL THEN [1] ELSE [] END |
                        MERGE (p)-[newLivesIn:LIVES_IN]->(newH)
                        ON CREATE SET
                            newLivesIn.fromDate      = $today,
                            newLivesIn.reason        = $reason,
                            newLivesIn.residencyType = $newResidencyType,
                            newLivesIn.relationToHead = CASE
                                WHEN p.cccd = $headCCCD THEN 'Chủ hộ'
                                ELSE coalesce(oldLivesIn.relationToHead, 'Thành viên')
                            END
                    )
                    
                    FOREACH (_ IN CASE WHEN oldCurrentRes IS NOT NULL THEN [1] ELSE [] END |
                        MERGE (p)-[newCurrentRes:CURRENT_RESIDENT]->(newH)
                        ON CREATE SET
                            newCurrentRes.fromDate = $today,
                            newCurrentRes.toDate = null,
                            newCurrentRes.loaiCuTru = $newResidencyType,
                            newCurrentRes.quanHe = CASE
                                WHEN p.cccd = $headCCCD THEN 'Chủ hộ'
                                ELSE coalesce(oldCurrentRes.quanHe, 'Thành viên')
                            END,
                            newCurrentRes.lyDoChuyen = $reason
                    )

                    RETURN oldH, newH, collect({cccd: p.cccd, hoTen: p.hoTen}) AS movedMembers
                ";

                var result = await session.RunAsync(splitQuery, new
                {
                    fromHouseholdId = request.SourceHouseholdId,
                    headCCCD = headCCCD,
                    newHouseholdId = request.NewHouseholdId,
                    newRegistrationNum = request.NewRegistrationNum,
                    newResidencyType = request.ResidencyType,
                    newAddressText = request.NewAddress,
                    today = today,
                    memberCCCDs = request.MemberCCCDs,
                    reason = request.LyDo
                });

                var records = await result.ToListAsync();
                if (records.Count == 0)
                {
                    throw new Exception("Không thể tạo hộ khẩu mới");
                }

                // Lấy thông tin hộ khẩu mới vừa tạo
                var newHouseholdNode = records[0]["newH"].As<INode>();
                var movedMembers = records[0]["movedMembers"].As<List<object>>();

                // Lấy thông tin chủ hộ
                var headQuery = @"
                    MATCH (p:Person {cccd: $cccd})
                    RETURN p.hoTen AS hoTen
                ";
                var headResult = await session.RunAsync(headQuery, new { cccd = headCCCD });
                await headResult.FetchAsync();
                var headName = headResult.Current["hoTen"].As<string>();

                return new HouseholdDTO
                {
                    Id = newHouseholdNode.ElementId,
                    SoHoKhau = request.NewHouseholdId,
                    DiaChi = request.NewAddress,
                    TenChuHo = headName,
                    SoLuongThanhVien = request.MemberCCCDs.Count
                };
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi tách khẩu: {ex.Message}", ex);
            }
            finally
            {
                await session.CloseAsync();
            }
        }
    }
}