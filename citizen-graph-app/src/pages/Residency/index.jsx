import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Tag,
  Button,
  Modal,
  Table,
  Form,
  Select,
  Input,
  message,
  Space,
  Spin,
  Empty,
  Statistic,
  Row,
  Col,
  DatePicker
} from 'antd';
import {
  UserOutlined,
  HomeOutlined,
  TeamOutlined,
  EyeOutlined,
  SwapOutlined,
  LoadingOutlined,
  UserAddOutlined,
  UsergroupAddOutlined,
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import residencyService from '../../services/residencyService';

const { TextArea } = Input;
const { Option } = Select;

const ResidencyPage = () => {
  // State cho danh sách hộ khẩu
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(false);

  // State cho modal xem chi tiết
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // State cho modal tách khẩu
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [movingMember, setMovingMember] = useState(null);
  const [form] = Form.useForm();

  // State cho modal tạo hộ khẩu mới
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm();

  // State cho modal nhập khẩu (thêm thành viên)
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [addMemberForm] = Form.useForm();
  const [addingMember, setAddingMember] = useState(false);

  // State cho modal chuyển khẩu sang hộ khác
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferForm] = Form.useForm();
  const [transferring, setTransferring] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);

  // State cho modal tách khẩu + lập hộ mới
  const [splitNewModalVisible, setSplitNewModalVisible] = useState(false);
  const [splitNewForm] = Form.useForm();
  const [splittingNew, setSplittingNew] = useState(false);

  // State cho modal xóa khẩu
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [removeForm] = Form.useForm();
  const [removing, setRemoving] = useState(false);

  // Lấy danh sách hộ khẩu khi component mount
  useEffect(() => {
    fetchHouseholds();
  }, []);

  /**
   * Lấy danh sách tất cả hộ khẩu
   */
  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      const data = await residencyService.getAllHouseholds();
      console.log('🏠 [Frontend] Raw API response:', data);
      console.log('🏠 [Frontend] First household:', data[0]);
      console.log('🏠 [Frontend] SoLuongThanhVien values:', data.map(h => ({ 
        hoKhau: h.soHoKhau, 
        count: h.soLuongThanhVien, 
        type: typeof h.soLuongThanhVien 
      })));
      const total = data.reduce((sum, h) => sum + h.soLuongThanhVien, 0);
      console.log('🏠 [Frontend] Calculated total:', total);
      setHouseholds(data);
    } catch (error) {
      message.error('Không thể lấy danh sách hộ khẩu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xem chi tiết hộ khẩu
   */
  const handleViewDetail = async (household) => {
    try {
      setSelectedHousehold(household);
      setDetailModalVisible(true);
      setLoadingMembers(true);
      
      const data = await residencyService.getMembersByHousehold(household.soHoKhau);
      setMembers(data);
    } catch (error) {
      message.error('Không thể lấy danh sách thành viên');
      console.error(error);
    } finally {
      setLoadingMembers(false);
    }
  };

  /**
   * Mở modal tách khẩu
   */
  const handleOpenMoveModal = async (household) => {
    try {
      setSelectedHousehold(household);
      setLoadingMembers(true);
      
      // Lấy danh sách thành viên để chọn người tách
      const data = await residencyService.getMembersByHousehold(household.soHoKhau);
      setMembers(data);
      setMoveModalVisible(true);
    } catch (error) {
      message.error('Không thể lấy danh sách thành viên');
      console.error(error);
    } finally {
      setLoadingMembers(false);
    }
  };

  /**
   * Xử lý chuyển khẩu
   */
  const handleMove = async (values) => {
    try {
      setMovingMember(values.cccd);
      
      const moveData = {
        cccd: values.cccd,
        targetHouseholdId: values.targetHouseholdId,
        reason: values.reason,
        loaiCuTru: values.loaiCuTru || 'Thường trú'
      };

      await residencyService.moveMember(moveData);
      
      message.success('Chuyển khẩu thành công!');
      setMoveModalVisible(false);
      form.resetFields();
      
      // Refresh danh sách
      fetchHouseholds();
    } catch (error) {
      message.error(error.response?.data?.message || 'Chuyển khẩu thất bại');
      console.error(error);
    } finally {
      setMovingMember(null);
    }
  };

  /**
   * Đóng modal chi tiết
   */
  const handleCloseDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedHousehold(null);
    setMembers([]);
  };

  /**
   * Đóng modal tách khẩu
   */
  const handleCloseMoveModal = () => {
    setMoveModalVisible(false);
    setSelectedHousehold(null);
    setMembers([]);
    form.resetFields();
  };

  /**
   * Mở modal tạo hộ khẩu mới
   */
  const handleOpenCreateModal = () => {
    setCreateModalVisible(true);
  };

  /**
   * Xử lý tạo hộ khẩu mới
   */
  const handleCreateHousehold = async (values) => {
    try {
      setCreating(true);

      await residencyService.createHousehold(values);

      message.success('Tạo hộ khẩu thành công!');
      setCreateModalVisible(false);
      createForm.resetFields();

      // Refresh danh sách
      fetchHouseholds();
    } catch (error) {
      message.error(error.response?.data?.message || 'Tạo hộ khẩu thất bại');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  /**
   * Đóng modal tạo hộ khẩu
   */
  const handleCloseCreateModal = () => {
    setCreateModalVisible(false);
    createForm.resetFields();
  };

  /**
   * Mở modal nhập khẩu (thêm thành viên)
   */
  const handleOpenAddMemberModal = async (household) => {
    setSelectedHousehold(household);
    setAddMemberModalVisible(true);
  };

  /**
   * Xử lý nhập khẩu
   */
  const handleAddMember = async (values) => {
    try {
      setAddingMember(true);
      
      // Gọi API nhập khẩu
      await residencyService.addMember({
        cccd: values.cccd,
        householdId: selectedHousehold.soHoKhau,
        quanHe: values.quanHe,
        loaiCuTru: values.loaiCuTru,
        tuNgay: values.tuNgay.toDate(),
        lyDo: values.lyDo
      });
      
      message.success('Nhập khẩu thành công!');
      setAddMemberModalVisible(false);
      addMemberForm.resetFields();
      fetchHouseholds();
    } catch (error) {
      message.error(error.response?.data?.message || 'Nhập khẩu thất bại');
    } finally {
      setAddingMember(false);
    }
  };

  /**
   * Mở modal chuyển khẩu sang hộ khác
   */
  const handleOpenTransferModal = async (household) => {
    try {
      setSelectedHousehold(household);
      setLoadingMembers(true);
      const data = await residencyService.getMembersByHousehold(household.soHoKhau);
      setMembers(data);
      setSelectedMembers([]);
      setTransferModalVisible(true);
    } catch (error) {
      message.error('Không thể lấy danh sách thành viên');
    } finally {
      setLoadingMembers(false);
    }
  };

  /**
   * Xử lý chuyển khẩu sang hộ khác
   */
  const handleTransferMembers = async (values) => {
    try {
      setTransferring(true);
      
        // send keys matching backend DTO: CCCDs and TargetHouseholdId
        await residencyService.moveMember({
          CCCDs: selectedMembers,
          TargetHouseholdId: values.toHouseholdId,
          Reason: values.reason,
          LoaiCuTru: values.loaiCuTru || 'Thường trú'
        });
      
      message.success('Chuyển khẩu thành công!');
      setTransferModalVisible(false);
      transferForm.resetFields();
      setSelectedMembers([]);
      fetchHouseholds();
    } catch (error) {
      message.error(error.response?.data?.message || 'Chuyển khẩu thất bại');
      console.error('Lỗi chuyển khẩu:', error);
    } finally {
      setTransferring(false);
    }
  };

  /**
   * Mở modal tách khẩu + lập hộ mới
   */
  const handleOpenSplitNewModal = async (household) => {
    try {
      setSelectedHousehold(household);
      setLoadingMembers(true);
      const data = await residencyService.getMembersByHousehold(household.soHoKhau);
      setMembers(data);
      setSelectedMembers([]);
      setSplitNewModalVisible(true);
    } catch (error) {
      message.error('Không thể lấy danh sách thành viên');
    } finally {
      setLoadingMembers(false);
    }
  };

  /**
   * Xử lý tách khẩu + lập hộ mới
   */
  const handleSplitNewHousehold = async (values) => {
    try {
      setSplittingNew(true);
      
      await residencyService.splitNewHousehold({
        sourceHouseholdId: selectedHousehold.soHoKhau,
        memberCCCDs: selectedMembers,
        newHouseholdId: values.newHouseholdId,
        newRegistrationNum: values.newRegistrationNum,
        newAddress: values.newAddress,
        residencyType: values.residencyType,
        lyDo: values.lyDo
      });
      
      message.success('Tách khẩu và tạo hộ mới thành công!');
      setSplitNewModalVisible(false);
      splitNewForm.resetFields();
      setSelectedMembers([]);
      fetchHouseholds();
    } catch (error) {
      message.error(error.response?.data?.message || 'Tách khẩu thất bại');
    } finally {
      setSplittingNew(false);
    }
  };

  /**
   * Mở modal xóa khẩu (khai tử/định cư nước ngoài)
   */
  const handleOpenRemoveModal = async (household) => {
    try {
      setSelectedHousehold(household);
      setLoadingMembers(true);
      const data = await residencyService.getMembersByHousehold(household.soHoKhau);
      setMembers(data);
      setRemoveModalVisible(true);
    } catch (error) {
      message.error('Không thể lấy danh sách thành viên');
    } finally {
      setLoadingMembers(false);
    }
  };

  /**
   * Xử lý xóa khẩu
   */
  const handleRemoveMember = async (values) => {
    try {
      setRemoving(true);
      
      console.log('Xóa khẩu - Values:', values);
      console.log('Selected Household:', selectedHousehold);
      
      const requestData = {
        cccd: values.cccd,
        householdId: selectedHousehold.soHoKhau, // soHoKhau chính là householdId trong DB
        lyDo: values.lyDo,
        ngayXoa: values.ngayXoa.toDate(),
        loaiXoa: values.loaiXoa
      };
      
      console.log('Request data:', requestData);
      
      await residencyService.removeMember(requestData);
      
      message.success('Xóa khẩu thành công!');
      setRemoveModalVisible(false);
      removeForm.resetFields();
      
      // Refresh cả danh sách hộ khẩu và danh sách thành viên trong modal chi tiết
      await fetchHouseholds();
      if (selectedHousehold) {
        const updatedMembers = await residencyService.getMembersByHousehold(selectedHousehold.soHoKhau);
        setMembers(updatedMembers);
      }
    } catch (error) {
      console.error('Lỗi xóa khẩu:', error);
      message.error(error.response?.data?.message || error.message || 'Xóa khẩu thất bại');
    } finally {
      setRemoving(false);
    }
  };

  // Columns cho bảng thành viên
  const memberColumns = [
    {
      title: 'Họ tên',
      dataIndex: 'hoTen',
      key: 'hoTen',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'CCCD',
      dataIndex: 'cccd',
      key: 'cccd'
    },
    {
      title: 'Ngày sinh',
      dataIndex: 'ngaySinh',
      key: 'ngaySinh',
      render: (date) => date ? new Date(date).toLocaleDateString('vi-VN') : '-'
    },
    {
      title: 'Quan hệ',
      dataIndex: 'quanHe',
      key: 'quanHe',
      render: (text) => (
        <Tag color={text === 'Chủ hộ' ? 'blue' : 'default'}>
          {text}
        </Tag>
      )
    },
    {
      title: 'Loại cư trú',
      dataIndex: 'loaiCuTru',
      key: 'loaiCuTru',
      render: (text) => (
        <Tag color={text === 'Thường trú' ? 'green' : 'orange'}>
          {text}
        </Tag>
      )
    },
    {
      title: 'Từ ngày',
      dataIndex: 'tuNgay',
      key: 'tuNgay',
      render: (date) => date ? new Date(date).toLocaleDateString('vi-VN') : '-'
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <h1 style={{ margin: 0 }}>
              <HomeOutlined style={{ marginRight: '8px' }} />
              Quản lý hộ khẩu
            </h1>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary" 
                icon={<HomeOutlined />}
                onClick={handleOpenCreateModal}
              >
                Tạo hộ khẩu mới
              </Button>
              <Button onClick={fetchHouseholds} loading={loading}>
                Làm mới
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Thống kê */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Tổng số hộ khẩu"
              value={households.length}
              prefix={<HomeOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Tổng số thành viên"
              value={households.reduce((sum, h) => sum + Number(h.soLuongThanhVien || 0), 0)}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Trung bình/hộ"
              value={households.length > 0 
                ? (households.reduce((sum, h) => sum + Number(h.soLuongThanhVien || 0), 0) / households.length).toFixed(1)
                : 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Danh sách hộ khẩu */}
      <Spin spinning={loading} indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}>
        {households.length === 0 && !loading ? (
          <Empty description="Chưa có hộ khẩu nào" />
        ) : (
          <List
            grid={{
              gutter: 16,
              xs: 1,
              sm: 2,
              md: 2,
              lg: 3,
              xl: 3,
              xxl: 4
            }}
            dataSource={households}
            renderItem={(household) => (
              <List.Item>
                <Card
                  hoverable
                  title={
                    <Space>
                      <span>{household.soHoKhau}</span>
                      <Tag color="green">Thường trú</Tag>
                    </Space>
                  }
                  actions={[
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewDetail(household)}
                    >
                      Chi tiết
                    </Button>,
                    <Button
                      type="link"
                      size="small"
                      icon={<UserAddOutlined />}
                      onClick={() => handleOpenAddMemberModal(household)}
                    >
                      Nhập khẩu
                    </Button>,
                    <Button
                      type="link"
                      size="small"
                      icon={<SwapOutlined />}
                      onClick={() => handleOpenTransferModal(household)}
                    >
                      Chuyển khẩu
                    </Button>
                  ]}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                      <strong>Chủ hộ:</strong> {household.tenChuHo}
                    </div>
                    <div>
                      <HomeOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                      <strong>Địa chỉ:</strong> {household.diaChi}
                    </div>
                    <div>
                      <TeamOutlined style={{ marginRight: '8px', color: '#fa8c16' }} />
                      <strong>Tổng thành viên:</strong> {household.soLuongThanhVien} người
                    </div>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Spin>

      {/* Modal xem chi tiết */}
      <Modal
        title={
          <Space>
            <HomeOutlined />
            <span>Chi tiết hộ khẩu: {selectedHousehold?.soHoKhau}</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={handleCloseDetailModal}
        footer={[
          <Button 
            key="split" 
            icon={<PlusOutlined />}
            onClick={() => {
              handleCloseDetailModal();
              handleOpenSplitNewModal(selectedHousehold);
            }}
          >
            Tách khẩu + Lập hộ mới
          </Button>,
          <Button 
            key="remove" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              handleCloseDetailModal();
              handleOpenRemoveModal(selectedHousehold);
            }}
          >
            Xóa khẩu
          </Button>,
          <Button key="close" type="primary" onClick={handleCloseDetailModal}>
            Đóng
          </Button>
        ]}
        width={1000}
      >
        {selectedHousehold && (
          <div style={{ marginBottom: '16px' }}>
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>Số hộ khẩu:</strong> {selectedHousehold.soHoKhau}</p>
                <p><strong>Chủ hộ:</strong> {selectedHousehold.tenChuHo}</p>
              </Col>
              <Col span={12}>
                <p><strong>Địa chỉ:</strong> {selectedHousehold.diaChi}</p>
                <p><strong>Số lượng thành viên:</strong> {selectedHousehold.soLuongThanhVien}</p>
              </Col>
            </Row>
          </div>
        )}
        
        <Table
          columns={memberColumns}
          dataSource={members}
          rowKey="cccd"
          loading={loadingMembers}
          pagination={{ pageSize: 5 }}
        />
      </Modal>

      {/* Modal tách khẩu */}
      <Modal
        title={
          <Space>
            <SwapOutlined />
            <span>Tách khẩu - Hộ: {selectedHousehold?.soHoKhau}</span>
          </Space>
        }
        open={moveModalVisible}
        onCancel={handleCloseMoveModal}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleMove}
        >
          <Form.Item
            label="Chọn thành viên cần tách"
            name="cccd"
            rules={[{ required: true, message: 'Vui lòng chọn thành viên!' }]}
          >
            <Select
              placeholder="Chọn thành viên"
              loading={loadingMembers}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {members.map((member) => (
                <Option key={member.cccd} value={member.cccd}>
                  {member.hoTen} - {member.cccd} ({member.quanHe})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Mã hộ khẩu mới (nơi chuyển đến)"
            name="targetHouseholdId"
            rules={[{ required: true, message: 'Vui lòng nhập mã hộ khẩu mới!' }]}
          >
            <Input
              placeholder="Nhập ID hộ khẩu đích (ví dụ: 4:xxx:xxx)"
              prefix={<HomeOutlined />}
            />
          </Form.Item>

          <Form.Item
            label="Loại cư trú"
            name="loaiCuTru"
            initialValue="Thường trú"
            rules={[{ required: true, message: 'Vui lòng chọn loại cư trú!' }]}
          >
            <Select>
              <Option value="Thường trú">Thường trú</Option>
              <Option value="Tạm trú">Tạm trú</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Lý do chuyển"
            name="reason"
            rules={[{ required: true, message: 'Vui lòng nhập lý do chuyển!' }]}
          >
            <TextArea
              rows={4}
              placeholder="Nhập lý do chuyển khẩu..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCloseMoveModal}>
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={movingMember !== null}
                icon={<SwapOutlined />}
              >
                Xác nhận chuyển khẩu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal tạo hộ khẩu mới */}
      <Modal
        title={
          <Space>
            <HomeOutlined />
            <span>Đăng ký hộ khẩu mới</span>
          </Space>
        }
        open={createModalVisible}
        onCancel={handleCloseCreateModal}
        footer={null}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateHousehold}
        >
          <Form.Item
            label="Mã hộ khẩu"
            name="householdId"
            rules={[{ required: true, message: 'Vui lòng nhập mã hộ khẩu!' }]}
          >
            <Input
              placeholder="Ví dụ: HK010"
              prefix={<HomeOutlined />}
            />
          </Form.Item>

          <Form.Item
            label="Số đăng ký"
            name="registrationNum"
            rules={[{ required: true, message: 'Vui lòng nhập số đăng ký!' }]}
          >
            <Input
              placeholder="Ví dụ: 010/2025/HK"
            />
          </Form.Item>

          <Form.Item
            label="Địa chỉ"
            name="addressText"
            rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}
          >
            <TextArea
              rows={3}
              placeholder="Nhập địa chỉ đầy đủ..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="Loại cư trú"
            name="residencyType"
            initialValue="Thường trú"
            rules={[{ required: true, message: 'Vui lòng chọn loại cư trú!' }]}
          >
            <Select>
              <Option value="Thường trú">Thường trú</Option>
              <Option value="Tạm trú">Tạm trú</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="CCCD chủ hộ"
            name="chuHoCCCD"
            rules={[
              { required: true, message: 'Vui lòng nhập CCCD chủ hộ!' },
              { pattern: /^\d{12}$/, message: 'CCCD phải là 12 chữ số!' }
            ]}
          >
            <Input
              placeholder="Nhập CCCD 12 số của chủ hộ"
              prefix={<UserOutlined />}
              maxLength={12}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCloseCreateModal}>
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={creating}
                icon={<HomeOutlined />}
              >
                Tạo hộ khẩu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal nhập khẩu (thêm thành viên vào hộ) */}
      <Modal
        title={
          <Space>
            <UserAddOutlined />
            <span>Nhập khẩu - Hộ: {selectedHousehold?.soHoKhau}</span>
          </Space>
        }
        open={addMemberModalVisible}
        onCancel={() => setAddMemberModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={addMemberForm}
          layout="vertical"
          onFinish={handleAddMember}
        >
          <Form.Item
            label="CCCD người nhập khẩu"
            name="cccd"
            rules={[
              { required: true, message: 'Vui lòng nhập CCCD!' },
              { pattern: /^\d{12}$/, message: 'CCCD phải là 12 chữ số!' }
            ]}
          >
            <Input
              placeholder="Nhập CCCD 12 số"
              prefix={<UserOutlined />}
              maxLength={12}
            />
          </Form.Item>

          <Form.Item
            label="Quan hệ với chủ hộ"
            name="quanHe"
            rules={[{ required: true, message: 'Vui lòng nhập quan hệ!' }]}
          >
            <Select placeholder="Chọn quan hệ">
              <Option value="Vợ/Chồng">Vợ/Chồng</Option>
              <Option value="Con">Con</Option>
              <Option value="Bố/Mẹ">Bố/Mẹ</Option>
              <Option value="Anh/Chị/Em">Anh/Chị/Em</Option>
              <Option value="Khác">Khác</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Loại cư trú"
            name="loaiCuTru"
            initialValue="Thường trú"
            rules={[{ required: true, message: 'Vui lòng chọn loại cư trú!' }]}
          >
            <Select>
              <Option value="Thường trú">Thường trú</Option>
              <Option value="Tạm trú">Tạm trú</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Từ ngày"
            name="tuNgay"
            initialValue={dayjs()}
            rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu!' }]}
          >
            <DatePicker 
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày bắt đầu"
            />
          </Form.Item>

          <Form.Item
            label="Lý do nhập khẩu"
            name="lyDo"
            rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}
          >
            <TextArea
              rows={3}
              placeholder="Ví dụ: Kết hôn, về sống cùng gia đình..."
              maxLength={300}
              showCount
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAddMemberModalVisible(false)}>
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={addingMember}
                icon={<UserAddOutlined />}
              >
                Nhập khẩu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal chuyển khẩu sang hộ khác */}
      <Modal
        title={
          <Space>
            <SwapOutlined />
            <span>Chuyển khẩu từ hộ: {selectedHousehold?.soHoKhau}</span>
          </Space>
        }
        open={transferModalVisible}
        onCancel={() => {
          setTransferModalVisible(false);
          transferForm.resetFields();
          setSelectedMembers([]);
        }}
        footer={null}
        width={700}
      >
        <Form
          form={transferForm}
          layout="vertical"
          onFinish={handleTransferMembers}
        >
          <Form.Item
            label="Chọn thành viên cần chuyển"
            name="memberCCCDs"
            rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 thành viên!' }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn thành viên"
              loading={loadingMembers}
              onChange={setSelectedMembers}
            >
              {members.filter(m => m.quanHe !== 'Chủ hộ').map((member) => (
                <Option key={member.cccd} value={member.cccd}>
                  {member.hoTen} - {member.cccd}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Hộ khẩu đích (đã tồn tại)"
            name="toHouseholdId"
            rules={[{ required: true, message: 'Vui lòng chọn hộ khẩu đích!' }]}
          >
            <Select
              showSearch
              placeholder="Chọn hộ khẩu đích"
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {households
                .filter(h => h.soHoKhau !== selectedHousehold?.soHoKhau)
                .map(h => (
                  <Option key={h.soHoKhau} value={h.soHoKhau}>
                    {h.soHoKhau} - {h.diaChi} (Chủ hộ: {h.tenChuHo})
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Lý do chuyển"
            name="reason"
            rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}
          >
            <Select placeholder="Chọn lý do">
              <Option value="Kết hôn">Kết hôn</Option>
              <Option value="Ra ở riêng">Ra ở riêng</Option>
              <Option value="Đi học">Đi học</Option>
              <Option value="Đi làm">Đi làm</Option>
              <Option value="Khác">Khác</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setTransferModalVisible(false);
                transferForm.resetFields();
                setSelectedMembers([]);
              }}>
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={transferring}
                icon={<SwapOutlined />}
              >
                Chuyển khẩu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal tách khẩu + lập hộ mới */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            <span>Tách khẩu và lập hộ mới</span>
          </Space>
        }
        open={splitNewModalVisible}
        onCancel={() => {
          setSplitNewModalVisible(false);
          splitNewForm.resetFields();
          setSelectedMembers([]);
        }}
        footer={null}
        width={700}
      >
        <Form
          form={splitNewForm}
          layout="vertical"
          onFinish={handleSplitNewHousehold}
        >
          <Form.Item
            label="Chọn thành viên tách ra"
            name="memberCCCDs"
            rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 thành viên!' }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn thành viên"
              loading={loadingMembers}
              onChange={setSelectedMembers}
            >
              {members.filter(m => m.quanHe !== 'Chủ hộ').map((member) => (
                <Option key={member.cccd} value={member.cccd}>
                  {member.hoTen} - {member.cccd}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Mã hộ khẩu mới"
            name="newHouseholdId"
            rules={[{ required: true, message: 'Vui lòng nhập mã hộ mới!' }]}
          >
            <Input
              placeholder="Ví dụ: HK020"
              prefix={<HomeOutlined />}
            />
          </Form.Item>

          <Form.Item
            label="Số đăng ký mới"
            name="newRegistrationNum"
            rules={[{ required: true, message: 'Vui lòng nhập số đăng ký!' }]}
          >
            <Input placeholder="Ví dụ: 020/2025/HK" />
          </Form.Item>

          <Form.Item
            label="Địa chỉ hộ mới"
            name="newAddress"
            rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}
          >
            <TextArea rows={2} placeholder="Nhập địa chỉ đầy đủ..." maxLength={500} showCount />
          </Form.Item>

          <Form.Item
            label="Loại cư trú"
            name="residencyType"
            initialValue="Thường trú"
            rules={[{ required: true, message: 'Vui lòng chọn loại cư trú!' }]}
          >
            <Select>
              <Option value="Thường trú">Thường trú</Option>
              <Option value="Tạm trú">Tạm trú</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Lý do tách"
            name="lyDo"
            rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}
          >
            <Select placeholder="Chọn lý do">
              <Option value="Kết hôn">Kết hôn</Option>
              <Option value="Ra ở riêng">Ra ở riêng</Option>
              <Option value="Khác">Khác</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setSplitNewModalVisible(false);
                splitNewForm.resetFields();
                setSelectedMembers([]);
              }}>
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={splittingNew}
                icon={<PlusOutlined />}
              >
                Tách khẩu và tạo hộ mới
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal xóa khẩu (khai tử/định cư nước ngoài) */}
      <Modal
        title={
          <Space>
            <DeleteOutlined style={{ color: '#ff4d4f' }} />
            <span>Xóa khẩu - Hộ: {selectedHousehold?.soHoKhau}</span>
          </Space>
        }
        open={removeModalVisible}
        onCancel={() => {
          setRemoveModalVisible(false);
          removeForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={removeForm}
          layout="vertical"
          onFinish={handleRemoveMember}
        >
          <Form.Item
            label="Chọn người cần xóa khẩu"
            name="cccd"
            rules={[{ required: true, message: 'Vui lòng chọn người!' }]}
          >
            <Select
              placeholder="Chọn thành viên"
              loading={loadingMembers}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {members.map((member) => (
                <Option key={member.cccd} value={member.cccd}>
                  {member.hoTen} - {member.cccd} ({member.quanHe})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Trạng thái mới"
            name="loaiXoa"
            initialValue="Đã chết"
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
          >
            <Select placeholder="Chọn trạng thái">
              <Option value="Đã chết">
                <Tag color="red">Đã chết (Khai tử)</Tag>
              </Option>
              <Option value="Định cư nước ngoài">
                <Tag color="orange">Định cư nước ngoài</Tag>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Ngày xóa khẩu"
            name="ngayXoa"
            initialValue={dayjs()}
            rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}
          >
            <DatePicker 
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày xóa khẩu"
            />
          </Form.Item>

          <Form.Item
            label="Lý do"
            name="lyDo"
            rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}
          >
            <TextArea
              rows={3}
              placeholder="Nhập lý do xóa khẩu..."
              maxLength={300}
              showCount
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setRemoveModalVisible(false);
                removeForm.resetFields();
              }}>
                Hủy
              </Button>
              <Button
                type="primary"
                danger
                htmlType="submit"
                loading={removing}
                icon={<DeleteOutlined />}
              >
                Xác nhận xóa khẩu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ResidencyPage;