import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Progress, Table, Tag, Spin, Alert } from 'antd';
import { ArrowUpOutlined, UserOutlined, HomeOutlined, CarOutlined, AlertOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import axios from 'axios';

// 1. Import Dayjs và các plugin cần thiết
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi'; // Import ngôn ngữ tiếng Việt

// 2. Cấu hình Dayjs
dayjs.extend(relativeTime);
dayjs.locale('vi'); // Thiết lập sử dụng tiếng Việt

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cấu hình cột cho bảng Log
  const columns = [
    { 
      title: 'Hoạt động', 
      dataIndex: 'action', 
      key: 'action', 
      render: (text) => <b style={{color: '#1890ff'}}>{text}</b> 
    },
    { 
      title: 'Thời gian', 
      dataIndex: 'time', 
      key: 'time', 
      render: (text) => (
        <span style={{ color: '#888', fontSize: '12px' }}>
          {/* 3. Sử dụng fromNow() để hiển thị thời gian tương đối */}
          <ClockCircleOutlined style={{marginRight: 5}}/>
          {dayjs(text).fromNow()} 
        </span>
      )
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status', 
      render: status => {
        let color = 'default';
        let icon = null;
        if (status === 'Thành công') { color = 'success'; icon = <CheckCircleOutlined />; }
        else if (status === 'Thất bại') { color = 'error'; icon = <CloseCircleOutlined />; }
        else if (status === 'Đang xử lý') { color = 'processing'; icon = <SyncOutlined spin />; }
        return <Tag icon={icon} color={color}>{status}</Tag>;
      }
    },
  ];

  // Fetch dữ liệu định kỳ
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/dashboard/overview');
        setData(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Lỗi lấy dữ liệu:", err);
        setError("Không thể kết nối đến server.");
        setLoading(false);
      }
    };

    fetchData();
    // Refresh mỗi 5 giây để cập nhật log và thời gian "cách đây..."
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval);
  }, []);

  const calculatePercent = (value, total) => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  if (loading) return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" tip="Đang tải dữ liệu hệ thống..." /></div>;
  if (error) return <div style={{ padding: 24 }}><Alert message="Lỗi" description={error} type="error" showIcon /></div>;

  const { statistics, demographics, recentLogs } = data || {};
  
  if (!statistics || !demographics) {
    return <div style={{ padding: 24 }}><Alert message="Lỗi định dạng dữ liệu" description="Server trả về dữ liệu không khớp cấu trúc mong đợi." type="error" showIcon /></div>;
  }

  // Dữ liệu cho bảng Log
  const logDataSource = recentLogs ? recentLogs.map((log, index) => ({
      key: index,
      action: log.action,
      time: log.time, // Chuỗi thời gian ISO từ backend
      status: log.status
  })) : [];

  const malePercent = calculatePercent(demographics.maleCount, demographics.totalClassified);
  const femalePercent = calculatePercent(demographics.femaleCount, demographics.totalClassified);
  const laborPercent = calculatePercent(demographics.laborAgeCount, demographics.totalAgeClassified);
  const otherAgePercent = 100 - laborPercent;

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 20 }}>📊 Tổng quan Hệ thống</h2>

      {/* 1. HÀNG THỐNG KÊ SỐ LIỆU */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
            <Statistic title="Tổng Dân số" value={statistics.population} prefix={<UserOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Statistic title="Hộ gia đình" value={statistics.households} prefix={<HomeOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
            <Statistic title="Phương tiện Đăng ký" value={statistics.vehicles} prefix={<CarOutlined />} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#fff1f0', borderColor: '#ffa39e' }}>
            <Statistic title="Cảnh báo An ninh (F0/F1)" value={statistics.alerts} prefix={<AlertOutlined />} valueStyle={{ color: '#cf1322' }} suffix={<span style={{fontSize: 12, color: '#cf1322'}}><ArrowUpOutlined /> High Risk</span>} />
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 24 }}></div>

      {/* 2. HÀNG BIỂU ĐỒ VÀ HOẠT ĐỘNG */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="Thống kê theo Độ tuổi & Giới tính" bordered={false}>
            <div style={{ marginBottom: 15 }}><span>Nam giới ({malePercent}%) - {demographics.maleCount} người</span><Progress percent={malePercent} strokeColor="#1890ff" /></div>
            <div style={{ marginBottom: 15 }}><span>Nữ giới ({femalePercent}%) - {demographics.femaleCount} người</span><Progress percent={femalePercent} strokeColor="#eb2f96" /></div>
            <div style={{ marginBottom: 15 }}><span>Độ tuổi lao động (18-60) ({laborPercent}%)</span><Progress percent={laborPercent} status="active" strokeColor="#52c41a" /></div>
            <div><span>Trẻ em & Người già ({otherAgePercent}%)</span><Progress percent={otherAgePercent} strokeColor="orange" /></div>
          </Card>
        </Col>

        {/* Bảng Log Real-time */}
        <Col xs={24} lg={14}>
          <Card title={<><ClockCircleOutlined /> Lịch sử hoạt động Hệ thống (Real-time)</>} bordered={false}>
             <Table 
               dataSource={logDataSource} 
               columns={columns} 
               pagination={false} 
               size="small"
               locale={{emptyText: 'Chưa có dữ liệu hoạt động'}}
             />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;


// import React, { useEffect, useState } from 'react';
// import { 
//   Row, 
//   Col, 
//   Card, 
//   Statistic, 
//   Progress, 
//   Table, 
//   Tag, 
//   Spin, 
//   Alert,
//   Typography // THÊM DÒNG NÀY – QUAN TRỌNG!
// } from 'antd';
// import { 
//   ArrowUpOutlined, 
//   UserOutlined, 
//   HomeOutlined, 
//   CarOutlined, 
//   AlertOutlined, 
//   ClockCircleOutlined, 
//   CheckCircleOutlined, 
//   CloseCircleOutlined, 
//   SyncOutlined 
// } from '@ant-design/icons';
// import axios from 'axios';

// // Cấu hình Day.js cho tiếng Việt + relative time
// import dayjs from 'dayjs';
// import relativeTime from 'dayjs/plugin/relativeTime';
// import updateLocale from 'dayjs/plugin/updateLocale';
// import 'dayjs/locale/vi';

// dayjs.extend(relativeTime);
// dayjs.extend(updateLocale);
// dayjs.locale('vi');

// // Tùy chỉnh tiếng Việt đẹp hơn
// dayjs.updateLocale('vi', {
//   relativeTime: {
//     future: "trong %s",
//     past: "%s trước",
//     s: 'vài giây',
//     m: "1 phút",
//     mm: "%d phút",
//     h: "1 giờ",
//     hh: "%d giờ",
//     d: "1 ngày",
//     dd: "%d ngày",
//     M: "1 tháng",
//     MM: "%d tháng",
//     y: "1 năm",
//     yy: "%d năm"
//   }
// });

// // THÊM DÒNG NÀY ĐỂ DÙNG <Text>
// const { Text } = Typography;

// const Dashboard = () => {
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Cột bảng log – thời gian hiển thị "cách đây bao lâu"
//   const columns = [
//     {
//       title: 'Hoạt động',
//       dataIndex: 'action',
//       key: 'action',
//       render: (text) => <b style={{ color: '#1890ff' }}>{text}</b>
//     },
//     {
//       title: 'Thời gian',
//       dataIndex: 'time',
//       key: 'time',
//       width: 180,
//       render: (isoTime) => {
//         if (!isoTime) return <span style={{ color: '#ccc' }}>—</span>;
//         const time = dayjs(isoTime);
//         const now = dayjs();
//         const diffSeconds = now.diff(time, 'second');

//         let display = time.fromNow();

//         if (diffSeconds < 60) display = 'vài giây trước';
//         else if (diffSeconds < 86400) display = time.fromNow();
//         else display = time.format('DD/MM/YYYY HH:mm');

//         return (
//           <span style={{ color: '#666', fontSize: '13px' }}>
//             <ClockCircleOutlined style={{ marginRight: 6, color: '#1890ff' }} />
//             {display}
//           </span>
//         );
//       }
//     },
//     {
//       title: 'Trạng thái',
//       dataIndex: 'status',
//       key: 'status',
//       width: 120,
//       render: (status) => {
//         let color = 'default';
//         let icon = null;

//         switch (status) {
//           case 'Thành công':
//             color = 'success';
//             icon = <CheckCircleOutlined />;
//             break;
//           case 'Thất bại':
//             color = 'error';
//             icon = <CloseCircleOutlined />;
//             break;
//           case 'Đang xử lý':
//             color = 'processing';
//             icon = <SyncOutlined spin />;
//             break;
//           default:
//             color = 'default';
//         }

//         return <Tag icon={icon} color={color} style={{ fontWeight: 500 }}>{status}</Tag>;
//       }
//     }
//   ];

//   // Fetch dữ liệu + tự động refresh mỗi 5 giây
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const response = await axios.get('/api/dashboard/overview'); // Đã dùng relative URL
//         setData(response.data);
//         setError(null);
//       } catch (err) {
//         console.error("Lỗi lấy dữ liệu dashboard:", err);
//         setError("Không thể kết nối đến server. Đang thử lại...");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//     const interval = setInterval(fetchData, 5000);

//     return () => clearInterval(interval);
//   }, []);

//   const calculatePercent = (value, total) => {
//     if (!total || total === 0) return 0;
//     return Math.round((value / total) * 100);
//   };

//   // Loading & Error
//   if (loading) {
//     return (
//       <div style={{ padding: 80, textAlign: 'center' }}>
//         <Spin size="large" tip="Đang tải dữ liệu hệ thống..." />
//       </div>
//     );
//   }

//   if (error || !data?.statistics || !data?.demographics) {
//     return (
//       <div style={{ padding: 24 }}>
//         <Alert
//           message="Lỗi kết nối"
//           description={error || "Không nhận được dữ liệu từ server."}
//           type="error"
//           showIcon
//         />
//       </div>
//     );
//   }

//   const { statistics, demographics, recentLogs = [] } = data;

//   const malePercent = calculatePercent(demographics.maleCount, demographics.totalClassified);
//   const femalePercent = calculatePercent(demographics.femaleCount, demographics.totalClassified);
//   const laborPercent = calculatePercent(demographics.laborAgeCount, demographics.totalAgeClassified);
//   const otherAgePercent = 100 - laborPercent;

//   // Chuẩn bị dữ liệu cho bảng log
//   const logDataSource = recentLogs.map((log, index) => ({
//     key: index,
//     action: log.action || 'Không xác định',
//     time: log.time,
//     status: log.status || 'Đang xử lý'
//   }));

//   return (
//     <div style={{ padding: 24, background: '#f8f9fc' }}>
//       <h2 style={{ marginBottom: 24, fontSize: 32, fontWeight: 700, color: '#1a1a1a' }}>
//         Tổng quan Hệ thống
//       </h2>

//       {/* 1. Thống kê nhanh */}
//       <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
//         <Col xs={24} sm={12} lg={6}>
//           <Card hoverable style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
//             <Statistic
//               title="Tổng Dân số"
//               value={statistics.population}
//               prefix={<UserOutlined style={{ color: '#1890ff' }} />}
//               valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
//             />
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} lg={6}>
//           <Card hoverable style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
//             <Statistic
//               title="Hộ gia đình"
//               value={statistics.households}
//               prefix={<HomeOutlined style={{ color: '#52c41a' }} />}
//               valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
//             />
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} lg={6}>
//           <Card hoverable style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
//             <Statistic
//               title="Phương tiện Đăng ký"
//               value={statistics.vehicles}
//               prefix={<CarOutlined style={{ color: '#722ed1' }} />}
//               valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
//             />
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} lg={6}>
//           <Card hoverable style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
//             <Statistic
//               title="Cảnh báo An ninh"
//               value={statistics.alerts}
//               prefix={<AlertOutlined style={{ color: '#cf1322' }} />}
//               valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
//               suffix={statistics.alerts > 0 && <Tag color="red">Cao</Tag>}
//             />
//           </Card>
//         </Col>
//       </Row>

//       {/* 2. Biểu đồ + Bảng log real-time */}
//       <Row gutter={[16, 16]}>
//         {/* Biểu đồ */}
//         <Col xs={24} lg={10}>
//           <Card 
//             title="Phân bố Giới tính & Độ tuổi" 
//             bordered={false}
//             style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
//           >
//             <div style={{ marginBottom: 16 }}>
//               <Text strong>Nam giới</Text> ({malePercent}%) – {demographics.maleCount.toLocaleString()} người
//               <Progress percent={malePercent} strokeColor="#1890ff" showInfo={false} />
//             </div>
//             <div style={{ marginBottom: 16 }}>
//               <Text strong>Nữ giới</Text> ({femalePercent}%) – {demographics.femaleCount.toLocaleString()} người
//               <Progress percent={femalePercent} strokeColor="#eb2f96" showInfo={false} />
//             </div>
//             <div style={{ marginBottom: 16 }}>
//               <Text strong>Độ tuổi lao động (18–60)</Text> ({laborPercent}%)
//               <Progress percent={laborPercent} status="active" strokeColor="#52c41a" showInfo={false} />
//             </div>
//             <div>
//               <Text strong>Trẻ em & Người cao tuổi</Text> ({otherAgePercent}%)
//               <Progress percent={otherAgePercent} strokeColor="#fa8c16" showInfo={false} />
//             </div>
//           </Card>
//         </Col>

//         {/* Bảng log real-time */}
//         <Col xs={24} lg={14}>
//           <Card 
//             title={<><ClockCircleOutlined style={{ color: '#1890ff' }} /> Hoạt động hệ thống (Cập nhật tự động)</>}
//             bordered={false}
//             style={{ borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
//             extra={<Tag color="blue">Cập nhật mỗi 5s</Tag>}
//           >
//             <Table
//               dataSource={logDataSource}
//               columns={columns}
//               pagination={false}
//               size="small"
//               rowClassName={() => 'log-row'}
//               locale={{ emptyText: 'Chưa có hoạt động nào' }}
//               scroll={{ x: 500 }}
//             />
//           </Card>
//         </Col>
//       </Row>
//     </div>
//   );
// };

// export default Dashboard;

// import React, { useEffect, useState } from 'react';
// import { Row, Col, Card, Statistic, Progress, Table, Tag, Spin, Alert } from 'antd';
// import { ArrowUpOutlined, UserOutlined, HomeOutlined, CarOutlined, AlertOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';
// import axios from 'axios';

// // 1. Import Dayjs và các plugin cần thiết
// import dayjs from 'dayjs';
// import relativeTime from 'dayjs/plugin/relativeTime';
// import 'dayjs/locale/vi'; // Import ngôn ngữ tiếng Việt

// // 2. Cấu hình Dayjs
// dayjs.extend(relativeTime);
// dayjs.locale('vi'); // Thiết lập sử dụng tiếng Việt

// const Dashboard = () => {
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Cấu hình cột cho bảng Log
//   const columns = [
//     { 
//       title: 'Hoạt động', 
//       dataIndex: 'action', 
//       key: 'action', 
//       render: (text) => <b style={{color: '#1890ff'}}>{text}</b> 
//     },
//     { 
//       title: 'Thời gian', 
//       dataIndex: 'time', 
//       key: 'time', 
//       render: (text) => (
//         <span style={{ color: '#888', fontSize: '12px' }}>
//           {/* 3. Sử dụng fromNow() để hiển thị thời gian tương đối */}
//           <ClockCircleOutlined style={{marginRight: 5}}/>
//           {dayjs(text).fromNow()} 
//         </span>
//       )
//     },
//     { 
//       title: 'Trạng thái', 
//       dataIndex: 'status', 
//       key: 'status', 
//       render: status => {
//         let color = 'default';
//         let icon = null;
//         if (status === 'Thành công') { color = 'success'; icon = <CheckCircleOutlined />; }
//         else if (status === 'Thất bại') { color = 'error'; icon = <CloseCircleOutlined />; }
//         else if (status === 'Đang xử lý') { color = 'processing'; icon = <SyncOutlined spin />; }
//         return <Tag icon={icon} color={color}>{status}</Tag>;
//       }
//     },
//   ];

//   // Fetch dữ liệu định kỳ
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const response = await axios.get('http://localhost:5000/api/dashboard/overview');
//         setData(response.data);
//         setLoading(false);
//       } catch (err) {
//         console.error("Lỗi lấy dữ liệu:", err);
//         setError("Không thể kết nối đến server.");
//         setLoading(false);
//       }
//     };

//     fetchData();
//     // Refresh mỗi 5 giây để cập nhật log và thời gian "cách đây..."
//     const interval = setInterval(fetchData, 5000); 
//     return () => clearInterval(interval);
//   }, []);

//   const calculatePercent = (value, total) => {
//     if (!total || total === 0) return 0;
//     return Math.round((value / total) * 100);
//   };

//   if (loading) return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" tip="Đang tải dữ liệu hệ thống..." /></div>;
//   if (error) return <div style={{ padding: 24 }}><Alert message="Lỗi" description={error} type="error" showIcon /></div>;

//   const { statistics, demographics, recentLogs } = data || {};
  
//   if (!statistics || !demographics) {
//     return <div style={{ padding: 24 }}><Alert message="Lỗi định dạng dữ liệu" description="Server trả về dữ liệu không khớp cấu trúc mong đợi." type="error" showIcon /></div>;
//   }

//   // Dữ liệu cho bảng Log
//   const logDataSource = recentLogs ? recentLogs.map((log, index) => ({
//       key: index,
//       action: log.action,
//       time: log.time, // Chuỗi thời gian ISO từ backend
//       status: log.status
//   })) : [];

//   const malePercent = calculatePercent(demographics.maleCount, demographics.totalClassified);
//   const femalePercent = calculatePercent(demographics.femaleCount, demographics.totalClassified);
//   const laborPercent = calculatePercent(demographics.laborAgeCount, demographics.totalAgeClassified);
//   const otherAgePercent = 100 - laborPercent;

//   return (
//     <div style={{ padding: 24 }}>
//       <h2 style={{ marginBottom: 20 }}>📊 Tổng quan Hệ thống</h2>

//       {/* 1. HÀNG THỐNG KÊ SỐ LIỆU */}
//       <Row gutter={[16, 16]}>
//         <Col xs={24} sm={12} lg={6}>
//           <Card bordered={false} style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
//             <Statistic title="Tổng Dân số" value={statistics.population} prefix={<UserOutlined />} valueStyle={{ color: '#1890ff' }} />
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} lg={6}>
//           <Card bordered={false} style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
//             <Statistic title="Hộ gia đình" value={statistics.households} prefix={<HomeOutlined />} valueStyle={{ color: '#52c41a' }} />
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} lg={6}>
//           <Card bordered={false} style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
//             <Statistic title="Phương tiện Đăng ký" value={statistics.vehicles} prefix={<CarOutlined />} valueStyle={{ color: '#722ed1' }} />
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} lg={6}>
//           <Card bordered={false} style={{ background: '#fff1f0', borderColor: '#ffa39e' }}>
//             <Statistic title="Cảnh báo An ninh (F0/F1)" value={statistics.alerts} prefix={<AlertOutlined />} valueStyle={{ color: '#cf1322' }} suffix={<span style={{fontSize: 12, color: '#cf1322'}}><ArrowUpOutlined /> High Risk</span>} />
//           </Card>
//         </Col>
//       </Row>

//       <div style={{ marginTop: 24 }}></div>

//       {/* 2. HÀNG BIỂU ĐỒ VÀ HOẠT ĐỘNG */}
//       <Row gutter={[16, 16]}>
//         <Col xs={24} lg={10}>
//           <Card title="Thống kê theo Độ tuổi & Giới tính" bordered={false}>
//             <div style={{ marginBottom: 15 }}><span>Nam giới ({malePercent}%) - {demographics.maleCount} người</span><Progress percent={malePercent} strokeColor="#1890ff" /></div>
//             <div style={{ marginBottom: 15 }}><span>Nữ giới ({femalePercent}%) - {demographics.femaleCount} người</span><Progress percent={femalePercent} strokeColor="#eb2f96" /></div>
//             <div style={{ marginBottom: 15 }}><span>Độ tuổi lao động (18-60) ({laborPercent}%)</span><Progress percent={laborPercent} status="active" strokeColor="#52c41a" /></div>
//             <div><span>Trẻ em & Người già ({otherAgePercent}%)</span><Progress percent={otherAgePercent} strokeColor="orange" /></div>
//           </Card>
//         </Col>

//         {/* Bảng Log Real-time */}
//         <Col xs={24} lg={14}>
//           <Card title={<><ClockCircleOutlined /> Lịch sử hoạt động Hệ thống (Real-time)</>} bordered={false}>
//              <Table 
//                dataSource={logDataSource} 
//                columns={columns} 
//                pagination={false} 
//                size="small"
//                locale={{emptyText: 'Chưa có dữ liệu hoạt động'}}
//              />
//           </Card>
//         </Col>
//       </Row>
//     </div>
//   );
// };

// export default Dashboard;


// import React, { useEffect, useState } from 'react';
// import { Row, Col, Card, Statistic, Progress, Table, Tag, Spin, Alert } from 'antd';
// import { ArrowUpOutlined, UserOutlined, HomeOutlined, CarOutlined, AlertOutlined } from '@ant-design/icons';
// import axios from 'axios';

// const Dashboard = () => {
//   // State lưu dữ liệu từ Backend
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Dữ liệu giả lập cho bảng hoạt động gần đây (Theo yêu cầu giữ nguyên)
//   const recentActivities = [
//     { key: '1', user: 'Nguyễn Văn A', action: 'Đăng ký thường trú', time: '10 phút trước', status: 'success' },
//     { key: '2', user: 'Lê Thị B', action: 'Khai báo y tế', time: '30 phút trước', status: 'warning' },
//     { key: '3', user: 'Trần Văn C', action: 'Sang tên xe máy', time: '1 giờ trước', status: 'processing' },
//   ];

//   const columns = [
//     { title: 'Công dân', dataIndex: 'user', key: 'user', render: (text) => <b>{text}</b> },
//     { title: 'Hoạt động', dataIndex: 'action', key: 'action' },
//     { title: 'Thời gian', dataIndex: 'time', key: 'time', style: { color: '#888' } },
//     { 
//       title: 'Trạng thái', dataIndex: 'status', key: 'status', 
//       render: status => {
//         let color = status === 'success' ? 'green' : status === 'warning' ? 'orange' : 'blue';
//         let text = status === 'success' ? 'Hoàn tất' : status === 'warning' ? 'Cảnh báo' : 'Đang xử lý';
//         return <Tag color={color}>{text}</Tag>;
//       }
//     },
//   ];

//   // Hàm fetch dữ liệu thật
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         // Thay đổi port 5000 tùy theo cấu hình Backend của bạn
//         const response = await axios.get('http://localhost:5000/api/dashboard/overview');
//         setData(response.data);
//         setLoading(false);
//       } catch (err) {
//         console.error("Lỗi lấy dữ liệu:", err);
//         setError("Không thể kết nối đến server.");
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, []);

//   // Tính toán phần trăm để hiển thị
//   const calculatePercent = (value, total) => {
//     if (!total || total === 0) return 0;
//     return Math.round((value / total) * 100);
//   };

//   if (loading) return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" tip="Đang tải dữ liệu hệ thống..." /></div>;
//   if (error) return <div style={{ padding: 24 }}><Alert message="Lỗi" description={error} type="error" showIcon /></div>;

//   // Destructuring dữ liệu cho gọn
//   const { statistics, demographics } = data || {};
  
//   if (!statistics || !demographics) {
//     return <div style={{ padding: 24 }}><Alert message="Lỗi định dạng dữ liệu" description="Server trả về dữ liệu không khớp cấu trúc mong đợi." type="error" showIcon /></div>;
//   }
//   // Tính toán phần trăm biểu đồ
//   const malePercent = calculatePercent(demographics.maleCount, demographics.totalClassified);
//   const femalePercent = calculatePercent(demographics.femaleCount, demographics.totalClassified);
//   const laborPercent = calculatePercent(demographics.laborAgeCount, demographics.totalAgeClassified);
//   const otherAgePercent = 100 - laborPercent;

//   return (
//     <div style={{ padding: 24 }}>
//       <h2 style={{ marginBottom: 20 }}>📊 Tổng quan Hệ thống</h2>

//       {/* 1. HÀNG THỐNG KÊ SỐ LIỆU (CARDS) - DỮ LIỆU THẬT */}
//       <Row gutter={[16, 16]}>
//         <Col xs={24} sm={12} lg={6}>
//           <Card bordered={false} style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
//             <Statistic 
//               title="Tổng Dân số" 
//               value={statistics.population} 
//               prefix={<UserOutlined />} 
//               valueStyle={{ color: '#1890ff' }}
//             />
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} lg={6}>
//           <Card bordered={false} style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
//             <Statistic 
//               title="Hộ gia đình" 
//               value={statistics.households} 
//               prefix={<HomeOutlined />} 
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} lg={6}>
//           <Card bordered={false} style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
//             <Statistic 
//               title="Phương tiện Đăng ký" 
//               value={statistics.vehicles} // Dữ liệu này trả về 0 do Graph chưa có
//               prefix={<CarOutlined />} 
//               valueStyle={{ color: '#722ed1' }}
//               // suffix={<span style={{fontSize: 12, color: '#999'}}>(Chưa có dữ liệu)</span>}
//             />
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} lg={6}>
//           <Card bordered={false} style={{ background: '#fff1f0', borderColor: '#ffa39e' }}>
//             <Statistic 
//               title="Cảnh báo An ninh (F0/F1)" 
//               value={statistics.alerts} 
//               prefix={<AlertOutlined />} 
//               valueStyle={{ color: '#cf1322' }}
//               suffix={<span style={{fontSize: 12, color: '#cf1322'}}><ArrowUpOutlined /> High Risk</span>}
//             />
//           </Card>
//         </Col>
//       </Row>

//       <div style={{ marginTop: 24 }}></div>

//       {/* 2. HÀNG BIỂU ĐỒ VÀ HOẠT ĐỘNG */}
//       <Row gutter={[16, 16]}>
//         {/* Cột trái: Tỷ lệ dân số - DỮ LIỆU THẬT */}
//         <Col xs={24} lg={10}>
//           <Card title="Thống kê theo Độ tuổi & Giới tính" bordered={false}>
//             <div style={{ marginBottom: 15 }}>
//               <span>Nam giới ({malePercent}%) - {demographics.maleCount} người</span>
//               <Progress percent={malePercent} strokeColor="#1890ff" />
//             </div>
//             <div style={{ marginBottom: 15 }}>
//               <span>Nữ giới ({femalePercent}%) - {demographics.femaleCount} người</span>
//               <Progress percent={femalePercent} strokeColor="#eb2f96" />
//             </div>
//             <div style={{ marginBottom: 15 }}>
//               <span>Độ tuổi lao động (18-60) ({laborPercent}%)</span>
//               <Progress percent={laborPercent} status="active" strokeColor="#52c41a" />
//             </div>
//             <div> 
//               <span>Trẻ em & Người già ({otherAgePercent}%)</span>
//               <Progress percent={otherAgePercent} strokeColor="orange" />
//             </div>
//           </Card>
//         </Col>

//         {/* Cột phải: Hoạt động gần đây (MOCK DATA GIỮ NGUYÊN) */}
//         <Col xs={24} lg={14}>
//           <Card title="Hoạt động Gần đây (Real-time)" bordered={false}>
//              <Table 
//                dataSource={recentActivities} 
//                columns={columns} 
//                pagination={false} 
//                size="small"
//              />
//           </Card>
//         </Col>
//       </Row>
//     </div>
//   );
// };

// export default Dashboard;

// import React from 'react';
// import { Row, Col, Card, Statistic, Progress, Table, Tag } from 'antd';
// import { ArrowUpOutlined, UserOutlined, HomeOutlined, CarOutlined, AlertOutlined } from '@ant-design/icons';

// const Dashboard = () => {
//   // Dữ liệu giả lập cho bảng
//   const recentActivities = [
//     { key: '1', user: 'Nguyễn Văn A', action: 'Đăng ký thường trú', time: '10 phút trước', status: 'success' },
//     { key: '2', user: 'Lê Thị B', action: 'Khai báo y tế', time: '30 phút trước', status: 'warning' },
//     { key: '3', user: 'Trần Văn C', action: 'Sang tên xe máy', time: '1 giờ trước', status: 'processing' },
//   ];

//   const columns = [
//     { title: 'Công dân', dataIndex: 'user', key: 'user', render: (text) => <b>{text}</b> },
//     { title: 'Hoạt động', dataIndex: 'action', key: 'action' },
//     { title: 'Thời gian', dataIndex: 'time', key: 'time', style: { color: '#888' } },
//     { 
//       title: 'Trạng thái', dataIndex: 'status', key: 'status', 
//       render: status => {
//         let color = status === 'success' ? 'green' : status === 'warning' ? 'orange' : 'blue';
//         let text = status === 'success' ? 'Hoàn tất' : status === 'warning' ? 'Cảnh báo' : 'Đang xử lý';
//         return <Tag color={color}>{text}</Tag>;
//       }
//     },
//   ];

//   return (
//     <div>
//       <h2 style={{ marginBottom: 20 }}>📊 Tổng quan Hệ thống</h2>

//       {/* 1. HÀNG THỐNG KÊ SỐ LIỆU (CARDS) */}
//       <Row gutter={[16, 16]}>
//         <Col xs={24} sm={12} lg={6}>
//           <Card bordered={false} style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
//             <Statistic 
//               title="Tổng Dân số" 
//               value={1254302} 
//               prefix={<UserOutlined />} 
//               valueStyle={{ color: '#1890ff' }}
//             />
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} lg={6}>
//           <Card bordered={false} style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
//             <Statistic 
//               title="Hộ gia đình" 
//               value={340120} 
//               prefix={<HomeOutlined />} 
//               valueStyle={{ color: '#52c41a' }}
//             />
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} lg={6}>
//           <Card bordered={false} style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
//             <Statistic 
//               title="Phương tiện Đăng ký" 
//               value={893201} 
//               prefix={<CarOutlined />} 
//               valueStyle={{ color: '#722ed1' }}
//             />
//           </Card>
//         </Col>
//         <Col xs={24} sm={12} lg={6}>
//           <Card bordered={false} style={{ background: '#fff1f0', borderColor: '#ffa39e' }}>
//             <Statistic 
//               title="Cảnh báo An ninh" 
//               value={12} 
//               prefix={<AlertOutlined />} 
//               valueStyle={{ color: '#cf1322' }}
//               suffix={<span style={{fontSize: 12, color: '#888'}}>(<ArrowUpOutlined /> +2)</span>}
//             />
//           </Card>
//         </Col>
//       </Row>

//       <div style={{ marginTop: 24 }}></div>

//       {/* 2. HÀNG BIỂU ĐỒ VÀ HOẠT ĐỘNG */}
//       <Row gutter={[16, 16]}>
//         {/* Cột trái: Tỷ lệ dân số */}
//         <Col xs={24} lg={10}>
//           <Card title="Thống kê theo Độ tuổi & Giới tính" bordered={false}>
//             <div style={{ marginBottom: 15 }}>
//               <span>Nam giới (49%)</span>
//               <Progress percent={49} strokeColor="#1890ff" />
//             </div>
//             <div style={{ marginBottom: 15 }}>
//               <span>Nữ giới (51%)</span>
//               <Progress percent={51} strokeColor="#eb2f96" />
//             </div>
//             <div style={{ marginBottom: 15 }}>
//               <span>Độ tuổi lao động (18-60)</span>
//               <Progress percent={68} status="active" />
//             </div>
//             <div>
//               <span>Trẻ em & Người già</span>
//               <Progress percent={32} strokeColor="orange" />
//             </div>
//           </Card>
//         </Col>

//         {/* Cột phải: Hoạt động gần đây */}
//         <Col xs={24} lg={14}>
//           <Card title="Hoạt động Gần đây (Real-time)" bordered={false}>
//              <Table 
//                dataSource={recentActivities} 
//                columns={columns} 
//                pagination={false} 
//                size="small"
//              />
//           </Card>
//         </Col>
//       </Row>
//     </div>
//   );
// };

// export default Dashboard;