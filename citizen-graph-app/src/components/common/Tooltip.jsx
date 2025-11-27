import React from "react";

export default function Tooltip({ text, children }) {
  return (
    <div className="relative group">
      {children}
      <span className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs rounded bg-gray-700 text-white opacity-0 group-hover:opacity-100 transition-opacity">
        {text}
      </span>
    </div>
  );
}
