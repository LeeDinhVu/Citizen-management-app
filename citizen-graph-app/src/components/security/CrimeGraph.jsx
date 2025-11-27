// src/components/security/CrimeGraph.jsx
import React, { useEffect, useRef } from "react";
import { Network } from "vis-network/standalone";
import { DataSet } from "vis-data/standalone";

export default function CrimeGraph({ data }) {
  const container = useRef(null);

  useEffect(() => {
    if (!container.current || !data?.nodes?.length) return;

    const nodes = new DataSet(
      data.nodes.map(node => ({
        id: node.id,
        label: node.displayName || node.label || "Không rõ",
        title: node.cccd 
          ? `${node.role || "Khác"} - CCCD: ${node.cccd}`
          : node.role === "Vụ án" ? node.label : "Không có CCCD",
        shape: node.role === "Vụ án" ? "box" : "ellipse",
        size: node.role === "Vụ án" ? 45 : 32,
        color: {
          background:
            node.role === "Nghi phạm" ? "#dc2626" :      // đỏ
            node.role === "Nạn nhân"   ? "#ea580c" :      // cam
            node.role === "Nhân chứng" ? "#16a34a" :      // xanh lá
            node.role === "Vụ án"      ? "#2563eb" :      // xanh dương
            "#9333ea", // tím mặc định
          border: "#1f2937",
          highlight: { background: "#f43f5e", border: "#f43f5e" }
        },
        font: {
          color: "#fff",
          size: 16,
          face: "Inter, sans-serif",
          strokeWidth: 3,
          strokeColor: "#000"
        },
        shadow: { enabled: true, size: 10 }
      }))
    );

    const edges = new DataSet(
      data.links.map(link => ({
        from: link.source,
        to: link.target,
        arrows: "to",
        label: link.type === "SUSPECT_IN" ? "Nghi phạm" :
               link.type === "VICTIM_IN"   ? "Nạn nhân" :
               link.type === "WITNESS_IN"  ? "Nhân chứng" : link.type,
        color: { color: "#6b7280", highlight: "#111827" },
        font: { align: "middle", size: 13, color: "#4b5563" },
        width: 2,
        smooth: { type: "cubicBezier" }
      }))
    );

    new Network(container.current, { nodes, edges }, {
      physics: {
        barnesHut: {
          gravitationalConstant: -12000,
          springLength: 250,
          springConstant: 0.08
        },
        stabilization: { iterations: 500 }
      },
      layout: { improvedLayout: true },
      interaction: { hover: true, zoomView: true, dragView: true },
      height: "560px"
    });
  }, [data]);

  if (!data?.nodes?.length) {
    return <div className="text-center py-10 text-gray-500">Không có dữ liệu đồ thị</div>;
  }

  return (
    <div 
      ref={container} 
      className="border-2 border-gray-200 rounded-2xl shadow-xl bg-gradient-to-br from-gray-50 to-white overflow-hidden"
      style={{ height: "560px" }}
    />
  );
}