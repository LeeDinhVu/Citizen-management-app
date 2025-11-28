import React, { useState, useEffect } from 'react';

const MedicalPage = () => {
    // STATE
    const [stats, setStats] = useState({ F0: 0, F1: 0, Safe: 0, Total: 0 });
    const [loading, setLoading] = useState(false);
    
    // Trace State
    const [searchCCCD, setSearchCCCD] = useState('');
    const [traceResult, setTraceResult] = useState(null);
    
    // Warning State
    const [warnings, setWarnings] = useState([]);
    
    // Vaccine State
    const [vaccineCCCD, setVaccineCCCD] = useState('');
    const [vaccineData, setVaccineData] = useState(null);

    // Update & Action State
    const [actionTab, setActionTab] = useState('update'); // update | contact | vaccine
    const [formData, setFormData] = useState({ cccd: '', status: 'F0', cccd2: '', date: '', location: '', vaccine: '', dose: 1 });

    useEffect(() => {
        fetchStats();
        fetchWarnings();
    }, []);

    // --- API CALLS ---
    const fetchStats = () => fetch('http://localhost:5000/api/health/dashboard-stats').then(res=>res.json()).then(setStats).catch(console.error);
    const fetchWarnings = () => fetch('http://localhost:5000/api/health/household-warning').then(res=>res.json()).then(setWarnings).catch(console.error);
    
    const handleTrace = async () => {
        if(!searchCCCD) return; setLoading(true); setTraceResult(null);
        try {
            const res = await fetch(`http://localhost:5000/api/health/trace-infection/${searchCCCD}`);
            if(res.ok) setTraceResult(await res.json());
            else alert("Không tìm thấy công dân!");
        } finally { setLoading(false); }
    };

    const handleVaccineCheck = async () => {
        if(!vaccineCCCD) return;
        try {
            const res = await fetch(`http://localhost:5000/api/health/vaccine-history/${vaccineCCCD}`);
            if(res.ok) setVaccineData(await res.json());
            else alert("Không có dữ liệu tiêm chủng!");
        } catch(e) { alert("Lỗi kết nối"); }
    };

    const handleSubmitAction = async () => {
        let url = '', body = {};
        if (actionTab === 'update') {
            url = 'update-status'; body = { Cccd: formData.cccd, Status: formData.status };
        } else if (actionTab === 'contact') {
            url = 'add-contact'; body = { Cccd1: formData.cccd, Cccd2: formData.cccd2, Date: formData.date, Location: formData.location };
        } else if (actionTab === 'vaccine') {
            url = 'add-vaccine'; body = { Cccd: formData.cccd, VaccineName: formData.vaccine, Date: formData.date, Dose: parseInt(formData.dose) };
        }

        try {
            const res = await fetch(`http://localhost:5000/api/health/medical/${url}`, {
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
            });
            if(res.ok) { alert("✅ Thao tác thành công!"); fetchStats(); fetchWarnings(); }
            else alert("❌ Thất bại!");
        } catch(e) { alert("Lỗi server!"); }
    };

    return (
        <>
            <style>{`
                .med-page { padding: 20px; background: #f1f5f9; font-family: 'Segoe UI', sans-serif; min-height: 100vh; }
                .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
                .grid-2 { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
                .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
                .stat-box { border-left: 5px solid #ccc; padding: 15px; background: white; border-radius: 10px; }
                .stat-num { font-size: 2.5rem; font-weight: bold; line-height: 1; }
                .red { border-color: #ef4444; color: #dc2626; } .orange { border-color: #f97316; color: #ea580c; }
                .green { border-color: #22c55e; color: #16a34a; } .blue { border-color: #3b82f6; color: #1e40af; }
                
                .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; color: white; transition: 0.2s; }
                .btn-blue { background: #2563eb; } .btn-blue:hover { background: #1d4ed8; }
                .btn-green { background: #16a34a; } .btn-green:hover { background: #15803d; }
                .input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; width: 100%; box-sizing: border-box; margin-bottom: 10px; }
                
                .tab-group { display: flex; gap: 5px; margin-bottom: 15px; background: #e2e8f0; padding: 5px; border-radius: 8px; }
                .tab { flex: 1; padding: 8px; text-align: center; cursor: pointer; border-radius: 6px; font-weight: 600; }
                .tab.active { background: white; color: #2563eb; shadow: 0 1px 3px rgba(0,0,0,0.1); }
                
                .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .table th { background: #f8fafc; text-align: left; padding: 10px; color: #64748b; }
                .table td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
                .badge { padding: 3px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
                .bg-red { background: #fee2e2; color: #991b1b; } .bg-green { background: #dcfce7; color: #166534; }
            `}</style>

            <div className="med-page">
                <h1 style={{color: '#0f172a', marginBottom: '20px'}}>🏥 Hệ thống Quản lý Dịch tễ Toàn diện</h1>

                {/* 1. DASHBOARD */}
                <div className="grid-4">
                    <div className="stat-box red"><div>F0 (DƯƠNG TÍNH)</div><div className="stat-num">{stats.F0}</div></div>
                    <div className="stat-box orange"><div>F1 (NGUY CƠ)</div><div className="stat-num">{stats.F1}</div></div>
                    <div className="stat-box green"><div>VÙNG XANH</div><div className="stat-num">{stats.Safe}</div></div>
                    <div className="stat-box blue"><div>TỔNG DÂN SỐ</div><div className="stat-num">{stats.Total}</div></div>
                </div>

                <div className="grid-2">
                    {/* CỘT TRÁI: CÁC CHỨC NĂNG XEM */}
                    <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                        
                        {/* 2. TRUY VẾT */}
                        <div className="card">
                            <h3>🔍 Truy vết lây nhiễm (Contact Tracing)</h3>
                            <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                                <input className="input" style={{marginBottom:0}} placeholder="Nhập CCCD F0..." value={searchCCCD} onChange={e=>setSearchCCCD(e.target.value)}/>
                                <button className="btn btn-blue" onClick={handleTrace} disabled={loading}>{loading?'...':'Tìm'}</button>
                            </div>
                            {traceResult && (
                                <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px'}}>
                                    <div style={{color:'#dc2626', fontWeight:'bold', marginBottom:'10px'}}>ĐỐI TƯỢNG: {traceResult.name} ({traceResult.status})</div>
                                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                                        <div>
                                            <div style={{fontWeight:'bold', color:'#ea580c'}}>🔻 F1 ({traceResult.f1.length})</div>
                                            <div style={{maxHeight:'150px', overflowY:'auto'}}>
                                                {traceResult.f1.map((p,i)=><div key={i} style={{fontSize:'0.9rem', padding:'5px', borderBottom:'1px dashed #eee'}}>{p.name} - {p.contactDate}</div>)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{fontWeight:'bold', color:'#ca8a04'}}>⚠️ F2 ({traceResult.f2.length})</div>
                                            <div style={{maxHeight:'150px', overflowY:'auto'}}>
                                                {traceResult.f2.map((p,i)=><div key={i} style={{fontSize:'0.9rem', padding:'5px', borderBottom:'1px dashed #eee'}}>{p.name} ({p.verifySource})</div>)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. CẢNH BÁO HỘ GIA ĐÌNH */}
                        <div className="card">
                            <h3>🏠 Cảnh báo Hộ gia đình có F0</h3>
                            {warnings.length === 0 ? <p style={{color:'#64748b'}}>Không có cảnh báo nào.</p> : (
                                <table className="table">
                                    <thead><tr><th>Số hộ khẩu</th><th>Địa chỉ</th><th>Thành viên F0</th><th>Thành viên khác</th></tr></thead>
                                    <tbody>
                                        {warnings.map((w, i) => (
                                            <tr key={i}>
                                                <td style={{fontWeight:'bold'}}>{w.soHoKhau}</td>
                                                <td>{w.diaChi}</td>
                                                <td style={{color:'red', fontWeight:'bold'}}>{w.f0}</td>
                                                <td>{w.thanhVien.length} người</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                         {/* 4. TRA CỨU TIÊM CHỦNG */}
                         <div className="card">
                            <h3>💉 Tra cứu Lịch sử Tiêm chủng</h3>
                            <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                                <input className="input" style={{marginBottom:0}} placeholder="Nhập CCCD..." value={vaccineCCCD} onChange={e=>setVaccineCCCD(e.target.value)}/>
                                <button className="btn btn-green" onClick={handleVaccineCheck}>Kiểm tra</button>
                            </div>
                            {vaccineData && (
                                <div style={{background:'#f0fdf4', padding:'15px', borderRadius:'8px', border:'1px solid #dcfce7'}}>
                                    <div style={{fontWeight:'bold', color:'#166534'}}>{vaccineData.name} - {vaccineData.status}</div>
                                    <ul style={{marginTop:'5px', paddingLeft:'20px'}}>
                                        {vaccineData.history.length === 0 ? <li>Chưa tiêm mũi nào</li> : 
                                        vaccineData.history.map((v,i) => (
                                            <li key={i}>Mũi {v.dose}: {v.vaccine} (Ngày: {v.date})</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CỘT PHẢI: THAO TÁC (QUẢN LÝ) */}
                    <div className="card" style={{height:'fit-content'}}>
                        <h3>🛠 Quản lý & Tác nghiệp</h3>
                        <div className="tab-group">
                            <div className={`tab ${actionTab==='update'?'active':''}`} onClick={()=>setActionTab('update')}>Cập nhật F0</div>
                            <div className={`tab ${actionTab==='contact'?'active':''}`} onClick={()=>setActionTab('contact')}>Khai báo F1</div>
                            <div className={`tab ${actionTab==='vaccine'?'active':''}`} onClick={()=>setActionTab('vaccine')}>Tiêm chủng</div>
                        </div>

                        {/* FORM NHẬP LIỆU */}
                        <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px'}}>
                            <label style={{fontSize:'0.85rem', fontWeight:'bold', display:'block', marginBottom:'5px'}}>CCCD Công dân:</label>
                            <input className="input" placeholder="VD: 079..." value={formData.cccd} onChange={e=>setFormData({...formData, cccd:e.target.value})}/>

                            {actionTab === 'update' && (
                                <>
                                    <label style={{fontSize:'0.85rem', fontWeight:'bold', display:'block', marginBottom:'5px'}}>Trạng thái mới:</label>
                                    <select className="input" value={formData.status} onChange={e=>setFormData({...formData, status:e.target.value})}>
                                        <option value="F0">F0 (Dương tính)</option><option value="F1">F1 (Nguy cơ)</option><option value="Khỏi bệnh">Khỏi bệnh</option>
                                    </select>
                                </>
                            )}

                            {actionTab === 'contact' && (
                                <>
                                    <label style={{fontSize:'0.85rem', fontWeight:'bold', display:'block', marginBottom:'5px'}}>Tiếp xúc với (CCCD):</label>
                                    <input className="input" placeholder="CCCD người thứ 2" value={formData.cccd2} onChange={e=>setFormData({...formData, cccd2:e.target.value})}/>
                                    <label style={{fontSize:'0.85rem', fontWeight:'bold', display:'block', marginBottom:'5px'}}>Ngày & Địa điểm:</label>
                                    <input className="input" type="date" value={formData.date} onChange={e=>setFormData({...formData, date:e.target.value})}/>
                                    <input className="input" placeholder="VD: Siêu thị..." value={formData.location} onChange={e=>setFormData({...formData, location:e.target.value})}/>
                                </>
                            )}

                            {actionTab === 'vaccine' && (
                                <>
                                    <label style={{fontSize:'0.85rem', fontWeight:'bold', display:'block', marginBottom:'5px'}}>Thông tin mũi tiêm:</label>
                                    <input className="input" placeholder="Tên Vaccine (Pfizer...)" value={formData.vaccine} onChange={e=>setFormData({...formData, vaccine:e.target.value})}/>
                                    <input className="input" type="number" placeholder="Mũi số (1, 2...)" value={formData.dose} onChange={e=>setFormData({...formData, dose:e.target.value})}/>
                                    <input className="input" type="date" value={formData.date} onChange={e=>setFormData({...formData, date:e.target.value})}/>
                                </>
                            )}

                            <button className="btn btn-blue" style={{width:'100%', marginTop:'10px'}} onClick={handleSubmitAction}>LƯU DỮ LIỆU</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MedicalPage;