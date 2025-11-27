// src/components/security/FilterPanel.jsx
import React, { useState } from 'react';

export default function FilterPanel({ onSearch }) {
  const [cccd, setCccd] = useState('');
  const [crimeType, setCrimeType] = useState('');
  const [severity, setSeverity] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [policeOrg, setPoliceOrg] = useState('');

  function submit(e){
    e?.preventDefault();
    onSearch({
      cccd: cccd || null,
      crimeType: crimeType || null,
      severity: severity || null,
      occurredDateFrom: fromDate || null,
      occurredDateTo: toDate || null,
      policeOrg: policeOrg || null
    });
  }

  return (
    <form onSubmit={submit} className="bg-white p-3 rounded shadow-sm mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="p-2 border rounded" placeholder="CCCD nghi phạm" value={cccd} onChange={e=>setCccd(e.target.value)} />
        <input className="p-2 border rounded" placeholder="Loại tội phạm" value={crimeType} onChange={e=>setCrimeType(e.target.value)} />
        <input className="p-2 border rounded" placeholder="Đơn vị điều tra" value={policeOrg} onChange={e=>setPoliceOrg(e.target.value)} />
      </div>

      <div className="flex gap-2 mt-3">
        <input type="date" className="p-2 border rounded" value={fromDate} onChange={e=>setFromDate(e.target.value)} />
        <input type="date" className="p-2 border rounded" value={toDate} onChange={e=>setToDate(e.target.value)} />
        <input className="p-2 border rounded" placeholder="Mức độ" value={severity} onChange={e=>setSeverity(e.target.value)} />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Tìm</button>
      </div>
    </form>
  );
}
