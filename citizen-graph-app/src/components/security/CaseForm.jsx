// src/components/security/CaseForm.jsx
import React, { useEffect, useState } from "react";  // ĐÃ THÊM useState!
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Typography,
  message,
  Tag,
} from "antd";
import {
  FileTextOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  TagOutlined,
  AlertOutlined,
  FileProtectOutlined,
} from "@ant-design/icons";
import { apiCreateCase, apiUpdateCase } from "../../services/api/criminalApi";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;

const crimeTypes = [
  "Ma túy", "Trộm cắp tài sản", "Cướp giật", "Cướp tài sản", "Giết người",
  "Hiếp dâm", "Lừa đảo chiếm đoạt tài sản", "Tham nhũng", "Tội phạm công nghệ cao", "Khác"
];

const statuses = [
  "Mở", "Đang điều tra", "Chờ xử lý", "Tạm đình chỉ", "Đã kết án", "Đã đóng"
];

export default function CaseForm({ open, onClose, initial, mode = "create", onSuccess }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);  // ĐÃ CÓ useState → KHÔNG LỖI NỮA!

  useEffect(() => {
    if (open && initial) {
      form.setFieldsValue({
        caseNumber: initial.caseNumber || "",
        crimeType: initial.crimeType || "",
        occurredDate: initial.occurredDate ? dayjs(initial.occurredDate) : null,
        reportedDate: initial.reportedDate ? dayjs(initial.reportedDate) : null,
        location: initial.location || "",
        status: initial.status || "Đang điều tra",
        description: initial.description || "",
      });
    }
  }, [initial, open, form]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // CHUẨN HÓA DỮ LIỆU TRƯỚC KHI GỬI
      const payload = {
        caseId: initial.caseId,  // BẮT BUỘC PHẢI CÓ caseId khi update
        caseNumber: values.caseNumber?.trim(),
        crimeType: values.crimeType?.trim(),
        description: values.description?.trim() || null,
        occurredDate: values.occurredDate?.format("YYYY-MM-DD") || null,
        reportedDate: values.reportedDate?.format("YYYY-MM-DD") || null,
        location: values.location?.trim(),
        status: values.status || "Đang điều tra",
      };

      console.log("Payload gửi đi:", payload); // Debug – xem có đúng không

      if (mode === "create") {
        await apiCreateCase(payload);
        message.success("Tạo vụ án thành công!");
      } else {
        // GỬI ĐÚNG caseId trong URL + payload đầy đủ
        await apiUpdateCase(initial.caseId, payload);
        message.success("Cập nhật vụ án thành công!");
      }

      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Lỗi khi lưu:", err.response || err);
      const msg = err.response?.data?.message || err.response?.data?.title || "Cập nhật thất bại!";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      closeIcon={null}
      centered
      destroyOnClose
      className="rounded-3xl"
      styles={{ body: { padding: "40px", maxHeight: "85vh", overflowY: "auto" } }}
    >
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-5 shadow-lg">
          {mode === "create" ? (
            <FileTextOutlined className="text-4xl text-white" />
          ) : (
            <FileProtectOutlined className="text-4xl text-white" />
          )}
        </div>
        <Title level={2} className="m-0 text-gray-800">
          {mode === "create" ? "Tạo Vụ Án Mới" : "Chỉnh Sửa Vụ Án"}
        </Title>
        {mode === "update" && initial?.caseId && (
          <Text type="secondary" className="text-lg block mt-3">
            Mã vụ án: <span className="font-mono font-bold text-blue-600 text-xl">{initial.caseId}</span>
          </Text>
        )}
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
        <Form.Item
          name="caseNumber"
          label={<span className="font-semibold text-gray-700"><TagOutlined className="mr-2 text-blue-600" />Số vụ án</span>}
          rules={[{ required: true, message: "Vui lòng nhập số vụ án!" }]}
        >
          <Input placeholder="VD: 789/2023/HS" className="rounded-xl h-12" />
        </Form.Item>

        <Form.Item
          name="crimeType"
          label={<span className="font-semibold text-gray-700"><AlertOutlined className="mr-2 text-red-600" />Loại tội phạm</span>}
          rules={[{ required: true, message: "Vui lòng chọn loại tội phạm!" }]}
        >
          <Select placeholder="Chọn loại tội phạm" className="rounded-xl">
            {crimeTypes.map(type => (
              <Select.Option key={type} value={type}>{type}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="occurredDate"
          label={<span className="font-semibold text-gray-700"><CalendarOutlined className="mr-2 text-blue-600" />Ngày xảy ra</span>}
          rules={[{ required: true, message: "Vui lòng chọn ngày xảy ra!" }]}
        >
          <DatePicker format="DD/MM/YYYY" placeholder="Chọn ngày" className="w-full rounded-xl h-12" />
        </Form.Item>

        <Form.Item
          name="reportedDate"
          label={<span className="font-semibold text-gray-700"><CalendarOutlined className="mr-2 text-gray-500" />Ngày báo cáo</span>}
        >
          <DatePicker format="DD/MM/YYYY" placeholder="Chọn ngày (tùy chọn)" className="w-full rounded-xl h-12" />
        </Form.Item>

        <Form.Item
          name="location"
          label={<span className="font-semibold text-gray-700"><EnvironmentOutlined className="mr-2 text-green-600" />Địa điểm xảy ra</span>}
          rules={[{ required: true, message: "Vui lòng nhập địa điểm!" }]}
        >
          <Input placeholder="VD: Quận 1, TP. Hồ Chí Minh" className="rounded-xl h-12" />
        </Form.Item>

        <Form.Item
          name="status"
          label={<span className="font-semibold text-gray-700"><TagOutlined className="mr-2 text-purple-600" />Trạng thái vụ án</span>}
        >
          <Select className="rounded-xl">
            {statuses.map(s => (
              <Select.Option key={s} value={s}>
                <Tag
                  color={
                    s === "Đang điều tra" ? "processing" :
                    s === "Đã kết án" ? "success" :
                    s === "Tạm đình chỉ" ? "warning" :
                    s === "Đã đóng" ? "default" : "blue"
                  }
                >
                  {s}
                </Tag>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="description"
          label={<span className="font-semibold text-gray-700"><FileTextOutlined className="mr-2 text-gray-600" />Mô tả chi tiết vụ án</span>}
        >
          <TextArea
            rows={5}
            placeholder="Nhập thông tin chi tiết: diễn biến, hiện trường, tình tiết quan trọng..."
            className="rounded-xl"
          />
        </Form.Item>

        <Form.Item className="mb-0 mt-10">
          <div className="flex justify-end gap-4">
            <Button size="large" onClick={onClose} className="px-8 rounded-xl">
              Hủy bỏ
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              className="px-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg hover:shadow-xl"
            >
              {loading ? "Đang lưu..." : (mode === "create" ? "Tạo Vụ Án" : "Cập Nhật Vụ Án")}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}