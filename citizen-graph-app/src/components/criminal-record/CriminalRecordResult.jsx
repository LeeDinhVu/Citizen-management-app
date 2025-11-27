import { Alert, Tag, Timeline, Card } from 'antd';

export default function CriminalRecordResult({ data }) {
  if (!data) return null;

  const { hasCriminalRecord, totalConvictions, convictions, fullName, cccd } = data;

  return (
    <div className="mt-8 max-w-4xl mx-auto">
      <Alert
        message={
          hasCriminalRecord
            ? `CÔ TIỀN ÁN TIỀN SỰ - ${totalConvictions} bản án`
            : "KHÔNG CÓ TIỀN ÁN TIỀN SỰ"
        }
        type={hasCriminalRecord ? "error" : "success"}
        showIcon
        banner
        className="text-xl font-bold"
      />

      <Card title={`Thông tin công dân: ${fullName} (${cccd})`} className="mt-6">
        {convictions.length > 0 ? (
          <Timeline mode="left">
            {convictions.map((c, i) => (
              <Timeline.Item key={i} color={c.status.includes('Đang') ? 'red' : 'green'}>
                <p className="font-semibold">{c.crimeType}</p>
                <p>Số bản án: {c.caseNumber || 'Chưa có'}</p>
                <p>Ngày tuyên án: {c.sentenceDate}</p>
                <p>Mức án: <Tag color="orange">{c.prisonTerm}</Tag></p>
                {c.fineAmount && <p>Tiền phạt: {c.fineAmount.toLocaleString()} ₫</p>}
                <p>Trại giam: {c.prisonName || 'Chưa xác định'}</p>
                <Tag color={c.status.includes('Đang') ? 'volcano' : 'green'}>
                  <p><strong>{c.status}</strong></p>
                </Tag>
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <p className="text-green-600 text-lg">Công dân này chưa từng bị kết án</p>
        )}
      </Card>
    </div>
  );
}