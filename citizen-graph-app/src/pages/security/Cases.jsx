// src/pages/security/Cases.jsx
import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Input,
  Space,
  message,
  Popconfirm,
  Select,
  DatePicker,
  Tag,
  Card,
  Typography,
  Spin,
  Empty,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  apiGetCases,
  apiSearchCases,
  apiDeleteCase,
  apiGetPersonHistory,
} from "../../services/api/criminalApi";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const crimeTypes = [
  "Ma túy", "Trộm cắp tài sản", "Cướp giật", "Cướp tài sản", "Giết người",
  "Hiếp dâm", "Lừa đảo chiếm đoạt tài sản", "Tham nhũng", "Tội phạm công nghệ cao", "Khác"
];

const statuses = [
  "Mở", "Đang điều tra", "Chờ xử lý", "Tạm đình chỉ", "Đã kết án", "Đã đóng"
];

export default function CasesPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [cccd, setCccd] = useState("");
  const [crimeType, setCrimeType] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [location, setLocation] = useState("");
  const [dateRange, setDateRange] = useState([]);

  // Load all cases
  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await apiGetCases();
      setCases(data || []);
    } catch (err) {
      message.error("Không thể tải danh sách vụ án");
    } finally {
      setLoading(false);
    }
  };

  // Search handler
  const handleSearch = async () => {
    if (cccd.trim()) {
      setLoading(true);
      try {
        const data = await apiGetPersonHistory(cccd.trim());
        setCases(data || []);
        if (!data?.length) message.info("Không tìm thấy vụ án nào liên quan đến CCCD này");
      } catch (err) {
        message.error("Lỗi tìm kiếm theo CCCD");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const filters = {
        CrimeType: crimeType,
        Status: statusFilter,
        Location: location.trim() || null,
        FromDate: dateRange[0]?.format("YYYY-MM-DD") || null,
        ToDate: dateRange[1]?.format("YYYY-MM-DD") || null,
      };

      const data = await apiSearchCases(filters);
      setCases(data || []);
    } catch (err) {
      message.error("Lỗi tìm kiếm");
    } finally {
      setLoading(false);
    }
  };



  // Reset filters
  const handleReset = () => {
    setCccd("");
    setCrimeType(null);
    setStatusFilter(null);
    setLocation("");
    setDateRange([]);
    loadCases();
  };

  useEffect(() => {
    loadCases();
  }, []);

  // Table columns
  const columns = [
    {
      title: "Mã vụ án",
      dataIndex: "caseId",
      key: "caseId",
      render: (text) => <span className="font-mono font-semibold text-blue-600">{text}</span>,
    },
    {
      title: "Số hiệu",
      dataIndex: "caseNumber",
      key: "caseNumber",
      render: (text) => text || <Text type="secondary">Chưa có</Text>,
    },
    {
      title: "Loại tội phạm",
      dataIndex: "crimeType",
      key: "crimeType",
      render: (text) => (
        <Tag color="red" className="font-medium">
          {text}
        </Tag>
      ),
    },
    {
      title: "Ngày xảy ra",
      dataIndex: "occurredDate",
      key: "occurredDate",
      render: (text) => text || <Text type="secondary">Không rõ</Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const color =
          status === "Đang điều tra" ? "processing" :
          status === "Đã kết án" ? "success" :
          status === "Tạm đình chỉ" ? "warning" :
          status === "Đã đóng" ? "default" : "blue";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Địa điểm",
      dataIndex: "location",
      key: "location",
      render: (text) => text || <Text type="secondary">Không rõ</Text>,
    },
    {
      title: "Hành động",
      key: "action",
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/security/cases/${record.caseId}`)}
            className="text-blue-600 hover:text-blue-800"
          >
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Title level={2} className="m-0 text-blue-900">
              Quản Lý Vụ Án Hình Sự
            </Title>
            <Text type="secondary" className="text-lg">
              Tổng cộng: <strong>{cases.length}</strong> vụ án
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => navigate("/security/cases/create")}
            className="bg-blue-600 hover:bg-blue-700 shadow-lg px-6"
          >
            Thêm Vụ Án Mới
          </Button>
        </div>

        {/* Search Card */}
        <Card className="mb-6 shadow-lg rounded-2xl" title={<span className="font-semibold text-lg"><SearchOutlined className="mr-2" />Tìm Kiếm & Lọc Vụ Án</span>}>
          <Space wrap className="w-full" size={[12, 12]}>
            <Input
              placeholder="Tìm theo CCCD người liên quan"
              value={cccd}
              onChange={(e) => setCccd(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 260 }}
              prefix={<SearchOutlined className="text-gray-400" />}
              allowClear
            />

            <Select
              placeholder="Loại tội phạm"
              value={crimeType}
              onChange={setCrimeType}
              allowClear
              showSearch
              style={{ width: 220 }}
              options={crimeTypes.map(t => ({ value: t, label: t }))}
            />

            <Select
              placeholder="Trạng thái"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              style={{ width: 180 }}
              options={statuses.map(s => ({ value: s, label: s }))}
            />

            <Input
              placeholder="Địa điểm"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />

            <RangePicker
              format="DD/MM/YYYY"
              placeholder={["Từ ngày", "Đến ngày"]}
              value={dateRange}
              onChange={setDateRange}
            />

            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              Tìm kiếm
            </Button>

            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              Tất cả
            </Button>
          </Space>
        </Card>

        {/* Table */}
        <Card className="shadow-xl rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <Spin size="large" tip="Đang tải danh sách vụ án..." />
            </div>
          ) : cases.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không có vụ án nào"
              className="py-20"
            >
              <Button type="primary" size="large" onClick={() => navigate("/security/cases/create")}>
                Tạo vụ án đầu tiên
              </Button>
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={cases}
              rowKey="caseId"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `Tổng ${total} vụ án`,
              }}
              scroll={{ x: 1000 }}
              className="shadow-sm"
            />
          )}
        </Card>
      </div>
    </div>
  );
}