import React from 'react';
import { Avatar, Tag, Tooltip, Typography } from 'antd';
import { ManOutlined, WomanOutlined, HomeOutlined } from '@ant-design/icons';

const { Text } = Typography;

const FamilyMemberCard = ({ member, role }) => {
  if (!member) return null;

  const { hoTen, ngaySinh, gioiTinh, cccd, maritalStatus } = member;
  const isMale = gioiTinh === 'Nam';
  const age = ngaySinh ? new Date().getFullYear() - new Date(ngaySinh).getFullYear() : '?';

  // Màu sắc chủ đạo
  const mainColor = isMale ? '#1890ff' : '#eb2f96';
  const bgColor = isMale ? '#e6f7ff' : '#fff0f6';

  return (
    <div
      style={{
        width: '100%', // Full width của khung chứa
        height: '100%', // Full height của khung chứa
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        border: `2px solid ${isMale ? '#91d5ff' : '#ffadd2'}`,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box' // Quan trọng: Padding không làm vỡ khung
      }}
    >
      {/* Header card */}
      <div style={{ background: bgColor, padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32 }}>
         <Tag color={mainColor} style={{ margin: 0, fontSize: 10 }}>{role || 'TV'}</Tag>
         {maritalStatus === 'Đã kết hôn' && <Tooltip title="Đã kết hôn"><HomeOutlined style={{ color: mainColor }} /></Tooltip>}
      </div>

      <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Avatar
          size={48}
          style={{ backgroundColor: mainColor, marginBottom: 4, fontSize: 20 }}
          icon={isMale ? <ManOutlined /> : <WomanOutlined />}
        />
        
        <Text strong style={{ fontSize: 14, textAlign: 'center', lineHeight: 1.2, marginBottom: 2 }} ellipsis={{ tooltip: hoTen }}>
            {hoTen}
        </Text>
        <Text type="secondary" style={{ fontSize: 10 }}>{cccd}</Text>

        <div style={{ marginTop: 4, display: 'flex', gap: 4 }}>
            <Tag style={{ fontSize: 10, margin: 0 }}>{age}t</Tag>
            <Tag color={isMale ? 'blue' : 'magenta'} style={{ fontSize: 10, margin: 0 }}>{gioiTinh}</Tag>
        </div>
      </div>
    </div>
  );
};

export default FamilyMemberCard;