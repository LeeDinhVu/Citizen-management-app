import React from 'react';
import { Row, Col, Card, Statistic, Progress, Table, Tag } from 'antd';
import { ArrowUpOutlined, UserOutlined, HomeOutlined, CarOutlined, AlertOutlined } from '@ant-design/icons';

const Dashboard = () => {
  // Dữ liệu giả lập cho bảng
  const recentActivities = [
    { key: '1', user: 'Nguyễn Văn A', action: 'Đăng ký thường trú', time: '10 phút trước', status: 'success' },
    { key: '2', user: 'Lê Thị B', action: 'Khai báo y tế', time: '30 phút trước', status: 'warning' },
    { key: '3', user: 'Trần Văn C', action: 'Sang tên xe máy', time: '1 giờ trước', status: 'processing' },
  ];

  const columns = [
    { title: 'Công dân', dataIndex: 'user', key: 'user', render: (text) => <b>{text}</b> },
    { title: 'Hoạt động', dataIndex: 'action', key: 'action' },
    { title: 'Thời gian', dataIndex: 'time', key: 'time', style: { color: '#888' } },
    { 
      title: 'Trạng thái', dataIndex: 'status', key: 'status', 
      render: status => {
        let color = status === 'success' ? 'green' : status === 'warning' ? 'orange' : 'blue';
        let text = status === 'success' ? 'Hoàn tất' : status === 'warning' ? 'Cảnh báo' : 'Đang xử lý';
        return <Tag color={color}>{text}</Tag>;
      }
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>📊 Tổng quan Hệ thống</h2>

      {/* 1. HÀNG THỐNG KÊ SỐ LIỆU (CARDS) */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
            <Statistic 
              title="Tổng Dân số" 
              value={1254302} 
              prefix={<UserOutlined />} 
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Statistic 
              title="Hộ gia đình" 
              value={340120} 
              prefix={<HomeOutlined />} 
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
            <Statistic 
              title="Phương tiện Đăng ký" 
              value={893201} 
              prefix={<CarOutlined />} 
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#fff1f0', borderColor: '#ffa39e' }}>
            <Statistic 
              title="Cảnh báo An ninh" 
              value={12} 
              prefix={<AlertOutlined />} 
              valueStyle={{ color: '#cf1322' }}
              suffix={<span style={{fontSize: 12, color: '#888'}}>(<ArrowUpOutlined /> +2)</span>}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 24 }}></div>

      {/* 2. HÀNG BIỂU ĐỒ VÀ HOẠT ĐỘNG */}
      <Row gutter={[16, 16]}>
        {/* Cột trái: Tỷ lệ dân số */}
        <Col xs={24} lg={10}>
          <Card title="Thống kê theo Độ tuổi & Giới tính" bordered={false}>
            <div style={{ marginBottom: 15 }}>
              <span>Nam giới (49%)</span>
              <Progress percent={49} strokeColor="#1890ff" />
            </div>
            <div style={{ marginBottom: 15 }}>
              <span>Nữ giới (51%)</span>
              <Progress percent={51} strokeColor="#eb2f96" />
            </div>
            <div style={{ marginBottom: 15 }}>
              <span>Độ tuổi lao động (18-60)</span>
              <Progress percent={68} status="active" />
            </div>
            <div>
              <span>Trẻ em & Người già</span>
              <Progress percent={32} strokeColor="orange" />
            </div>
          </Card>
        </Col>

        {/* Cột phải: Hoạt động gần đây */}
        <Col xs={24} lg={14}>
          <Card title="Hoạt động Gần đây (Real-time)" bordered={false}>
             <Table 
               dataSource={recentActivities} 
               columns={columns} 
               pagination={false} 
               size="small"
             />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;