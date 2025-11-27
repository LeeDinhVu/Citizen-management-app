// src/pages/security/cases/CreateCase.jsx
import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  DatePicker,
  message,
  Card,
  Space,
  Tag,
  Select,
} from "antd";
import { useNavigate } from "react-router-dom";
import { apiCreateCase } from "../../services/api/criminalApi";
import dayjs from "dayjs";

const { TextArea } = Input;

export default function CreateCase() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Quản lý danh sách CCCD
  const [suspectCccds, setSuspectCccds] = useState([]);
  const [victimCccds, setVictimCccds] = useState([]);
  const [witnessCccds, setWitnessCccds] = useState([]);

  const [inputSuspect, setInputSuspect] = useState("");
  const [inputVictim, setInputVictim] = useState("");
  const [inputWitness, setInputWitness] = useState("");

  // Hàm thêm CCCD (nhấn Enter hoặc blur)
  const addCccd = (value, setInput, list, setList) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (trimmed.length !== 12) {
      message.warning("CCCD phải đúng 12 số!");
      return;
    }
    if (list.includes(trimmed)) {
      message.info("CCCD này đã được thêm!");
      return;
    }
    setList([...list, trimmed]);
    setInput("");
  };

  const removeCccd = (list, setList, cccd) => {
    setList(list.filter((item) => item !== cccd));
  };

  // Submit
  const onFinish = async (values) => {
    if (suspectCccds.length === 0 && victimCccds.length === 0) {
      message.warning("Phải có ít nhất 1 nghi phạm hoặc 1 nạn nhân!");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        caseNumber: values.caseNumber,
        crimeType: values.crimeType,
        description: values.description?.trim(),
        occurredDate: values.occurredDate.format("YYYY-MM-DD"),
        reportedDate: values.reportedDate
          ? values.reportedDate.format("YYYY-MM-DD")
          : null,
        location: values.location,
        status: values.status || "Đang điều tra",
        suspectCccds,
        victimCccds,
        witnessCccds,
      };

      await apiCreateCase(payload); // Dùng service thay vì axios trực tiếp

      message.success("Tạo vụ án thành công!");
      navigate("/security/cases");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Lỗi không xác định";
      message.error("Tạo vụ án thất bại: " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Card title={<h1 className="text-3xl font-bold text-blue-700">Thêm vụ án mới</h1>} bordered={false}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            status: "Đang điều tra",
            occurredDate: dayjs(),
            reportedDate: dayjs(),
          }}
        >
          {/* Các field cơ bản */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Form.Item
              label="Số vụ án"
              name="caseNumber"
              rules={[{ required: true, message: "Bắt buộc nhập số vụ án" }]}
            >
              <Input placeholder="VD: 789/2025/HS" size="large" />
            </Form.Item>

            <Form.Item
              label="Loại tội phạm"
              name="crimeType"
              rules={[{ required: true, message: "Vui lòng chọn loại tội phạm" }]}
            >
              <Select
                placeholder="Chọn loại tội phạm"
                size="large"
                options={[
                  { value: "Giết người", label: "Giết người" },
                  { value: "Cướp tài sản", label: "Cướp tài sản" },
                  { value: "Cướp giật tài sản", label: "Cướp giật tài sản" },
                  { value: "Trộm cắp tài sản", label: "Trộm cắp tài sản" },
                  { value: "Ma túy", label: "Ma túy" },
                  { value: "Cố ý gây thương tích", label: "Cố ý gây thương tích" },
                  { value: "Hiếp dâm", label: "Hiếp dâm" },
                  { value: "Lừa đảo chiếm đoạt tài sản", label: "Lừa đảo chiếm đoạt tài sản" },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item label="Mô tả vụ án" name="description">
            <TextArea rows={4} placeholder="Nhập chi tiết vụ việc..." />
          </Form.Item>

          <Space size={24} className="w-full">
            <Form.Item
              label="Ngày xảy ra"
              name="occurredDate"
              rules={[{ required: true, message: "Bắt buộc" }]}
            >
              <DatePicker format="DD/MM/YYYY" style={{ width: 200 }} />
            </Form.Item>
            <Form.Item label="Ngày trình báo" name="reportedDate">
              <DatePicker format="DD/MM/YYYY" style={{ width: 200 }} />
            </Form.Item>
          </Space>

          <Form.Item
            label="Địa điểm xảy ra"
            name="location"
            rules={[{ required: true, message: "Bắt buộc nhập địa điểm" }]}
          >
            <Input placeholder="VD: Thủ Đức, TP.HCM" />
          </Form.Item>

          <Form.Item label="Trạng thái" name="status">
            <Select
              options={[
                { value: "Đang điều tra", label: "Đang điều tra" },
                { value: "Đã kết án", label: "Đã kết án" },
                { value: "Tạm đình chỉ", label: "Tạm đình chỉ" },
              ]}
            />
          </Form.Item>

          {/* Nghi phạm */}
          <div className="mb-6 p-4 border rounded-lg bg-red-50">
            <label className="block font-semibold mb-3 text-red-700 text-lg">
              Nghi phạm (CCCD):   
            </label>
            <Input
              value={inputSuspect}
              onChange={(e) => setInputSuspect(e.target.value)}
              onPressEnter={() => addCccd(inputSuspect, setInputSuspect, suspectCccds, setSuspectCccds)}
              onBlur={() => addCccd(inputSuspect, setInputSuspect, suspectCccds, setSuspectCccds)}
              placeholder="Nhập CCCD 12 số"
              style={{ width: 320 }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {suspectCccds.map((cccd) => (
                <Tag key={cccd} color="red" closable onClose={() => removeCccd(suspectCccds, setSuspectCccds, cccd)}>
                  {cccd}
                </Tag>
              ))}
            </div>
          </div>

          {/* Nạn nhân */}
          <div className="mb-6 p-4 border rounded-lg bg-orange-50">
            <label className="block font-semibold mb-3 text-orange-700 text-lg">
              Nạn nhân (CCCD):
            </label>
            <Input
              value={inputVictim}
              onChange={(e) => setInputVictim(e.target.value)}
              onPressEnter={() => addCccd(inputVictim, setInputVictim, victimCccds, setVictimCccds)}
              onBlur={() => addCccd(inputVictim, setInputVictim, victimCccds, setVictimCccds)}
              placeholder="Nhập CCCD nạn nhân"
              style={{ width: 320 }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {victimCccds.map((cccd) => (
                <Tag key={cccd} color="orange" closable onClose={() => removeCccd(victimCccds, setVictimCccds, cccd)}>
                  {cccd}
                </Tag>
              ))}
            </div>
          </div>

          {/* Nhân chứng */}
          <div className="mb-8 p-4 border rounded-lg bg-blue-50">
            <label className="block font-semibold mb-3 text-blue-700 text-lg">
              Nhân chứng (CCCD) - Tùy chọn
            </label>
            <Input
              value={inputWitness}
              onChange={(e) => setInputWitness(e.target.value)}
              onPressEnter={() => addCccd(inputWitness, setInputWitness, witnessCccds, setWitnessCccds)}
              onBlur={() => addCccd(inputWitness, setInputWitness, witnessCccds, setWitnessCccds)}
              placeholder="Nhập CCCD nhân chứng"
              style={{ width: 320 }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {witnessCccds.map((cccd) => (
                <Tag key={cccd} color="blue" closable onClose={() => removeCccd(witnessCccds, setWitnessCccds, cccd)}>
                  {cccd}
                </Tag>
              ))}
            </div>
          </div>

          <Form.Item>
            <Space size="large">
              <Button type="primary" htmlType="submit" loading={loading} size="large" className="min-w-32">
                Tạo vụ án
              </Button>
              <Button size="large" onClick={() => navigate("/security/cases")}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}