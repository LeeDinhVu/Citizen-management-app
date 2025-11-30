import React, { useState, useEffect, useRef } from 'react';
import { 
  Tabs, Card, Button, Input, Statistic, Tag, 
  Table, Descriptions, notification, Row, Col, Spin, Empty, Typography 
} from 'antd';
import { 
  SearchOutlined, RetweetOutlined, SafetyCertificateOutlined, 
  DeploymentUnitOutlined, UnorderedListOutlined 
} from '@ant-design/icons';
import { Network } from "vis-network/standalone";
import axios from 'axios';

const { Title } = Typography;

// --- CẤU HÌNH API URL CHÍNH XÁC ---
const API_URL = 'http://localhost:5000/api/trace';

const TracePage = () => {
  const [cccd, setCccd] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const networkRef = useRef(null);
  const containerRef = useRef(null);

  // Gọi API
  const handleTrace = async () => {
    // [VALIDATE FRONTEND] Kiểm tra CCCD 12 số
    if (!cccd) {
      notification.warning({ message: 'Vui lòng nhập số CCCD' });
      return;
    }
    if (!/^\d{12}$/.test(cccd)) {
      notification.error({ message: 'CCCD không hợp lệ', description: 'Số CCCD phải bao gồm đúng 12 chữ số.' });
      return;
    }

    setLoading(true);
    setSelectedNode(null);
    setData(null);

    try {
      // URL thực tế: http://localhost:5000/api/trace/001...
      const res = await axios.get(`${API_URL}/${cccd}`);
      
      if (res.data) {
        setData(res.data);
        notification.success({ 
            message: 'Truy vết thành công', 
            description: `Tìm thấy ${res.data.nodes.length > 0 ? res.data.nodes.length - 1 : 0} đối tượng liên quan.` 
        });
      } else {
        notification.info({ message: 'Không tìm thấy dữ liệu liên quan' });
      }
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Không có dữ liệu hoặc lỗi kết nối.';
      notification.error({ message: 'Lỗi truy vết', description: msg });
    } finally {
      setLoading(false);
    }
  };

  const safeDateStr = (dateVal) => {
    if (!dateVal) return '';
    // Nếu là chuỗi (String)
    if (typeof dateVal === 'string') return dateVal.split('T')[0];
    // Nếu là Neo4j Object (có dạng {year, month, day})
    if (typeof dateVal === 'object' && dateVal !== null) {
        // Ưu tiên check nếu có thuộc tính year/month/day
        if (dateVal.year) {
             const m = String(dateVal.month).padStart(2, '0');
             const d = String(dateVal.day).padStart(2, '0');
             return `${dateVal.year}-${m}-${d}`;
        }
    }
    return String(dateVal); // Fallback
  };

  // Vẽ biểu đồ khi có data
  useEffect(() => {
    if (data && containerRef.current) {
      // Chuẩn hóa nodes
      const nodes = data.nodes.map(n => ({
        id: n.id,
        label: (n.group === 'Location' && n.label.length > 15) ? n.label.substring(0, 15) + '...' : n.label,
        group: n.group,
        title: n.label, // Tooltip đơn giản là tên, chi tiết xem ở panel bên phải
        shape: n.group === 'Location' ? 'hexagon' : 'dot',
        size: n.group === 'F0' ? 35 : n.group === 'Location' ? 30 : 25,
        font: { color: n.group === 'F0' ? 'white' : 'black', size: 14 }
      }));

      // Chuẩn hóa edges
      const edges = data.edges.map(e => {
        // Xử lý nhãn ngày tháng an toàn
        let labelText = '';
        if (e.label === 'VISITED' && e.info?.visitDate) {
            labelText = safeDateStr(e.info.visitDate);
        } else if (e.label === 'CONTACTED') {
            labelText = 'Tiếp xúc';
        }

        return {
            from: e.from,
            to: e.to,
            label: labelText,
            arrows: 'to',
            color: { color: '#bdc3c7' },
            dashes: e.label === 'VISITED',
            smooth: { type: 'continuous' }
        };
      });

      const options = {
        groups: {
          F0: { color: { background: '#ff4d4d', border: '#b30000' }, font: { color: 'white' } }, // Đỏ
          F1: { color: { background: '#ff9f40', border: '#e65c00' } }, // Cam
          F1_Indirect: { color: { background: '#f1c40f', border: '#f39c12' } }, // Vàng
          Location: { color: { background: '#3498db', border: '#2980b9' }, font: { color: 'white' } } // Xanh
        },
        physics: { stabilization: true, barnesHut: { gravitationalConstant: -3000 } },
        interaction: { hover: true, tooltipDelay: 200 },
        layout: { randomSeed: 2 }
      };

      // Khởi tạo Network
      networkRef.current = new Network(containerRef.current, { nodes, edges }, options);

      // Bắt sự kiện Click
        networkRef.current.on("click", (params) => {
            if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const nodeDetails = data.nodes.find(n => n.id === nodeId);
            
            // Khi click, clone ra object mới và format lại date trong info để hiển thị đẹp hơn
            if (nodeDetails) {
                const displayInfo = { ...nodeDetails.info };
                // Format lại các trường ngày tháng trong info nếu có
                ['visitDate', 'ngaySinh', 'lastContactDate'].forEach(field => {
                    if (displayInfo[field]) displayInfo[field] = safeDateStr(displayInfo[field]);
                });
                
                setSelectedNode({
                    ...nodeDetails,
                    info: displayInfo
                });
            }
            } else {
            setSelectedNode(null);
            }
        });
    }
  }, [data]);

  // Cấu hình cột cho bảng
  const tableColumns = [
    {
      title: 'Phân loại',
      dataIndex: 'group',
      render: (g) => {
        let color = g === 'F1' ? 'orange' : g === 'F1_Indirect' ? 'gold' : 'blue';
        let text = g === 'F1' ? 'F1 Trực tiếp' : g === 'F1_Indirect' ? 'F1 Gián tiếp' : g;
        return <Tag color={color}>{text}</Tag>;
      }
    },
    { title: 'Tên / Địa điểm', dataIndex: 'label', render: t => <b>{t}</b> },
    { title: 'Mã (CCCD/ID)', dataIndex: ['info', 'cccd'], render: (text, record) => text || record.info.code || '-' },
    { title: 'SĐT', dataIndex: ['info', 'soDienThoai'], render: t => t || '-' },
    { title: 'Địa chỉ', dataIndex: ['info', 'thuongTru'], ellipsis: true, render: t => t || '-' },
  ];

  // Lọc F0 khỏi danh sách bảng để tập trung vào F1/Location
  const tableData = data ? data.nodes.filter(n => n.group !== 'F0') : [];

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: '#001529' }}><SafetyCertificateOutlined /> Truy vết Dịch tễ & Tiếp xúc</Title>
        <Button icon={<RetweetOutlined />} onClick={() => { setCccd(''); setData(null); setSelectedNode(null); }}>Làm mới</Button>
      </div>

      {/* SEARCH CARD */}
      <Card style={{ marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Row gutter={16} align="middle">
          <Col span={10}>
            <Input 
              size="large" 
              placeholder="Nhập CCCD F0 (Ví dụ: 001093000001)..." 
              value={cccd} 
              // [IMPROVE] Chỉ cho phép nhập số
              onChange={e => {
                  const val = e.target.value;
                  if (!val || /^\d+$/.test(val)) setCccd(val);
              }} 
              prefix={<SearchOutlined />} 
              onPressEnter={handleTrace}
              maxLength={12} // Giới hạn 12 ký tự
              allowClear
            />
          </Col>
          <Col span={4}>
            <Button type="primary" size="large" onClick={handleTrace} loading={loading} block>Bắt đầu Truy vết</Button>
          </Col>
          {data && (
            <Col span={10} style={{ textAlign: 'right' }}>
              <Statistic 
                title="Đối tượng liên quan (Nodes)" 
                value={tableData.length} 
                valueStyle={{ color: '#cf1322', fontWeight: 'bold' }} 
                prefix={<SafetyCertificateOutlined />} 
              />
            </Col>
          )}
        </Row>
      </Card>

      {/* MAIN CONTENT TAB */}
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Tabs defaultActiveKey="1" items={[
          {
            key: '1',
            label: <span><DeploymentUnitOutlined /> Biểu đồ mạng (Graph)</span>,
            children: (
              <Row gutter={16}>
                <Col span={17}>
                  <div 
                    ref={containerRef} 
                    style={{ 
                        height: '600px', 
                        border: '1px solid #f0f0f0', 
                        background: '#fafafa', 
                        borderRadius: 8,
                        position: 'relative'
                    }}
                  >
                    {!data && !loading && <Empty style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }} description="Vui lòng nhập CCCD để hiển thị mạng lưới" />}
                    {loading && <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)' }}><Spin size="large" tip="Đang phân tích dữ liệu..." /></div>}
                  </div>
                </Col>
                <Col span={7}>
                  <Card title="Chi tiết Thông tin" style={{ height: '600px', overflowY: 'auto' }}>
                    {selectedNode ? (
                      <div>
                          <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <Tag color={
                                selectedNode.group === 'F0' ? 'red' : 
                                selectedNode.group === 'F1' ? 'orange' : 
                                selectedNode.group === 'F1_Indirect' ? 'gold' : 'blue'
                            } style={{ fontSize: 16, padding: '5px 10px' }}>
                                {selectedNode.group}
                            </Tag>
                          </div>
                          <Descriptions column={1} size="small" bordered>
                            {Object.entries(selectedNode.info).map(([k, v]) => (
                               <Descriptions.Item key={k} labelStyle={{ fontWeight: 'bold' }} label={k}>{String(v)}</Descriptions.Item>
                            ))}
                          </Descriptions>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#999', marginTop: 100 }}>
                        <p>Nhấp chuột vào một nút tròn trên biểu đồ để xem chi tiết.</p>
                      </div>
                    )}
                    
                    <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #eee' }}>
                      <b>Chú thích màu sắc:</b><br/>
                      <Tag color="red" style={{marginTop: 5}}>F0</Tag> Nguồn bệnh<br/>
                      <Tag color="orange" style={{marginTop: 5}}>F1</Tag> Tiếp xúc trực tiếp<br/>
                      <Tag color="gold" style={{marginTop: 5}}>F1 Gián tiếp</Tag> Qua địa điểm<br/>
                      <Tag color="blue" style={{marginTop: 5}}>Địa điểm</Tag> Nơi công cộng
                    </div>
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: '2',
            label: <span><UnorderedListOutlined /> Danh sách chi tiết (Table)</span>,
            children: <Table dataSource={tableData} columns={tableColumns} rowKey="id" />
          }
        ]} />
      </div>
    </div>
  );
};

export default TracePage;