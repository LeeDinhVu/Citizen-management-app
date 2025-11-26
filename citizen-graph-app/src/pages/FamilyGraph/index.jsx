import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs'; 
import { 
    Tabs, Card, List, Button, Tag, Typography, Drawer, Badge, Alert, Table, 
    notification, Statistic, Row, Col, Modal, Descriptions, Form, Select, Input, 
    Popconfirm, Space, DatePicker, Tooltip 
} from 'antd';
import { 
    PartitionOutlined, HomeOutlined, EyeOutlined, RedoOutlined, TeamOutlined, 
    HeartOutlined, GlobalOutlined, InfoCircleOutlined, UserOutlined, PlusOutlined, 
    DeleteOutlined, EditOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import FamilyTreeViz from '../../components/FamilyTreeViz'; 

const { Title, Text } = Typography;
const { Option } = Select;
const API_URL = 'http://localhost:5000/api/family';

const isValidDateStr = (str) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return typeof str === 'string' && regex.test(str);
};

const FamilyGraphPage = () => {
  // ... (Giữ nguyên toàn bộ State và Logic API của bạn)
  // ... (Copy lại phần logic state/effect/api từ phiên bản trước)
  
  const [stats, setStats] = useState(null);
  const [households, setHouseholds] = useState([]);
  const [citizens, setCitizens] = useState([]); 
  const [peopleOptions, setPeopleOptions] = useState([]); 
  const [treeData, setTreeData] = useState({ nodes: [], links: [] });
  const [globalData, setGlobalData] = useState({ nodes: [], links: [] });
  const [loadingHH, setLoadingHH] = useState(false);
  const [loadingCitizens, setLoadingCitizens] = useState(false);
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRootId, setSelectedRootId] = useState(null);
  const [selectedRootName, setSelectedRootName] = useState('');
  const [memberDetail, setMemberDetail] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [relModalVisible, setRelModalVisible] = useState(false);
  const [hhModalVisible, setHhModalVisible] = useState(false);
  const [citizenModalVisible, setCitizenModalVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [linkActionModalVisible, setLinkActionModalVisible] = useState(false);
  const [memberRelEditVisible, setMemberRelEditVisible] = useState(false);
  const [selectedMemberRel, setSelectedMemberRel] = useState(null); 
  const [selectedLink, setSelectedLink] = useState(null);
  const [dynamicLinkProps, setDynamicLinkProps] = useState([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRole, setCurrentRole] = useState('Thành viên');
  const [formRel] = Form.useForm();
  const [formHh] = Form.useForm();
  const [formMember] = Form.useForm();
  const [formCitizen] = Form.useForm();
  const [formLinkEdit] = Form.useForm();
  const [formMemberRelEdit] = Form.useForm(); 

  useEffect(() => { fetchData(); }, []);
  const fetchData = () => { fetchStats(); fetchHouseholds(); fetchCitizensForGenealogy(); fetchPeopleOptions(); };

  const fetchStats = async () => { try { const res = await axios.get(`${API_URL}/stats`); setStats(res.data); } catch (err) {} };
  const fetchHouseholds = async () => { setLoadingHH(true); try { const res = await axios.get(`${API_URL}/households`); if(res.data.success) setHouseholds(res.data.data); } catch(err){} finally{setLoadingHH(false);} };
  const fetchCitizensForGenealogy = async () => { setLoadingCitizens(true); try { const res = await axios.get(`${API_URL}/genealogy-all`); if(res.data.success) setCitizens(res.data.data); } catch(err){} finally{setLoadingCitizens(false);} };
  const fetchPeopleOptions = async () => { try { const res = await axios.get(`${API_URL}/dropdown-list`); if(res.data.success) setPeopleOptions(res.data.data); } catch(err){} };
  const fetchGlobalGraph = async () => { if (globalData.nodes.length > 0) return; setLoadingGlobal(true); try { const res = await axios.get(`${API_URL}/global-graph`); if(res.data.success) setGlobalData(res.data.data); } catch(err){} finally{setLoadingGlobal(false);} };

  const viewMemberDetail = async (cccd) => { try { const res = await axios.get(`${API_URL}/member-detail`, { params: { cccd } }); if (res.data.success) { setMemberDetail(res.data.data); setModalVisible(true); } } catch (err) {} };
  const viewFullTree = async (cccd, name) => { setSelectedRootId(cccd); setSelectedRootName(name); setLoadingTree(true); setTreeData({ nodes: [], links: [] }); try { const res = await axios.get(`${API_URL}/full-tree`, { params: { cccd } }); const data = res.data.data; if(res.data.success && data) { if (data.links.length === 0 && data.nodes.length <= 1) { Modal.confirm({ title: 'Thông báo', content: `Công dân ${name} chưa có quan hệ gia đình.`, onOk: () => { formRel.resetFields(); formRel.setFieldsValue({ sourceId: cccd }); setRelModalVisible(true); } }); } else { setTreeData(data); setDrawerVisible(true); } } } catch (err) {} finally { setLoadingTree(false); } };
  const handleNodeClick = (node) => { if(node.id) viewMemberDetail(node.id); };
  const handleLinkClick = (link) => { setSelectedLink(link); const formData = { type: link.label }; const propKeys = []; if (link.properties) { Object.entries(link.properties).forEach(([key, value]) => { propKeys.push(key); if (isValidDateStr(value)) formData[key] = dayjs(value); else formData[key] = value; }); } if(propKeys.length===0) propKeys.push('note', 'fromDate'); setDynamicLinkProps(propKeys); formLinkEdit.setFieldsValue(formData); setLinkActionModalVisible(true); };

  const handleCreateRelationship = async () => { try { const v = await formRel.validateFields(); await axios.post(`${API_URL}/relationship`, { sourceId: v.sourceId, targetId: v.targetId, type: v.type, properties: { createdDate: new Date().toISOString().split('T')[0] } }); notification.success({ message: 'Thành công' }); setRelModalVisible(false); fetchData(); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){ notification.error({ message: 'Lỗi' }); } };
  const handleUpdateLink = async () => { try { const values = await formLinkEdit.validateFields(); const { type, ...rawProps } = values; const propsToUpdate = {}; Object.entries(rawProps).forEach(([key, val]) => { if (val && dayjs.isDayjs(val)) propsToUpdate[key] = val.format('YYYY-MM-DD'); else propsToUpdate[key] = val; }); await axios.put(`${API_URL}/relationship/${selectedLink.id}`, propsToUpdate); notification.success({ message: 'Đã cập nhật' }); setLinkActionModalVisible(false); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err) { notification.error({ message: 'Lỗi cập nhật' }); } };
  const handleDeleteLink = async () => { try { await axios.delete(`${API_URL}/relationship/${selectedLink.id}`); notification.success({ message: 'Đã xóa' }); setLinkActionModalVisible(false); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){} };
  
  const openAddHousehold = () => { setIsEditing(false); formHh.resetFields(); setHhModalVisible(true); };
  const openEditHousehold = (hh) => { setIsEditing(true); setSelectedHouseholdId(hh.householdCode); formHh.setFieldsValue({ householdId: hh.householdCode, registrationNumber: hh.registrationNumber, address: hh.address, residencyType: hh.residencyType }); setHhModalVisible(true); };
  const handleSaveHousehold = async () => { try { const v = await formHh.validateFields(); const p = { householdId: isEditing?selectedHouseholdId:(v.householdId||`HK${Math.floor(Math.random()*10000)}`), registrationNumber: v.registrationNumber, headCccd: v.headCccd, address: v.address, residencyType: v.residencyType }; if(isEditing) await axios.put(`${API_URL}/household/${selectedHouseholdId}`, p); else await axios.post(`${API_URL}/household`, p); notification.success({ message: 'Xong' }); setHhModalVisible(false); fetchHouseholds(); } catch(err){ notification.error({message: 'Lỗi lưu hộ khẩu'}); } };
  const handleDeleteHousehold = async (hid) => { try{ await axios.delete(`${API_URL}/household/${hid}`); fetchHouseholds(); notification.success({message:'Đã xóa'}); }catch(e){ notification.error({message:'Lỗi xóa'}); } };
  const handleAddMemberToHousehold = async () => { try{ const v=await formMember.validateFields(); await axios.post(`${API_URL}/household/member`,{ householdId: selectedHouseholdId, personCccd: v.personCccd, relationToHead: v.relationToHead, role: v.role||'Thành viên', fromDate: new Date().toISOString().split('T')[0] }); notification.success({message:'Đã thêm'}); setAddMemberModalVisible(false); fetchHouseholds(); }catch(e){ notification.error({ message: 'Lỗi thêm' }); } };
  const handleRemoveMember = async (hid, cccd) => { try{ await axios.delete(`${API_URL}/household/member`,{params:{householdId:hid, cccd}}); fetchHouseholds(); notification.success({message:'Đã xóa thành viên'}); }catch(e){ notification.error({ message: 'Lỗi xóa' }); } };
  
  const openEditMemberRel = async (hid, cccd, name) => { try { const res = await axios.get(`${API_URL}/member-detail`, { params: { cccd } }); if (res.data.success) { const detail = res.data.data; const relProps = detail.residentRelProps || {}; setSelectedMemberRel({ householdId: hid, cccd, name }); const role = relProps.role || 'Thành viên'; setCurrentRole(role); const formData = { role: role, relationToHead: relProps.relationToHead || (role === 'Chủ hộ' ? 'Bản thân' : ''), }; if(relProps.fromDate && isValidDateStr(relProps.fromDate)) formData.fromDate = dayjs(relProps.fromDate); formMemberRelEdit.setFieldsValue(formData); setMemberRelEditVisible(true); } } catch (e) { notification.error({ message: 'Lỗi tải' }); } };
  const handleSaveMemberRel = async () => { try { const values = await formMemberRelEdit.validateFields(); const props = { ...values }; if (dayjs.isDayjs(props.fromDate)) props.fromDate = props.fromDate.format('YYYY-MM-DD'); await axios.put(`${API_URL}/household/member-rel`, props, { params: { householdId: selectedMemberRel.householdId, cccd: selectedMemberRel.cccd } }); notification.success({ message: 'Cập nhật thành công' }); setMemberRelEditVisible(false); fetchHouseholds(); } catch (e) { notification.error({ message: 'Lỗi cập nhật' }); } };
  const handleRoleChange = (role, formInstance) => { setCurrentRole(role); if (role === 'Chủ hộ') { formInstance.setFieldsValue({ relationToHead: 'Bản thân' }); } else { if (formInstance.getFieldValue('relationToHead') === 'Bản thân') { formInstance.setFieldsValue({ relationToHead: null }); } } };
  const openEditCitizen = (c) => { setSelectedRootId(c.cccd); formCitizen.setFieldsValue(c); setCitizenModalVisible(true); };
  const handleUpdateCitizen = async () => { try{ const v = await formCitizen.validateFields(); await axios.put(`${API_URL}/citizen/${selectedRootId}`, v); setCitizenModalVisible(false); fetchCitizensForGenealogy(); notification.success({message:'Cập nhật OK'}); } catch(e){ notification.error({ message: 'Lỗi cập nhật' }); } };
  const handleDeleteRelationshipFromList = async (r) => { try { await axios.delete(`${API_URL}/relationship/${r.id}`); notification.success({ message: 'Đã xóa' }); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){ notification.error({ message: 'Lỗi xóa' }); } };

  // Helper để mở modal detail và lưu context
  const handleViewMemberDetailWithId = (cccd, hid) => { setSelectedHouseholdId(hid); viewMemberDetail(cccd); };

  const renderDashboard = () => (<div>{stats && <Row gutter={16} style={{marginBottom:24}}><Col span={6}><Card bordered={false}><Statistic title="Tổng Công Dân" value={stats.totalCitizens} prefix={<TeamOutlined/>} valueStyle={{color:'#3f8600'}}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Đã Kết Hôn" value={stats.marriedCount} prefix={<HeartOutlined/>} valueStyle={{color:'#cf1322'}}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Mối quan hệ" value={stats.totalRelationships} prefix={<PartitionOutlined/>}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Số con TB" value={stats.avgChildrenPerFamily} precision={1}/></Card></Col></Row>}<div style={{display:'flex', justifyContent:'space-between', marginBottom:16}}><Title level={4} style={{margin:0}}><HomeOutlined/> Quản lý Hộ Gia Đình</Title><Button type="primary" icon={<PlusOutlined/>} onClick={openAddHousehold}>Thêm Hộ Mới</Button></div><List grid={{gutter:16, column:3}} dataSource={households} loading={loadingHH} renderItem={item=><List.Item><Card title={<span>{item.address} <small>({item.householdCode})</small></span>} extra={<Space><Button type="text" icon={<EditOutlined/>} onClick={()=>{openEditHousehold(item)}}/><Popconfirm title="Xóa?" onConfirm={()=>handleDeleteHousehold(item.householdCode)}><Button type="text" danger icon={<DeleteOutlined/>}/></Popconfirm></Space>} hoverable actions={[<Button type="link" size="small" icon={<PlusOutlined/>} onClick={()=>{setSelectedHouseholdId(item.householdCode);formMember.resetFields();setCurrentRole('Thành viên');setAddMemberModalVisible(true)}}>Thêm TV</Button>]}><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{item.members?.map((m,i)=><Tag key={i} color="geekblue" closable onClose={(e)=>{e.preventDefault();handleRemoveMember(item.householdCode,m.cccd)}}><span style={{cursor:'pointer', marginRight: 5}} onClick={()=>handleViewMemberDetailWithId(m.cccd, item.householdCode)}>{m.name}</span><Tooltip title="Sửa quan hệ hộ tịch"><EditOutlined style={{cursor:'pointer', color:'#1890ff'}} onClick={(e) => { e.stopPropagation(); openEditMemberRel(item.householdCode, m.cccd, m.name); }} /></Tooltip></Tag>)}</div></Card></List.Item>}/></div>);
  const renderGenealogy = () => (<div><div style={{marginBottom:16,display:'flex',justifyContent:'space-between'}}><Alert message="Danh sách toàn bộ công dân." type="info" showIcon style={{flex:1,marginRight:10}}/><Button type="primary" icon={<PlusOutlined/>} onClick={()=>{formRel.resetFields();setRelModalVisible(true)}}>Thêm Quan Hệ</Button></div><Table dataSource={citizens} rowKey="cccd" loading={loadingCitizens} pagination={{pageSize:8}} columns={[{title:'Họ Tên',dataIndex:'hoTen',render:t=><b>{t}</b>},{title:'CCCD',dataIndex:'cccd'},{title:'Năm sinh',dataIndex:'ngaySinh'},{title:'Số con',dataIndex:'soConTrucTiep',align:'center',render:n=>n>0?<Tag color="purple">{n}</Tag>:'-'},{title:'Hành động',key:'act',align:'right',render:(_,r)=><Space><Button size="small" icon={<EditOutlined/>} onClick={()=>openEditCitizen(r)}/><Button type="primary" size="small" icon={<EyeOutlined/>} onClick={()=>viewFullTree(r.cccd, r.hoTen)}>Sơ Đồ</Button></Space>}]}/></div>);

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={2} style={{margin: 0, color: '#001529'}}>Quản lý Dân Cư & Phả Hệ</Title>
          <Button icon={<RedoOutlined />} onClick={fetchData}>Làm mới dữ liệu</Button>
      </div>
      <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
        <Tabs defaultActiveKey="1" items={[
            { key: '1', label: <span><HomeOutlined /> Hộ Khẩu</span>, children: renderDashboard() },
            { key: '2', label: <span><PartitionOutlined /> Tra cứu Phả Hệ</span>, children: renderGenealogy() },
            { key: '3', label: <span><GlobalOutlined /> Toàn cảnh</span>, children: <div style={{height: '75vh'}}><FamilyTreeViz graphData={globalData} loading={loadingGlobal} rootId={null} onNodeClick={handleNodeClick} onLinkClick={handleLinkClick} /></div> }
        ]} size="large" onChange={(k)=>k==='3'&&fetchGlobalGraph()} />
      </div>

      <Modal title="Thông tin thành viên" open={modalVisible} onCancel={()=>setModalVisible(false)} footer={null}>{memberDetail && <Descriptions bordered column={1} size="small"><Descriptions.Item label="Họ tên">{memberDetail.member.hoTen}</Descriptions.Item><Descriptions.Item label="CCCD">{memberDetail.member.id}</Descriptions.Item><Descriptions.Item label="Quan hệ">{memberDetail.relationToHead}</Descriptions.Item><Descriptions.Item label="Địa chỉ">{memberDetail.householdAddress}</Descriptions.Item></Descriptions>}</Modal>

      <Modal title={isEditing?"Sửa Hộ":"Thêm Hộ"} open={hhModalVisible} onCancel={()=>setHhModalVisible(false)} onOk={handleSaveHousehold}>
        <Form form={formHh} layout="vertical">
            {!isEditing && <Form.Item name="householdId" label="Mã Hộ Khẩu"><Input placeholder="Để trống tự sinh" /></Form.Item>}
            <Form.Item name="registrationNumber" label="Số Đăng Ký"><Input /></Form.Item>
            <Form.Item name="headCccd" label="Chủ Hộ"><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item>
            <Form.Item name="address" label="Địa chỉ" rules={[{required:true}]}><Input /></Form.Item>
            <Form.Item name="residencyType" label="Loại cư trú" initialValue="Thường trú"><Select><Option value="Thường trú">Thường trú</Option><Option value="Tạm trú">Tạm trú</Option></Select></Form.Item>
        </Form>
      </Modal>

      <Modal title="Thêm Thành Viên" open={addMemberModalVisible} onCancel={()=>setAddMemberModalVisible(false)} onOk={handleAddMemberToHousehold}>
        <Form form={formMember} layout="vertical">
            <Form.Item name="personCccd" label="Thành viên" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="role" label="Vai trò" initialValue="Thành viên">
                        <Select onChange={(val) => handleRoleChange(val, formMember)}>
                            <Option value="Thành viên">Thành viên</Option>
                            <Option value="Chủ hộ">Chủ hộ</Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="relationToHead" label="Quan hệ với Chủ Hộ" rules={[{required:true}]}>
                        <Select disabled={currentRole === 'Chủ hộ'}>
                            {currentRole === 'Chủ hộ' ? <Option value="Bản thân">Bản thân</Option> : <><Option value="Vợ">Vợ</Option><Option value="Chồng">Chồng</Option><Option value="Con">Con</Option><Option value="Bố mẹ">Bố mẹ</Option><Option value="Cháu">Cháu</Option><Option value="Khác">Khác</Option></>}
                        </Select>
                    </Form.Item>
                </Col>
            </Row>
            <Form.Item name="fromDate" label="Ngày bắt đầu"><DatePicker style={{width:'100%'}} format="YYYY-MM-DD" /></Form.Item>
        </Form>
      </Modal>
      
      <Modal title={`Sửa Quan Hệ: ${selectedMemberRel?.name}`} open={memberRelEditVisible} onCancel={()=>setMemberRelEditVisible(false)} onOk={handleSaveMemberRel}>
        <Form form={formMemberRelEdit} layout="vertical">
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="role" label="Vai trò"><Select onChange={(val) => handleRoleChange(val, formMemberRelEdit)}><Option value="Chủ hộ">Chủ hộ</Option><Option value="Thành viên">Thành viên</Option></Select></Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="relationToHead" label="Quan hệ với Chủ Hộ">
                        <Select disabled={currentRole === 'Chủ hộ'}>
                            {currentRole === 'Chủ hộ' ? <Option value="Bản thân">Bản thân</Option> : <><Option value="Vợ">Vợ</Option><Option value="Chồng">Chồng</Option><Option value="Con">Con</Option><Option value="Bố mẹ">Bố mẹ</Option><Option value="Cháu">Cháu</Option><Option value="Khác">Khác</Option></>}
                        </Select>
                    </Form.Item>
                </Col>
            </Row>
            <Form.Item name="fromDate" label="Ngày bắt đầu"><DatePicker style={{width:'100%'}} format="YYYY-MM-DD" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Sửa Công Dân" open={citizenModalVisible} onCancel={()=>setCitizenModalVisible(false)} onOk={handleUpdateCitizen}><Form form={formCitizen} layout="vertical"><Form.Item name="hoTen" label="Tên"><Input/></Form.Item><Form.Item name="ngaySinh" label="Ngày sinh"><Input/></Form.Item><Form.Item name="gioiTinh" label="Giới tính"><Select><Option value="Nam">Nam</Option><Option value="Nữ">Nữ</Option></Select></Form.Item></Form></Modal>
      <Modal title="Thêm Quan Hệ" open={relModalVisible} onCancel={()=>setRelModalVisible(false)} onOk={handleCreateRelationship}><Form form={formRel} layout="vertical"><Row gutter={16}><Col span={12}><Form.Item name="sourceId" label="Nguồn" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item></Col><Col span={12}><Form.Item name="targetId" label="Đích" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item></Col></Row><Form.Item name="type" label="Loại" rules={[{required:true}]}><Select><Option value="FATHER_OF">Cha</Option><Option value="MOTHER_OF">Mẹ</Option><Option value="MARRIED_TO">Vợ/Chồng</Option></Select></Form.Item></Form></Modal>
      
      <Modal title="Chi tiết Mối quan hệ" open={linkActionModalVisible} onCancel={() => setLinkActionModalVisible(false)} footer={[<Button key="del" danger icon={<DeleteOutlined />} onClick={handleDeleteLink}>Xóa Quan Hệ</Button>,<Button key="upd" type="primary" onClick={handleUpdateLink}>Cập nhật</Button>]}>{selectedLink && <Form form={formLinkEdit} layout="vertical"><Alert message={selectedLink.label} type="info" showIcon style={{marginBottom:16}}/><Form.Item name="type" label="Loại"><Input disabled /></Form.Item>{dynamicLinkProps.map(prop => { const isDate = prop.toLowerCase().includes('date') || prop.toLowerCase().includes('sinh'); return <Form.Item key={prop} name={prop} label={`Thuộc tính: ${prop}`}>{isDate ? <DatePicker style={{width:'100%'}} format="YYYY-MM-DD" /> : <Input />}</Form.Item> })}<Button type="dashed" block icon={<PlusOutlined />} onClick={()=>{const k=prompt("Tên thuộc tính:");if(k) setDynamicLinkProps([...dynamicLinkProps, k])}}>Thêm thuộc tính</Button></Form>}</Modal>

      <Drawer title={<div>Cây Phả Hệ: <span style={{color:'#1677ff'}}>{selectedRootName}</span></div>} placement="right" width="100%" onClose={() => setDrawerVisible(false)} open={drawerVisible} destroyOnClose bodyStyle={{padding:0,display:'flex',flexDirection:'column'}}>
        <div style={{flex:3, borderBottom:'1px solid #f0f0f0', position:'relative'}}><FamilyTreeViz graphData={treeData} loading={loadingTree} rootId={selectedRootId} onNodeClick={handleNodeClick} onLinkClick={handleLinkClick} /></div>
        <div style={{flex:1, padding:16, overflow:'auto', background:'#fafafa'}}>
            <Title level={5}><PartitionOutlined /> Danh sách chi tiết quan hệ</Title>
            <Table dataSource={treeData.links} rowKey="id" size="small" pagination={false} columns={[{ title: 'Nguồn', dataIndex: 'source', render: s => typeof s==='object'?<b>{s.hoTen}</b>:s }, { title: 'Quan hệ', dataIndex: 'label', render: l => <Tag color="orange">{l}</Tag> }, { title: 'Đích', dataIndex: 'target', render: t => typeof t==='object'?<b>{t.hoTen}</b>:t }, { title: 'Thuộc tính', dataIndex: 'properties', render: p => JSON.stringify(p) }, { title: 'Xóa', align: 'right', render: (_, r) => <Popconfirm title="Xóa?" onConfirm={() => handleDeleteRelationshipFromList(r)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm> }]}/>
        </div>
      </Drawer>
    </div>
  );
};

export default FamilyGraphPage;


// import React, { useState, useEffect } from 'react';
// import dayjs from 'dayjs';
// import { 
//     Tabs, Card, List, Button, Tag, Typography, Drawer, Badge, Alert, Table, 
//     notification, Statistic, Row, Col, Modal, Descriptions, Form, Select, Input, 
//     Popconfirm, Space, DatePicker, Tooltip 
// } from 'antd';
// import { 
//     PartitionOutlined, HomeOutlined, EyeOutlined, RedoOutlined, TeamOutlined, 
//     HeartOutlined, GlobalOutlined, InfoCircleOutlined, UserOutlined, PlusOutlined, 
//     DeleteOutlined, EditOutlined, IdcardOutlined 
// } from '@ant-design/icons';
// import axios from 'axios';
// import FamilyTreeViz from '../../components/FamilyTreeViz'; 

// const { Title, Text } = Typography;
// const { Option } = Select;
// const API_URL = 'http://localhost:5000/api/family';

// const isValidDateStr = (str) => {
//     const regex = /^\d{4}-\d{2}-\d{2}$/;
//     return typeof str === 'string' && regex.test(str);
// };

// const FamilyGraphPage = () => {
//   // --- STATE ---
//   const [stats, setStats] = useState(null);
//   const [households, setHouseholds] = useState([]);
//   const [citizens, setCitizens] = useState([]); 
//   const [peopleOptions, setPeopleOptions] = useState([]); 
//   const [treeData, setTreeData] = useState({ nodes: [], links: [] });
//   const [globalData, setGlobalData] = useState({ nodes: [], links: [] });
  
//   // UI States
//   const [loadingHH, setLoadingHH] = useState(false);
//   const [loadingCitizens, setLoadingCitizens] = useState(false);
//   const [loadingTree, setLoadingTree] = useState(false);
//   const [loadingGlobal, setLoadingGlobal] = useState(false);
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [selectedRootId, setSelectedRootId] = useState(null);
//   const [selectedRootName, setSelectedRootName] = useState('');

//   // Modals
//   const [memberDetail, setMemberDetail] = useState(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [relModalVisible, setRelModalVisible] = useState(false);
//   const [hhModalVisible, setHhModalVisible] = useState(false);
//   const [citizenModalVisible, setCitizenModalVisible] = useState(false);
//   const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
//   const [linkActionModalVisible, setLinkActionModalVisible] = useState(false);
  
//   // Modal Sửa Quan Hệ Hộ Tịch
//   const [memberRelEditVisible, setMemberRelEditVisible] = useState(false);
//   const [selectedMemberRel, setSelectedMemberRel] = useState(null); 

//   const [selectedLink, setSelectedLink] = useState(null);
//   const [dynamicLinkProps, setDynamicLinkProps] = useState([]);
//   const [selectedHouseholdId, setSelectedHouseholdId] = useState(null);
//   const [isEditing, setIsEditing] = useState(false);

//   // State để quản lý logic Role -> Relation
//   const [currentRole, setCurrentRole] = useState('Thành viên');

//   const [formRel] = Form.useForm();
//   const [formHh] = Form.useForm();
//   const [formMember] = Form.useForm();
//   const [formCitizen] = Form.useForm();
//   const [formLinkEdit] = Form.useForm();
//   const [formMemberRelEdit] = Form.useForm(); 

//   useEffect(() => { fetchData(); }, []);
//   const fetchData = () => { fetchStats(); fetchHouseholds(); fetchCitizensForGenealogy(); fetchPeopleOptions(); };

//   // API CALLS
//   const fetchStats = async () => { try { const res = await axios.get(`${API_URL}/stats`); setStats(res.data); } catch (err) {} };
//   const fetchHouseholds = async () => { setLoadingHH(true); try { const res = await axios.get(`${API_URL}/households`); if(res.data.success) setHouseholds(res.data.data); } catch(err){} finally{setLoadingHH(false);} };
//   const fetchCitizensForGenealogy = async () => { setLoadingCitizens(true); try { const res = await axios.get(`${API_URL}/genealogy-all`); if(res.data.success) setCitizens(res.data.data); } catch(err){} finally{setLoadingCitizens(false);} };
//   const fetchPeopleOptions = async () => { try { const res = await axios.get(`${API_URL}/dropdown-list`); if(res.data.success) setPeopleOptions(res.data.data); } catch(err){} };
//   const fetchGlobalGraph = async () => { if (globalData.nodes.length > 0) return; setLoadingGlobal(true); try { const res = await axios.get(`${API_URL}/global-graph`); if(res.data.success) setGlobalData(res.data.data); } catch(err){} finally{setLoadingGlobal(false);} };

//   const viewMemberDetail = async (cccd) => { try { const res = await axios.get(`${API_URL}/member-detail`, { params: { cccd } }); if (res.data.success) { setMemberDetail(res.data.data); setModalVisible(true); } } catch (err) {} };
//   const viewFullTree = async (cccd, name) => { setSelectedRootId(cccd); setSelectedRootName(name); setLoadingTree(true); setTreeData({ nodes: [], links: [] }); try { const res = await axios.get(`${API_URL}/full-tree`, { params: { cccd } }); const data = res.data.data; if(res.data.success && data) { if (data.links.length === 0 && data.nodes.length <= 1) { Modal.confirm({ title: 'Thông báo', content: `Công dân ${name} chưa có quan hệ gia đình.`, onOk: () => { formRel.resetFields(); formRel.setFieldsValue({ sourceId: cccd }); setRelModalVisible(true); } }); } else { setTreeData(data); setDrawerVisible(true); } } } catch (err) {} finally { setLoadingTree(false); } };
//   const handleNodeClick = (node) => { if(node.id) viewMemberDetail(node.id); };
  
//   const handleLinkClick = (link) => { 
//       setSelectedLink(link);
//       const formData = { type: link.label };
//       const propKeys = [];
//       if (link.properties) {
//           Object.entries(link.properties).forEach(([key, value]) => {
//               propKeys.push(key);
//               if (isValidDateStr(value)) formData[key] = dayjs(value); else formData[key] = value;
//           });
//       }
//       if(propKeys.length===0) propKeys.push('note', 'fromDate');
//       setDynamicLinkProps(propKeys);
//       formLinkEdit.setFieldsValue(formData);
//       setLinkActionModalVisible(true); 
//   };

//   const handleCreateRelationship = async () => { try { const v = await formRel.validateFields(); await axios.post(`${API_URL}/relationship`, { sourceId: v.sourceId, targetId: v.targetId, type: v.type, properties: { createdDate: new Date().toISOString().split('T')[0] } }); notification.success({ message: 'Thành công' }); setRelModalVisible(false); fetchData(); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){ notification.error({ message: 'Lỗi' }); } };
//   const handleUpdateLink = async () => { try { const values = await formLinkEdit.validateFields(); const { type, ...rawProps } = values; const propsToUpdate = {}; Object.entries(rawProps).forEach(([key, val]) => { if (val && dayjs.isDayjs(val)) propsToUpdate[key] = val.format('YYYY-MM-DD'); else propsToUpdate[key] = val; }); await axios.put(`${API_URL}/relationship/${selectedLink.id}`, propsToUpdate); notification.success({ message: 'Đã cập nhật' }); setLinkActionModalVisible(false); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err) { notification.error({ message: 'Lỗi cập nhật' }); } };
//   const handleDeleteLink = async () => { try { await axios.delete(`${API_URL}/relationship/${selectedLink.id}`); notification.success({ message: 'Đã xóa' }); setLinkActionModalVisible(false); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){} };
//   const handleSaveHousehold = async () => { try { const v = await formHh.validateFields(); const p = { householdId: isEditing?selectedHouseholdId:(v.householdId||`HK${Math.floor(Math.random()*10000)}`), registrationNumber: v.registrationNumber, headCccd: v.headCccd, address: v.address, residencyType: v.residencyType }; if(isEditing) await axios.put(`${API_URL}/household/${selectedHouseholdId}`, p); else await axios.post(`${API_URL}/household`, p); notification.success({ message: 'Xong' }); setHhModalVisible(false); fetchHouseholds(); } catch(err){} };
//   const handleDeleteHousehold = async (hid) => { try{ await axios.delete(`${API_URL}/household/${hid}`); fetchHouseholds(); notification.success({message:'Đã xóa'}); }catch(e){ notification.error({message:'Lỗi xóa'}); } };
//   const handleUpdateCitizen = async () => { try{ const v = await formCitizen.validateFields(); await axios.put(`${API_URL}/citizen/${selectedRootId}`, v); setCitizenModalVisible(false); fetchCitizensForGenealogy(); notification.success({message:'Cập nhật OK'}); } catch(e){ notification.error({ message: 'Lỗi cập nhật' }); } };
  
//   const handleAddMemberToHousehold = async () => { try{ const v=await formMember.validateFields(); await axios.post(`${API_URL}/household/member`,{ householdId: selectedHouseholdId, personCccd: v.personCccd, relationToHead: v.relationToHead, role: v.role||'Thành viên', fromDate: new Date().toISOString().split('T')[0] }); notification.success({message:'Đã thêm'}); setAddMemberModalVisible(false); fetchHouseholds(); }catch(e){ notification.error({ message: 'Lỗi thêm' }); } };
//   const handleRemoveMember = async (hid, cccd) => { try{ await axios.delete(`${API_URL}/household/member`,{params:{householdId:hid, cccd}}); fetchHouseholds(); notification.success({message:'Đã xóa thành viên'}); }catch(e){ notification.error({ message: 'Lỗi xóa' }); } };
//   const handleDeleteRelationshipFromList = async (r) => { try { await axios.delete(`${API_URL}/relationship/${r.id}`); notification.success({ message: 'Đã xóa' }); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){ notification.error({ message: 'Lỗi xóa' }); } };

//   // --- NEW HANDLERS FOR MEMBER EDIT ---
//   const openEditMemberRel = async (hid, cccd, name) => {
//       try {
//           const res = await axios.get(`${API_URL}/member-detail`, { params: { cccd } });
//           if (res.data.success) {
//               const detail = res.data.data;
//               const relProps = detail.residentRelProps || {};
//               setSelectedMemberRel({ householdId: hid, cccd, name });
              
//               const role = relProps.role || 'Thành viên';
//               setCurrentRole(role); // Init state

//               const formData = {
//                   role: role,
//                   relationToHead: relProps.relationToHead || (role === 'Chủ hộ' ? 'Bản thân' : ''),
//               };
//               if(relProps.fromDate && isValidDateStr(relProps.fromDate)) formData.fromDate = dayjs(relProps.fromDate);
              
//               formMemberRelEdit.setFieldsValue(formData);
//               setMemberRelEditVisible(true);
//           }
//       } catch (e) { notification.error({ message: 'Lỗi tải' }); }
//   };

//   const handleSaveMemberRel = async () => {
//       try {
//           const values = await formMemberRelEdit.validateFields();
//           const props = { ...values };
//           if (dayjs.isDayjs(props.fromDate)) props.fromDate = props.fromDate.format('YYYY-MM-DD');
//           await axios.put(`${API_URL}/household/member-rel`, props, { params: { householdId: selectedMemberRel.householdId, cccd: selectedMemberRel.cccd } });
//           notification.success({ message: 'Cập nhật thành công' }); setMemberRelEditVisible(false); fetchHouseholds();
//       } catch (e) { notification.error({ message: 'Lỗi cập nhật' }); }
//   };

//   // Xử lý thay đổi Role -> Tự động set Relation
//   const handleRoleChange = (role, formInstance) => {
//       setCurrentRole(role);
//       if (role === 'Chủ hộ') {
//           formInstance.setFieldsValue({ relationToHead: 'Bản thân' });
//       } else {
//           // Nếu chuyển về thành viên mà đang là Bản thân -> Clear
//           if (formInstance.getFieldValue('relationToHead') === 'Bản thân') {
//               formInstance.setFieldsValue({ relationToHead: null });
//           }
//       }
//   };

//   const openAddHousehold = () => { setIsEditing(false); formHh.resetFields(); setHhModalVisible(true); };
//   const openEditHousehold = (hh) => { setIsEditing(true); setSelectedHouseholdId(hh.householdCode); formHh.setFieldsValue({ householdId: hh.householdCode, registrationNumber: hh.registrationNumber, address: hh.address, residencyType: hh.residencyType }); setHhModalVisible(true); };
//   const openEditCitizen = (c) => { setSelectedRootId(c.cccd); formCitizen.setFieldsValue(c); setCitizenModalVisible(true); };

//   // --- RENDER UI ---
//   const renderDashboard = () => (
//       <div>
//           {stats && <Row gutter={16} style={{marginBottom:24}}><Col span={6}><Card bordered={false}><Statistic title="Tổng Công Dân" value={stats.totalCitizens} prefix={<TeamOutlined/>} valueStyle={{color:'#3f8600'}}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Đã Kết Hôn" value={stats.marriedCount} prefix={<HeartOutlined/>} valueStyle={{color:'#cf1322'}}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Mối quan hệ" value={stats.totalRelationships} prefix={<PartitionOutlined/>}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Số con TB" value={stats.avgChildrenPerFamily} precision={1}/></Card></Col></Row>}
//           <div style={{display:'flex', justifyContent:'space-between', marginBottom:16}}><Title level={4} style={{margin:0}}><HomeOutlined/> Quản lý Hộ Gia Đình</Title><Button type="primary" icon={<PlusOutlined/>} onClick={openAddHousehold}>Thêm Hộ Mới</Button></div>
//           <List grid={{gutter:16, column:3}} dataSource={households} loading={loadingHH} renderItem={item=><List.Item><Card title={<span>{item.address} <small>({item.householdCode})</small></span>} extra={<Space><Button type="text" icon={<EditOutlined/>} onClick={()=>{openEditHousehold(item)}}/><Popconfirm title="Xóa?" onConfirm={()=>handleDeleteHousehold(item.householdCode)}><Button type="text" danger icon={<DeleteOutlined/>}/></Popconfirm></Space>} hoverable actions={[<Button type="link" size="small" icon={<PlusOutlined/>} onClick={()=>{setSelectedHouseholdId(item.householdCode);formMember.resetFields();setCurrentRole('Thành viên');setAddMemberModalVisible(true)}}>Thêm TV</Button>]}><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{item.members?.map((m,i)=><Tag key={i} color="geekblue" closable onClose={(e)=>{e.preventDefault();handleRemoveMember(item.householdCode,m.cccd)}}><span style={{cursor:'pointer', marginRight: 5}} onClick={()=>viewMemberDetail(m.cccd)}>{m.name}</span><Tooltip title="Sửa quan hệ"><EditOutlined style={{cursor:'pointer', color:'#1890ff'}} onClick={(e) => { e.stopPropagation(); openEditMemberRel(item.householdCode, m.cccd, m.name); }} /></Tooltip></Tag>)}</div></Card></List.Item>}/>
//       </div>
//   );

//   const renderGenealogy = () => (<div><div style={{marginBottom:16,display:'flex',justifyContent:'space-between'}}><Alert message="Danh sách toàn bộ công dân." type="info" showIcon style={{flex:1,marginRight:10}}/><Button type="primary" icon={<PlusOutlined/>} onClick={()=>{formRel.resetFields();setRelModalVisible(true)}}>Thêm Quan Hệ</Button></div><Table dataSource={citizens} rowKey="cccd" loading={loadingCitizens} pagination={{pageSize:8}} columns={[{title:'Họ Tên',dataIndex:'hoTen',render:t=><b>{t}</b>},{title:'CCCD',dataIndex:'cccd'},{title:'Năm sinh',dataIndex:'ngaySinh'},{title:'Số con',dataIndex:'soConTrucTiep',align:'center',render:n=>n>0?<Tag color="purple">{n}</Tag>:'-'},{title:'Hành động',key:'act',align:'right',render:(_,r)=><Space><Button size="small" icon={<EditOutlined/>} onClick={()=>openEditCitizen(r)}/><Button type="primary" size="small" icon={<EyeOutlined/>} onClick={()=>viewFullTree(r.cccd, r.hoTen)}>Sơ Đồ</Button></Space>}]}/></div>);

//   return (
//     <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
//           <Title level={2} style={{margin: 0, color: '#001529'}}>Quản lý Dân Cư & Phả Hệ</Title>
//           <Button icon={<RedoOutlined />} onClick={fetchData}>Làm mới dữ liệu</Button>
//       </div>
//       <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
//         <Tabs defaultActiveKey="1" items={[{ key: '1', label: <span><HomeOutlined /> Hộ Khẩu</span>, children: renderDashboard() }, { key: '2', label: <span><PartitionOutlined /> Tra cứu Phả Hệ</span>, children: renderGenealogy() }, { key: '3', label: <span><GlobalOutlined /> Toàn cảnh</span>, children: <div style={{height: '75vh'}}><FamilyTreeViz graphData={globalData} loading={loadingGlobal} rootId={null} onNodeClick={handleNodeClick} onLinkClick={handleLinkClick} /></div> }]} size="large" onChange={(k)=>k==='3'&&fetchGlobalGraph()} />
//       </div>

//       <Modal title="Thông tin thành viên" open={modalVisible} onCancel={()=>setModalVisible(false)} footer={null}>{memberDetail && <Descriptions bordered column={1} size="small"><Descriptions.Item label="Họ tên">{memberDetail.member.hoTen}</Descriptions.Item><Descriptions.Item label="CCCD">{memberDetail.member.id}</Descriptions.Item><Descriptions.Item label="Quan hệ">{memberDetail.relationToHead}</Descriptions.Item><Descriptions.Item label="Địa chỉ">{memberDetail.householdAddress}</Descriptions.Item></Descriptions>}</Modal>
//       <Modal title={isEditing?"Sửa Hộ":"Thêm Hộ"} open={hhModalVisible} onCancel={()=>setHhModalVisible(false)} onOk={handleSaveHousehold}><Form form={formHh} layout="vertical"><Form.Item name="registrationNumber" label="Số ĐK"><Input/></Form.Item><Form.Item name="headCccd" label="Chủ Hộ"><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item><Form.Item name="address" label="Địa chỉ" rules={[{required:true}]}><Input/></Form.Item><Form.Item name="residencyType" label="Loại cư trú" initialValue="Thường trú"><Select><Option value="Thường trú">Thường trú</Option><Option value="Tạm trú">Tạm trú</Option></Select></Form.Item></Form></Modal>
//       <Modal title="Sửa Công Dân" open={citizenModalVisible} onCancel={()=>setCitizenModalVisible(false)} onOk={handleUpdateCitizen}><Form form={formCitizen} layout="vertical"><Form.Item name="hoTen" label="Tên"><Input/></Form.Item><Form.Item name="ngaySinh" label="Ngày sinh"><Input/></Form.Item><Form.Item name="gioiTinh" label="Giới tính"><Select><Option value="Nam">Nam</Option><Option value="Nữ">Nữ</Option></Select></Form.Item></Form></Modal>
//       <Modal title="Thêm Quan Hệ" open={relModalVisible} onCancel={()=>setRelModalVisible(false)} onOk={handleCreateRelationship}><Form form={formRel} layout="vertical"><Row gutter={16}><Col span={12}><Form.Item name="sourceId" label="Nguồn" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item></Col><Col span={12}><Form.Item name="targetId" label="Đích" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item></Col></Row><Form.Item name="type" label="Loại" rules={[{required:true}]}><Select><Option value="FATHER_OF">Cha</Option><Option value="MOTHER_OF">Mẹ</Option><Option value="MARRIED_TO">Vợ/Chồng</Option></Select></Form.Item></Form></Modal>
//       <Modal title="Chi tiết Mối quan hệ" open={linkActionModalVisible} onCancel={() => setLinkActionModalVisible(false)} footer={[<Button key="del" danger icon={<DeleteOutlined />} onClick={handleDeleteLink}>Xóa Quan Hệ</Button>,<Button key="upd" type="primary" onClick={handleUpdateLink}>Cập nhật</Button>]}>{selectedLink && <Form form={formLinkEdit} layout="vertical"><Alert message={selectedLink.label} type="info" showIcon style={{marginBottom:16}}/><Form.Item name="type" label="Loại"><Input disabled /></Form.Item>{dynamicLinkProps.map(prop => <Form.Item key={prop} name={prop} label={`Thuộc tính: ${prop}`}>{prop.toLowerCase().includes('date')?<DatePicker style={{width:'100%'}} format="YYYY-MM-DD"/>:<Input/>}</Form.Item>)}<Button type="dashed" block icon={<PlusOutlined />} onClick={()=>{const k=prompt("Tên thuộc tính:");if(k) setDynamicLinkProps([...dynamicLinkProps, k])}}>Thêm thuộc tính</Button></Form>}</Modal>
//       <Drawer title={<div>Cây Phả Hệ: <span style={{color:'#1677ff'}}>{selectedRootName}</span></div>} placement="right" width="100%" onClose={() => setDrawerVisible(false)} open={drawerVisible} destroyOnClose bodyStyle={{padding:0,display:'flex',flexDirection:'column'}}><div style={{flex:3, borderBottom:'1px solid #f0f0f0', position:'relative'}}><FamilyTreeViz graphData={treeData} loading={loadingTree} rootId={selectedRootId} onNodeClick={handleNodeClick} onLinkClick={handleLinkClick} /></div><div style={{flex:1, padding:16, overflow:'auto', background:'#fafafa'}}><Title level={5}><PartitionOutlined /> Danh sách chi tiết quan hệ</Title><Table dataSource={treeData.links} rowKey="id" size="small" pagination={false} columns={[{ title: 'Nguồn', dataIndex: 'source', render: s => typeof s==='object'?<b>{s.hoTen}</b>:s }, { title: 'Quan hệ', dataIndex: 'label', render: l => <Tag color="orange">{l}</Tag> }, { title: 'Đích', dataIndex: 'target', render: t => typeof t==='object'?<b>{t.hoTen}</b>:t }, { title: 'Thuộc tính', dataIndex: 'properties', render: p => JSON.stringify(p) }, { title: 'Xóa', align: 'right', render: (_, r) => <Popconfirm title="Xóa?" onConfirm={() => handleDeleteRelationshipFromList(r)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm> }]}/></div></Drawer>

//       {/* MODAL SỬA/THÊM QUAN HỆ HỘ TỊCH (MỚI) */}
//       <Modal title={selectedMemberRel ? `Sửa Quan Hệ: ${selectedMemberRel.name}` : "Thêm Thành Viên"} open={addMemberModalVisible || memberRelEditVisible} onCancel={() => { setAddMemberModalVisible(false); setMemberRelEditVisible(false); }} onOk={memberRelEditVisible ? handleSaveMemberRel : handleAddMemberToHousehold}>
//         <Form form={memberRelEditVisible ? formMemberRelEdit : formMember} layout="vertical">
//             {/* Nếu đang THÊM mới thì hiện ô chọn người */}
//             {!memberRelEditVisible && <Form.Item name="personCccd" label="Chọn thành viên" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item>}
            
//             <Row gutter={16}>
//                 <Col span={12}>
//                     <Form.Item name="role" label="Vai trò" initialValue="Thành viên">
//                         <Select onChange={(val) => handleRoleChange(val, memberRelEditVisible ? formMemberRelEdit : formMember)}>
//                             <Option value="Thành viên">Thành viên</Option>
//                             <Option value="Chủ hộ">Chủ hộ</Option>
//                         </Select>
//                     </Form.Item>
//                 </Col>
//                 <Col span={12}>
//                     <Form.Item name="relationToHead" label="Quan hệ với Chủ Hộ" rules={[{required:true}]}>
//                         <Select disabled={currentRole === 'Chủ hộ'}>
//                             {currentRole === 'Chủ hộ' ? (
//                                 <Option value="Bản thân">Bản thân</Option>
//                             ) : (
//                                 <>
//                                     <Option value="Vợ">Vợ</Option>
//                                     <Option value="Chồng">Chồng</Option>
//                                     <Option value="Con">Con</Option>
//                                     <Option value="Bố mẹ">Bố mẹ</Option>
//                                     <Option value="Cháu">Cháu</Option>
//                                     <Option value="Khác">Khác</Option>
//                                 </>
//                             )}
//                         </Select>
//                     </Form.Item>
//                 </Col>
//             </Row>
//             <Form.Item name="fromDate" label="Ngày bắt đầu"><DatePicker style={{width:'100%'}} format="YYYY-MM-DD" /></Form.Item>
//         </Form>
//       </Modal>
//     </div>
//   );
// };

// export default FamilyGraphPage;

// import React, { useState, useEffect } from 'react';
// import dayjs from 'dayjs';
// import { 
//     Tabs, Card, List, Button, Tag, Typography, Drawer, Badge, Alert, Table, 
//     notification, Statistic, Row, Col, Modal, Descriptions, Form, Select, Input, 
//     Popconfirm, Space, DatePicker 
// } from 'antd';
// import { 
//     PartitionOutlined, HomeOutlined, EyeOutlined, RedoOutlined, TeamOutlined, 
//     HeartOutlined, GlobalOutlined, InfoCircleOutlined, UserOutlined, PlusOutlined, 
//     DeleteOutlined, EditOutlined 
// } from '@ant-design/icons';
// import axios from 'axios';
// import FamilyTreeViz from '../../components/FamilyTreeViz'; 

// const { Title, Text } = Typography;
// const { Option } = Select;
// const API_URL = 'http://localhost:5000/api/family';

// // Helper kiểm tra chuỗi YYYY-MM-DD
// const isValidDateStr = (str) => {
//     const regex = /^\d{4}-\d{2}-\d{2}$/;
//     return typeof str === 'string' && regex.test(str);
// };

// const FamilyGraphPage = () => {
//   // --- STATE ---
//   const [stats, setStats] = useState(null);
//   const [households, setHouseholds] = useState([]);
//   const [citizens, setCitizens] = useState([]); 
//   const [peopleOptions, setPeopleOptions] = useState([]); 
//   const [treeData, setTreeData] = useState({ nodes: [], links: [] });
//   const [globalData, setGlobalData] = useState({ nodes: [], links: [] });
  
//   // UI States
//   const [loadingHH, setLoadingHH] = useState(false);
//   const [loadingCitizens, setLoadingCitizens] = useState(false);
//   const [loadingTree, setLoadingTree] = useState(false);
//   const [loadingGlobal, setLoadingGlobal] = useState(false);
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [selectedRootId, setSelectedRootId] = useState(null);
//   const [selectedRootName, setSelectedRootName] = useState('');

//   // Modals
//   const [memberDetail, setMemberDetail] = useState(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [relModalVisible, setRelModalVisible] = useState(false);
//   const [hhModalVisible, setHhModalVisible] = useState(false);
//   const [citizenModalVisible, setCitizenModalVisible] = useState(false);
//   const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  
//   const [linkActionModalVisible, setLinkActionModalVisible] = useState(false);
//   const [selectedLink, setSelectedLink] = useState(null);
//   const [dynamicLinkProps, setDynamicLinkProps] = useState([]);

//   const [selectedHouseholdId, setSelectedHouseholdId] = useState(null);
//   const [isEditing, setIsEditing] = useState(false);

//   const [formRel] = Form.useForm();
//   const [formHh] = Form.useForm();
//   const [formMember] = Form.useForm();
//   const [formCitizen] = Form.useForm();
//   const [formLinkEdit] = Form.useForm();

//   useEffect(() => { fetchData(); }, []);

//   const fetchData = () => { fetchStats(); fetchHouseholds(); fetchCitizensForGenealogy(); fetchPeopleOptions(); };

//   // --- API CALLS ---
//   const fetchStats = async () => { try { const res = await axios.get(`${API_URL}/stats`); setStats(res.data); } catch (err) {} };
//   const fetchHouseholds = async () => { setLoadingHH(true); try { const res = await axios.get(`${API_URL}/households`); if(res.data.success) setHouseholds(res.data.data); } catch(err){} finally{setLoadingHH(false);} };
//   const fetchCitizensForGenealogy = async () => { setLoadingCitizens(true); try { const res = await axios.get(`${API_URL}/genealogy-all`); if(res.data.success) setCitizens(res.data.data); } catch(err){} finally{setLoadingCitizens(false);} };
//   const fetchPeopleOptions = async () => { try { const res = await axios.get(`${API_URL}/dropdown-list`); if(res.data.success) setPeopleOptions(res.data.data); } catch(err){} };
//   const fetchGlobalGraph = async () => { if (globalData.nodes.length > 0) return; setLoadingGlobal(true); try { const res = await axios.get(`${API_URL}/global-graph`); if(res.data.success) setGlobalData(res.data.data); } catch(err){} finally{setLoadingGlobal(false);} };

//   const viewMemberDetail = async (cccd) => { try { const res = await axios.get(`${API_URL}/member-detail`, { params: { cccd } }); if (res.data.success) { setMemberDetail(res.data.data); setModalVisible(true); } } catch (err) {} };
//   const viewFullTree = async (cccd, name) => { setSelectedRootId(cccd); setSelectedRootName(name); setLoadingTree(true); setTreeData({ nodes: [], links: [] }); try { const res = await axios.get(`${API_URL}/full-tree`, { params: { cccd } }); const data = res.data.data; if(res.data.success && data) { if (data.links.length === 0 && data.nodes.length <= 1) { Modal.confirm({ title: 'Chưa có dữ liệu phả hệ', content: `Thêm quan hệ mới cho ${name}?`, onOk: () => { formRel.resetFields(); formRel.setFieldsValue({ sourceId: cccd }); setRelModalVisible(true); } }); } else { setTreeData(data); setDrawerVisible(true); } } } catch (err) {} finally { setLoadingTree(false); } };

//   const handleNodeClick = (node) => { if(node.id) viewMemberDetail(node.id); };
  
//   const handleLinkClick = (link) => { 
//       setSelectedLink(link);
//       const formData = { type: link.label };
//       const propKeys = [];
//       if (link.properties) {
//           Object.entries(link.properties).forEach(([key, value]) => {
//               propKeys.push(key);
//               if (isValidDateStr(value)) formData[key] = dayjs(value); else formData[key] = value;
//           });
//       }
//       if(propKeys.length===0) propKeys.push('note', 'fromDate');
//       setDynamicLinkProps(propKeys);
//       formLinkEdit.setFieldsValue(formData);
//       setLinkActionModalVisible(true); 
//   };

//   // --- CRUD ACTIONS ---
//   const handleCreateRelationship = async () => { try { const v = await formRel.validateFields(); await axios.post(`${API_URL}/relationship`, { sourceId: v.sourceId, targetId: v.targetId, type: v.type, properties: { createdDate: new Date().toISOString().split('T')[0] } }); notification.success({ message: 'Thành công' }); setRelModalVisible(false); fetchData(); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){ notification.error({ message: 'Lỗi tạo quan hệ' }); } };
  
//   const handleUpdateLink = async () => { 
//       try { 
//           const values = await formLinkEdit.validateFields();
//           const { type, ...rawProps } = values; 
//           const propsToUpdate = {};
//           Object.entries(rawProps).forEach(([key, val]) => {
//               if (val && dayjs.isDayjs(val)) propsToUpdate[key] = val.format('YYYY-MM-DD');
//               else propsToUpdate[key] = val;
//           });
//           await axios.put(`${API_URL}/relationship/${selectedLink.id}`, propsToUpdate); 
//           notification.success({ message: 'Đã cập nhật' }); 
//           setLinkActionModalVisible(false); 
//           if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); 
//       } catch(err) { notification.error({ message: 'Lỗi cập nhật' }); } 
//   };
  
//   const handleDeleteLink = async () => { try { await axios.delete(`${API_URL}/relationship/${selectedLink.id}`); notification.success({ message: 'Đã xóa' }); setLinkActionModalVisible(false); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){} };
  
//   const handleDeleteRelationshipFromList = async (r) => { try { await axios.delete(`${API_URL}/relationship/${r.id}`); notification.success({ message: 'Đã xóa' }); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){ notification.error({ message: 'Lỗi xóa' }); } };

//   // --- HOUSEHOLD ACTIONS (Định nghĩa hàm ở đây để renderDashboard nhìn thấy) ---
//   const openAddHousehold = () => { 
//       setIsEditing(false); 
//       formHh.resetFields(); 
//       setHhModalVisible(true); 
//   };
  
//   const openEditHousehold = (hh) => { 
//       setIsEditing(true); 
//       setSelectedHouseholdId(hh.householdCode); 
//       formHh.setFieldsValue({ 
//           householdId: hh.householdCode, 
//           registrationNumber: hh.registrationNumber, 
//           address: hh.address, 
//           residencyType: hh.residencyType,
//           // headCccd: hh.headCccd // Nếu có data này trong list
//       }); 
//       setHhModalVisible(true); 
//   };

//   const handleSaveHousehold = async () => { 
//       try { 
//           const v = await formHh.validateFields(); 
//           const p = { 
//               householdId: isEditing ? selectedHouseholdId : (v.householdId || `HK${Math.floor(Math.random()*10000)}`), 
//               registrationNumber: v.registrationNumber, 
//               headCccd: v.headCccd, 
//               address: v.address, 
//               residencyType: v.residencyType 
//           }; 
//           if(isEditing) await axios.put(`${API_URL}/household/${selectedHouseholdId}`, p); 
//           else await axios.post(`${API_URL}/household`, p); 
//           notification.success({ message: 'Xong' }); 
//           setHhModalVisible(false); 
//           fetchHouseholds(); 
//       } catch(err){ notification.error({message: 'Lỗi lưu hộ khẩu'}); } 
//   };

//   const handleDeleteHousehold = async (hid) => { try{ await axios.delete(`${API_URL}/household/${hid}`); fetchHouseholds(); notification.success({message:'Đã xóa'}); }catch(e){ notification.error({message:'Lỗi xóa'}); } };
  
//   // --- CITIZEN & MEMBER ACTIONS ---
//   const openEditCitizen = (c) => { setSelectedRootId(c.cccd); formCitizen.setFieldsValue(c); setCitizenModalVisible(true); };
  
//   const handleUpdateCitizen = async () => { try{ const v = await formCitizen.validateFields(); await axios.put(`${API_URL}/citizen/${selectedRootId}`, v); setCitizenModalVisible(false); fetchCitizensForGenealogy(); notification.success({message:'Cập nhật OK'}); } catch(e){ notification.error({ message: 'Lỗi cập nhật' }); } };
  
//   const handleAddMemberToHousehold = async () => { try{ const v=await formMember.validateFields(); await axios.post(`${API_URL}/household/member`,{ householdId: selectedHouseholdId, personCccd: v.personCccd, relationToHead: v.relationToHead, role: v.role||'Thành viên', fromDate: new Date().toISOString().split('T')[0] }); setAddMemberModalVisible(false); fetchHouseholds(); notification.success({message:'Đã thêm'}); }catch(e){ notification.error({ message: 'Lỗi thêm' }); } };
  
//   const handleRemoveMember = async (hid, cccd) => { try{ await axios.delete(`${API_URL}/household/member`,{params:{householdId:hid, cccd}}); fetchHouseholds(); notification.success({message:'Đã xóa thành viên'}); }catch(e){ notification.error({ message: 'Lỗi xóa' }); } };

//   // --- RENDER FUNCTIONS ---
//   const renderDashboard = () => (
//       <div>
//           {stats && <Row gutter={16} style={{marginBottom:24}}><Col span={6}><Card bordered={false}><Statistic title="Tổng Công Dân" value={stats.totalCitizens} prefix={<TeamOutlined/>} valueStyle={{color:'#3f8600'}}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Đã Kết Hôn" value={stats.marriedCount} prefix={<HeartOutlined/>} valueStyle={{color:'#cf1322'}}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Mối quan hệ" value={stats.totalRelationships} prefix={<PartitionOutlined/>}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Số con TB" value={stats.avgChildrenPerFamily} precision={1}/></Card></Col></Row>}
          
//           <div style={{display:'flex', justifyContent:'space-between', marginBottom:16}}>
//             <Title level={4} style={{margin:0}}><HomeOutlined/> Quản lý Hộ Gia Đình</Title>
//             <Button type="primary" icon={<PlusOutlined/>} onClick={openAddHousehold}>Thêm Hộ Mới</Button>
//           </div>
          
//           <List grid={{gutter:16, column:3}} dataSource={households} loading={loadingHH} renderItem={item=>(
//               <List.Item>
//                   <Card title={<span>{item.address} <small>({item.householdCode})</small></span>} extra={<Space><Button type="text" icon={<EditOutlined/>} onClick={()=>{openEditHousehold(item)}}/><Popconfirm title="Xóa?" onConfirm={()=>handleDeleteHousehold(item.householdCode)}><Button type="text" danger icon={<DeleteOutlined/>}/></Popconfirm></Space>} hoverable actions={[<Button type="link" size="small" icon={<PlusOutlined/>} onClick={()=>{setSelectedHouseholdId(item.householdCode);formMember.resetFields();setAddMemberModalVisible(true)}}>Thêm TV</Button>]}>
//                       <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{item.members?.map((m,i)=><Tag key={i} color="geekblue" closable onClose={(e)=>{e.preventDefault();handleRemoveMember(item.householdCode,m.cccd)}}><span onClick={()=>viewMemberDetail(m.cccd)}>{m.name}</span></Tag>)}</div>
//                   </Card>
//               </List.Item>
//           )}/>
//       </div>
//   );

//   const renderGenealogy = () => (
//       <div>
//           <div style={{marginBottom:16,display:'flex',justifyContent:'space-between'}}><Alert message="Danh sách toàn bộ công dân." type="info" showIcon style={{flex:1,marginRight:10}}/><Button type="primary" icon={<PlusOutlined/>} onClick={()=>{formRel.resetFields();setRelModalVisible(true)}}>Thêm Quan Hệ</Button></div>
//           <Table dataSource={citizens} rowKey="cccd" loading={loadingCitizens} pagination={{pageSize:8}} columns={[
//               {title:'Họ Tên',dataIndex:'hoTen',render:t=><b>{t}</b>},
//               {title:'CCCD',dataIndex:'cccd'},
//               {title:'Năm sinh',dataIndex:'ngaySinh'},
//               {title:'Số con',dataIndex:'soConTrucTiep',align:'center',render:n=>n>0?<Tag color="purple">{n}</Tag>:'-'},
//               {title:'Hành động',key:'act',align:'right',render:(_,r)=><Space><Button size="small" icon={<EditOutlined/>} onClick={()=>openEditCitizen(r)}/><Button type="primary" size="small" icon={<EyeOutlined/>} onClick={()=>viewFullTree(r.cccd, r.hoTen)}>Sơ Đồ</Button></Space>}
//           ]}/>
//       </div>
//   );

//   return (
//     <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
//           <Title level={2} style={{margin: 0, color: '#001529'}}>Quản lý Dân Cư & Phả Hệ</Title>
//           <Button icon={<RedoOutlined />} onClick={fetchData}>Làm mới dữ liệu</Button>
//       </div>
//       <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
//         <Tabs defaultActiveKey="1" items={[
//             { key: '1', label: <span><HomeOutlined /> Hộ Khẩu</span>, children: renderDashboard() },
//             { key: '2', label: <span><PartitionOutlined /> Tra cứu Phả Hệ</span>, children: renderGenealogy() },
//             { key: '3', label: <span><GlobalOutlined /> Toàn cảnh</span>, children: <div style={{height: '75vh'}}><FamilyTreeViz graphData={globalData} loading={loadingGlobal} rootId={null} onNodeClick={handleNodeClick} onLinkClick={handleLinkClick} /></div> }
//         ]} size="large" onChange={(k)=>k==='3'&&fetchGlobalGraph()} />
//       </div>

//       {/* --- MODALS --- */}
//       <Modal title="Thông tin thành viên" open={modalVisible} onCancel={()=>setModalVisible(false)} footer={null}>{memberDetail && <Descriptions bordered column={1} size="small"><Descriptions.Item label="Họ tên">{memberDetail.member.hoTen}</Descriptions.Item><Descriptions.Item label="CCCD">{memberDetail.member.id}</Descriptions.Item><Descriptions.Item label="Quan hệ">{memberDetail.relationToHead}</Descriptions.Item><Descriptions.Item label="Địa chỉ">{memberDetail.householdAddress}</Descriptions.Item></Descriptions>}</Modal>

//       <Modal title={isEditing?"Sửa Hộ":"Thêm Hộ"} open={hhModalVisible} onCancel={()=>setHhModalVisible(false)} onOk={handleSaveHousehold}>
//         <Form form={formHh} layout="vertical">
//             {!isEditing && <Form.Item name="householdId" label="Mã Hộ Khẩu"><Input placeholder="Để trống tự sinh" /></Form.Item>}
//             <Form.Item name="registrationNumber" label="Số Đăng Ký"><Input /></Form.Item>
//             <Form.Item name="headCccd" label="Chủ Hộ"><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item>
//             <Form.Item name="address" label="Địa chỉ" rules={[{required:true}]}><Input/></Form.Item>
//             <Form.Item name="residencyType" label="Loại cư trú" initialValue="Thường trú"><Select><Option value="Thường trú">Thường trú</Option><Option value="Tạm trú">Tạm trú</Option></Select></Form.Item>
//         </Form>
//       </Modal>

//       <Modal title="Thêm Thành Viên" open={addMemberModalVisible} onCancel={()=>setAddMemberModalVisible(false)} onOk={handleAddMemberToHousehold}>
//         <Form form={formMember} layout="vertical">
//             <Form.Item name="personCccd" label="Thành viên" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item>
//             <Row gutter={16}><Col span={12}><Form.Item name="relationToHead" label="Quan hệ chủ hộ" rules={[{required:true}]}><Select><Option value="Vợ">Vợ</Option><Option value="Chồng">Chồng</Option><Option value="Con">Con</Option><Option value="Bố mẹ">Bố mẹ</Option><Option value="Chủ hộ">Chủ hộ</Option></Select></Form.Item></Col><Col span={12}><Form.Item name="role" label="Vai trò" initialValue="Thành viên"><Select><Option value="Thành viên">Thành viên</Option><Option value="Chủ hộ">Chủ hộ</Option></Select></Form.Item></Col></Row>
//         </Form>
//       </Modal>

//       <Modal title="Sửa Công Dân" open={citizenModalVisible} onCancel={()=>setCitizenModalVisible(false)} onOk={handleUpdateCitizen}>
//         <Form form={formCitizen} layout="vertical">
//             <Form.Item name="hoTen" label="Tên"><Input/></Form.Item>
//             <Row gutter={16}><Col span={12}><Form.Item name="ngaySinh" label="Ngày sinh"><Input/></Form.Item></Col><Col span={12}><Form.Item name="gioiTinh" label="Giới tính"><Select><Option value="Nam">Nam</Option><Option value="Nữ">Nữ</Option></Select></Form.Item></Col></Row>
//             <Form.Item name="queQuan" label="Quê quán"><Input/></Form.Item>
//             <Form.Item name="ngheNghiep" label="Nghề nghiệp"><Input/></Form.Item>
//         </Form>
//       </Modal>

//       <Modal title="Thêm Quan Hệ" open={relModalVisible} onCancel={()=>setRelModalVisible(false)} onOk={handleCreateRelationship}><Form form={formRel} layout="vertical"><Row gutter={16}><Col span={12}><Form.Item name="sourceId" label="Nguồn" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item></Col><Col span={12}><Form.Item name="targetId" label="Đích" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item></Col></Row><Form.Item name="type" label="Loại" rules={[{required:true}]}><Select><Option value="FATHER_OF">Cha</Option><Option value="MOTHER_OF">Mẹ</Option><Option value="MARRIED_TO">Vợ/Chồng</Option><Option value="CHILD_OF">Con</Option></Select></Form.Item></Form></Modal>
      
//       <Modal title="Chi tiết Mối quan hệ" open={linkActionModalVisible} onCancel={() => setLinkActionModalVisible(false)} footer={[<Button key="del" danger icon={<DeleteOutlined />} onClick={handleDeleteLink}>Xóa Quan Hệ</Button>,<Button key="upd" type="primary" onClick={handleUpdateLink}>Cập nhật</Button>]}>{selectedLink && <Form form={formLinkEdit} layout="vertical"><Alert message={selectedLink.label} type="info" showIcon style={{marginBottom:16}}/><Form.Item name="type" label="Loại"><Input disabled /></Form.Item>{dynamicLinkProps.map(prop => { const isDate = prop.toLowerCase().includes('date') || prop.toLowerCase().includes('sinh'); return <Form.Item key={prop} name={prop} label={`Thuộc tính: ${prop}`}>{isDate ? <DatePicker style={{width:'100%'}} format="YYYY-MM-DD" /> : <Input />}</Form.Item> })}<Button type="dashed" block icon={<PlusOutlined />} onClick={()=>{const k=prompt("Tên thuộc tính:");if(k) setDynamicLinkProps([...dynamicLinkProps, k])}}>Thêm thuộc tính</Button></Form>}</Modal>

//       <Drawer title={<div>Cây Phả Hệ: <span style={{color:'#1677ff'}}>{selectedRootName}</span></div>} placement="right" width="100%" onClose={() => setDrawerVisible(false)} open={drawerVisible} destroyOnClose bodyStyle={{padding:0,display:'flex',flexDirection:'column'}}>
//         <div style={{flex:3, borderBottom:'1px solid #f0f0f0', position:'relative'}}><FamilyTreeViz graphData={treeData} loading={loadingTree} rootId={selectedRootId} onNodeClick={handleNodeClick} onLinkClick={handleLinkClick} /></div>
//         <div style={{flex:1, padding:16, overflow:'auto', background:'#fafafa'}}>
//             <Title level={5}><PartitionOutlined /> Danh sách chi tiết quan hệ</Title>
//             <Table dataSource={treeData.links} rowKey="id" size="small" pagination={false} columns={[{ title: 'Nguồn', dataIndex: 'source', render: s => typeof s==='object'?<b>{s.hoTen}</b>:s }, { title: 'Quan hệ', dataIndex: 'label', render: l => <Tag color="orange">{l}</Tag> }, { title: 'Đích', dataIndex: 'target', render: t => typeof t==='object'?<b>{t.hoTen}</b>:t }, { title: 'Thuộc tính', dataIndex: 'properties', render: p => JSON.stringify(p) }, { title: 'Xóa', align: 'right', render: (_, r) => <Popconfirm title="Xóa?" onConfirm={() => handleDeleteRelationshipFromList(r)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm> }]}/>
//         </div>
//       </Drawer>
//     </div>
//   );
// };

// export default FamilyGraphPage;


// import React, { useState, useEffect } from 'react';
// import { 
//     Tabs, Card, List, Button, Tag, Typography, Drawer, Badge, Alert, Table, 
//     notification, Statistic, Row, Col, Modal, Descriptions, Form, Select, Input, 
//     Popconfirm, Space 
// } from 'antd';
// import { 
//     PartitionOutlined, HomeOutlined, EyeOutlined, RedoOutlined, TeamOutlined, 
//     HeartOutlined, GlobalOutlined, InfoCircleOutlined, UserOutlined, PlusOutlined, 
//     DeleteOutlined, EditOutlined 
// } from '@ant-design/icons';
// import axios from 'axios';
// import FamilyTreeViz from '../../components/FamilyTreeViz'; 

// const { Title, Text } = Typography;
// const { Option } = Select;
// const API_URL = 'http://localhost:5000/api/family';

// const FamilyGraphPage = () => {
//   // STATE
//   const [stats, setStats] = useState(null);
//   const [households, setHouseholds] = useState([]);
//   const [citizens, setCitizens] = useState([]); 
//   const [peopleOptions, setPeopleOptions] = useState([]); 
//   const [treeData, setTreeData] = useState({ nodes: [], links: [] });
//   const [globalData, setGlobalData] = useState({ nodes: [], links: [] });
  
//   // UI
//   const [loadingHH, setLoadingHH] = useState(false);
//   const [loadingCitizens, setLoadingCitizens] = useState(false);
//   const [loadingTree, setLoadingTree] = useState(false);
//   const [loadingGlobal, setLoadingGlobal] = useState(false);
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [selectedRootId, setSelectedRootId] = useState(null);
//   const [selectedRootName, setSelectedRootName] = useState('');

//   // Modals
//   const [memberDetail, setMemberDetail] = useState(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [relModalVisible, setRelModalVisible] = useState(false);
//   const [hhModalVisible, setHhModalVisible] = useState(false);
//   const [citizenModalVisible, setCitizenModalVisible] = useState(false);
//   const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  
//   // Modal Link Interaction
//   const [linkActionModalVisible, setLinkActionModalVisible] = useState(false);
//   const [selectedLink, setSelectedLink] = useState(null);
//   const [dynamicLinkProps, setDynamicLinkProps] = useState([]);

//   const [selectedHouseholdId, setSelectedHouseholdId] = useState(null);
//   const [isEditing, setIsEditing] = useState(false);

//   const [formRel] = Form.useForm();
//   const [formHh] = Form.useForm();
//   const [formMember] = Form.useForm();
//   const [formCitizen] = Form.useForm();
//   const [formLinkEdit] = Form.useForm();

//   useEffect(() => { fetchData(); }, []);

//   const fetchData = () => { fetchStats(); fetchHouseholds(); fetchCitizensForGenealogy(); fetchPeopleOptions(); };

//   // API CALLS
//   const fetchStats = async () => { try { const res = await axios.get(`${API_URL}/stats`); setStats(res.data); } catch (err) {} };
//   const fetchHouseholds = async () => { setLoadingHH(true); try { const res = await axios.get(`${API_URL}/households`); if(res.data.success) setHouseholds(res.data.data); } catch(err){} finally{setLoadingHH(false);} };
//   const fetchCitizensForGenealogy = async () => { setLoadingCitizens(true); try { const res = await axios.get(`${API_URL}/genealogy-all`); if(res.data.success) setCitizens(res.data.data); } catch(err){} finally{setLoadingCitizens(false);} };
//   const fetchPeopleOptions = async () => { try { const res = await axios.get(`${API_URL}/dropdown-list`); if(res.data.success) setPeopleOptions(res.data.data); } catch(err){} };
//   const fetchGlobalGraph = async () => { if (globalData.nodes.length > 0) return; setLoadingGlobal(true); try { const res = await axios.get(`${API_URL}/global-graph`); if(res.data.success) setGlobalData(res.data.data); } catch(err){} finally{setLoadingGlobal(false);} };

//   const viewMemberDetail = async (cccd) => { try { const res = await axios.get(`${API_URL}/member-detail`, { params: { cccd } }); if (res.data.success) { setMemberDetail(res.data.data); setModalVisible(true); } } catch (err) {} };
//   const viewFullTree = async (cccd, name) => {
//       setSelectedRootId(cccd); setSelectedRootName(name); setLoadingTree(true); setTreeData({ nodes: [], links: [] }); 
//       try { const res = await axios.get(`${API_URL}/full-tree`, { params: { cccd } }); const data = res.data.data; if(res.data.success && data) { if (data.links.length === 0 && data.nodes.length <= 1) { Modal.confirm({ title: 'Chưa có dữ liệu phả hệ', content: `Thêm quan hệ mới cho ${name}?`, onOk: () => { formRel.resetFields(); formRel.setFieldsValue({ sourceId: cccd }); setRelModalVisible(true); } }); } else { setTreeData(data); setDrawerVisible(true); } } } catch (err) {} finally { setLoadingTree(false); }
//   };

//   const handleNodeClick = (node) => { if(node.id) viewMemberDetail(node.id); };
  
//   // Click Link: Lấy tất cả props để hiện form
//   const handleLinkClick = (link) => { 
//       setSelectedLink(link);
//       const formData = { type: link.label }; // Chỉ hiện Type để xem, ko sửa
//       const propKeys = [];
//       if (link.properties) {
//           Object.entries(link.properties).forEach(([key, value]) => {
//               formData[key] = value;
//               propKeys.push(key);
//           });
//       }
//       if(propKeys.length===0) propKeys.push('note', 'fromDate'); // Default fields suggestion
//       setDynamicLinkProps(propKeys);
//       formLinkEdit.setFieldsValue(formData);
//       setLinkActionModalVisible(true); 
//   };

//   // CRUD ACTIONS
//   const handleCreateRelationship = async () => { try { const v = await formRel.validateFields(); await axios.post(`${API_URL}/relationship`, { sourceId: v.sourceId, targetId: v.targetId, type: v.type, properties: { createdDate: new Date().toISOString().split('T')[0] } }); notification.success({ message: 'Thành công' }); setRelModalVisible(false); fetchData(); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){ notification.error({ message: 'Lỗi' }); } };
  
//   const handleUpdateLink = async () => { 
//       try { 
//           const values = await formLinkEdit.validateFields();
//           const { type, ...propsToUpdate } = values; 
//           await axios.put(`${API_URL}/relationship/${selectedLink.id}`, propsToUpdate); 
//           notification.success({ message: 'Đã cập nhật thông tin' }); 
//           setLinkActionModalVisible(false); 
//           if(selectedRootId) viewFullTree(selectedRootId, selectedRootName);
//       } catch(err) { notification.error({ message: 'Lỗi cập nhật' }); } 
//   };
  
//   const handleDeleteLink = async () => { try { await axios.delete(`${API_URL}/relationship/${selectedLink.id}`); notification.success({ message: 'Đã xóa quan hệ' }); setLinkActionModalVisible(false); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err) { notification.error({ message: 'Lỗi xóa' }); } };

//   // Other CRUDs
//   const handleSaveHousehold = async () => { try { const v = await formHh.validateFields(); const p = { householdId: isEditing?selectedHouseholdId:(v.householdId||`HK${Math.floor(Math.random()*10000)}`), registrationNumber: v.registrationNumber, headCccd: v.headCccd, address: v.address, residencyType: v.residencyType }; if(isEditing) await axios.put(`${API_URL}/household/${selectedHouseholdId}`, p); else await axios.post(`${API_URL}/household`, p); notification.success({ message: 'Xong' }); setHhModalVisible(false); fetchHouseholds(); } catch(err){} };
//   const handleDeleteHousehold = async (hid) => { try{ await axios.delete(`${API_URL}/household/${hid}`); fetchHouseholds(); }catch(e){} };
//   const handleUpdateCitizen = async () => { try{ const v = await formCitizen.validateFields(); await axios.put(`${API_URL}/citizen/${selectedRootId}`, v); setCitizenModalVisible(false); fetchCitizensForGenealogy(); }catch(e){} };
//   const handleAddMemberToHousehold = async () => { try{ const v=await formMember.validateFields(); await axios.post(`${API_URL}/household/member`,{ householdId: selectedHouseholdId, personCccd: v.personCccd, relationToHead: v.relationToHead, role: v.role||'Thành viên', fromDate: new Date().toISOString().split('T')[0] }); setAddMemberModalVisible(false); fetchHouseholds(); }catch(e){} };
//   const handleRemoveMember = async (hid, cccd) => { try{ await axios.delete(`${API_URL}/household/member`,{params:{householdId:hid, cccd}}); fetchHouseholds(); }catch(e){} };
//   const handleDeleteRelationshipFromList = async (r) => { try { const sId = typeof r.source==='object'?r.source.id:r.source; const tId = typeof r.target==='object'?r.target.id:r.target; await axios.delete(`${API_URL}/relationship`, { params: { sourceId: sId, targetId: tId, type: r.type } }); notification.success({ message: 'Đã xóa' }); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){ notification.error({ message: 'Lỗi xóa' }); } };

//   // RENDER
//   return (
//     <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
//           <Title level={2} style={{margin: 0, color: '#001529'}}>Quản lý Dân Cư & Phả Hệ</Title>
//           <Button icon={<RedoOutlined />} onClick={fetchData}>Làm mới dữ liệu</Button>
//       </div>
//       <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
//         <Tabs defaultActiveKey="1" items={[
//             { key: '1', label: <span><HomeOutlined /> Hộ Khẩu</span>, children: <div>{stats && <Row gutter={16} style={{marginBottom:24}}><Col span={6}><Card bordered={false}><Statistic title="Tổng Công Dân" value={stats.totalCitizens} prefix={<TeamOutlined/>} valueStyle={{color:'#3f8600'}}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Đã Kết Hôn" value={stats.marriedCount} prefix={<HeartOutlined/>} valueStyle={{color:'#cf1322'}}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Mối quan hệ" value={stats.totalRelationships} prefix={<PartitionOutlined/>}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Số con TB" value={stats.avgChildrenPerFamily} precision={1}/></Card></Col></Row>}<div style={{display:'flex', justifyContent:'space-between', marginBottom:16}}><Title level={4} style={{margin:0}}><HomeOutlined/> Quản lý Hộ Gia Đình</Title><Button type="primary" icon={<PlusOutlined/>} onClick={()=>{setIsEditing(false);formHh.resetFields();setHhModalVisible(true)}}>Thêm Hộ Mới</Button></div><List grid={{gutter:16, column:3}} dataSource={households} loading={loadingHH} renderItem={item=><List.Item><Card title={<span>{item.address} <small>({item.householdCode})</small></span>} extra={<Space><Button type="text" icon={<EditOutlined/>} onClick={()=>{setIsEditing(true);setSelectedHouseholdId(item.householdCode);formHh.setFieldsValue({householdId:item.householdCode,...item});setHhModalVisible(true)}}/><Popconfirm title="Xóa?" onConfirm={()=>handleDeleteHousehold(item.householdCode)}><Button type="text" danger icon={<DeleteOutlined/>}/></Popconfirm></Space>} hoverable actions={[<Button type="link" size="small" icon={<PlusOutlined/>} onClick={()=>{setSelectedHouseholdId(item.householdCode);formMember.resetFields();setAddMemberModalVisible(true)}}>Thêm TV</Button>]}><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{item.members?.map((m,i)=><Tag key={i} color="geekblue" closable onClose={(e)=>{e.preventDefault();handleRemoveMember(item.householdCode,m.cccd)}}><span onClick={()=>viewMemberDetail(m.cccd)}>{m.name}</span></Tag>)}</div></Card></List.Item>}/></div>},
//             { key: '2', label: <span><PartitionOutlined /> Tra cứu Phả Hệ</span>, children: <div><div style={{marginBottom:16,display:'flex',justifyContent:'space-between'}}><Alert message="Danh sách toàn bộ công dân." type="info" showIcon style={{flex:1,marginRight:10}}/><Button type="primary" icon={<PlusOutlined/>} onClick={()=>{formRel.resetFields();setRelModalVisible(true)}}>Thêm Quan Hệ</Button></div><Table dataSource={citizens} rowKey="cccd" loading={loadingCitizens} pagination={{pageSize:8}} columns={[{title:'Họ Tên',dataIndex:'hoTen',render:t=><b>{t}</b>},{title:'CCCD',dataIndex:'cccd'},{title:'Năm sinh',dataIndex:'ngaySinh'},{title:'Số con',dataIndex:'soConTrucTiep',align:'center',render:n=>n>0?<Tag color="purple">{n}</Tag>:'-'},{title:'Hành động',key:'act',align:'right',render:(_,r)=><Space><Button size="small" icon={<EditOutlined/>} onClick={()=>{setSelectedRootId(r.cccd);formCitizen.setFieldsValue(r);setCitizenModalVisible(true)}}/><Button type="primary" size="small" icon={<EyeOutlined/>} onClick={()=>viewFullTree(r.cccd, r.hoTen)}>Sơ Đồ</Button></Space>}]}/></div>},
//             { key: '3', label: <span><GlobalOutlined /> Toàn cảnh</span>, children: <div style={{height: '75vh'}}><FamilyTreeViz graphData={globalData} loading={loadingGlobal} rootId={null} onNodeClick={handleNodeClick} onLinkClick={handleLinkClick} /></div> }
//         ]} size="large" onChange={(k)=>k==='3'&&fetchGlobalGraph()} />
//       </div>

//       {/* MODALS */}
//       <Modal title="Chi tiết thành viên" open={modalVisible} onCancel={()=>setModalVisible(false)} footer={null}>{memberDetail && <Descriptions bordered column={1} size="small"><Descriptions.Item label="Tên">{memberDetail.member.hoTen}</Descriptions.Item><Descriptions.Item label="CCCD">{memberDetail.member.id}</Descriptions.Item><Descriptions.Item label="Quan hệ">{memberDetail.relationToHead}</Descriptions.Item><Descriptions.Item label="Địa chỉ">{memberDetail.householdAddress}</Descriptions.Item></Descriptions>}</Modal>
//       <Modal title={isEditing?"Sửa Hộ":"Thêm Hộ"} open={hhModalVisible} onCancel={()=>setHhModalVisible(false)} onOk={handleSaveHousehold}><Form form={formHh} layout="vertical"><Form.Item name="registrationNumber" label="Số ĐK"><Input/></Form.Item><Form.Item name="headCccd" label="Chủ Hộ"><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item><Form.Item name="address" label="Địa chỉ" rules={[{required:true}]}><Input/></Form.Item></Form></Modal>
//       <Modal title="Thêm Thành Viên" open={addMemberModalVisible} onCancel={()=>setAddMemberModalVisible(false)} onOk={handleAddMemberToHousehold}><Form form={formMember} layout="vertical"><Form.Item name="personCccd" label="Thành viên" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item><Form.Item name="relationToHead" label="Quan hệ" rules={[{required:true}]}><Select><Option value="Vợ">Vợ</Option><Option value="Con">Con</Option></Select></Form.Item></Form></Modal>
//       <Modal title="Sửa Công Dân" open={citizenModalVisible} onCancel={()=>setCitizenModalVisible(false)} onOk={handleUpdateCitizen}><Form form={formCitizen} layout="vertical"><Form.Item name="hoTen" label="Tên"><Input/></Form.Item><Form.Item name="ngaySinh" label="Ngày sinh"><Input/></Form.Item><Form.Item name="gioiTinh" label="Giới tính"><Select><Option value="Nam">Nam</Option><Option value="Nữ">Nữ</Option></Select></Form.Item></Form></Modal>
//       <Modal title="Thêm Quan Hệ" open={relModalVisible} onCancel={()=>setRelModalVisible(false)} onOk={handleCreateRelationship}><Form form={formRel} layout="vertical"><Row gutter={16}><Col span={12}><Form.Item name="sourceId" label="Nguồn" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item></Col><Col span={12}><Form.Item name="targetId" label="Đích" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item></Col></Row><Form.Item name="type" label="Loại" rules={[{required:true}]}><Select><Option value="FATHER_OF">Cha</Option><Option value="MOTHER_OF">Mẹ</Option><Option value="MARRIED_TO">Vợ/Chồng</Option></Select></Form.Item></Form></Modal>

//       {/* MODAL SỬA QUAN HỆ (Dynamic Form) */}
//       <Modal title="Chi tiết Mối quan hệ" open={linkActionModalVisible} onCancel={() => setLinkActionModalVisible(false)} footer={[<Button key="delete" danger icon={<DeleteOutlined />} onClick={handleDeleteLink}>Xóa Quan Hệ</Button>,<Button key="update" type="primary" onClick={handleUpdateLink}>Cập nhật</Button>]}>
//         {selectedLink && (
//             <Form form={formLinkEdit} layout="vertical">
//                 <Alert message={`Đang chỉnh sửa: ${selectedLink.label}`} description="Loại quan hệ không thể thay đổi." type="info" showIcon style={{marginBottom: 16}} />
//                 <Form.Item name="type" label="Loại quan hệ"><Input disabled /></Form.Item>
                
//                 {dynamicLinkProps.map(prop => (
//                     <Form.Item key={prop} name={prop} label={`Thuộc tính: ${prop}`}>
//                         <Input placeholder={`Nhập giá trị cho ${prop}`} />
//                     </Form.Item>
//                 ))}
                
//                 <Button type="dashed" block icon={<PlusOutlined />} onClick={() => {
//                     const newKey = prompt("Nhập tên thuộc tính mới (ví dụ: note, date):");
//                     if(newKey && !dynamicLinkProps.includes(newKey)) setDynamicLinkProps([...dynamicLinkProps, newKey]);
//                 }}>Thêm thuộc tính khác</Button>
//             </Form>
//         )}
//       </Modal>

//       {/* DRAWER Full Width */}
//       <Drawer title={<div>Cây Phả Hệ: <span style={{color:'#1677ff'}}>{selectedRootName}</span></div>} placement="right" width="100%" onClose={() => setDrawerVisible(false)} open={drawerVisible} destroyOnClose bodyStyle={{padding:0,display:'flex',flexDirection:'column'}}>
//         <div style={{flex:3, borderBottom:'1px solid #f0f0f0', position:'relative'}}><FamilyTreeViz graphData={treeData} loading={loadingTree} rootId={selectedRootId} onNodeClick={handleNodeClick} onLinkClick={handleLinkClick} /></div>
//         <div style={{flex:1, padding:16, overflow:'auto', background:'#fafafa', minHeight: 200}}>
//             <Title level={5}><PartitionOutlined /> Danh sách chi tiết quan hệ</Title>
//             <Table dataSource={treeData.links} rowKey="id" size="small" pagination={false} columns={[
//                 { title: 'Nguồn', dataIndex: 'source', render: s => typeof s==='object'?<b>{s.hoTen}</b>:s },
//                 { title: 'Quan hệ', dataIndex: 'label', render: l => <Tag color="orange">{l}</Tag> },
//                 { title: 'Đích', dataIndex: 'target', render: t => typeof t==='object'?<b>{t.hoTen}</b>:t },
//                 { title: 'Thuộc tính', dataIndex: 'properties', render: p => JSON.stringify(p) },
//                 { title: 'Xóa', align: 'right', render: (_, r) => <Popconfirm title="Xóa?" onConfirm={() => handleDeleteRelationshipFromList(r)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm> }
//             ]}/>
//         </div>
//       </Drawer>
//     </div>
//   );
// };

// export default FamilyGraphPage;


// import React, { useState, useEffect } from 'react';
// import { 
//     Tabs, Card, List, Button, Tag, Typography, Drawer, Badge, Alert, Table, 
//     notification, Statistic, Row, Col, Modal, Descriptions, Form, Select, Input, 
//     Popconfirm, Space 
// } from 'antd';
// import { 
//     PartitionOutlined, HomeOutlined, EyeOutlined, RedoOutlined, TeamOutlined, 
//     HeartOutlined, GlobalOutlined, InfoCircleOutlined, UserOutlined, PlusOutlined, 
//     DeleteOutlined, EditOutlined 
// } from '@ant-design/icons';
// import axios from 'axios';
// import FamilyTreeViz from '../../components/FamilyTreeViz'; 

// const { Title, Text } = Typography;
// const { Option } = Select;
// const API_URL = 'http://localhost:5000/api/family';

// const FamilyGraphPage = () => {
//   // STATE
//   const [stats, setStats] = useState(null);
//   const [households, setHouseholds] = useState([]);
//   const [citizens, setCitizens] = useState([]); 
//   const [peopleOptions, setPeopleOptions] = useState([]); 
//   const [treeData, setTreeData] = useState({ nodes: [], links: [] });
//   const [globalData, setGlobalData] = useState({ nodes: [], links: [] });
  
//   // UI
//   const [loadingHH, setLoadingHH] = useState(false);
//   const [loadingCitizens, setLoadingCitizens] = useState(false);
//   const [loadingTree, setLoadingTree] = useState(false);
//   const [loadingGlobal, setLoadingGlobal] = useState(false);
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [selectedRootId, setSelectedRootId] = useState(null);
//   const [selectedRootName, setSelectedRootName] = useState('');

//   // Modals
//   const [memberDetail, setMemberDetail] = useState(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [relModalVisible, setRelModalVisible] = useState(false);
//   const [hhModalVisible, setHhModalVisible] = useState(false);
//   const [citizenModalVisible, setCitizenModalVisible] = useState(false);
//   const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  
//   // Modal Link Interaction
//   const [linkActionModalVisible, setLinkActionModalVisible] = useState(false);
//   const [selectedLink, setSelectedLink] = useState(null);
//   const [dynamicLinkProps, setDynamicLinkProps] = useState([]);

//   const [selectedHouseholdId, setSelectedHouseholdId] = useState(null);
//   const [isEditing, setIsEditing] = useState(false);

//   const [formRel] = Form.useForm();
//   const [formHh] = Form.useForm();
//   const [formMember] = Form.useForm();
//   const [formCitizen] = Form.useForm();
//   const [formLinkEdit] = Form.useForm();

//   useEffect(() => { fetchData(); }, []);

//   const fetchData = () => { fetchStats(); fetchHouseholds(); fetchCitizensForGenealogy(); fetchPeopleOptions(); };

//   // API READ
//   const fetchStats = async () => { try { const res = await axios.get(`${API_URL}/stats`); setStats(res.data); } catch (err) {} };
//   const fetchHouseholds = async () => { setLoadingHH(true); try { const res = await axios.get(`${API_URL}/households`); if(res.data.success) setHouseholds(res.data.data); } catch(err){} finally{setLoadingHH(false);} };
//   const fetchCitizensForGenealogy = async () => { setLoadingCitizens(true); try { const res = await axios.get(`${API_URL}/genealogy-all`); if(res.data.success) setCitizens(res.data.data); } catch(err){} finally{setLoadingCitizens(false);} };
//   const fetchPeopleOptions = async () => { try { const res = await axios.get(`${API_URL}/dropdown-list`); if(res.data.success) setPeopleOptions(res.data.data); } catch(err){} };
//   const fetchGlobalGraph = async () => { if (globalData.nodes.length > 0) return; setLoadingGlobal(true); try { const res = await axios.get(`${API_URL}/global-graph`); if(res.data.success) setGlobalData(res.data.data); } catch(err){} finally{setLoadingGlobal(false);} };

//   const viewMemberDetail = async (cccd) => { try { const res = await axios.get(`${API_URL}/member-detail`, { params: { cccd } }); if (res.data.success) { setMemberDetail(res.data.data); setModalVisible(true); } } catch (err) {} };
//   const viewFullTree = async (cccd, name) => {
//       setSelectedRootId(cccd); setSelectedRootName(name); setLoadingTree(true); setTreeData({ nodes: [], links: [] }); 
//       try { const res = await axios.get(`${API_URL}/full-tree`, { params: { cccd } }); const data = res.data.data; if(res.data.success && data) { if (data.links.length === 0 && data.nodes.length <= 1) { Modal.confirm({ title: 'Chưa có dữ liệu', content: `Thêm quan hệ mới cho ${name}?`, onOk: () => { formRel.resetFields(); formRel.setFieldsValue({ sourceId: cccd }); setRelModalVisible(true); } }); } else { setTreeData(data); setDrawerVisible(true); } } } catch (err) {} finally { setLoadingTree(false); }
//   };

//   // INTERACTION HANDLERS
//   const handleNodeClick = (node) => { if(node.id) viewMemberDetail(node.id); };
  
//   // Click vào Link để sửa
//   const handleLinkClick = (link) => { 
//       setSelectedLink(link);
      
//       // Lấy danh sách thuộc tính hiện có
//       const formData = { type: link.label }; // Type chỉ để hiển thị
//       const propKeys = [];
      
//       if (link.properties) {
//           Object.entries(link.properties).forEach(([key, value]) => {
//               formData[key] = value;
//               propKeys.push(key);
//           });
//       }
      
//       if (propKeys.length === 0) propKeys.push('createdDate'); // Default field

//       setDynamicLinkProps(propKeys);
//       formLinkEdit.setFieldsValue(formData);
//       setLinkActionModalVisible(true); 
//   };

//   // CRUD ACTIONS
//   const handleCreateRelationship = async () => { try { const v = await formRel.validateFields(); await axios.post(`${API_URL}/relationship`, { sourceId: v.sourceId, targetId: v.targetId, type: v.type, properties: { createdDate: new Date().toISOString().split('T')[0] } }); notification.success({ message: 'Thành công' }); setRelModalVisible(false); fetchData(); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){ notification.error({ message: 'Lỗi' }); } };
  
//   const handleUpdateLink = async () => { 
//       try { 
//           const values = await formLinkEdit.validateFields();
//           const { type, ...propsToUpdate } = values; // Bỏ field type ra
          
//           await axios.put(`${API_URL}/relationship/${selectedLink.id}`, propsToUpdate); 
//           notification.success({ message: 'Cập nhật thành công' }); 
//           setLinkActionModalVisible(false); 
//           if(selectedRootId) viewFullTree(selectedRootId, selectedRootName);
//       } catch(err) { notification.error({ message: 'Lỗi cập nhật' }); } 
//   };
  
//   const handleDeleteLink = async () => { try { await axios.delete(`${API_URL}/relationship/${selectedLink.id}`); notification.success({ message: 'Đã xóa' }); setLinkActionModalVisible(false); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err) { notification.error({ message: 'Lỗi xóa' }); } };

//   // Other CRUDs
//   const handleSaveHousehold = async () => { try { const v = await formHh.validateFields(); const p = { householdId: isEditing?selectedHouseholdId:(v.householdId||`HK${Math.floor(Math.random()*10000)}`), registrationNumber: v.registrationNumber, headCccd: v.headCccd, address: v.address, residencyType: v.residencyType }; if(isEditing) await axios.put(`${API_URL}/household/${selectedHouseholdId}`, p); else await axios.post(`${API_URL}/household`, p); notification.success({ message: 'Xong' }); setHhModalVisible(false); fetchHouseholds(); } catch(err){} };
//   const handleDeleteHousehold = async (hid) => { try{ await axios.delete(`${API_URL}/household/${hid}`); fetchHouseholds(); }catch(e){} };
//   const handleUpdateCitizen = async () => { try{ const v = await formCitizen.validateFields(); await axios.put(`${API_URL}/citizen/${selectedRootId}`, v); setCitizenModalVisible(false); fetchCitizensForGenealogy(); }catch(e){} };
//   const handleAddMemberToHousehold = async () => { try{ const v=await formMember.validateFields(); await axios.post(`${API_URL}/household/member`,{ householdId: selectedHouseholdId, personCccd: v.personCccd, relationToHead: v.relationToHead, role: v.role||'Thành viên', fromDate: new Date().toISOString().split('T')[0] }); setAddMemberModalVisible(false); fetchHouseholds(); }catch(e){} };
//   const handleRemoveMember = async (hid, cccd) => { try{ await axios.delete(`${API_URL}/household/member`,{params:{householdId:hid, cccd}}); fetchHouseholds(); }catch(e){} };
//   const handleDeleteRelationshipFromList = async (r) => { try { const sId = typeof r.source==='object'?r.source.id:r.source; const tId = typeof r.target==='object'?r.target.id:r.target; await axios.delete(`${API_URL}/relationship`, { params: { sourceId: sId, targetId: tId, type: r.type } }); notification.success({ message: 'Đã xóa' }); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){ notification.error({ message: 'Lỗi xóa' }); } };

//   // RENDER
//   return (
//     <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
//           <Title level={2} style={{margin: 0, color: '#001529'}}>Quản lý Dân Cư & Phả Hệ</Title>
//           <Button icon={<RedoOutlined />} onClick={fetchData}>Làm mới dữ liệu</Button>
//       </div>
//       <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
//         <Tabs defaultActiveKey="1" items={[
//             { key: '1', label: <span><HomeOutlined /> Hộ Khẩu</span>, children: <div>{stats && <Row gutter={16} style={{marginBottom:24}}><Col span={6}><Card bordered={false}><Statistic title="Tổng Công Dân" value={stats.totalCitizens} prefix={<TeamOutlined/>} valueStyle={{color:'#3f8600'}}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Đã Kết Hôn" value={stats.marriedCount} prefix={<HeartOutlined/>} valueStyle={{color:'#cf1322'}}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Mối quan hệ" value={stats.totalRelationships} prefix={<PartitionOutlined/>}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Số con TB" value={stats.avgChildrenPerFamily} precision={1}/></Card></Col></Row>}<div style={{display:'flex', justifyContent:'space-between', marginBottom:16}}><Title level={4} style={{margin:0}}><HomeOutlined/> Quản lý Hộ Gia Đình</Title><Button type="primary" icon={<PlusOutlined/>} onClick={()=>{setIsEditing(false);formHh.resetFields();setHhModalVisible(true)}}>Thêm Hộ Mới</Button></div><List grid={{gutter:16, column:3}} dataSource={households} loading={loadingHH} renderItem={item=><List.Item><Card title={<span>{item.address} <small>({item.householdCode})</small></span>} extra={<Space><Button type="text" icon={<EditOutlined/>} onClick={()=>{setIsEditing(true);setSelectedHouseholdId(item.householdCode);formHh.setFieldsValue({householdId:item.householdCode,...item});setHhModalVisible(true)}}/><Popconfirm title="Xóa?" onConfirm={()=>handleDeleteHousehold(item.householdCode)}><Button type="text" danger icon={<DeleteOutlined/>}/></Popconfirm></Space>} hoverable actions={[<Button type="link" size="small" icon={<PlusOutlined/>} onClick={()=>{setSelectedHouseholdId(item.householdCode);formMember.resetFields();setAddMemberModalVisible(true)}}>Thêm TV</Button>]}><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{item.members?.map((m,i)=><Tag key={i} color="geekblue" closable onClose={(e)=>{e.preventDefault();handleRemoveMember(item.householdCode,m.cccd)}}><span onClick={()=>viewMemberDetail(m.cccd)}>{m.name}</span></Tag>)}</div></Card></List.Item>}/></div>},
//             { key: '2', label: <span><PartitionOutlined /> Tra cứu Phả Hệ</span>, children: <div><div style={{marginBottom:16,display:'flex',justifyContent:'space-between'}}><Alert message="Danh sách toàn bộ công dân." type="info" showIcon style={{flex:1,marginRight:10}}/><Button type="primary" icon={<PlusOutlined/>} onClick={()=>{formRel.resetFields();setRelModalVisible(true)}}>Thêm Quan Hệ</Button></div><Table dataSource={citizens} rowKey="cccd" loading={loadingCitizens} pagination={{pageSize:8}} columns={[{title:'Họ Tên',dataIndex:'hoTen',render:t=><b>{t}</b>},{title:'CCCD',dataIndex:'cccd'},{title:'Năm sinh',dataIndex:'ngaySinh'},{title:'Số con',dataIndex:'soConTrucTiep',align:'center',render:n=>n>0?<Tag color="purple">{n}</Tag>:'-'},{title:'Hành động',key:'act',align:'right',render:(_,r)=><Space><Button size="small" icon={<EditOutlined/>} onClick={()=>{setSelectedRootId(r.cccd);formCitizen.setFieldsValue(r);setCitizenModalVisible(true)}}/><Button type="primary" size="small" icon={<EyeOutlined/>} onClick={()=>viewFullTree(r.cccd, r.hoTen)}>Sơ Đồ</Button></Space>}]}/></div>},
//             { key: '3', label: <span><GlobalOutlined /> Toàn cảnh</span>, children: <div style={{height: '75vh'}}><FamilyTreeViz graphData={globalData} loading={loadingGlobal} rootId={null} onNodeClick={handleNodeClick} onLinkClick={handleLinkClick} /></div> }
//         ]} size="large" onChange={(k)=>k==='3'&&fetchGlobalGraph()} />
//       </div>

//       {/* MODALS */}
//       <Modal title="Chi tiết thành viên" open={modalVisible} onCancel={()=>setModalVisible(false)} footer={null}>{memberDetail && <Descriptions bordered column={1} size="small"><Descriptions.Item label="Họ tên">{memberDetail.member.hoTen}</Descriptions.Item><Descriptions.Item label="CCCD">{memberDetail.member.id}</Descriptions.Item><Descriptions.Item label="Quan hệ">{memberDetail.relationToHead}</Descriptions.Item><Descriptions.Item label="Địa chỉ">{memberDetail.householdAddress}</Descriptions.Item></Descriptions>}</Modal>
//       <Modal title={isEditing?"Sửa Hộ":"Thêm Hộ"} open={hhModalVisible} onCancel={()=>setHhModalVisible(false)} onOk={handleSaveHousehold}><Form form={formHh} layout="vertical"><Form.Item name="registrationNumber" label="Số ĐK"><Input/></Form.Item><Form.Item name="headCccd" label="Chủ Hộ"><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item><Form.Item name="address" label="Địa chỉ" rules={[{required:true}]}><Input/></Form.Item></Form></Modal>
//       <Modal title="Thêm Thành Viên" open={addMemberModalVisible} onCancel={()=>setAddMemberModalVisible(false)} onOk={handleAddMemberToHousehold}><Form form={formMember} layout="vertical"><Form.Item name="personCccd" label="Thành viên" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item><Form.Item name="relationToHead" label="Quan hệ" rules={[{required:true}]}><Select><Option value="Vợ">Vợ</Option><Option value="Con">Con</Option></Select></Form.Item></Form></Modal>
//       <Modal title="Sửa Công Dân" open={citizenModalVisible} onCancel={()=>setCitizenModalVisible(false)} onOk={handleUpdateCitizen}><Form form={formCitizen} layout="vertical"><Form.Item name="hoTen" label="Tên"><Input/></Form.Item><Form.Item name="ngaySinh" label="Ngày sinh"><Input/></Form.Item><Form.Item name="gioiTinh" label="Giới tính"><Select><Option value="Nam">Nam</Option><Option value="Nữ">Nữ</Option></Select></Form.Item></Form></Modal>
//       <Modal title="Thêm Quan Hệ" open={relModalVisible} onCancel={()=>setRelModalVisible(false)} onOk={handleCreateRelationship}><Form form={formRel} layout="vertical"><Row gutter={16}><Col span={12}><Form.Item name="sourceId" label="Nguồn" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item></Col><Col span={12}><Form.Item name="targetId" label="Đích" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item></Col></Row><Form.Item name="type" label="Loại" rules={[{required:true}]}><Select><Option value="FATHER_OF">Cha</Option><Option value="MOTHER_OF">Mẹ</Option><Option value="MARRIED_TO">Vợ/Chồng</Option></Select></Form.Item></Form></Modal>

//       {/* MODAL SỬA QUAN HỆ (Dynamic Form) */}
//       <Modal title="Chi tiết Mối quan hệ" open={linkActionModalVisible} onCancel={() => setLinkActionModalVisible(false)} footer={[<Button key="delete" danger icon={<DeleteOutlined />} onClick={handleDeleteLink}>Xóa Quan Hệ</Button>,<Button key="update" type="primary" onClick={handleUpdateLink}>Cập nhật</Button>]}>
//         {selectedLink && (
//             <Form form={formLinkEdit} layout="vertical">
//                 <Alert message={`Đang chỉnh sửa: ${selectedLink.label}`} description="Loại quan hệ không thể thay đổi." type="info" showIcon style={{marginBottom: 16}} />
//                 <Form.Item name="type" label="Loại quan hệ"><Input disabled /></Form.Item>
//                 {dynamicLinkProps.map(prop => (
//                     <Form.Item key={prop} name={prop} label={`Thuộc tính: ${prop}`}>
//                         <Input placeholder={`Nhập giá trị cho ${prop}`} />
//                     </Form.Item>
//                 ))}
//                 <Button type="dashed" block icon={<PlusOutlined />} onClick={() => {
//                     const newKey = prompt("Nhập tên thuộc tính mới (ví dụ: note, date):");
//                     if(newKey && !dynamicLinkProps.includes(newKey)) setDynamicLinkProps([...dynamicLinkProps, newKey]);
//                 }}>Thêm thuộc tính khác</Button>
//             </Form>
//         )}
//       </Modal>

//       <Drawer title={<div>Cây Phả Hệ: <span style={{color:'#1677ff'}}>{selectedRootName}</span></div>} placement="right" width="100%" onClose={() => setDrawerVisible(false)} open={drawerVisible} destroyOnClose bodyStyle={{padding:0,display:'flex',flexDirection:'column'}}>
//         <div style={{flex:3, borderBottom:'1px solid #f0f0f0', position:'relative'}}><FamilyTreeViz graphData={treeData} loading={loadingTree} rootId={selectedRootId} onNodeClick={handleNodeClick} onLinkClick={handleLinkClick} /></div>
//         <div style={{flex:1, padding:16, overflow:'auto', background:'#fafafa', minHeight: 200}}>
//             <Title level={5}><PartitionOutlined /> Danh sách chi tiết quan hệ</Title>
//             <Table dataSource={treeData.links} rowKey="id" size="small" pagination={false} columns={[
//                 { title: 'Nguồn', dataIndex: 'source', render: s => typeof s==='object'?<b>{s.hoTen}</b>:s },
//                 { title: 'Quan hệ', dataIndex: 'label', render: l => <Tag color="orange">{l}</Tag> },
//                 { title: 'Đích', dataIndex: 'target', render: t => typeof t==='object'?<b>{t.hoTen}</b>:t },
//                 { title: 'Thuộc tính', dataIndex: 'properties', render: p => JSON.stringify(p) },
//                 { title: 'Xóa', align: 'right', render: (_, r) => <Popconfirm title="Xóa?" onConfirm={() => handleDeleteRelationshipFromList(r)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm> }
//             ]}/>
//         </div>
//       </Drawer>
//     </div>
//   );
// };

// export default FamilyGraphPage;


// import React, { useState, useEffect } from 'react';
// import { 
//     Tabs, Card, List, Button, Tag, Typography, 
//     Drawer, Badge, Alert, Table, notification, Statistic, Row, Col, 
//     Modal, Descriptions, Divider, Form, Select, Input, Popconfirm, Space, DatePicker 
// } from 'antd';
// import { 
//     PartitionOutlined, HomeOutlined, EyeOutlined, RedoOutlined, 
//     TeamOutlined, HeartOutlined, GlobalOutlined, InfoCircleOutlined, 
//     UserOutlined, PlusOutlined, DeleteOutlined, EditOutlined 
// } from '@ant-design/icons';
// import axios from 'axios';
// import FamilyTreeViz from '../../components/FamilyTreeViz'; 

// const { Title, Text } = Typography;
// const { Option } = Select;
// const API_URL = 'http://localhost:5000/api/family';

// const FamilyGraphPage = () => {
//   // --- STATE ---
//   const [stats, setStats] = useState(null);
//   const [households, setHouseholds] = useState([]);
//   const [citizens, setCitizens] = useState([]); 
//   const [peopleOptions, setPeopleOptions] = useState([]); 
  
//   const [treeData, setTreeData] = useState({ nodes: [], links: [] });
//   const [globalData, setGlobalData] = useState({ nodes: [], links: [] });
  
//   // UI State
//   const [loadingHH, setLoadingHH] = useState(false);
//   const [loadingCitizens, setLoadingCitizens] = useState(false);
//   const [loadingTree, setLoadingTree] = useState(false);
//   const [loadingGlobal, setLoadingGlobal] = useState(false);
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [selectedRootId, setSelectedRootId] = useState(null);
//   const [selectedRootName, setSelectedRootName] = useState('');

//   // Modals
//   const [memberDetail, setMemberDetail] = useState(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [relModalVisible, setRelModalVisible] = useState(false);
//   const [hhModalVisible, setHhModalVisible] = useState(false);
//   const [citizenModalVisible, setCitizenModalVisible] = useState(false);
//   const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  
//   // Modal Link Interaction (Edit Relationship)
//   const [linkActionModalVisible, setLinkActionModalVisible] = useState(false);
//   const [selectedLink, setSelectedLink] = useState(null);

//   const [selectedHouseholdId, setSelectedHouseholdId] = useState(null);
//   const [isEditing, setIsEditing] = useState(false);

//   const [formRel] = Form.useForm();
//   const [formHh] = Form.useForm();
//   const [formMember] = Form.useForm();
//   const [formCitizen] = Form.useForm();
//   const [formLinkEdit] = Form.useForm();

//   useEffect(() => { fetchData(); }, []);

//   const fetchData = () => { fetchStats(); fetchHouseholds(); fetchCitizensForGenealogy(); fetchPeopleOptions(); };

//   // API CALLS
//   const fetchStats = async () => { try { const res = await axios.get(`${API_URL}/stats`); setStats(res.data); } catch (err) {} };
//   const fetchHouseholds = async () => { setLoadingHH(true); try { const res = await axios.get(`${API_URL}/households`); if(res.data.success) setHouseholds(res.data.data); } catch(err){} finally{setLoadingHH(false);} };
//   const fetchCitizensForGenealogy = async () => { setLoadingCitizens(true); try { const res = await axios.get(`${API_URL}/genealogy-all`); if(res.data.success) setCitizens(res.data.data); } catch(err){} finally{setLoadingCitizens(false);} };
//   const fetchPeopleOptions = async () => { try { const res = await axios.get(`${API_URL}/dropdown-list`); if(res.data.success) setPeopleOptions(res.data.data); } catch(err){} };
//   const fetchGlobalGraph = async () => { if (globalData.nodes.length > 0) return; setLoadingGlobal(true); try { const res = await axios.get(`${API_URL}/global-graph`); if(res.data.success) setGlobalData(res.data.data); } catch(err){} finally{setLoadingGlobal(false);} };

//   // VIEW HELPERS
//   const viewMemberDetail = async (cccd) => { try { const res = await axios.get(`${API_URL}/member-detail`, { params: { cccd } }); if (res.data.success) { setMemberDetail(res.data.data); setModalVisible(true); } } catch (err) {} };
//   const viewFullTree = async (cccd, name) => {
//       setSelectedRootId(cccd); setSelectedRootName(name); setLoadingTree(true); setTreeData({ nodes: [], links: [] }); 
//       try { const res = await axios.get(`${API_URL}/full-tree`, { params: { cccd } }); const data = res.data.data; if(res.data.success && data) { if (data.links.length === 0 && data.nodes.length <= 1) { Modal.confirm({ title: 'Chưa có dữ liệu phả hệ', content: `Thêm quan hệ mới cho ${name}?`, onOk: () => { formRel.resetFields(); formRel.setFieldsValue({ sourceId: cccd }); setRelModalVisible(true); } }); } else { setTreeData(data); setDrawerVisible(true); } } } catch (err) {} finally { setLoadingTree(false); }
//   };

//   // INTERACTION HANDLERS (GRAPH)
//   const handleNodeClick = (node) => { if(node.id) viewMemberDetail(node.id); };
  
//   const handleLinkClick = (link) => { 
//       setSelectedLink(link); 
//       // Fill data vào form edit
//       formLinkEdit.setFieldsValue({ 
//           type: link.label, // Hiển thị tên tiếng Việt (read-only)
//           // Nếu backend trả về properties trong link, ta map vào đây.
//           // Mặc định Neo4j driver trả về properties trong object link
//           createdDate: link.properties?.createdDate || '', 
//           note: link.properties?.note || ''
//       }); 
//       setLinkActionModalVisible(true); 
//   };

//   // CRUD ACTIONS
//   const handleCreateRelationship = async () => { try { const v = await formRel.validateFields(); await axios.post(`${API_URL}/relationship`, { sourceId: v.sourceId, targetId: v.targetId, type: v.type, properties: { createdDate: new Date().toISOString().split('T')[0] } }); notification.success({ message: 'Thành công' }); setRelModalVisible(false); fetchData(); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){ notification.error({ message: 'Lỗi' }); } };
  
//   // --- SỬA QUAN HỆ (UPDATE) ---
//   const handleUpdateLink = async () => { 
//       try { 
//           const values = await formLinkEdit.validateFields();
//           // Chỉ gửi các properties cần update
//           await axios.put(`${API_URL}/relationship/${selectedLink.id}`, { 
//               createdDate: values.createdDate,
//               note: values.note
//           }); 
//           notification.success({ message: 'Cập nhật thông tin quan hệ thành công' }); 
//           setLinkActionModalVisible(false); 
//           if(selectedRootId) viewFullTree(selectedRootId, selectedRootName);
//       } catch(err) { notification.error({ message: 'Lỗi cập nhật' }); } 
//   };
  
//   const handleDeleteLink = async () => { try { await axios.delete(`${API_URL}/relationship/${selectedLink.id}`); notification.success({ message: 'Đã xóa quan hệ' }); setLinkActionModalVisible(false); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err) { notification.error({ message: 'Lỗi xóa' }); } };

//   // Other CRUDs
//   const handleSaveHousehold = async () => { try { const v = await formHh.validateFields(); const p = { householdId: isEditing?selectedHouseholdId:(v.householdId||`HK${Math.floor(Math.random()*10000)}`), registrationNumber: v.registrationNumber, headCccd: v.headCccd, address: v.address, residencyType: v.residencyType }; if(isEditing) await axios.put(`${API_URL}/household/${selectedHouseholdId}`, p); else await axios.post(`${API_URL}/household`, p); notification.success({ message: 'Xong' }); setHhModalVisible(false); fetchHouseholds(); } catch(err){} };
//   const handleDeleteHousehold = async (hid) => { try{ await axios.delete(`${API_URL}/household/${hid}`); fetchHouseholds(); }catch(e){} };
//   const handleUpdateCitizen = async () => { try{ const v = await formCitizen.validateFields(); await axios.put(`${API_URL}/citizen/${selectedRootId}`, v); setCitizenModalVisible(false); fetchCitizensForGenealogy(); }catch(e){} };
//   const handleAddMemberToHousehold = async () => { try{ const v=await formMember.validateFields(); await axios.post(`${API_URL}/household/member`,{ householdId: selectedHouseholdId, personCccd: v.personCccd, relationToHead: v.relationToHead, role: v.role||'Thành viên', fromDate: new Date().toISOString().split('T')[0] }); setAddMemberModalVisible(false); fetchHouseholds(); }catch(e){} };
//   const handleRemoveMember = async (hid, cccd) => { try{ await axios.delete(`${API_URL}/household/member`,{params:{householdId:hid, cccd}}); fetchHouseholds(); }catch(e){} };
//   const handleDeleteRelationshipFromList = async (r) => { try { const sId = typeof r.source==='object'?r.source.id:r.source; const tId = typeof r.target==='object'?r.target.id:r.target; await axios.delete(`${API_URL}/relationship`, { params: { sourceId: sId, targetId: tId, type: r.type } }); notification.success({ message: 'Đã xóa' }); if(selectedRootId) viewFullTree(selectedRootId, selectedRootName); } catch(err){ notification.error({ message: 'Lỗi xóa' }); } };

//   // RENDER
//   return (
//     <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
//           <Title level={2} style={{margin: 0, color: '#001529'}}>Quản lý Dân Cư & Phả Hệ</Title>
//           <Button icon={<RedoOutlined />} onClick={fetchData}>Làm mới dữ liệu</Button>
//       </div>
//       <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
//         <Tabs defaultActiveKey="1" items={[
//             { key: '1', label: <span><HomeOutlined /> Hộ Khẩu</span>, children: 
//                 <div>
//                     {stats && <Row gutter={16} style={{marginBottom:24}}><Col span={6}><Card bordered={false}><Statistic title="Tổng Công Dân" value={stats.totalCitizens} prefix={<TeamOutlined/>} valueStyle={{color:'#3f8600'}}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Đã Kết Hôn" value={stats.marriedCount} prefix={<HeartOutlined/>} valueStyle={{color:'#cf1322'}}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Mối quan hệ" value={stats.totalRelationships} prefix={<PartitionOutlined/>}/></Card></Col><Col span={6}><Card bordered={false}><Statistic title="Số con TB" value={stats.avgChildrenPerFamily} precision={1}/></Card></Col></Row>}
//                     <div style={{display:'flex', justifyContent:'space-between', marginBottom:16}}><Title level={4} style={{margin:0}}><HomeOutlined/> Quản lý Hộ Gia Đình</Title><Button type="primary" icon={<PlusOutlined/>} onClick={()=>{setIsEditing(false);formHh.resetFields();setHhModalVisible(true)}}>Thêm Hộ Mới</Button></div>
//                     <List grid={{gutter:16, column:3}} dataSource={households} loading={loadingHH} renderItem={item=><List.Item><Card title={<span>{item.address} <small>({item.householdCode})</small></span>} extra={<Space><Button type="text" icon={<EditOutlined/>} onClick={()=>{setIsEditing(true);setSelectedHouseholdId(item.householdCode);formHh.setFieldsValue({householdId:item.householdCode,...item});setHhModalVisible(true)}}/><Popconfirm title="Xóa?" onConfirm={()=>handleDeleteHousehold(item.householdCode)}><Button type="text" danger icon={<DeleteOutlined/>}/></Popconfirm></Space>} hoverable actions={[<Button type="link" size="small" icon={<PlusOutlined/>} onClick={()=>{setSelectedHouseholdId(item.householdCode);formMember.resetFields();setAddMemberModalVisible(true)}}>Thêm TV</Button>]}><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{item.members?.map((m,i)=><Tag key={i} color="geekblue" closable onClose={(e)=>{e.preventDefault();handleRemoveMember(item.householdCode,m.cccd)}}><span onClick={()=>viewMemberDetail(m.cccd)}>{m.name}</span></Tag>)}</div></Card></List.Item>}/>
//                 </div>
//             },
//             { key: '2', label: <span><PartitionOutlined /> Tra cứu Phả Hệ</span>, children: 
//                 <div>
//                     <div style={{marginBottom:16,display:'flex',justifyContent:'space-between'}}><Alert message="Danh sách toàn bộ công dân." type="info" showIcon style={{flex:1,marginRight:10}}/><Button type="primary" icon={<PlusOutlined/>} onClick={()=>{formRel.resetFields();setRelModalVisible(true)}}>Thêm Quan Hệ</Button></div>
//                     <Table dataSource={citizens} rowKey="cccd" loading={loadingCitizens} pagination={{pageSize:8}} columns={[{title:'Họ Tên',dataIndex:'hoTen',render:t=><b>{t}</b>},{title:'CCCD',dataIndex:'cccd'},{title:'Năm sinh',dataIndex:'ngaySinh'},{title:'Số con',dataIndex:'soConTrucTiep',align:'center',render:n=>n>0?<Tag color="purple">{n}</Tag>:'-'},{title:'Hành động',key:'act',align:'right',render:(_,r)=><Space><Button size="small" icon={<EditOutlined/>} onClick={()=>{setSelectedRootId(r.cccd);formCitizen.setFieldsValue(r);setCitizenModalVisible(true)}}/><Button type="primary" size="small" icon={<EyeOutlined/>} onClick={()=>viewFullTree(r.cccd, r.hoTen)}>Xem Sơ Đồ</Button></Space>}]}/>
//                 </div>
//             },
//             { key: '3', label: <span><GlobalOutlined /> Toàn cảnh</span>, children: <div style={{height: '75vh'}}><FamilyTreeViz graphData={globalData} loading={loadingGlobal} rootId={null} onNodeClick={handleNodeClick} onLinkClick={handleLinkClick} /></div> }
//         ]} size="large" onChange={(k)=>k==='3'&&fetchGlobalGraph()} />
//       </div>

//       {/* MODALS */}
//       <Modal title="Thông tin thành viên" open={modalVisible} onCancel={() => setModalVisible(false)} footer={null}>
//         {memberDetail && <Descriptions bordered column={1} size="small"><Descriptions.Item label="Họ tên">{memberDetail.member.hoTen}</Descriptions.Item><Descriptions.Item label="CCCD">{memberDetail.member.id}</Descriptions.Item><Descriptions.Item label="Quan hệ chủ hộ"><Tag color="geekblue">{memberDetail.relationToHead}</Tag></Descriptions.Item><Descriptions.Item label="Địa chỉ">{memberDetail.householdAddress}</Descriptions.Item></Descriptions>}
//       </Modal>

//       <Modal title={isEditing ? "Cập nhật Hộ Khẩu" : "Tạo Hộ Khẩu Mới"} open={hhModalVisible} onCancel={() => setHhModalVisible(false)} onOk={handleSaveHousehold}>
//         <Form form={formHh} layout="vertical">
//             {!isEditing && <Form.Item name="householdId" label="Mã Hộ Khẩu"><Input placeholder="Để trống tự sinh" /></Form.Item>}
//             <Form.Item name="registrationNumber" label="Số Đăng Ký"><Input /></Form.Item>
//             <Form.Item name="headCccd" label="Chủ Hộ"><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item>
//             <Form.Item name="address" label="Địa chỉ" rules={[{required:true}]}><Input /></Form.Item>
//             <Form.Item name="residencyType" label="Loại cư trú" initialValue="Thường trú"><Select><Option value="Thường trú">Thường trú</Option><Option value="Tạm trú">Tạm trú</Option></Select></Form.Item>
//         </Form>
//       </Modal>

//       <Modal title="Thêm Thành Viên Vào Hộ" open={addMemberModalVisible} onCancel={() => setAddMemberModalVisible(false)} onOk={handleAddMemberToHousehold}>
//         <Form form={formMember} layout="vertical">
//             <Form.Item name="personCccd" label="Chọn thành viên" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item>
//             <Row gutter={16}><Col span={12}><Form.Item name="relationToHead" label="Quan hệ chủ hộ" rules={[{required:true}]}><Select><Option value="Vợ">Vợ</Option><Option value="Con">Con</Option><Option value="Bố mẹ">Bố mẹ</Option></Select></Form.Item></Col><Col span={12}><Form.Item name="role" label="Vai trò" initialValue="Thành viên"><Select><Option value="Thành viên">Thành viên</Option><Option value="Chủ hộ">Chủ hộ</Option></Select></Form.Item></Col></Row>
//         </Form>
//       </Modal>

//       <Modal title="Cập Nhật Thông Tin Công Dân" open={citizenModalVisible} onCancel={() => setCitizenModalVisible(false)} onOk={handleUpdateCitizen}>
//         <Form form={formCitizen} layout="vertical">
//             <Form.Item name="hoTen" label="Họ tên" rules={[{required:true}]}><Input /></Form.Item>
//             <Row gutter={16}><Col span={12}><Form.Item name="ngaySinh" label="Ngày sinh"><Input /></Form.Item></Col><Col span={12}><Form.Item name="gioiTinh" label="Giới tính"><Select><Option value="Nam">Nam</Option><Option value="Nữ">Nữ</Option></Select></Form.Item></Col></Row>
//             <Form.Item name="queQuan" label="Quê quán"><Input /></Form.Item>
//             <Form.Item name="ngheNghiep" label="Nghề nghiệp"><Input /></Form.Item>
//         </Form>
//       </Modal>

//       <Modal title="Thêm Quan Hệ" open={relModalVisible} onCancel={() => setRelModalVisible(false)} onOk={handleCreateRelationship}>
//         <Form form={formRel} layout="vertical">
//             <Row gutter={16}><Col span={12}><Form.Item name="sourceId" label="Nguồn" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item></Col><Col span={12}><Form.Item name="targetId" label="Đích" rules={[{required:true}]}><Select showSearch optionFilterProp="children">{peopleOptions.map(p=><Option key={p.value} value={p.value}>{p.label}</Option>)}</Select></Form.Item></Col></Row>
//             <Form.Item name="type" label="Loại" rules={[{required:true}]}><Select><Option value="FATHER_OF">Cha</Option><Option value="MOTHER_OF">Mẹ</Option><Option value="MARRIED_TO">Vợ/Chồng</Option></Select></Form.Item>
//         </Form>
//       </Modal>

//       {/* MODAL QUẢN LÝ MỐI QUAN HỆ (KHI CLICK VÀO ĐƯỜNG NỐI) */}
//       <Modal 
//         title="Chi tiết Mối quan hệ" 
//         open={linkActionModalVisible} 
//         onCancel={() => setLinkActionModalVisible(false)}
//         footer={[
//             <Button key="delete" danger icon={<DeleteOutlined />} onClick={handleDeleteLink}>Xóa Quan Hệ</Button>,
//             <Button key="update" type="primary" onClick={handleUpdateLink}>Cập nhật thông tin</Button>
//         ]}
//       >
//         {selectedLink && (
//             <Form form={formLinkEdit} layout="vertical">
//                 <Alert 
//                     message={`Bạn đang chỉnh sửa quan hệ: ${selectedLink.label}`} 
//                     description="Loại quan hệ không thể thay đổi. Nếu sai loại, vui lòng xóa và tạo mới."
//                     type="info" 
//                     showIcon 
//                     style={{marginBottom: 16}} 
//                 />
//                 <Form.Item name="type" label="Loại quan hệ">
//                     <Input disabled />
//                 </Form.Item>
//                 <Form.Item name="createdDate" label="Ngày bắt đầu/Ghi nhận">
//                     <Input placeholder="YYYY-MM-DD" />
//                 </Form.Item>
//                 <Form.Item name="note" label="Ghi chú thêm">
//                     <Input.TextArea rows={3} placeholder="Ví dụ: Con nuôi, Kết hôn lần 2..." />
//                 </Form.Item>
//             </Form>
//         )}
//       </Modal>

//       <Drawer title={<div>Cây Phả Hệ: <span style={{color:'#1677ff'}}>{selectedRootName}</span></div>} placement="right" width="95%" onClose={() => setDrawerVisible(false)} open={drawerVisible} destroyOnClose bodyStyle={{padding:0,display:'flex',flexDirection:'column'}}>
//         <div style={{flex:3, borderBottom:'1px solid #f0f0f0'}}><FamilyTreeViz graphData={treeData} loading={loadingTree} rootId={selectedRootId} onNodeClick={handleNodeClick} onLinkClick={handleLinkClick} /></div>
//         <div style={{flex:2, padding:16, overflow:'auto', background:'#fafafa'}}>
//             <Title level={5}><PartitionOutlined /> Danh sách chi tiết quan hệ</Title>
//             <Table dataSource={treeData.links} rowKey="id" size="small" pagination={false} columns={[
//                 { title: 'Nguồn', dataIndex: 'source', render: s => typeof s==='object'?<b>{s.hoTen}</b>:s },
//                 { title: 'Quan hệ', dataIndex: 'label', render: l => <Tag color="orange">{l}</Tag> },
//                 { title: 'Đích', dataIndex: 'target', render: t => typeof t==='object'?<b>{t.hoTen}</b>:t },
//                 { title: 'Xóa', align: 'right', render: (_, r) => <Popconfirm title="Xóa?" onConfirm={() => handleDeleteRelationshipFromList(r)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm> }
//             ]}/>
//         </div>
//       </Drawer>
//     </div>
//   );
// };

// export default FamilyGraphPage;



// import React, { useState, useEffect } from 'react';
// import { 
//     Tabs, Card, List, Button, Tag, Typography, 
//     Drawer, Badge, Alert, Table, notification, Statistic, Row, Col 
// } from 'antd';
// import { 
//     PartitionOutlined, HomeOutlined, EyeOutlined, RedoOutlined, 
//     TeamOutlined, HeartOutlined, GlobalOutlined 
// } from '@ant-design/icons';
// import axios from 'axios';
// import FamilyTreeViz from '../../components/FamilyTreeViz'; 

// const { Title } = Typography;

// // PORT 5000 là port bạn đã ép trong Program.cs
// const API_URL = 'http://localhost:5000/api/family';

// const FamilyGraphPage = () => {
//   // --- STATE ---
//   const [stats, setStats] = useState(null);
//   const [households, setHouseholds] = useState([]);
//   const [roots, setRoots] = useState([]);
//   const [treeData, setTreeData] = useState({ nodes: [], links: [] });
//   const [globalData, setGlobalData] = useState({ nodes: [], links: [] });
  
//   const [loadingHH, setLoadingHH] = useState(false);
//   const [loadingRoots, setLoadingRoots] = useState(false);
//   const [loadingTree, setLoadingTree] = useState(false);
//   const [loadingGlobal, setLoadingGlobal] = useState(false);
  
//   const [drawerVisible, setDrawerVisible] = useState(false);
//   const [selectedRootId, setSelectedRootId] = useState(null);

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const fetchData = () => {
//     fetchStats();
//     fetchHouseholds();
//     fetchClanRoots();
//   };

//   // 1. Fetch Stats (Dashboard)
//   const fetchStats = async () => {
//     try {
//         const res = await axios.get(`${API_URL}/stats`);
//         setStats(res.data);
//     } catch (err) { console.error(err); }
//   };

//   // 2. Fetch Households
//   const fetchHouseholds = async () => {
//     setLoadingHH(true);
//     try {
//       const res = await axios.get(`${API_URL}/households`);
//       if (res.data && res.data.success) {
//         setHouseholds(res.data.data);
//       }
//     } catch (err) {
//       console.error(err);
//       notification.error({ message: 'Lỗi kết nối Backend', description: 'Đảm bảo Backend chạy Port 5000' });
//     } finally {
//       setLoadingHH(false);
//     }
//   };

//   // 3. Fetch Roots
//   const fetchClanRoots = async () => {
//     setLoadingRoots(true);
//     try {
//       const res = await axios.get(`${API_URL}/genealogy-roots`);
//       if (res.data && res.data.success) {
//         setRoots(res.data.data);
//       }
//     } catch (err) { console.error(err); } 
//     finally { setLoadingRoots(false); }
//   };

//   // 4. Xem chi tiết cây phả hệ 1 người
//   const viewFullTree = async (cccd) => {
//       setSelectedRootId(cccd);
//       setDrawerVisible(true);
//       setLoadingTree(true);
//       setTreeData({ nodes: [], links: [] }); 

//       try {
//           const res = await axios.get(`${API_URL}/full-tree`, { params: { cccd } });
//           if(res.data && res.data.success) {
//               setTreeData(res.data.data);
//           } else {
//               notification.warning({ message: 'Chưa có dữ liệu phả hệ cho người này' });
//           }
//       } catch (err) {
//           notification.error({ message: 'Lỗi tải cây phả hệ' });
//       } finally {
//           setLoadingTree(false);
//       }
//   };

//   // 5. Fetch Global Graph (Toàn cảnh)
//   const fetchGlobalGraph = async () => {
//       if (globalData.nodes.length > 0) return; // Đã tải rồi thì thôi
//       setLoadingGlobal(true);
//       try {
//           const res = await axios.get(`${API_URL}/global-graph`);
//           if(res.data && res.data.success) {
//               setGlobalData(res.data.data);
//           }
//       } catch(err) {
//           notification.error({ message: 'Dữ liệu quá lớn hoặc lỗi kết nối' });
//       } finally {
//           setLoadingGlobal(false);
//       }
//   };

//   // --- RENDER CONTENT ---
  
//   // Tab 1: Dashboard & Hộ gia đình
//   const renderDashboardTab = () => (
//       <div>
//           {/* Dashboard Cards */}
//           {stats && (
//             <Row gutter={16} style={{ marginBottom: 24 }}>
//                 <Col span={6}>
//                     <Card bordered={false}>
//                         <Statistic title="Tổng Công Dân" value={stats.totalCitizens} prefix={<TeamOutlined />} valueStyle={{ color: '#3f8600' }} />
//                     </Card>
//                 </Col>
//                 <Col span={6}>
//                     <Card bordered={false}>
//                         <Statistic title="Đã Kết Hôn" value={stats.marriedCount} prefix={<HeartOutlined />} valueStyle={{ color: '#cf1322' }} />
//                     </Card>
//                 </Col>
//                 <Col span={6}>
//                     <Card bordered={false}>
//                         <Statistic title="Mối quan hệ" value={stats.totalRelationships} prefix={<PartitionOutlined />} />
//                     </Card>
//                 </Col>
//                 <Col span={6}>
//                     <Card bordered={false}>
//                         <Statistic title="Số con TB/Gia đình" value={stats.avgChildrenPerFamily} precision={1} />
//                     </Card>
//                 </Col>
//             </Row>
//           )}

//           <Title level={4}><HomeOutlined /> Danh sách Hộ Gia Đình Tiêu Biểu</Title>
//           <List
//               grid={{ gutter: 16, column: 3, xs: 1, sm: 2, md: 3 }}
//               dataSource={households}
//               loading={loadingHH}
//               renderItem={item => (
//                   <List.Item>
//                       <Card 
//                           title={item.address} 
//                           extra={<Badge count={item.count} color="cyan" />}
//                           size="small"
//                           hoverable
//                       >
//                           <div style={{marginBottom: 8, fontSize: 12, color: '#666'}}>Thành viên:</div>
//                           <div style={{display: 'flex', flexWrap: 'wrap', gap: 4}}>
//                               {item.previewNames && item.previewNames.map((n, i) => (
//                                   <Tag key={i} color="geekblue">{n}</Tag>
//                               ))}
//                           </div>
//                       </Card>
//                   </List.Item>
//               )}
//           />
//       </div>
//   );

//   const tabItems = [
//     {
//       key: '1',
//       label: <span><HomeOutlined /> Dashboard & Hộ Gia Đình</span>,
//       children: renderDashboardTab()
//     },
//     {
//       key: '2',
//       label: <span><PartitionOutlined /> Tra cứu Phả Hệ</span>,
//       children: (
//         <div>
//             <Alert message="Chọn một người đại diện để xem sơ đồ quan hệ của họ và gia đình." type="info" showIcon style={{marginBottom: 16}} />
//             <Table 
//                 dataSource={roots} 
//                 rowKey="cccd"
//                 loading={loadingRoots}
//                 columns={[
//                     { title: 'Họ và Tên', dataIndex: 'hoTen', key: 'hoTen', render: t => <b style={{color:'#1677ff'}}>{t}</b> },
//                     { title: 'CCCD', dataIndex: 'cccd', key: 'cccd' },
//                     { title: 'Năm sinh', dataIndex: 'ngaySinh', key: 'ngaySinh' },
//                     { 
//                         title: 'Số con trực tiếp', 
//                         dataIndex: 'soConTrucTiep', 
//                         align: 'center', 
//                         render: n => <Tag color="purple">{n}</Tag> 
//                     },
//                     { 
//                         title: 'Hành động', key: 'act', align: 'right',
//                         render: (_, r) => (
//                             <Button type="primary" size="small" icon={<EyeOutlined />} onClick={() => viewFullTree(r.cccd)}>
//                                 Xem Sơ Đồ
//                             </Button> 
//                         )
//                     }
//                 ]}
//             />
            
//             <Drawer
//                 title={`Cây Phả Hệ Chi Tiết (Gốc: ${selectedRootId})`}
//                 placement="right"
//                 width="95%"
//                 onClose={() => setDrawerVisible(false)}
//                 open={drawerVisible}
//                 styles={{ body: { padding: 0 } }}
//                 destroyOnClose
//             >
//                 <FamilyTreeViz 
//                     graphData={treeData} 
//                     loading={loadingTree} 
//                     rootId={selectedRootId}
//                 />
//             </Drawer>
//         </div>
//       )
//     },
//     {
//         key: '3',
//         label: <span onClick={fetchGlobalGraph}><GlobalOutlined /> Toàn cảnh Dòng họ (Beta)</span>,
//         children: (
//             <div style={{height: '75vh'}}>
//                 <Alert message="Chế độ hiển thị toàn bộ mạng lưới công dân trong cơ sở dữ liệu." type="warning" banner closable />
//                 <FamilyTreeViz 
//                     graphData={globalData} 
//                     loading={loadingGlobal}
//                     rootId={null}
//                 />
//             </div>
//         )
//     }
//   ];

//   return (
//     <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
//           <Title level={2} style={{margin: 0, color: '#001529'}}>Hệ thống Quản lý Phả Hệ & Dân Cư</Title>
//           <Button icon={<RedoOutlined />} onClick={fetchData}>Làm mới dữ liệu</Button>
//       </div>
      
//       <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
//         <Tabs defaultActiveKey="1" items={tabItems} size="large" onChange={(key) => key === '3' && fetchGlobalGraph()} />
//       </div>
//     </div>
//   );
// };

// export default FamilyGraphPage;

// import React, { useState, useEffect } from 'react';
// import { 
//     Tabs, Card, Table, List, Button, Tag, 
//     Modal, Typography, Space, Drawer, Badge, Alert 
// } from 'antd';
// import { PartitionOutlined, HomeOutlined, EyeOutlined } from '@ant-design/icons';
// import axios from 'axios';
// import FamilyTreeViz from '../../components/FamilyTreeViz'; // Đảm bảo đường dẫn đúng

// const { Title, Text } = Typography;
// // Tự động nhận diện localhost nếu không có env
// const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';

// const FamilyGraphPage = () => {
//   // State Hộ Gia Đình
//   const [households, setHouseholds] = useState([]);
//   const [loadingHH, setLoadingHH] = useState(false);
//   const [viewHouseholdVisible, setViewHouseholdVisible] = useState(false);

//   // State Phả Hệ
//   const [roots, setRoots] = useState([]);
//   const [loadingRoots, setLoadingRoots] = useState(false);
//   const [treeData, setTreeData] = useState(null);
//   const [selectedRootId, setSelectedRootId] = useState(null);
//   const [loadingTree, setLoadingTree] = useState(false);
//   const [drawerVisible, setDrawerVisible] = useState(false);

//   useEffect(() => {
//     fetchHouseholds();
//     fetchClanRoots();
//   }, []);

//   const fetchHouseholds = async () => {
//     setLoadingHH(true);
//     try {
//       const res = await axios.get(`${API_URL}/family/households`);
//       // Backend trả về trực tiếp List hoặc object { data: List } tùy convention, xử lý cả 2:
//       const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
//       setHouseholds(data);
//     } catch (err) { console.error(err); setHouseholds([]); } 
//     finally { setLoadingHH(false); }
//   };

//   const fetchClanRoots = async () => {
//     setLoadingRoots(true);
//     try {
//       const res = await axios.get(`${API_URL}/family/genealogy-roots`);
//       const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
//       setRoots(data);
//     } catch (err) { console.error(err); setRoots([]); }
//     finally { setLoadingRoots(false); }
//   };

//   const viewNuclearFamily = (headCccd) => {
//       alert("Tính năng đang phát triển: Xem chi tiết hộ gia đình " + (headCccd || ""));
//   };

//   const viewFullTree = async (rootCccd) => {
//       if (!rootCccd) return;
//       setSelectedRootId(rootCccd);
//       setTreeData(null); 
//       setDrawerVisible(true);
//       setLoadingTree(true);
//       try {
//           const res = await axios.get(`${API_URL}/family/full-tree`, { params: { cccd: rootCccd } });
//           setTreeData(res.data); // Backend trả về { nodes: [], links: [] }
//       } catch (err) { console.error(err); } 
//       finally { setLoadingTree(false); }
//   };

//   // Tab Items Configuration
//   const tabItems = [
//     {
//       key: '1',
//       label: <span><HomeOutlined /> Quản lý Hộ Gia Đình</span>,
//       children: (
//         <div>
//             <List
//                 grid={{ gutter: 16, column: 3, xs: 1, sm: 2, md: 3 }}
//                 dataSource={households}
//                 loading={loadingHH}
//                 renderItem={item => (
//                     <List.Item>
//                         <Card 
//                             title={item.Address} 
//                             extra={<Badge count={item.Count} style={{ backgroundColor: '#52c41a' }} />}
//                             actions={[<Button type="link" onClick={() => viewNuclearFamily(item.AddressId)}>Xem chi tiết</Button>]}
//                             hoverable
//                         >
//                             <div style={{minHeight: 60}}>
//                                 <Space wrap>
//                                     {item.PreviewNames.map((n, i) => (
//                                         <Tag key={i} color="blue">{n}</Tag>
//                                     ))}
//                                     {item.Count > 3 && <Tag>+{item.Count - 3}</Tag>}
//                                 </Space>
//                             </div>
//                         </Card>
//                     </List.Item>
//                 )}
//             />
//         </div>
//       )
//     },
//     {
//       key: '2',
//       label: <span><PartitionOutlined /> Phả Hệ & Dòng Họ</span>,
//       children: (
//         <div>
//             {roots.length === 0 && !loadingRoots && <Alert message="Không tìm thấy dữ liệu dòng họ lớn" type="info" showIcon />}
//             <Table 
//                 dataSource={roots} 
//                 rowKey="Cccd"
//                 loading={loadingRoots}
//                 columns={[
//                     { title: 'Cụ Tổ (Người đứng đầu nhánh)', dataIndex: 'HoTen', key: 'HoTen', render: t => <Text strong style={{color: '#1677ff'}}>{t}</Text> },
//                     { title: 'Năm sinh', dataIndex: 'NgaySinh', key: 'NgaySinh' },
//                     { title: 'Số con trực tiếp', dataIndex: 'SoConTrucTiep', align: 'center', render: n => <Tag color="purple">{n} người</Tag> },
//                     { 
//                         title: 'Hành động', key: 'act', align: 'right',
//                         render: (_, r) => <Button type="primary" icon={<EyeOutlined />} onClick={() => viewFullTree(r.Cccd)}>Xem Cây Phả Hệ</Button> 
//                     }
//                 ]}
//             />
//             <Drawer
//                 title={`Sơ đồ Phả hệ: ${selectedRootId}`}
//                 placement="right"
//                 width="90%"
//                 onClose={() => setDrawerVisible(false)}
//                 open={drawerVisible}
//                 styles={{ body: { padding: 0, height: 'calc(100vh - 55px)', overflow: 'hidden' } }}
//             >
//                 <FamilyTreeViz 
//                     graphData={treeData} 
//                     loading={loadingTree} 
//                     rootId={selectedRootId}
//                 />
//             </Drawer>
//         </div>
//       )
//     }
//   ];

//   return (
//     <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
//       <Title level={2} style={{ marginBottom: 24 }}>Quản lý Dân cư & Phả hệ</Title>
//       <Card>
//         <Tabs defaultActiveKey="1" items={tabItems} size="large" />
//       </Card>
//     </div>
//   );
// };

// export default FamilyGraphPage;