import React, { useState, useEffect } from 'react';
import {
  Table, Card, Button, Input, Row, Col, Statistic, Tag, Modal, Form,
  Select, DatePicker, Descriptions, notification, Space, Popconfirm,
  Drawer, List, Avatar, Empty
} from 'antd';
import {
  UserOutlined, TeamOutlined, ManOutlined, WomanOutlined,
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, ReloadOutlined, IdcardOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { Typography } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;

const API_URL = 'http://localhost:5000/api/citizens';

const CitizensManagement = () => {
  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [citizens, setCitizens] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchText, setSearchText] = useState('');
  
  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCitizen, setEditingCitizen] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const [form] = Form.useForm();

  // --- EFFECTS ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}?search=${searchText}`),
        axios.get(`${API_URL}/stats`)
      ]);
      setCitizens(listRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      notification.error({ message: 'Lỗi tải dữ liệu', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleSearch = (e) => {
    setSearchText(e.target.value);
  };

  const handleCreate = () => {
    setEditingCitizen(null);
    form.resetFields();
    setModalVisible(true);
  };

  // SỬA LỖI TẠI ĐÂY: Thứ tự gán dữ liệu Form
  const handleEdit = (record) => {
    setEditingCitizen(record);
    
    // Spread record.details TRƯỚC, sau đó mới gán đè các trường chuẩn
    // Điều này đảm bảo ngaySinh (dạng string trong details) bị ghi đè bởi object dayjs
    form.setFieldsValue({
      ...record.details, // Dynamic fields first
      cccd: record.id,
      hoTen: record.hoTen,
      gioiTinh: record.gioiTinh,
      ngheNghiep: record.ngheNghiep,
      queQuan: record.queQuan,
      maritalStatus: record.maritalStatus,
      ngaySinh: record.ngaySinh ? dayjs(record.ngaySinh) : null, // dayjs object last
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      // Format date for Neo4j (yyyy-MM-dd)
      if (values.ngaySinh) {
        values.ngaySinh = values.ngaySinh.format('YYYY-MM-DD');
      }

      if (editingCitizen) {
        await axios.put(`${API_URL}/${editingCitizen.id}`, values);
        notification.success({ message: 'Cập nhật thành công' });
      } else {
        await axios.post(API_URL, values);
        notification.success({ message: 'Tạo mới thành công' });
      }
      setModalVisible(false);
      fetchData();
    } catch (err) {
      notification.error({ message: 'Lỗi lưu dữ liệu', description: err.response?.data || err.message });
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      notification.success({ message: 'Đã xóa công dân' });
      fetchData();
    } catch (err) {
      notification.error({ message: 'Lỗi xóa', description: err.message });
    }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await axios.get(`${API_URL}/${id}`);
      setSelectedDetail(res.data); 
      setDrawerVisible(true);
    } catch (err) {
      notification.error({ message: 'Lỗi tải chi tiết' });
    }
  };

  // --- COLUMNS ---
  const columns = [
    {
      title: 'CCCD',
      dataIndex: 'id', 
      render: t => <Tag color="blue">{t}</Tag>
    },
    {
      title: 'Họ Tên',
      dataIndex: 'hoTen', 
      render: t => <b>{t}</b>
    },
    {
      title: 'Giới tính',
      dataIndex: 'gioiTinh',
      width: 100,
      render: t => t === 'Nam' ? <Tag color="geekblue"><ManOutlined/> Nam</Tag> : <Tag color="magenta"><WomanOutlined/> Nữ</Tag>
    },
    {
      title: 'Ngày sinh',
      dataIndex: 'ngaySinh',
    },
    {
      title: 'Nghề nghiệp',
      dataIndex: 'ngheNghiep',
    },
    {
      title: 'Quê quán',
      dataIndex: 'queQuan',
      ellipsis: true
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record.id)} />
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          <Popconfirm title="Chắc chắn xóa?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // --- RENDER UI ---
  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 1. DASHBOARD */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Tổng Công Dân" 
              value={stats?.total || 0} 
              prefix={<TeamOutlined />} 
              valueStyle={{ color: '#3f8600' }} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Nam giới" 
              value={stats?.male || 0} 
              prefix={<ManOutlined />} 
              valueStyle={{ color: '#1890ff' }} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Nữ giới" 
              value={stats?.female || 0} 
              prefix={<WomanOutlined />} 
              valueStyle={{ color: '#eb2f96' }} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Tuổi Trung Bình" 
              value={stats?.avgAge || 0} 
              suffix="tuổi" 
            />
          </Card>
        </Col>
      </Row>

      {/* 2. LIST & FILTER */}
      <Card title={<><IdcardOutlined /> Hồ Sơ Công Dân</>} extra={<Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input 
            placeholder="Tìm kiếm theo tên hoặc CCCD..." 
            prefix={<SearchOutlined />} 
            style={{ width: 300 }}
            value={searchText}
            onChange={handleSearch}
            onPressEnter={fetchData}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Thêm Công Dân</Button>
        </div>

        <Table
          columns={columns}
          dataSource={citizens}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 3. MODAL CREATE/EDIT */}
      <Modal
        title={editingCitizen ? "Cập nhật Công Dân" : "Thêm Công Dân Mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="cccd" label="CCCD" rules={[{ required: true }]}>
                <Input disabled={!!editingCitizen} placeholder="Nhập số CCCD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hoTen" label="Họ Tên" rules={[{ required: true }]}>
                <Input placeholder="Nhập họ tên đầy đủ" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="gioiTinh" label="Giới tính">
                <Select>
                  <Option value="Nam">Nam</Option>
                  <Option value="Nữ">Nữ</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ngaySinh" label="Ngày sinh">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maritalStatus" label="Tình trạng hôn nhân">
                <Select>
                  <Option value="Độc thân">Độc thân</Option>
                  <Option value="Đã kết hôn">Đã kết hôn</Option>
                  <Option value="Ly hôn">Ly hôn</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="queQuan" label="Quê quán">
            <Input />
          </Form.Item>
          <Form.Item name="ngheNghiep" label="Nghề nghiệp">
            <Input />
          </Form.Item>
          <Form.Item name="soDienThoai" label="Số điện thoại">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* 4. DRAWER DETAIL */}
      <Drawer
        title="Chi tiết Hồ Sơ Công Dân"
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedDetail ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: '#87d068' }} />
              <Title level={4} style={{ marginTop: 10 }}>{selectedDetail.person?.hoTen}</Title>
              <Tag color="blue">{selectedDetail.person?.id}</Tag>
            </div>

            <Descriptions title="Thông tin cơ bản" bordered column={1} size="small">
              <Descriptions.Item label="Giới tính">{selectedDetail.person?.gioiTinh}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{selectedDetail.person?.ngaySinh}</Descriptions.Item>
              <Descriptions.Item label="Nghề nghiệp">{selectedDetail.person?.ngheNghiep}</Descriptions.Item>
              <Descriptions.Item label="Quê quán">{selectedDetail.person?.queQuan}</Descriptions.Item>
              <Descriptions.Item label="Tình trạng hôn nhân">{selectedDetail.person?.maritalStatus}</Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <Title level={5}>Mối quan hệ & Kết nối ({selectedDetail.relationships?.length || 0})</Title>
              <List
                itemLayout="horizontal"
                dataSource={selectedDetail.relationships || []}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Tag color={item.type === 'LIVES_IN' ? 'green' : item.type === 'RELATED_TO' ? 'volcano' : 'blue'}>
                          {item.type}
                        </Tag>
                      }
                      title={
                        <span>
                          {item.direction === 'OUT' ? '-> ' : '<- '} 
                          <b>{item.target?.name}</b> <small>({item.target?.label})</small>
                        </span>
                      }
                      description={
                        <div>
                          ID: {item.target?.id} <br/>
                          {item.properties && Object.entries(item.properties).map(([k, v]) => (
                            <Tag key={k}>{k}: {v}</Tag>
                          ))}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          </div>
        ) : <Empty />}
      </Drawer>
    </div>
  );
};

export default CitizensManagement;


// import React, { useState, useEffect } from 'react';
// import {
//   Table, Card, Button, Input, Row, Col, Statistic, Tag, Modal, Form,
//   Select, DatePicker, Descriptions, notification, Space, Popconfirm,
//   Drawer, List, Avatar, Empty
// } from 'antd';
// import {
//   UserOutlined, TeamOutlined, ManOutlined, WomanOutlined,
//   SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
//   EyeOutlined, ReloadOutlined, IdcardOutlined
// } from '@ant-design/icons';
// import axios from 'axios';
// import dayjs from 'dayjs';
// import { Typography } from 'antd'; // Đã bổ sung import thiếu

// const { Title, Text } = Typography;
// const { Option } = Select;

// const API_URL = 'http://localhost:5000/api/citizens';

// const CitizensManagement = () => {
//   // --- STATE ---
//   const [loading, setLoading] = useState(false);
//   const [citizens, setCitizens] = useState([]);
//   const [stats, setStats] = useState(null);
//   const [searchText, setSearchText] = useState('');
  
//   // Modal States
//   const [modalVisible, setModalVisible] = useState(false);
//   const [editingCitizen, setEditingCitizen] = useState(null);
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [selectedDetail, setSelectedDetail] = useState(null);

//   const [form] = Form.useForm();

//   // --- EFFECTS ---
//   useEffect(() => {
//     fetchData();
//   }, []);

//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       const [listRes, statsRes] = await Promise.all([
//         axios.get(`${API_URL}?search=${searchText}`),
//         axios.get(`${API_URL}/stats`)
//       ]);
//       // Backend trả về JSON key chữ thường (id, hoTen, ...)
//       setCitizens(listRes.data || []);
//       // Backend trả về JSON key chữ thường (total, male, ...)
//       setStats(statsRes.data);
//     } catch (err) {
//       notification.error({ message: 'Lỗi tải dữ liệu', description: err.message });
//     } finally {
//       setLoading(false);
//     }
//   };

//   // --- HANDLERS ---
//   const handleSearch = (e) => {
//     setSearchText(e.target.value);
//   };

//   const handleCreate = () => {
//     setEditingCitizen(null);
//     form.resetFields();
//     setModalVisible(true);
//   };

//   const handleEdit = (record) => {
//     setEditingCitizen(record);
//     // Lưu ý: record từ API list cũng dùng key chữ thường
//     form.setFieldsValue({
//       cccd: record.id,
//       hoTen: record.hoTen,
//       gioiTinh: record.gioiTinh,
//       ngheNghiep: record.ngheNghiep,
//       queQuan: record.queQuan,
//       maritalStatus: record.maritalStatus,
//       ngaySinh: record.ngaySinh ? dayjs(record.ngaySinh) : null,
//       ...record.details
//     });
//     setModalVisible(true);
//   };

//   const handleSave = async () => {
//     try {
//       const values = await form.validateFields();
//       if (values.ngaySinh) {
//         values.ngaySinh = values.ngaySinh.format('YYYY-MM-DD');
//       }

//       if (editingCitizen) {
//         await axios.put(`${API_URL}/${editingCitizen.id}`, values);
//         notification.success({ message: 'Cập nhật thành công' });
//       } else {
//         await axios.post(API_URL, values);
//         notification.success({ message: 'Tạo mới thành công' });
//       }
//       setModalVisible(false);
//       fetchData();
//     } catch (err) {
//       notification.error({ message: 'Lỗi lưu dữ liệu', description: err.response?.data || err.message });
//     }
//   };

//   const handleDelete = async (id) => {
//     try {
//       await axios.delete(`${API_URL}/${id}`);
//       notification.success({ message: 'Đã xóa công dân' });
//       fetchData();
//     } catch (err) {
//       notification.error({ message: 'Lỗi xóa', description: err.message });
//     }
//   };

//   const handleViewDetail = async (id) => {
//     try {
//       const res = await axios.get(`${API_URL}/${id}`);
//       // Backend trả về { person: {}, relationships: [] } (key chữ thường)
//       setSelectedDetail(res.data); 
//       setDrawerVisible(true);
//     } catch (err) {
//       notification.error({ message: 'Lỗi tải chi tiết' });
//     }
//   };

//   // --- COLUMNS ---
//   const columns = [
//     {
//       title: 'CCCD',
//       dataIndex: 'id', // API trả về 'id'
//       render: t => <Tag color="blue">{t}</Tag>
//     },
//     {
//       title: 'Họ Tên',
//       dataIndex: 'hoTen', // API trả về 'hoTen'
//       render: t => <b>{t}</b>
//     },
//     {
//       title: 'Giới tính',
//       dataIndex: 'gioiTinh',
//       width: 100,
//       render: t => t === 'Nam' ? <Tag color="geekblue"><ManOutlined/> Nam</Tag> : <Tag color="magenta"><WomanOutlined/> Nữ</Tag>
//     },
//     {
//       title: 'Ngày sinh',
//       dataIndex: 'ngaySinh',
//     },
//     {
//       title: 'Nghề nghiệp',
//       dataIndex: 'ngheNghiep',
//     },
//     {
//       title: 'Quê quán',
//       dataIndex: 'queQuan',
//       ellipsis: true
//     },
//     {
//       title: 'Hành động',
//       key: 'action',
//       align: 'right',
//       render: (_, record) => (
//         <Space>
//           <Button icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record.id)} />
//           <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
//           <Popconfirm title="Chắc chắn xóa?" onConfirm={() => handleDelete(record.id)}>
//             <Button icon={<DeleteOutlined />} size="small" danger />
//           </Popconfirm>
//         </Space>
//       )
//     }
//   ];

//   // --- RENDER UI ---
//   return (
//     <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
//       {/* 1. DASHBOARD - ĐÃ SỬA: Dùng key chữ thường (total, male, female, avgAge) */}
//       <Row gutter={16} style={{ marginBottom: 24 }}>
//         <Col span={6}>
//           <Card>
//             <Statistic 
//               title="Tổng Công Dân" 
//               value={stats?.total || 0} 
//               prefix={<TeamOutlined />} 
//               valueStyle={{ color: '#3f8600' }} 
//             />
//           </Card>
//         </Col>
//         <Col span={6}>
//           <Card>
//             <Statistic 
//               title="Nam giới" 
//               value={stats?.male || 0} 
//               prefix={<ManOutlined />} 
//               valueStyle={{ color: '#1890ff' }} 
//             />
//           </Card>
//         </Col>
//         <Col span={6}>
//           <Card>
//             <Statistic 
//               title="Nữ giới" 
//               value={stats?.female || 0} 
//               prefix={<WomanOutlined />} 
//               valueStyle={{ color: '#eb2f96' }} 
//             />
//           </Card>
//         </Col>
//         <Col span={6}>
//           <Card>
//             <Statistic 
//               title="Tuổi Trung Bình" 
//               value={stats?.avgAge || 0} 
//               suffix="tuổi" 
//             />
//           </Card>
//         </Col>
//       </Row>

//       {/* 2. LIST & FILTER */}
//       <Card title={<><IdcardOutlined /> Hồ Sơ Công Dân</>} extra={<Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>}>
//         <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
//           <Input 
//             placeholder="Tìm kiếm theo tên hoặc CCCD..." 
//             prefix={<SearchOutlined />} 
//             style={{ width: 300 }}
//             value={searchText}
//             onChange={handleSearch}
//             onPressEnter={fetchData}
//           />
//           <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Thêm Công Dân</Button>
//         </div>

//         <Table
//           columns={columns}
//           dataSource={citizens}
//           rowKey="id"
//           loading={loading}
//           pagination={{ pageSize: 10 }}
//         />
//       </Card>

//       {/* 3. MODAL CREATE/EDIT */}
//       <Modal
//         title={editingCitizen ? "Cập nhật Công Dân" : "Thêm Công Dân Mới"}
//         open={modalVisible}
//         onCancel={() => setModalVisible(false)}
//         onOk={handleSave}
//         width={800}
//       >
//         <Form form={form} layout="vertical">
//           <Row gutter={16}>
//             <Col span={12}>
//               <Form.Item name="cccd" label="CCCD" rules={[{ required: true }]}>
//                 <Input disabled={!!editingCitizen} placeholder="Nhập số CCCD" />
//               </Form.Item>
//             </Col>
//             <Col span={12}>
//               <Form.Item name="hoTen" label="Họ Tên" rules={[{ required: true }]}>
//                 <Input placeholder="Nhập họ tên đầy đủ" />
//               </Form.Item>
//             </Col>
//           </Row>
//           <Row gutter={16}>
//             <Col span={8}>
//               <Form.Item name="gioiTinh" label="Giới tính">
//                 <Select>
//                   <Option value="Nam">Nam</Option>
//                   <Option value="Nữ">Nữ</Option>
//                 </Select>
//               </Form.Item>
//             </Col>
//             <Col span={8}>
//               <Form.Item name="ngaySinh" label="Ngày sinh">
//                 <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
//               </Form.Item>
//             </Col>
//             <Col span={8}>
//               <Form.Item name="maritalStatus" label="Tình trạng hôn nhân">
//                 <Select>
//                   <Option value="Độc thân">Độc thân</Option>
//                   <Option value="Đã kết hôn">Đã kết hôn</Option>
//                   <Option value="Ly hôn">Ly hôn</Option>
//                 </Select>
//               </Form.Item>
//             </Col>
//           </Row>
//           <Form.Item name="queQuan" label="Quê quán">
//             <Input />
//           </Form.Item>
//           <Form.Item name="ngheNghiep" label="Nghề nghiệp">
//             <Input />
//           </Form.Item>
//           {/* Các trường bổ sung dynamic nếu cần */}
//           <Form.Item name="soDienThoai" label="Số điện thoại">
//             <Input />
//           </Form.Item>
//         </Form>
//       </Modal>

//       {/* 4. DRAWER DETAIL */}
//       <Drawer
//         title="Chi tiết Hồ Sơ Công Dân"
//         placement="right"
//         width={600}
//         onClose={() => setDrawerVisible(false)}
//         open={drawerVisible}
//       >
//         {selectedDetail ? (
//           <div>
//             {/* ĐÃ SỬA: Dùng key chữ thường (selectedDetail.person.hoTen) */}
//             <div style={{ textAlign: 'center', marginBottom: 24 }}>
//               <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: '#87d068' }} />
//               <Title level={4} style={{ marginTop: 10 }}>{selectedDetail.person?.hoTen}</Title>
//               <Tag color="blue">{selectedDetail.person?.id}</Tag>
//             </div>

//             <Descriptions title="Thông tin cơ bản" bordered column={1} size="small">
//               <Descriptions.Item label="Giới tính">{selectedDetail.person?.gioiTinh}</Descriptions.Item>
//               <Descriptions.Item label="Ngày sinh">{selectedDetail.person?.ngaySinh}</Descriptions.Item>
//               <Descriptions.Item label="Nghề nghiệp">{selectedDetail.person?.ngheNghiep}</Descriptions.Item>
//               <Descriptions.Item label="Quê quán">{selectedDetail.person?.queQuan}</Descriptions.Item>
//               <Descriptions.Item label="Tình trạng hôn nhân">{selectedDetail.person?.maritalStatus}</Descriptions.Item>
//             </Descriptions>

//             <div style={{ marginTop: 24 }}>
//               {/* ĐÃ SỬA: Dùng key chữ thường (relationships) */}
//               <Title level={5}>Mối quan hệ & Kết nối ({selectedDetail.relationships?.length || 0})</Title>
//               <List
//                 itemLayout="horizontal"
//                 dataSource={selectedDetail.relationships || []}
//                 renderItem={item => (
//                   <List.Item>
//                     <List.Item.Meta
//                       avatar={
//                         // ĐÃ SỬA: item.type
//                         <Tag color={item.type === 'LIVES_IN' ? 'green' : item.type === 'RELATED_TO' ? 'volcano' : 'blue'}>
//                           {item.type}
//                         </Tag>
//                       }
//                       title={
//                         <span>
//                           {/* ĐÃ SỬA: item.direction, item.target.name */}
//                           {item.direction === 'OUT' ? '-> ' : '<- '} 
//                           <b>{item.target?.name}</b> <small>({item.target?.label})</small>
//                         </span>
//                       }
//                       description={
//                         <div>
//                           {/* ĐÃ SỬA: item.target.id, item.properties */}
//                           ID: {item.target?.id} <br/>
//                           {item.properties && Object.entries(item.properties).map(([k, v]) => (
//                             <Tag key={k}>{k}: {v}</Tag>
//                           ))}
//                         </div>
//                       }
//                     />
//                   </List.Item>
//                 )}
//               />
//             </div>
//           </div>
//         ) : <Empty />}
//       </Drawer>
//     </div>
//   );
// };

// export default CitizensManagement;