// src/components/security/PersonForm.jsx
import React, { useState } from 'react';
import axios from 'axios';

export default function PersonForm({ caseId, onClose }) {
  const [cccd, setCccd] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('SUSPECT'); // SUSPECT / VICTIM / WITNESS

  async function submit(e) {
    e.preventDefault();
    try {
      // two-step: create/find person, then create relationship
      // endpoint placeholders: /api/person (create) and /api/criminalcase/{caseId}/link
      const personRes = await axios.post('/api/person', { cccd, fullName }).catch(err => {
        // if exists, try to continue
        return err.response ?? null;
      });

      // link person to case
      await axios.post(`/api/CriminalCase/${encodeURIComponent(caseId)}/link-person`, { cccd, role });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Thêm người thất bại (cần backend endpoint /api/person & /api/CriminalCase/{id}/link-person)');
    }
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <form onSubmit={submit} className="space-y-2">
        <input required placeholder="CCCD" value={cccd} onChange={e=>setCccd(e.target.value)} className="p-2 border rounded w-full" />
        <input required placeholder="Họ tên" value={fullName} onChange={e=>setFullName(e.target.value)} className="p-2 border rounded w-full" />
        <select value={role} onChange={e=>setRole(e.target.value)} className="p-2 border rounded w-full">
          <option value="SUSPECT">Nghi phạm</option>
          <option value="VICTIM">Nạn nhân</option>
          <option value="WITNESS">Nhân chứng</option>
        </select>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1 bg-gray-200 rounded">Hủy</button>
          <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">Thêm</button>
        </div>
      </form>
    </div>
  );
}
