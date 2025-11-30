// src/pages/security/CaseDetail.jsx
// src/pages/security/CaseDetail.jsx
import { Drawer, List } from "antd";
import { apiGetPersonHistory } from "../../services/api/criminalApi";
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Typography,
  message,
  Spin,
  Alert,
  Divider,
  Empty,
} from "antd";
import {
  EditOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  AlertOutlined,
  NodeIndexOutlined,
  HeatMapOutlined,
} from "@ant-design/icons";

import {
  apiGetCaseById,
  apiGetCaseGraph,
  apiGetHeatmap,
} from "../../services/api/criminalApi";
import CrimeGraph from "../../components/security/CrimeGraph";
import CrimeHeatmap from "../../components/security/CrimeHeatmap";
import CaseForm from "../../components/security/CaseForm";
import PersonCard from "../../components/security/PersonCard";

const { Title, Text } = Typography;

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [editing, setEditing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personHistory, setPersonHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ĐÚNG THỨ TỰ HOOKS – useMemo TRƯỚC useEffect!
  const people = useMemo(() => {
  if (!graphData?.nodes || !graphData?.links || !caseData) return [];

  
  const caseNode = graphData.nodes.find(n => n.label.includes("Vụ án") || n.id.includes("67"));
  if (!caseNode) return [];

  
  const personNodes = graphData.nodes.filter(n => n.id !== caseNode.id);

  return personNodes.map(node => {
    const cccd = node.label.trim(); // 
    const name = `CCCD: ${cccd}`;

    // Tìm link để xác định vai trò
    const link = graphData.links.find(l => 
      l.source === node.id || l.target === node.id
    );

    let role = "UNKNOWN";
    if (link?.type === "SUSPECT_IN") role = "SUSPECT";
    else if (link?.type === "VICTIM_IN") role = "VICTIM";
    else if (link?.type === "WITNESS_IN") role = "WITNESS";

    return {
      id: cccd,
      name,
      cccd,
      role,
    };
  });
}, [graphData, caseData]);


  const loadPersonHistory = async (cccd) => {
  if (!cccd) return;
  setHistoryLoading(true);
  try {
    const data = await apiGetPersonHistory(cccd);
    setPersonHistory(data || []);
  } catch (err) {
    message.error("Không tải được lịch sử phạm tội");
    setPersonHistory([]);
  } finally {
    setHistoryLoading(false);
  }
};

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [caseRes, graphRes, heatmapRes] = await Promise.all([
          apiGetCaseById(id),
          apiGetCaseGraph(id),
          apiGetHeatmap(),
        ]);

        // Vụ án
        const caseObj = caseRes?.data || caseRes;
        setCaseData({
          caseId: caseObj.caseId || caseObj.CaseId,
          caseNumber: caseObj.caseNumber || "Chưa có số hiệu",
          crimeType: caseObj.crimeType || "Khác",
          description: caseObj.description || "Không có mô tả",
          occurredDate: caseObj.occurredDate || "Không rõ",
          reportedDate: caseObj.reportedDate || "Chưa báo cáo",
          location: caseObj.location || "Không rõ",
          status: caseObj.status || "Đang điều tra",
        });

        // Đồ thị – backend phải trả đúng format
        const graph = graphRes?.result || graphRes?.data || graphRes;
        setGraphData(graph || { nodes: [], links: [] });

        // Bản đồ nóng – sửa format đúng chuẩn Google Maps Heatmap
        const heat = (heatmapRes?.data || heatmapRes || []).map(item => ({
          lat: parseFloat(item.latitude || item.lat || item.Lat),
          lng: parseFloat(item.longitude || item.lng || item.Lng),
          weight: parseFloat(item.count || item.weight || 1),
        })).filter(p => !isNaN(p.lat) && !isNaN(p.lng));
        setHeatmapData(heat);

      } catch (err) {
        message.error("Lỗi tải dữ liệu: " + (err.message || "Unknown"));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleUpdateSuccess = () => {
    setEditing(false);
    message.success("Cập nhật thành công!");
    window.location.reload();
  };

  const getStatusColor = (s) => {
    const map = {
      "Đang điều tra": "processing",
      "Đã kết án": "success",
      "Tạm đình chỉ": "warning",
      "Đã đóng": "default",
    };
    return map[s] || "default";
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Spin size="large" tip="Đang tải..." /></div>;
  if (!caseData) return <Alert message="Không tìm thấy vụ án" type="error" showIcon className="m-8" />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} size="large">
            Quay lại
          </Button>
          <div>
            <Title level={2} className="m-0">Vụ án: {caseData.caseId}</Title>
            <Text type="secondary" className="text-lg">Số hiệu: {caseData.caseNumber}</Text>
          </div>
        </div>
        <Button type="primary" icon={<EditOutlined />} size="large" onClick={() => setEditing(true)}>
          Sửa vụ án
        </Button>
      </div>

      <Row gutter={[24, 24]}>
        {/* Cột trái */}
        <Col xs={24} lg={14}>
          <Card title={<><AlertOutlined /> Thông tin vụ án</>} className="shadow-xl" hoverable>
            <Space direction="vertical" size="large" className="w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Text strong>Loại tội phạm:</Text> <Tag color="red" className="ml-3 text-base">{caseData.crimeType}</Tag></div>
                <div><Text strong>Trạng thái:</Text> <Tag color={getStatusColor(caseData.status)} className="ml-3 text-base">{caseData.status}</Tag></div>
              </div>
              <div className="space-y-3 text-base">
                <div><Text strong>Ngày xảy ra:</Text> <Text className="ml-2 font-medium">{caseData.occurredDate}</Text></div>
                <div><Text strong>Ngày báo cáo:</Text> <Text className="ml-2">{caseData.reportedDate}</Text></div>
                <div><Text strong>Địa điểm:</Text> <Text className="ml-2 font-medium text-blue-700">{caseData.location}</Text></div>
              </div>
              <div>
                <Text strong>Mô tả:</Text>
                <div className="mt-3 p-5 bg-gray-100 rounded-xl">{caseData.description}</div>
              </div>
            </Space>
          </Card>

          <Divider className="my-10" />

          <Card title={<><NodeIndexOutlined /> Mạng quan hệ vụ án</>} className="shadow-xl" hoverable>
            {graphData?.nodes?.length > 1 ? (
              <div className="h-96 rounded-xl overflow-hidden border">
                <CrimeGraph data={graphData} />
              </div>
            ) : (
              <Empty description="Chưa có dữ liệu quan hệ" />
            )}
          </Card>
        </Col>

        {/* Cột phải */}
        <Col xs={24} lg={10}>
          <Card title={<><HeatMapOutlined /> Bản đồ nóng tội phạm</>} className="shadow-xl mb-6" hoverable>
            {heatmapData.length > 0 ? (
              <div className="h-64 rounded-xl overflow-hidden border">
                <CrimeHeatmap data={heatmapData} />
              </div>
            ) : (
              <Empty description="Không có dữ liệu nóng" className="py-12" />
            )}
          </Card>

          <Card title={<><UserOutlined /> Người liên quan</>} className="shadow-xl" hoverable>
            {people.length > 0 ? (
              <Space direction="vertical" className="w-full">
                {people.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPerson(p);
                      setDrawerOpen(true);
                      loadPersonHistory(p.cccd);
                    }}
                    className="p-4 border rounded-lg hover:bg-blue-50 cursor-pointer transition-all hover:shadow-md"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-lg">{p.name}</div>
                        {p.cccd && <div className="text-gray-600">CCCD: {p.cccd}</div>}
                      </div>
                      <Tag
                        color={
                          p.role === "SUSPECT" ? "red" :
                          p.role === "VICTIM" ? "orange" :
                          p.role === "WITNESS" ? "blue" : "default"
                        }
                        className="text-base"
                      >
                        {p.role === "SUSPECT" ? "Nghi phạm" :
                        p.role === "VICTIM" ? "Nạn nhân" :
                        p.role === "WITNESS" ? "Nhân chứng" : p.role}
                      </Tag>
                    </div>
                  </div>
                ))}
              </Space>
            ) : (
              <Empty description="Chưa có người liên quan" className="py-12" />
            )}
          </Card>
        </Col>
      </Row>

      {editing && (
        <CaseForm
          open={editing}
          onClose={() => setEditing(false)}
          initial={caseData}
          mode="update"
          onSuccess={handleUpdateSuccess}
        />
      )}
      <Drawer
  title={
    selectedPerson ? (
      <div>
        <div className="text-xl font-bold">{selectedPerson.name}</div>
        <div className="text-gray-600">CCCD: {selectedPerson.cccd}</div>
      </div>
    ) : "Lịch sử phạm tội"
  }
  open={drawerOpen}
  onClose={() => {
    setDrawerOpen(false);
    setSelectedPerson(null);
    setPersonHistory([]);
  }}
  width={600}
  placement="right"
>
  {historyLoading ? (
    <div className="flex justify-center items-center h-64">
      <Spin size="large" tip="Đang tải lịch sử..." />
    </div>
  ) : personHistory.length === 0 ? (
    <Empty 
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description="Không có tiền án tiền sự"
    />
  ) : (
    <List
      dataSource={personHistory}
      renderItem={(item) => (
        <List.Item>
          <Card className="w-full hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-bold text-lg text-blue-700">
                  {item.caseNumber}
                </div>
                <div className="text-gray-700 mt-1">
                  <strong>Tội danh:</strong> {item.crimeType}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  <div>• Vai trò: <Tag color={item.role === "SUSPECT" ? "red" : item.role === "VICTIM" ? "orange" : "blue"}>
                    {item.role === "SUSPECT" ? "Nghi phạm" : item.role === "VICTIM" ? "Nạn nhân" : "Nhân chứng"}
                  </Tag></div>
                  <div>• Ngày xảy ra: {item.occurredDate}</div>
                  <div>• Trạng thái: <Tag color={item.status === "Đã kết án" ? "red" : "blue"}>{item.status}</Tag></div>
                </div>
              </div>
            </div>
          </Card>
        </List.Item>
      )}
    />
  )}
</Drawer>
    </div>
    
  );
}

// import React, { useEffect, useState, useMemo } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import {
//   Card,
//   Row,
//   Col,
//   Tag,
//   Button,
//   Space,
//   Typography,
//   message,
//   Spin,
//   Alert,
//   Divider,
//   Empty,
// } from "antd";
// import {
//   EditOutlined,
//   ArrowLeftOutlined,
//   UserOutlined,
//   AlertOutlined,
//   NodeIndexOutlined,
//   HeatMapOutlined,
// } from "@ant-design/icons";

// import {
//   apiGetCaseById,
//   apiGetCaseGraph,
//   apiGetHeatmap,
// } from "../../services/api/criminalApi";
// import CrimeGraph from "../../components/security/CrimeGraph";
// import CrimeHeatmap from "../../components/security/CrimeHeatmap";
// import CaseForm from "../../components/security/CaseForm";
// import PersonCard from "../../components/security/PersonCard";

// const { Title, Text } = Typography;

// export default function CaseDetail() {
//   const { id } = useParams();
//   const navigate = useNavigate();

//   const [loading, setLoading] = useState(true);
//   const [caseData, setCaseData] = useState(null);
//   const [graphData, setGraphData] = useState(null);
//   const [heatmapData, setHeatmapData] = useState([]);
//   const [editing, setEditing] = useState(false);

//   // ĐÚNG THỨ TỰ HOOKS – useMemo TRƯỚC useEffect!
//   const people = useMemo(() => {
//     if (!graphData?.nodes || graphData.nodes.length === 0) return [];

//     return graphData.nodes
//       .filter(node => node.properties?.role) // chỉ lấy node là người
//       .map(node => {
//         const role = node.properties.role;
//         const fullName = node.properties.fullName?.trim();
//         const name = fullName && fullName !== "Chưa xác định" && fullName !== ""
//           ? fullName
//           : node.properties.cccd
//           ? `CCCD: ${node.properties.cccd}`
//           : "Chưa xác định";

//         return {
//           id: node.id,
//           name,
//           cccd: node.properties.cccd || null,
//           role,
//         };
//       });
//   }, [graphData]);

//   useEffect(() => {
//     const loadData = async () => {
//       if (!id) return;
//       setLoading(true);
//       try {
//         const [caseRes, graphRes, heatmapRes] = await Promise.all([
//           apiGetCaseById(id),
//           apiGetCaseGraph(id),
//           apiGetHeatmap(),
//         ]);

//         // Vụ án
//         const caseObj = caseRes?.data || caseRes;
//         setCaseData({
//           caseId: caseObj.caseId || caseObj.CaseId,
//           caseNumber: caseObj.caseNumber || "Chưa có số hiệu",
//           crimeType: caseObj.crimeType || "Khác",
//           description: caseObj.description || "Không có mô tả",
//           occurredDate: caseObj.occurredDate || "Không rõ",
//           reportedDate: caseObj.reportedDate || "Chưa báo cáo",
//           location: caseObj.location || "Không rõ",
//           status: caseObj.status || "Đang điều tra",
//         });

//         // Đồ thị – backend phải trả đúng format
//         const graph = graphRes?.result || graphRes?.data || graphRes;
//         setGraphData(graph || { nodes: [], links: [] });

//         // Bản đồ nóng – sửa format đúng chuẩn Google Maps Heatmap
//         const heat = (heatmapRes?.data || heatmapRes || []).map(item => ({
//           lat: parseFloat(item.latitude || item.lat || item.Lat),
//           lng: parseFloat(item.longitude || item.lng || item.Lng),
//           weight: parseFloat(item.count || item.weight || 1),
//         })).filter(p => !isNaN(p.lat) && !isNaN(p.lng));
//         setHeatmapData(heat);

//       } catch (err) {
//         message.error("Lỗi tải dữ liệu: " + (err.message || "Unknown"));
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadData();
//   }, [id]);

//   const handleUpdateSuccess = () => {
//     setEditing(false);
//     message.success("Cập nhật thành công!");
//     window.location.reload();
//   };

//   const getStatusColor = (s) => {
//     const map = {
//       "Đang điều tra": "processing",
//       "Đã kết án": "success",
//       "Tạm đình chỉ": "warning",
//       "Đã đóng": "default",
//     };
//     return map[s] || "default";
//   };

//   if (loading) return <div className="flex justify-center items-center min-h-screen"><Spin size="large" tip="Đang tải..." /></div>;
//   if (!caseData) return <Alert message="Không tìm thấy vụ án" type="error" showIcon className="m-8" />;

//   return (
//     <div className="min-h-screen bg-gray-50 p-4 md:p-8">
//       {/* Header */}
//       <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//         <div className="flex items-center gap-4">
//           <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} size="large">
//             Quay lại
//           </Button>
//           <div>
//             <Title level={2} className="m-0">Vụ án: {caseData.caseId}</Title>
//             <Text type="secondary" className="text-lg">Số hiệu: {caseData.caseNumber}</Text>
//           </div>
//         </div>
//         <Button type="primary" icon={<EditOutlined />} size="large" onClick={() => setEditing(true)}>
//           Sửa vụ án
//         </Button>
//       </div>

//       <Row gutter={[24, 24]}>
//         {/* Cột trái */}
//         <Col xs={24} lg={14}>
//           <Card title={<><AlertOutlined /> Thông tin vụ án</>} className="shadow-xl" hoverable>
//             <Space direction="vertical" size="large" className="w-full">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div><Text strong>Loại tội phạm:</Text> <Tag color="red" className="ml-3 text-base">{caseData.crimeType}</Tag></div>
//                 <div><Text strong>Trạng thái:</Text> <Tag color={getStatusColor(caseData.status)} className="ml-3 text-base">{caseData.status}</Tag></div>
//               </div>
//               <div className="space-y-3 text-base">
//                 <div><Text strong>Ngày xảy ra:</Text> <Text className="ml-2 font-medium">{caseData.occurredDate}</Text></div>
//                 <div><Text strong>Ngày báo cáo:</Text> <Text className="ml-2">{caseData.reportedDate}</Text></div>
//                 <div><Text strong>Địa điểm:</Text> <Text className="ml-2 font-medium text-blue-700">{caseData.location}</Text></div>
//               </div>
//               <div>
//                 <Text strong>Mô tả:</Text>
//                 <div className="mt-3 p-5 bg-gray-100 rounded-xl">{caseData.description}</div>
//               </div>
//             </Space>
//           </Card>

//           <Divider className="my-10" />

//           <Card title={<><NodeIndexOutlined /> Mạng quan hệ vụ án</>} className="shadow-xl" hoverable>
//             {graphData?.nodes?.length > 1 ? (
//               <div className="h-96 rounded-xl overflow-hidden border">
//                 <CrimeGraph data={graphData} />
//               </div>
//             ) : (
//               <Empty description="Chưa có dữ liệu quan hệ" />
//             )}
//           </Card>
//         </Col>

//         {/* Cột phải */}
//         <Col xs={24} lg={10}>
//           <Card title={<><HeatMapOutlined /> Bản đồ nóng tội phạm</>} className="shadow-xl mb-6" hoverable>
//             {heatmapData.length > 0 ? (
//               <div className="h-64 rounded-xl overflow-hidden border">
//                 <CrimeHeatmap data={heatmapData} />
//               </div>
//             ) : (
//               <Empty description="Không có dữ liệu nóng" className="py-12" />
//             )}
//           </Card>

//           <Card title={<><UserOutlined /> Người liên quan</>} className="shadow-xl" hoverable>
//             {people.length > 0 ? (
//               <Space direction="vertical" className="w-full">
//                 {people.map(p => (
//                   <PersonCard key={p.id} person={p} />
//                 ))}
//               </Space>
//             ) : (
//               <Empty description="Chưa có người liên quan" className="py-12" />
//             )}
//           </Card>
//         </Col>
//       </Row>

//       {editing && (
//         <CaseForm
//           open={editing}
//           onClose={() => setEditing(false)}
//           initial={caseData}
//           mode="update"
//           onSuccess={handleUpdateSuccess}
//         />
//       )}
//     </div>
//   );
// }