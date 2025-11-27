import React, { useState, useEffect } from 'react';
import {
  Tabs, Card, Button, Tag, Typography, Table,
  notification, Statistic, Row, Col, Modal, Descriptions, Form, Select, Input,
  Popconfirm, Space, Alert, Empty
} from 'antd';
import {
  WalletOutlined, HomeOutlined, CarOutlined, ApartmentOutlined,
  ShopOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
  LinkOutlined, DisconnectOutlined, RedoOutlined, UserOutlined,
  SearchOutlined, BarChartOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;

const API_URL = 'http://localhost:5000/api/assets'; // Đúng với route đã sửa

const AssetManagementPage = () => {
  const [stats, setStats] = useState(null);
  const [owners, setOwners] = useState([]);
  const [assets, setAssets] = useState([]);
  const [activeAssetType, setActiveAssetType] = useState('RealEstate');
  const [ownershipAssetType, setOwnershipAssetType] = useState('RealEstate');
  const [dropdownAssets, setDropdownAssets] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetModalVisible, setAssetModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [formAsset] = Form.useForm();
  const [formAssign] = Form.useForm();

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeAssetType) fetchAssets();
  }, [activeAssetType]);

  useEffect(() => {
    fetchDropdownAssets();
  }, [ownershipAssetType]);

  const fetchData = () => {
    fetchDashboard();
    fetchAssets();
    fetchDropdownAssets();
  };

  const fetchDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const res = await axios.get(`${API_URL}/dashboard`);
      if (res.data) {
        setStats(res.data.statistics);
        setOwners(res.data.ownersGrid || []);
      }
    } catch (err) {
      notification.error({ message: 'Lỗi', description: 'Không thể tải Dashboard' });
    } finally {
      setLoadingDashboard(false);
    }
  };

  const fetchAssets = async () => {
    setLoadingAssets(true);
    try {
      const res = await axios.get(`${API_URL}/assets/${activeAssetType}`);
      setAssets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      notification.error({ message: 'Lỗi tải danh sách tài sản' });
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  };

  const fetchDropdownAssets = async () => {
    try {
      const res = await axios.get(`${API_URL}/assets/${ownershipAssetType}`);
      setDropdownAssets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setDropdownAssets([]);
    }
  };

  const viewOwnerDetail = async (cccd) => {
    try {
      const res = await axios.get(`${API_URL}/detail/${cccd}`);
      setSelectedOwner(res.data);
      setDetailModalVisible(true);
    } catch (err) {
      notification.error({ message: 'Không tìm thấy chi tiết' });
    }
  };

  // --- HANDLERS ---
  const openAddAsset = () => {
    setEditingAsset(null);
    formAsset.resetFields();
    setAssetModalVisible(true);
  };

  const openEditAsset = (record) => {
    setEditingAsset(record);
    formAsset.setFieldsValue(record);
    setAssetModalVisible(true);
  };

  const handleSaveAsset = async () => {
    try {
      const values = await formAsset.validateFields();
      if (editingAsset) {
        const idField = activeAssetType === 'RealEstate' ? 'assetId' : activeAssetType === 'Vehicle' ? 'vehicleId' : 'businessId';
        const id = editingAsset[idField];
        await axios.put(`${API_URL}/assets/${activeAssetType}/${id}`, values);
        notification.success({ message: 'Thành công', description: 'Cập nhật tài sản thành công' });
      } else {
        await axios.post(`${API_URL}/assets/${activeAssetType}`, values);
        notification.success({ message: 'Thành công', description: 'Tạo tài sản mới thành công' });
      }
      setAssetModalVisible(false);
      fetchAssets();
      fetchDashboard();
      fetchDropdownAssets(); // Refresh cả dropdown
    } catch (err) {
      notification.error({ message: 'Lỗi', description: err.response?.data?.message || err.message });
    }
  };

  const handleDeleteAsset = async (record) => {
    const id = record.assetId || record.vehicleId || record.businessId;
    try {
      await axios.delete(`${API_URL}/assets/${activeAssetType}/${id}`);
      notification.success({ message: 'Thành công', description: 'Đã xóa tài sản' });
      fetchAssets();
      fetchDashboard();
      fetchDropdownAssets(); // Refresh cả dropdown
    } catch (err) {
      notification.error({ message: 'Lỗi', description: 'Xóa thất bại' });
    }
  };

  const handleAssignOwnership = async () => {
    try {
      const values = await formAssign.validateFields();
      await axios.post(`${API_URL}/ownership/assign`, values);
      notification.success({ message: 'Thành công', description: 'Gán quyền sở hữu thành công' });
      formAssign.resetFields(); 
      fetchDashboard(); 
    } catch (err) {
      notification.error({ message: 'Lỗi', description: err.response?.data?.message || 'Gán thất bại' });
    }
  };

  const handleUnassignOwnership = async () => {
    try {
      const values = await formAssign.validateFields();
      await axios.post(`${API_URL}/ownership/unassign`, values);
      notification.success({ message: 'Thành công', description: 'Đã gỡ quyền sở hữu' });
      fetchDashboard();
    } catch (err) {
      notification.error({ message: 'Lỗi', description: err.response?.data?.message || 'Gỡ thất bại' });
    }
  };

  // --- RENDER FUNCTIONS ---
const renderDashboard = () => {
    return (
      <div>
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="Bất động sản"
                value={stats.RealEstate?.Count || 0}
                prefix={<ApartmentOutlined />}
                valueStyle={{ color: '#722ed1' }}
                suffix={<small>({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.RealEstate?.Value || 0)})</small>}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Phương tiện"
                value={stats.Vehicle?.Count || 0}
                prefix={<CarOutlined />}
                valueStyle={{ color: '#08979c' }}
                suffix={<small>({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.Vehicle?.Value || 0)})</small>}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="Doanh nghiệp"
                value={stats.Business?.Count || 0}
                prefix={<ShopOutlined />}
                valueStyle={{ color: '#d4380d' }}
                suffix={<small>({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.Business?.Value || 0)})</small>}
              />
            </Card>
          </Col>
        </Row>
      )}
      <Card title={<><BarChartOutlined /> Top 100 Công dân giàu nhất</>}>
        <Table
          dataSource={owners}
          rowKey="cccd"
          loading={loadingDashboard}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Họ tên', dataIndex: 'hoTen', render: (t, r) => <a onClick={() => viewOwnerDetail(r.cccd)}><b><UserOutlined /> {t}</b></a> },
            { title: 'CCCD', dataIndex: 'cccd', render: t => <Tag color="blue">{t}</Tag> },
            { title: 'BĐS', dataIndex: 'soLuongBDS', render: v => v > 0 ? <Tag color="purple">{v}</Tag> : '-' },
            { title: 'Xe', dataIndex: 'soLuongXe', render: v => v > 0 ? <Tag color="cyan">{v}</Tag> : '-' },
            { title: 'DN', dataIndex: 'soLuongDN', render: v => v > 0 ? <Tag color="orange">{v}</Tag> : '-' },
            { title: 'Tổng giá trị', dataIndex: 'tongGiaTri', align: 'right', render: v => <b style={{ color: '#cf1322' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)}</b> },
          ]}
        />
      </Card>
    </div>
    );
  };

  const renderAssets = () => {
    const getColumns = () => {
      const common = [
        { title: 'ID', dataIndex: activeAssetType === 'RealEstate' ? 'assetId' : activeAssetType === 'Vehicle' ? 'vehicleId' : 'businessId', render: t => <Tag>{t}</Tag> }
      ];
      
      let specific = [];
      if (activeAssetType === 'RealEstate') {
        specific = [
          { title: 'Giấy tờ', dataIndex: 'legalDocument' },
          { title: 'Diện tích', dataIndex: 'area', render: v => v ? `${v} m²` : '-' },
          { title: 'Giá trị', dataIndex: 'valueVND', render: v => new Intl.NumberFormat('vi-VN').format(v) + ' VNĐ' }
        ];
      } else if (activeAssetType === 'Vehicle') {
        specific = [
          { title: 'Biển số', dataIndex: 'licensePlate', render: t => <Tag color="geekblue">{t}</Tag> },
          { title: 'Hãng/Dòng', render: (_,r) => `${r.brand || ''} ${r.model || ''}` },
          { title: 'Giá trị', dataIndex: 'valueVND', render: v => new Intl.NumberFormat('vi-VN').format(v) + ' VNĐ' }
        ];
      } else {
        specific = [
          { title: 'Doanh nghiệp', dataIndex: 'businessName', render: t => <b>{t}</b> },
          { title: 'MST', dataIndex: 'taxCode' },
          { title: 'Vốn', dataIndex: 'registeredCapital', render: v => new Intl.NumberFormat('vi-VN').format(v) + ' VNĐ' }
        ];
      }

      return [
        ...common, 
        ...specific, 
        {
          title: 'Hành động', align: 'right',
          render: (_, r) => (
            <Space>
              <Button size="small" icon={<EditOutlined />} onClick={() => openEditAsset(r)} />
              <Popconfirm title="Xóa tài sản này?" onConfirm={() => handleDeleteAsset(r)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )
        }
      ];
    };

    const safeAssets = Array.isArray(assets) ? assets : [];
    const filteredAssets = safeAssets.filter(item => 
      JSON.stringify(item).toLowerCase().includes(searchText.toLowerCase())
    );

    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Select 
              value={activeAssetType} 
              onChange={setActiveAssetType} 
              style={{ width: 200 }} 
              size="large"
            >
              <Option value="RealEstate"><ApartmentOutlined /> Bất động sản</Option>
              <Option value="Vehicle"><CarOutlined /> Phương tiện</Option>
              <Option value="Business"><ShopOutlined /> Doanh nghiệp</Option>
            </Select>
            <Input 
              prefix={<SearchOutlined />} 
              placeholder="Tìm kiếm..." 
              onChange={e => setSearchText(e.target.value)} 
              style={{ width: 250 }} 
            />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddAsset} size="large">Thêm Tài sản</Button>
        </div>

        <Table
          dataSource={filteredAssets}
          columns={getColumns()}
          rowKey={r => r.assetId || r.vehicleId || r.businessId}
          loading={loadingAssets}
          locale={{ emptyText: <Empty description="Chưa có dữ liệu" /> }}
        />
      </div>
    );
  };

  const renderOwnership = () => (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
      <Card 
        title={<span><LinkOutlined /> Gán hoặc Gỡ quyền sở hữu</span>} 
        style={{ width: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        actions={[
          <Button type="primary" block onClick={handleAssignOwnership} icon={<LinkOutlined />}>Gán Sở Hữu</Button>,
          <Button danger block onClick={() => {
             Modal.confirm({
               title: 'Xác nhận gỡ quyền sở hữu?',
               content: 'Hành động này sẽ xóa liên kết giữa người và tài sản.',
               onOk: handleUnassignOwnership
             })
          }} icon={<DisconnectOutlined />}>Gỡ Sở Hữu</Button>
        ]}
      >
        <Alert message="Hướng dẫn: Chọn loại tài sản, sau đó tìm kiếm CCCD và ID tài sản để xử lý." type="info" showIcon style={{ marginBottom: 24 }} />
        <Form form={formAssign} layout="vertical">
          
          {/* 1. CHỌN LOẠI TÀI SẢN */}
          <Form.Item name="AssetType" label="Loại Tài sản" initialValue="RealEstate">
             <Select onChange={(val) => setOwnershipAssetType(val)}>
                <Option value="RealEstate">Bất động sản</Option>
                <Option value="Vehicle">Phương tiện</Option>
                <Option value="Business">Doanh nghiệp</Option>
             </Select>
          </Form.Item>

          {/* 2. CHỌN CÔNG DÂN (ListDown search từ owners) */}
          <Form.Item name="cccd" label="CCCD Công dân" rules={[{ required: true, message: 'Vui lòng chọn công dân' }]}>
            <Select 
              showSearch 
              placeholder="Tìm kiếm theo Tên hoặc CCCD..."
              optionFilterProp="children"
              filterOption={(input, option) => 
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={owners.map(o => ({
                value: o.cccd,
                label: `${o.hoTen} (${o.cccd})`
              }))}
            />
          </Form.Item>

          {/* 3. CHỌN TÀI SẢN (ListDown search từ dropdownAssets) */}
          <Form.Item name="assetId" label="ID Tài sản" rules={[{ required: true, message: 'Vui lòng chọn tài sản' }]}>
             <Select 
                showSearch 
                placeholder="Tìm kiếm tài sản..."
                optionFilterProp="children"
                filterOption={(input, option) => 
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
             >
               {dropdownAssets.map(a => {
                 const id = a.assetId || a.vehicleId || a.businessId;
                 const label = ownershipAssetType === 'RealEstate' ? `Sổ: ${a.legalDocument} (${id})`
                             : ownershipAssetType === 'Vehicle' ? `Xe: ${a.licensePlate} - ${a.brand} (${id})`
                             : `DN: ${a.businessName} (${id})`;
                 return (
                   <Option key={id} value={id} label={label}>
                     {label}
                   </Option>
                 );
               })}
             </Select>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={2} style={{margin: 0, color: '#001529'}}>Quản lý Tài sản & Sở hữu</Title>
          <Button icon={<RedoOutlined />} onClick={fetchData}>Làm mới dữ liệu</Button>
      </div>

      <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
        <Tabs defaultActiveKey="1" items={[
            { key: '1', label: <span><HomeOutlined /> Tổng quan (Dashboard)</span>, children: renderDashboard() },
            { key: '2', label: <span><WalletOutlined /> Kho Tài sản</span>, children: renderAssets() },
            { key: '3', label: <span><LinkOutlined /> Quản lý Liên kết</span>, children: renderOwnership() }
        ]} size="large" />
      </div>

      <Modal 
        title={editingAsset ? "Cập nhật Tài sản" : "Thêm Tài sản mới"} 
        open={assetModalVisible} 
        onCancel={() => setAssetModalVisible(false)} 
        onOk={handleSaveAsset}
      >
        <Form form={formAsset} layout="vertical">
          {activeAssetType === 'RealEstate' && (
            <>
              <Form.Item name="legalDocument" label="Số giấy tờ / Sổ đỏ" rules={[{required: true}]}><Input /></Form.Item>
              <Form.Item name="area" label="Diện tích (m²)"><Input type="number" /></Form.Item>
              <Form.Item name="valueVND" label="Giá trị (VNĐ)" rules={[{required: true}]}><Input type="number" /></Form.Item>
            </>
          )}
          {activeAssetType === 'Vehicle' && (
            <>
              <Form.Item name="licensePlate" label="Biển số xe" rules={[{required: true}]}><Input /></Form.Item>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="brand" label="Hãng xe"><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="model" label="Dòng xe"><Input /></Form.Item></Col>
              </Row>
              <Form.Item name="valueVND" label="Giá trị (VNĐ)" rules={[{required: true}]}><Input type="number" /></Form.Item>
            </>
          )}
          {activeAssetType === 'Business' && (
            <>
              <Form.Item name="businessName" label="Tên doanh nghiệp" rules={[{required: true}]}><Input /></Form.Item>
              <Form.Item name="taxCode" label="Mã số thuế" rules={[{required: true}]}><Input /></Form.Item>
              <Form.Item name="registeredCapital" label="Vốn điều lệ (VNĐ)" rules={[{required: true}]}><Input type="number" /></Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <Modal 
        title="Chi tiết Tài sản Công dân" 
        open={detailModalVisible} 
        onCancel={() => setDetailModalVisible(false)} 
        footer={null} 
        width={900}
      >
        {selectedOwner && (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Họ tên">{selectedOwner.person?.hoTen}</Descriptions.Item>
              <Descriptions.Item label="CCCD">{selectedOwner.person?.cccd}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{selectedOwner.person?.ngaySinh || '-'}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ">{selectedOwner.person?.thuongTru || '-'}</Descriptions.Item>
            </Descriptions>
            
            <Tabs defaultActiveKey="re" items={[
              {
                key: 're',
                label: `Bất động sản (${selectedOwner.realEstates?.length || 0})`,
                children: <Table dataSource={selectedOwner.realEstates || []} rowKey="assetId" pagination={false} columns={[
                   { title: 'Giấy tờ', dataIndex: 'legalDocument' },
                   { title: 'Diện tích', dataIndex: 'area', render: v => v ? v + ' m²' : '-' },
                   { title: 'Giá trị', dataIndex: 'valueVND', render: v => v ? new Intl.NumberFormat('vi-VN').format(v) : '-' }
                ]} />
              },
              {
                key: 've',
                label: `Phương tiện (${selectedOwner.vehicles?.length || 0})`,
                children: <Table dataSource={selectedOwner.vehicles || []} rowKey="vehicleId" pagination={false} columns={[
                   { title: 'Biển số', dataIndex: 'licensePlate' },
                   { title: 'Hãng/Model', render: (_,r) => `${r.brand} ${r.model}` },
                   { title: 'Giá trị', dataIndex: 'valueVND', render: v => v ? new Intl.NumberFormat('vi-VN').format(v) : '-' }
                ]} />
              },
              {
                key: 'biz',
                label: `Doanh nghiệp (${selectedOwner.businesses?.length || 0})`,
                children: <Table dataSource={selectedOwner.businesses || []} rowKey="businessId" pagination={false} columns={[
                   { title: 'Tên DN', dataIndex: 'businessName' },
                   { title: 'MST', dataIndex: 'taxCode' },
                   { title: 'Vốn', dataIndex: 'registeredCapital', render: v => v ? new Intl.NumberFormat('vi-VN').format(v) : '-' }
                ]} />
              }
            ]} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AssetManagementPage;


// import React, { useState, useEffect } from 'react';
// import {
//   Tabs, Card, Button, Tag, Typography, Table,
//   notification, Statistic, Row, Col, Modal, Descriptions, Form, Select, Input,
//   Popconfirm, Space, Alert, Empty
// } from 'antd';
// import {
//   WalletOutlined, HomeOutlined, CarOutlined, ApartmentOutlined,
//   ShopOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
//   LinkOutlined, DisconnectOutlined, RedoOutlined, UserOutlined,
//   SearchOutlined, BarChartOutlined, TagOutlined
// } from '@ant-design/icons';
// import axios from 'axios';

// const { Title } = Typography;
// const { Option } = Select;

// // Đảm bảo Backend C# đang chạy ở port 5000 (http)
// const API_URL = 'http://localhost:5000/api/assets'; 

// const AssetManagementPage = () => {
//   // --- STATE ---
//   const [stats, setStats] = useState(null);
//   const [owners, setOwners] = useState([]);
//   const [assets, setAssets] = useState([]); 
//   const [activeAssetType, setActiveAssetType] = useState('RealEstate'); 

//   const [loadingDashboard, setLoadingDashboard] = useState(false);
//   const [loadingAssets, setLoadingAssets] = useState(false);
  
//   // Modals Visibility
//   const [assetModalVisible, setAssetModalVisible] = useState(false);
//   const [detailModalVisible, setDetailModalVisible] = useState(false);
  
//   // Selection & Editing
//   const [selectedOwner, setSelectedOwner] = useState(null);
//   const [editingAsset, setEditingAsset] = useState(null); 
//   const [searchText, setSearchText] = useState('');

//   // Forms
//   const [formAsset] = Form.useForm();
//   const [formAssign] = Form.useForm();

//   // --- EFFECT ---
//   useEffect(() => { fetchData(); }, []);
  
//   useEffect(() => { 
//     if (activeAssetType) fetchAssets(); 
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [activeAssetType]);

//   // --- API HELPER FUNCTIONS ---
//   const fetchData = () => { fetchDashboard(); fetchAssets(); };

//   const fetchDashboard = async () => {
//     setLoadingDashboard(true);
//     try {
//       console.log(`%c[API CALL] GET ${API_URL}/dashboard...`, 'color: blue; font-weight: bold;');
//       const res = await axios.get(`${API_URL}/dashboard`);
      
//       // --- LOGGING DATA FROM BACKEND ---
//       console.log('%c[API RESPONSE] Dashboard Raw Data:', 'color: green; font-weight: bold;', res.data);
      
//       if (res.data) {
//         // Cập nhật State dùng key chữ thường (camelCase)
//         setStats(res.data.statistics);
//         setOwners(res.data.ownersGrid || []);
//       }
//     } catch (err) {
//       console.error('❌ [API ERROR] Dashboard Failed:', err);
//       notification.error({ 
//         message: 'Lỗi kết nối', 
//         description: 'Không thể tải dữ liệu Dashboard. Hãy kiểm tra Console (F12) để biết chi tiết.' 
//       });
//     } finally {
//       setLoadingDashboard(false);
//     }
//   };

//   const fetchAssets = async () => {
//     setLoadingAssets(true);
//     try {
//       const res = await axios.get(`${API_URL}/assets/${activeAssetType}`);
//       setAssets(Array.isArray(res.data) ? res.data : []);
//     } catch (err) {
//       console.error(`[API ERROR] Assets (${activeAssetType}) Failed:`, err);
//       notification.error({ message: 'Lỗi', description: `Không thể tải danh sách ${activeAssetType}` });
//       setAssets([]);
//     } finally {
//       setLoadingAssets(false);
//     }
//   };

//   const viewOwnerDetail = async (cccd) => {
//     try {
//       console.log(`[API CALL] Detail for CCCD=${cccd}`);
//       const res = await axios.get(`${API_URL}/detail/${cccd}`);
//       console.log('[API RESPONSE] Detail Data:', res.data);
      
//       if (res.data) {
//         setSelectedOwner(res.data);
//         setDetailModalVisible(true);
//       }
//     } catch (err) {
//       console.error('[API ERROR] Detail Failed:', err);
//       notification.error({ message: 'Lỗi', description: 'Không tìm thấy thông tin chi tiết' });
//     }
//   };

//   // --- HANDLERS ---
//   const openAddAsset = () => {
//     setEditingAsset(null);
//     formAsset.resetFields();
//     setAssetModalVisible(true);
//   };

//   const openEditAsset = (record) => {
//     setEditingAsset(record);
//     formAsset.setFieldsValue(record);
//     setAssetModalVisible(true);
//   };

//   const handleSaveAsset = async () => {
//     try {
//       const values = await formAsset.validateFields();
//       if (editingAsset) {
//         const idField = activeAssetType === 'RealEstate' ? 'assetId' : activeAssetType === 'Vehicle' ? 'vehicleId' : 'businessId';
//         const id = editingAsset[idField];
//         await axios.put(`${API_URL}/assets/${activeAssetType}/${id}`, values);
//         notification.success({ message: 'Thành công', description: 'Cập nhật tài sản thành công' });
//       } else {
//         await axios.post(`${API_URL}/assets/${activeAssetType}`, values);
//         notification.success({ message: 'Thành công', description: 'Tạo tài sản mới thành công' });
//       }
//       setAssetModalVisible(false);
//       fetchAssets();
//       fetchDashboard();
//     } catch (err) {
//       notification.error({ message: 'Lỗi', description: err.response?.data?.message || err.message });
//     }
//   };

//   const handleDeleteAsset = async (record) => {
//     const id = record.assetId || record.vehicleId || record.businessId;
//     try {
//       await axios.delete(`${API_URL}/assets/${activeAssetType}/${id}`);
//       notification.success({ message: 'Thành công', description: 'Đã xóa tài sản' });
//       fetchAssets();
//       fetchDashboard();
//     } catch (err) {
//       notification.error({ message: 'Lỗi', description: 'Xóa thất bại' });
//     }
//   };

//   const handleAssignOwnership = async () => {
//     try {
//       const values = await formAssign.validateFields();
//       await axios.post(`${API_URL}/ownership/assign`, values);
//       notification.success({ message: 'Thành công', description: 'Gán quyền sở hữu thành công' });
//       formAssign.resetFields(); 
//       fetchDashboard(); 
//     } catch (err) {
//       notification.error({ message: 'Lỗi', description: err.response?.data?.message || 'Gán thất bại' });
//     }
//   };

//   const handleUnassignOwnership = async () => {
//     try {
//       const values = await formAssign.validateFields();
//       await axios.post(`${API_URL}/ownership/unassign`, values);
//       notification.success({ message: 'Thành công', description: 'Đã gỡ quyền sở hữu' });
//       fetchDashboard();
//     } catch (err) {
//       notification.error({ message: 'Lỗi', description: err.response?.data?.message || 'Gỡ thất bại' });
//     }
//   };

//   // --- RENDER FUNCTIONS ---
//   const renderDashboard = () => {
//     return (
//       <div>
//         {stats && (
//           <Row gutter={16} style={{ marginBottom: 24 }}>
//             <Col span={8}>
//               <Card bordered={false}>
//                 <Statistic 
//                   title="Bất động sản" 
//                   value={stats.realEstate?.count || 0} 
//                   prefix={<ApartmentOutlined />} 
//                   valueStyle={{ color: '#722ed1' }}
//                   suffix={<small style={{fontSize: 12, color: '#888'}}>({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.realEstate?.value || 0)})</small>}
//                 />
//               </Card>
//             </Col>
//             <Col span={8}>
//               <Card bordered={false}>
//                 <Statistic 
//                   title="Phương tiện" 
//                   value={stats.vehicle?.count || 0} 
//                   prefix={<CarOutlined />} 
//                   valueStyle={{ color: '#08979c' }}
//                   suffix={<small style={{fontSize: 12, color: '#888'}}>({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.vehicle?.value || 0)})</small>}
//                 />
//               </Card>
//             </Col>
//             <Col span={8}>
//               <Card bordered={false}>
//                 <Statistic 
//                   title="Doanh nghiệp" 
//                   value={stats.business?.count || 0} 
//                   prefix={<ShopOutlined />} 
//                   valueStyle={{ color: '#d4380d' }}
//                   suffix={<small style={{fontSize: 12, color: '#888'}}>({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.business?.value || 0)})</small>}
//                 />
//               </Card>
//             </Col>
//           </Row>
//         )}

//         {!stats && !loadingDashboard && <Empty description="Không có dữ liệu thống kê" />}

//         <Card title={<span><BarChartOutlined /> Top 100 Công dân có tài sản lớn nhất</span>}>
//           <Table
//             dataSource={owners}
//             rowKey="cccd"
//             loading={loadingDashboard}
//             pagination={{ pageSize: 10 }}
//             columns={[
//               {
//                 title: 'Họ tên',
//                 dataIndex: 'hoTen',
//                 render: (t, r) => <a onClick={() => viewOwnerDetail(r.cccd)}><b><UserOutlined /> {t}</b></a>
//               },
//               { title: 'CCCD', dataIndex: 'cccd', render: t => <Tag color="blue">{t}</Tag> },
//               { title: 'BĐS', dataIndex: 'soLuongBDS', align: 'center', render: v => v > 0 ? <Tag color="purple">{v}</Tag> : '-' },
//               { title: 'Xe', dataIndex: 'soLuongXe', align: 'center', render: v => v > 0 ? <Tag color="cyan">{v}</Tag> : '-' },
//               { title: 'DN', dataIndex: 'soLuongDN', align: 'center', render: v => v > 0 ? <Tag color="orange">{v}</Tag> : '-' },
//               {
//                 title: 'Tổng Giá Trị',
//                 dataIndex: 'tongGiaTri',
//                 align: 'right',
//                 render: v => <span style={{ color: '#cf1322', fontWeight: 600 }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)}</span>
//               },
//             ]}
//           />
//         </Card>
//       </div>
//     );
//   };

//   const renderAssets = () => {
//     const getColumns = () => {
//       const common = [
//         { title: 'ID', dataIndex: activeAssetType === 'RealEstate' ? 'assetId' : activeAssetType === 'Vehicle' ? 'vehicleId' : 'businessId', render: t => <Tag>{t}</Tag> }
//       ];
      
//       let specific = [];
//       if (activeAssetType === 'RealEstate') {
//         specific = [
//           { title: 'Giấy tờ', dataIndex: 'legalDocument' },
//           { title: 'Diện tích', dataIndex: 'area', render: v => v ? `${v} m²` : '-' },
//           { title: 'Giá trị', dataIndex: 'valueVND', render: v => new Intl.NumberFormat('vi-VN').format(v) + ' VNĐ' }
//         ];
//       } else if (activeAssetType === 'Vehicle') {
//         specific = [
//           { title: 'Biển số', dataIndex: 'licensePlate', render: t => <Tag color="geekblue">{t}</Tag> },
//           { title: 'Hãng/Dòng', render: (_,r) => `${r.brand || ''} ${r.model || ''}` },
//           { title: 'Giá trị', dataIndex: 'valueVND', render: v => new Intl.NumberFormat('vi-VN').format(v) + ' VNĐ' }
//         ];
//       } else {
//         specific = [
//           { title: 'Doanh nghiệp', dataIndex: 'businessName', render: t => <b>{t}</b> },
//           { title: 'MST', dataIndex: 'taxCode' },
//           { title: 'Vốn', dataIndex: 'registeredCapital', render: v => new Intl.NumberFormat('vi-VN').format(v) + ' VNĐ' }
//         ];
//       }

//       return [
//         ...common, 
//         ...specific, 
//         {
//           title: 'Hành động', align: 'right',
//           render: (_, r) => (
//             <Space>
//               <Button size="small" icon={<EditOutlined />} onClick={() => openEditAsset(r)} />
//               <Popconfirm title="Xóa tài sản này?" onConfirm={() => handleDeleteAsset(r)}>
//                 <Button size="small" danger icon={<DeleteOutlined />} />
//               </Popconfirm>
//             </Space>
//           )
//         }
//       ];
//     };

//     const safeAssets = Array.isArray(assets) ? assets : [];
//     const filteredAssets = safeAssets.filter(item => 
//       JSON.stringify(item).toLowerCase().includes(searchText.toLowerCase())
//     );

//     return (
//       <div>
//         <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
//           <Space>
//             <Select 
//               value={activeAssetType} 
//               onChange={setActiveAssetType} 
//               style={{ width: 200 }} 
//               size="large"
//             >
//               <Option value="RealEstate"><ApartmentOutlined /> Bất động sản</Option>
//               <Option value="Vehicle"><CarOutlined /> Phương tiện</Option>
//               <Option value="Business"><ShopOutlined /> Doanh nghiệp</Option>
//             </Select>
//             <Input 
//               prefix={<SearchOutlined />} 
//               placeholder="Tìm kiếm..." 
//               onChange={e => setSearchText(e.target.value)} 
//               style={{ width: 250 }} 
//             />
//           </Space>
//           <Button type="primary" icon={<PlusOutlined />} onClick={openAddAsset} size="large">Thêm Tài sản</Button>
//         </div>

//         <Table
//           dataSource={filteredAssets}
//           columns={getColumns()}
//           rowKey={r => r.assetId || r.vehicleId || r.businessId}
//           loading={loadingAssets}
//           locale={{ emptyText: <Empty description="Chưa có dữ liệu" /> }}
//         />
//       </div>
//     );
//   };

//   const renderOwnership = () => (
//     <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
//       <Card 
//         title={<span><LinkOutlined /> Gán hoặc Gỡ quyền sở hữu</span>} 
//         style={{ width: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
//         actions={[
//           <Button type="primary" block onClick={handleAssignOwnership} icon={<LinkOutlined />}>Gán Sở Hữu</Button>,
//           <Button danger block onClick={() => {
//              Modal.confirm({
//                title: 'Xác nhận gỡ quyền sở hữu?',
//                content: 'Hành động này sẽ xóa liên kết giữa người và tài sản.',
//                onOk: handleUnassignOwnership
//              })
//           }} icon={<DisconnectOutlined />}>Gỡ Sở Hữu</Button>
//         ]}
//       >
//         <Alert message="Hướng dẫn: Chọn loại tài sản, nhập CCCD và ID tài sản để xử lý." type="info" showIcon style={{ marginBottom: 24 }} />
//         <Form form={formAssign} layout="vertical">
//           <Form.Item name="AssetType" label="Loại Tài sản" initialValue="RealEstate">
//              <Select>
//                 <Option value="RealEstate">Bất động sản</Option>
//                 <Option value="Vehicle">Phương tiện</Option>
//                 <Option value="Business">Doanh nghiệp</Option>
//              </Select>
//           </Form.Item>
//           <Form.Item name="cccd" label="CCCD Công dân" rules={[{ required: true }]}>
//             <Input prefix={<UserOutlined />} placeholder="Ví dụ: 00109000..." />
//           </Form.Item>
//           <Form.Item name="assetId" label="ID Tài sản" rules={[{ required: true }]}>
//              <Input prefix={<TagOutlined />} placeholder="Ví dụ: RE001, VH123..." />
//           </Form.Item>
//         </Form>
//       </Card>
//     </div>
//   );

//   return (
//     <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
//           <Title level={2} style={{margin: 0, color: '#001529'}}>Quản lý Tài sản & Sở hữu</Title>
//           <Button icon={<RedoOutlined />} onClick={fetchData}>Làm mới dữ liệu</Button>
//       </div>

//       <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
//         <Tabs defaultActiveKey="1" items={[
//             { key: '1', label: <span><HomeOutlined /> Tổng quan (Dashboard)</span>, children: renderDashboard() },
//             { key: '2', label: <span><WalletOutlined /> Kho Tài sản</span>, children: renderAssets() },
//             { key: '3', label: <span><LinkOutlined /> Quản lý Liên kết</span>, children: renderOwnership() }
//         ]} size="large" />
//       </div>

//       <Modal 
//         title={editingAsset ? "Cập nhật Tài sản" : "Thêm Tài sản mới"} 
//         open={assetModalVisible} 
//         onCancel={() => setAssetModalVisible(false)} 
//         onOk={handleSaveAsset}
//       >
//         <Form form={formAsset} layout="vertical">
//           {activeAssetType === 'RealEstate' && (
//             <>
//               <Form.Item name="legalDocument" label="Số giấy tờ / Sổ đỏ" rules={[{required: true}]}><Input /></Form.Item>
//               <Form.Item name="area" label="Diện tích (m²)"><Input type="number" /></Form.Item>
//               <Form.Item name="valueVND" label="Giá trị (VNĐ)" rules={[{required: true}]}><Input type="number" /></Form.Item>
//             </>
//           )}
//           {activeAssetType === 'Vehicle' && (
//             <>
//               <Form.Item name="licensePlate" label="Biển số xe" rules={[{required: true}]}><Input /></Form.Item>
//               <Row gutter={16}>
//                 <Col span={12}><Form.Item name="brand" label="Hãng xe"><Input /></Form.Item></Col>
//                 <Col span={12}><Form.Item name="model" label="Dòng xe"><Input /></Form.Item></Col>
//               </Row>
//               <Form.Item name="valueVND" label="Giá trị (VNĐ)" rules={[{required: true}]}><Input type="number" /></Form.Item>
//             </>
//           )}
//           {activeAssetType === 'Business' && (
//             <>
//               <Form.Item name="businessName" label="Tên doanh nghiệp" rules={[{required: true}]}><Input /></Form.Item>
//               <Form.Item name="taxCode" label="Mã số thuế" rules={[{required: true}]}><Input /></Form.Item>
//               <Form.Item name="registeredCapital" label="Vốn điều lệ (VNĐ)" rules={[{required: true}]}><Input type="number" /></Form.Item>
//             </>
//           )}
//         </Form>
//       </Modal>

//       <Modal 
//         title="Chi tiết Tài sản Công dân" 
//         open={detailModalVisible} 
//         onCancel={() => setDetailModalVisible(false)} 
//         footer={null} 
//         width={900}
//       >
//         {selectedOwner && (
//           <div>
//             <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
//               {/* SỬA LỖI: person.hoTen (chữ thường) */}
//               <Descriptions.Item label="Họ tên">{selectedOwner.person?.hoTen}</Descriptions.Item>
//               <Descriptions.Item label="CCCD">{selectedOwner.person?.cccd}</Descriptions.Item>
//               <Descriptions.Item label="Ngày sinh">{selectedOwner.person?.ngaySinh || '-'}</Descriptions.Item>
//               <Descriptions.Item label="Địa chỉ">{selectedOwner.person?.thuongTru || '-'}</Descriptions.Item>
//             </Descriptions>
            
//             <Tabs defaultActiveKey="re" items={[
//               {
//                 key: 're',
//                 // SỬA LỖI: realEstates (chữ thường)
//                 label: `Bất động sản (${selectedOwner.realEstates?.length || 0})`,
//                 children: <Table dataSource={selectedOwner.realEstates || []} rowKey="assetId" pagination={false} columns={[
//                    { title: 'Giấy tờ', dataIndex: 'legalDocument' },
//                    { title: 'Diện tích', dataIndex: 'area', render: v => v ? v + ' m²' : '-' },
//                    { title: 'Giá trị', dataIndex: 'valueVND', render: v => v ? new Intl.NumberFormat('vi-VN').format(v) : '-' }
//                 ]} />
//               },
//               {
//                 key: 've',
//                 // SỬA LỖI: vehicles (chữ thường)
//                 label: `Phương tiện (${selectedOwner.vehicles?.length || 0})`,
//                 children: <Table dataSource={selectedOwner.vehicles || []} rowKey="vehicleId" pagination={false} columns={[
//                    { title: 'Biển số', dataIndex: 'licensePlate' },
//                    { title: 'Hãng/Model', render: (_,r) => `${r.brand} ${r.model}` },
//                    { title: 'Giá trị', dataIndex: 'valueVND', render: v => v ? new Intl.NumberFormat('vi-VN').format(v) : '-' }
//                 ]} />
//               },
//               {
//                 key: 'biz',
//                 // SỬA LỖI: businesses (chữ thường)
//                 label: `Doanh nghiệp (${selectedOwner.businesses?.length || 0})`,
//                 children: <Table dataSource={selectedOwner.businesses || []} rowKey="businessId" pagination={false} columns={[
//                    { title: 'Tên DN', dataIndex: 'businessName' },
//                    { title: 'MST', dataIndex: 'taxCode' },
//                    { title: 'Vốn', dataIndex: 'registeredCapital', render: v => v ? new Intl.NumberFormat('vi-VN').format(v) : '-' }
//                 ]} />
//               }
//             ]} />
//           </div>
//         )}
//       </Modal>
//     </div>
//   );
// };

// export default AssetManagementPage;