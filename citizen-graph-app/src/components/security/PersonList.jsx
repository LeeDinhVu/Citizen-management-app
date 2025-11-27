// src/components/security/PersonList.jsx
import React, { useState } from 'react';
import PersonForm from './PersonForm';

export default function PersonList({ persons = [], caseId, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold">Người liên quan</h4>
        <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => setShowAdd(true)}>Thêm</button>
      </div>
      <ul className="space-y-2">
        {persons.map(p => <li key={p.cccd ?? p.Cccd} className="p-2 border rounded">{p.fullName ?? p.name} — CCCD: {p.cccd ?? p.Cccd}</li>)}
      </ul>

      {showAdd && <PersonForm caseId={caseId} onClose={() => { setShowAdd(false); onRefresh?.(); }} />}
    </div>
  );
}
