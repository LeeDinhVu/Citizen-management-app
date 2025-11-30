import React, { useState, useEffect } from 'react';
import {
  Table, Card, Button, Input, Row, Col, Statistic, Tag, Modal, Form,
  Select, DatePicker, Descriptions, notification, Space, Popconfirm,
  Drawer, List, Avatar, Empty, Badge, InputNumber
} from 'antd';
import {
  UserOutlined, TeamOutlined, ManOutlined, WomanOutlined,
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, ReloadOutlined, IdcardOutlined, CheckCircleOutlined, CloseCircleOutlined,
  AuditOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { Typography } from 'antd';

const { Title } = Typography;
const { Option } = Select;

const API_URL = 'http://localhost:5000/api/citizens';

const DAN_TOC_LIST = ["Kinh", "Tày", "Thái", "Mường", "Khmer", "Hoa", "Nùng", "H'Mông", "Khác"];
const TON_GIAO_LIST = ["Không", "Phật Giáo", "Thiên Chúa Giáo", "Tin Lành", "Hòa Hảo", "Cao Đài", "Hồi Giáo", "Khác"];
const TRINH_DO_LIST = ["Chưa đi học", "Tiểu học", "THCS", "THPT", "Trung cấp", "Cao đẳng", "Đại học", "Sau đại học"];

const CitizensManagement = () => {
  const [loading, setLoading] = useState(false);
  const [citizens, setCitizens] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchText, setSearchText] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCitizen, setEditingCitizen] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const [form] = Form.useForm();

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

  const handleSearch = (e) => setSearchText(e.target.value);

  const handleCreate = () => {
    setEditingCitizen(null);
    form.resetFields();
    form.setFieldsValue({
        danToc: "Kinh",
        tonGiao: "Không",
        trangThai: "Hoạt động",
        ngaySinh: null 
    });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingCitizen(record);
    const details = record.details || {};

    form.setFieldsValue({
      cccd: details.cccd || record.id, 

      hoTen: record.hoTen,
      gioiTinh: record.gioiTinh,
      ngheNghiep: record.ngheNghiep,
      queQuan: record.queQuan,
      ngaySinh: record.ngaySinh ? dayjs(record.ngaySinh) : null,
      
      danToc: details.danToc || undefined,
      tonGiao: details.tonGiao || undefined,
      trinhDoHocVan: details.trinhDoHocVan || undefined,
      trangThai: details.trangThai || "Hoạt động",

      // birthOrder: details.birthOrder,
      // isAdopted: details.isAdopted, 
      // fatherCCCD: details.fatherCCCD,
      // motherCCCD: details.motherCCCD
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (values.ngaySinh) values.ngaySinh = values.ngaySinh.format('YYYY-MM-DD');
      if (values.hoTen) values.hoTen = values.hoTen.toUpperCase();

      if (editingCitizen) {
        await axios.put(`${API_URL}/${editingCitizen.id}`, values);
        notification.success({ message: 'Cập nhật hồ sơ thành công' });
      } else {
        await axios.post(API_URL, values);
        notification.success({ message: 'Tạo mới hồ sơ thành công' });
      }
      setModalVisible(false);
      fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      notification.error({ message: 'Thao tác thất bại', description: errorMsg });
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      notification.success({ message: 'Đã xóa hồ sơ' });
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

  const columns = [
    {
      title: 'Số CCCD',
      dataIndex: 'id', 
      width: 190,
      render: (t) => <Tag icon={<IdcardOutlined />} color="blue">{t}</Tag>
    },
    { title: 'Họ Tên', dataIndex: 'hoTen', render: t => <b style={{ textTransform: 'uppercase' }}>{t}</b> },
    { title: 'Giới tính', dataIndex: 'gioiTinh', width: 100, render: t => t === 'Nam' ? <Tag color="geekblue">Nam</Tag> : <Tag color="magenta">Nữ</Tag> },
    { title: 'Ngày sinh', dataIndex: 'ngaySinh', width: 110 },
    { title: 'Quê quán', dataIndex: 'queQuan', ellipsis: true },
    { title: 'Trạng thái', dataIndex: 'details', width: 120, render: (details) => details?.trangThai === 'Đã mất' ? <Badge status="error" text="Đã mất" /> : <Badge status="success" text="Hoạt động" /> },
    {
      title: 'Hành động', key: 'action', align: 'right', width: 150,
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record.id)} />
          <Button icon={<EditOutlined />} size="small" type="primary" ghost onClick={() => handleEdit(record)} />
          <Popconfirm title="Chắc chắn xóa?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy"><Button icon={<DeleteOutlined />} size="small" danger /></Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
         <Col span={6}><Card bordered={false}><Statistic title="Tổng Công Dân" value={stats?.total || 0} prefix={<TeamOutlined />} valueStyle={{ color: '#3f8600' }} /></Card></Col>
         <Col span={6}><Card bordered={false}><Statistic title="Nam giới" value={stats?.male || 0} prefix={<ManOutlined />} valueStyle={{ color: '#1890ff' }} /></Card></Col>
         <Col span={6}><Card bordered={false}><Statistic title="Nữ giới" value={stats?.female || 0} prefix={<WomanOutlined />} valueStyle={{ color: '#eb2f96' }} /></Card></Col>
         <Col span={6}><Card bordered={false}><Statistic title="Tuổi Trung Bình" value={stats?.avgAge || 0} suffix="tuổi" /></Card></Col>
      </Row>

      <Card title={<><IdcardOutlined /> QUẢN LÝ DÂN CƯ</>} extra={<Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>} bordered={false}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Input placeholder="Tìm kiếm theo tên hoặc CCCD..." prefix={<SearchOutlined />} style={{ width: 400 }} value={searchText} onChange={handleSearch} onPressEnter={fetchData} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} size="large">Thêm Hồ Sơ</Button>
        </div>
        <Table columns={columns} dataSource={citizens} rowKey="id" loading={loading} pagination={{ pageSize: 8 }} size="middle" />
      </Card>

      <Modal
        title={editingCitizen ? `Cập nhật hồ sơ: ${editingCitizen.hoTen}` : "Thêm Công Dân Mới"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        width={850}
        maskClosable={false}
        okText="Lưu hồ sơ"
        cancelText="Hủy bỏ"
      >
        <Form form={form} layout="vertical">
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item 
                        name="cccd" 
                        label="Số CCCD"
                        rules={[
                            { required: true, message: 'Bắt buộc nhập số CCCD' },
                            { pattern: /^\d{12}$/, message: 'CCCD phải bao gồm đúng 12 chữ số' }
                        ]}
                    >
                        <Input 
                            prefix={<IdcardOutlined />} 
                            placeholder="001234567890" 
                            maxLength={12} 
                            showCount 
                            disabled={!!editingCitizen} 
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item 
                        name="ngaySinh" 
                        label="Ngày sinh" 
                        rules={[
                            { required: true, message: 'Vui lòng chọn ngày sinh' },
                            // THÊM: Validator kiểm tra tuổi >= 18
                            () => ({
                                validator(_, value) {
                                    if (!value) return Promise.resolve();
                                    if (value.isAfter(dayjs(), 'day')) {
                                        return Promise.reject(new Error('Ngày sinh không được là ngày tương lai'));
                                    }                                    
                                    const age = dayjs().diff(value, 'year');
                                    if (age < 18) {
                                        return Promise.reject(new Error('Công dân phải từ 18 tuổi trở lên.'));
                                    }
                                    return Promise.resolve();
                                },
                            }),
                        ]}
                    >
                        <DatePicker 
                            style={{ width: '100%' }} 
                            format="DD/MM/YYYY" 
                            placeholder="Chọn ngày sinh (phải >= 18 tuổi)" 
                            disabledDate={(current) => current && current > dayjs().endOf('day')}
                        />
                    </Form.Item>
                </Col>
            </Row>

            {/* ĐÃ XÓA: Block Form.Item shouldUpdate kiểm tra isChild và các trường cha/mẹ */}

            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="hoTen" label="Họ và Tên" rules={[{ required: true, message: 'Nhập họ tên' }, { min: 2, message: 'Tên quá ngắn' }]}>
                        <Input style={{ textTransform: 'uppercase' }} placeholder="NGUYỄN VĂN A" />
                    </Form.Item>
                </Col>
                <Col span={6}>
                    <Form.Item name="gioiTinh" label="Giới tính" initialValue="Nam">
                        <Select><Option value="Nam">Nam</Option><Option value="Nữ">Nữ</Option></Select>
                    </Form.Item>
                </Col>
                <Col span={6}>
                    <Form.Item name="danToc" label="Dân tộc" initialValue="Kinh">
                        <Select showSearch>{DAN_TOC_LIST.map(d => <Option key={d} value={d}>{d}</Option>)}</Select>
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={16}>
                    <Form.Item name="queQuan" label="Quê quán" rules={[{ required: true, message: 'Vui lòng nhập quê quán' }]}>
                        <Input placeholder="Xã/Phường, Quận/Huyện, Tỉnh/Thành phố" />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="tonGiao" label="Tôn giáo" initialValue="Không">
                        <Select>{TON_GIAO_LIST.map(t => <Option key={t} value={t}>{t}</Option>)}</Select>
                    </Form.Item>
                </Col>
            </Row>
          
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item name="trinhDoHocVan" label="Trình độ học vấn">
                        <Select placeholder="Chọn trình độ">{TRINH_DO_LIST.map(td => <Option key={td} value={td}>{td}</Option>)}</Select>
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="ngheNghiep" label="Nghề nghiệp">
                        <Input placeholder="Công việc hiện tại" />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="trangThai" label="Trạng thái hồ sơ">
                        <Select>
                            <Option value="Hoạt động"><Space><CheckCircleOutlined style={{color:'green'}}/> Hoạt động</Space></Option>
                            <Option value="Đã mất"><Space><CloseCircleOutlined style={{color:'red'}}/> Đã mất</Space></Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>
        </Form>
      </Modal>
      
      <Drawer title="Hồ Sơ Chi Tiết Công Dân" placement="right" width={600} onClose={() => setDrawerVisible(false)} open={drawerVisible}>
        {selectedDetail ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24, padding: 20, background: '#f9f9f9', borderRadius: 8 }}>
              <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: selectedDetail.person?.gioiTinh === 'Nam' ? '#1890ff' : '#eb2f96' }} />
              <Title level={3} style={{ marginTop: 10, textTransform: 'uppercase', marginBottom: 5 }}>{selectedDetail.person?.hoTen}</Title>
              <Tag color="blue" style={{fontSize: 14, padding: '4px 10px'}}>CCCD: {selectedDetail.person?.details?.cccd || selectedDetail.person?.id}</Tag>
              <div style={{marginTop: 10}}>{selectedDetail.person?.details?.trangThai === 'Đã mất' ? <Tag color="red">ĐÃ MẤT</Tag> : <Tag color="green">HOẠT ĐỘNG</Tag>}</div>
            </div>

            <Descriptions title="Thông tin nhân thân" bordered column={1} size="small" labelStyle={{width: '160px', fontWeight: 'bold'}}>
              <Descriptions.Item label="Ngày sinh">{selectedDetail.person?.ngaySinh}</Descriptions.Item>
              <Descriptions.Item label="Giới tính">{selectedDetail.person?.gioiTinh}</Descriptions.Item>
              <Descriptions.Item label="Dân tộc">{selectedDetail.person?.details?.danToc || "Chưa cập nhật"}</Descriptions.Item>
              
              {selectedDetail.person?.details?.birthOrder && (
                  <>
                    <Descriptions.Item label="Con thứ">{selectedDetail.person?.details?.birthOrder}</Descriptions.Item>
                    <Descriptions.Item label="Là con nuôi">{selectedDetail.person?.details?.isAdopted ? <Tag color="red">Đúng</Tag> : "Không"}</Descriptions.Item>
                    <Descriptions.Item label="CCCD Cha">{selectedDetail.person?.details?.fatherCCCD || "---"}</Descriptions.Item>
                    <Descriptions.Item label="CCCD Mẹ">{selectedDetail.person?.details?.motherCCCD || "---"}</Descriptions.Item>
                  </>
              )}

              <Descriptions.Item label="Tôn giáo">{selectedDetail.person?.details?.tonGiao || "Không"}</Descriptions.Item>
              <Descriptions.Item label="Quê quán">{selectedDetail.person?.queQuan}</Descriptions.Item>
              <Descriptions.Item label="Trình độ học vấn">{selectedDetail.person?.details?.trinhDoHocVan || "Chưa cập nhật"}</Descriptions.Item>
              <Descriptions.Item label="Nghề nghiệp">{selectedDetail.person?.ngheNghiep}</Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 30 }}>
              <Title level={5}><TeamOutlined /> Quan hệ hộ tịch (Graph)</Title>
              <List
                itemLayout="horizontal"
                dataSource={selectedDetail.relationships || []}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Tag color={item.type === 'CHILD_OF' || item.type === 'FATHER_OF' || item.type === 'MOTHER_OF' ? 'volcano' : 'blue'}>{item.type}</Tag>}
                      title={<span>{item.direction === 'OUT' ? '-> ' : '<- '} <b>{item.target?.name}</b> <small style={{color:'#888'}}>({item.target?.label})</small></span>}
                      description={<div style={{fontSize: 12}}>ID: {item.target?.id}{item.properties && Object.keys(item.properties).length > 0 && (<div style={{marginTop: 4}}>{Object.entries(item.properties).map(([k, v]) => (<Tag key={k} style={{marginRight: 4}}>{k}: {v.toString()}</Tag>))}</div>)}</div>}
                    />
                  </List.Item>
                )}
              />
            </div>
          </div>
        ) : <Empty description="Không có dữ liệu" />}
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
// import { Typography } from 'antd';

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
//       setCitizens(listRes.data || []);
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

//   // SỬA LỖI TẠI ĐÂY: Thứ tự gán dữ liệu Form
//   const handleEdit = (record) => {
//     setEditingCitizen(record);
    
//     // Spread record.details TRƯỚC, sau đó mới gán đè các trường chuẩn
//     // Điều này đảm bảo ngaySinh (dạng string trong details) bị ghi đè bởi object dayjs
//     form.setFieldsValue({
//       ...record.details, // Dynamic fields first
//       cccd: record.id,
//       hoTen: record.hoTen,
//       gioiTinh: record.gioiTinh,
//       ngheNghiep: record.ngheNghiep,
//       queQuan: record.queQuan,
//       maritalStatus: record.maritalStatus,
//       ngaySinh: record.ngaySinh ? dayjs(record.ngaySinh) : null, // dayjs object last
//     });
//     setModalVisible(true);
//   };

//   const handleSave = async () => {
//     try {
//       const values = await form.validateFields();
//       // Format date for Neo4j (yyyy-MM-dd)
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
//       dataIndex: 'id', 
//       render: t => <Tag color="blue">{t}</Tag>
//     },
//     {
//       title: 'Họ Tên',
//       dataIndex: 'hoTen', 
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
//       {/* 1. DASHBOARD */}
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
//               <Title level={5}>Mối quan hệ & Kết nối ({selectedDetail.relationships?.length || 0})</Title>
//               <List
//                 itemLayout="horizontal"
//                 dataSource={selectedDetail.relationships || []}
//                 renderItem={item => (
//                   <List.Item>
//                     <List.Item.Meta
//                       avatar={
//                         <Tag color={item.type === 'LIVES_IN' ? 'green' : item.type === 'RELATED_TO' ? 'volcano' : 'blue'}>
//                           {item.type}
//                         </Tag>
//                       }
//                       title={
//                         <span>
//                           {item.direction === 'OUT' ? '-> ' : '<- '} 
//                           <b>{item.target?.name}</b> <small>({item.target?.label})</small>
//                         </span>
//                       }
//                       description={
//                         <div>
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