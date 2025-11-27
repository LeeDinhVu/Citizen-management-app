// src/components/security/PersonCard.jsx
import React from "react";
import { Card, Avatar, Tag } from "antd";
import { UserOutlined } from "@ant-design/icons";

export default function PersonCard({ person }) {
  const roleColor = person.role === "Nghi phạm" ? "red" : 
                   person.role === "Nạn nhân" ? "orange" : 
                   person.role === "Nhân chứng" ? "green" : "blue";

  return (
    <Card hoverable className="shadow-md border-l-4" style={{ borderLeftColor: roleColor }}>
      <div className="flex items-center gap-4">
        <Avatar size={50} icon={<UserOutlined />} style={{ backgroundColor: roleColor }} />
        <div className="flex-1">
          <div className="font-semibold text-lg">{person.name}</div>
          {person.cccd && <div className="text-sm text-gray-600">CCCD: {person.cccd}</div>}
        </div>
        <Tag color={roleColor} className="text-base font-bold">{person.role}</Tag>
      </div>
    </Card>
  );
}