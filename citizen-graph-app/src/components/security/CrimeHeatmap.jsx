// src/components/security/CrimeHeatmap.jsx
import React, { useEffect, useRef } from "react";

export default function CrimeHeatmap({ data = [] }) {
  const mapRef = useRef(null);

  useEffect(() => {
    // Tự động load Google Maps từ CDN – không cần key (chỉ dùng cho demo nội bộ)
    const script = document.createElement("script");
    script.src = "https://maps.googleapis.com/maps/api/js?key=&libraries=visualization";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (!mapRef.current || data.length === 0) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 10.762622, lng: 106.660172 }, // TP.HCM
        zoom: 11,
        mapTypeId: "roadmap",
        styles: [
          { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] },
          { featureType: "administrative", elementType: "labels", stylers: [{ visibility: "on" }] },
        ],
      });

      const heatmapData = data.map(p => ({
        location: new window.google.maps.LatLng(p.lat, p.lng),
        weight: p.value
      }));;

      new window.google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: map,
        radius: 25,
        opacity: 0.8,
        gradient: [
          "rgba(0, 255, 255, 0)",
          "rgba(0, 255, 255, 1)",
          "rgba(0, 191, 255, 1)",
          "rgba(0, 127, 255, 1)",
          "rgba(0, 63, 255, 1)",
          "rgba(0, 0, 255, 1)",
          "rgba(0, 0, 223, 1)",
          "rgba(0, 0, 191, 1)",
          "rgba(0, 0, 159, 1)",
          "rgba(0, 0, 127, 1)",
          "rgba(63, 0, 91, 1)",
          "rgba(127, 0, 63, 1)",
          "rgba(191, 0, 31, 1)",
          "rgba(255, 0, 0, 1)",
        ],
      });
    };

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-xl">
        <span className="text-gray-500">Không có dữ liệu điểm nóng</span>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full rounded-xl" style={{ minHeight: "300px" }} />;
}