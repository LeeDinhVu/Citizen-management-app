import { useState } from 'react';
import { Input, Button, Alert } from 'antd';
import { IdcardOutlined } from '@ant-design/icons';

export default function CriminalRecordSearch({ onSearch }) {
  const [cccd, setCccd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!cccd || cccd.length < 12) {
      setError('Vui lòng nhập đúng 12 số CCCD');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await getCriminalRecord(cccd);
      onSearch(data);
    } catch (err) {
      setError(err.response?.data || 'Không tìm thấy thông tin');
      onSearch(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-red-700 mb-6 flex items-center gap-3">
        <IdcardOutlined /> Tra cứu Lý lịch tư pháp & Tiền án tiền sự
      </h2>

      <div className="flex gap-3">
        <Input
          placeholder="Nhập số CCCD (12 số)"
          value={cccd}
          onChange={(e) => setCccd(e.target.value.replace(/\D/g, '').slice(0,12))}
          onPressEnter={handleSearch}
          size="large"
          prefix={<IdcardOutlined />}
        />
        <Button type="primary" size="large" loading={loading} onClick={handleSearch}>
          Tra cứu
        </Button>
      </div>

      {error && <Alert message={error} type="error" className="mt-4" />}
    </div>
  );
}