import React, { useState } from 'react';
import { Layout, Menu, theme, Avatar, Dropdown, Space } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  PieChartOutlined, UserOutlined, HomeOutlined, TeamOutlined,
  CarOutlined, AlertOutlined, MedicineBoxOutlined, PartitionOutlined,
  UserSwitchOutlined, LogoutOutlined, DownOutlined, DatabaseOutlined
} from '@ant-design/icons';

const { Header, Content, Footer, Sider } = Layout;

function getItem(label, key, icon, children) {
  return { key, icon, children, label };
}

const items = [
  getItem('Tổng quan', '/', <PieChartOutlined />),
  getItem('Database Connection', '/database', <DatabaseOutlined />),
  getItem('Hồ sơ Công dân', '/citizens', <UserOutlined />),
  getItem('Quản lý Cư trú', '/residency', <HomeOutlined />),
  getItem('Gia đình & Phả hệ', '/family', <TeamOutlined />),
  getItem('Tài sản & Sở hữu', '/assets', <CarOutlined />),
  getItem('An ninh & Tội phạm', '/security', <AlertOutlined />),
  getItem('Y tế & Dịch tễ', '/health', <MedicineBoxOutlined />),
  getItem('Truy vết', '/trace', <PartitionOutlined />),
];

// Menu dropdown cho User Admin
const userMenu = (
  <Menu items={[
    { key: '1', label: 'Thông tin tài khoản', icon: <UserOutlined /> },
    { key: '2', label: 'Đổi mật khẩu', icon: <UserSwitchOutlined /> },
    { type: 'divider' },
    { key: '3', label: 'Đăng xuất', icon: <LogoutOutlined />, danger: true },
  ]} />
);

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* SIDEBAR */}
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} width={260}>
        <div style={{ height: 64, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
           {/* Logo giả lập */}
           <div style={{ fontWeight: 'bold', color: 'white', fontSize: collapsed ? '12px' : '18px', whiteSpace: 'nowrap' }}>
              {collapsed ? 'NEO4J' : '🏛️ CITIZEN GRAPH'}
           </div>
        </div>
        <Menu theme="dark" defaultSelectedKeys={['/']} selectedKeys={[location.pathname]} mode="inline" items={items} onClick={(e) => navigate(e.key)} />
      </Sider>

      {/* NỘI DUNG CHÍNH */}
      <Layout>
        {/* HEADER: Làm đẹp phần đầu trang */}
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px #f0f1f2', zIndex: 1 }}>
          <h3 style={{ margin: 0, color: '#1890ff' }}>HỆ THỐNG QUẢN LÝ DỮ LIỆU CÔNG DÂN SỐ</h3>
          
          {/* Khu vực User Admin bên phải */}
          <Dropdown overlay={userMenu} trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: '#87d068' }} icon={<UserOutlined />} />
              <span style={{ fontWeight: 500 }}>Admin Group 14</span>
              <DownOutlined style={{ fontSize: '12px' }} />
            </Space>
          </Dropdown>
        </Header>

        {/* CONTENT: Phần nội dung thay đổi */}
        <Content style={{ margin: '16px 16px' }}>
          <div style={{ padding: 24, minHeight: 'calc(100vh - 150px)', background: colorBgContainer, borderRadius: borderRadiusLG }}>
            <Outlet />
          </div>
        </Content>

        <Footer style={{ textAlign: 'center', color: '#888' }}>
          CitizenGraph ©2025 Created by Group 14 using Neo4j & React
        </Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout;