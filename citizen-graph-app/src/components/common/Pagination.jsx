// src/components/common/Pagination.jsx
import React from 'react';

export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const arr = Array.from({length: pages}, (_,i)=>i+1).slice(0, 50);

  return (
    <div className="flex items-center gap-2">
      <button onClick={()=>onChange(Math.max(1, page-1))} className="px-2 py-1 border rounded">Prev</button>
      {arr.map(p => (
        <button key={p} onClick={()=>onChange(p)} className={`px-2 py-1 border rounded ${p===page?'bg-blue-600 text-white':''}`}>{p}</button>
      ))}
      <button onClick={()=>onChange(Math.min(pages, page+1))} className="px-2 py-1 border rounded">Next</button>
    </div>
  );
}
