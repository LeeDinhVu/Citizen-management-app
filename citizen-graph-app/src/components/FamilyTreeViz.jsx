// import React, { useRef, useEffect, useState } from 'react';
// import ForceGraph2D from 'react-force-graph-2d';
// import { Spin, Modal, Descriptions, Tag } from 'antd';

// const FamilyTreeViz = ({ graphData, loading, rootId, onLinkClick, onNodeClick }) => {
//     const fgRef = useRef();
//     const containerRef = useRef();
//     const [selectedNode, setSelectedNode] = useState(null);
//     const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

//     useEffect(() => {
//         const observer = new ResizeObserver(entries => {
//             for (let entry of entries) setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
//         });
//         if (containerRef.current) observer.observe(containerRef.current);
//         return () => observer.disconnect();
//     }, []);

//     useEffect(() => {
//         if (graphData && graphData.nodes.length > 0 && fgRef.current) {
//             fgRef.current.d3Force('charge').strength(-400);
//             fgRef.current.d3Force('link').distance(150);
//             setTimeout(() => { if(fgRef.current) fgRef.current.zoomToFit(400, 50); }, 500);
//         }
//     }, [graphData, dimensions]);

//     const handleInternalNodeClick = (node) => {
//         if (onNodeClick) onNodeClick(node); else setSelectedNode(node);
//     };

//     if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}><Spin size="large" tip="Đang tải..." /></div>;
//     if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Chưa có dữ liệu hiển thị</div>;

//     return (
//         <div ref={containerRef} style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden', background: '#fafafa' }}>
//             <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 9, background: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
//                 <div style={{fontWeight: 'bold', marginBottom: 5}}>Chú thích:</div>
//                 <div style={{display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2}}><div style={{width: 12, height: 12, borderRadius: '50%', background: '#ff4d4f'}}></div> Mục tiêu</div>
//                 <div style={{display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2}}><div style={{width: 12, height: 12, borderRadius: '50%', background: '#1677ff'}}></div> Nam</div>
//                 <div style={{display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2}}><div style={{width: 12, height: 12, borderRadius: '50%', background: '#eb2f96'}}></div> Nữ</div>
//                 <div style={{display: 'flex', alignItems: 'center', gap: 5}}><div style={{width: 12, height: 12, background: '#52c41a'}}></div> Hộ khẩu</div>
//             </div>

//             <ForceGraph2D
//                 ref={fgRef}
//                 graphData={graphData}
//                 width={dimensions.width}
//                 height={dimensions.height}
//                 linkDirectionalArrowLength={0}
//                 onLinkClick={onLinkClick}
//                 onNodeClick={handleInternalNodeClick}
                
//                 linkCanvasObject={(link, ctx, globalScale) => {
//                     const start = link.source; const end = link.target;
//                     if (typeof start !== 'object' || typeof end !== 'object') return;
//                     const NODE_R = 8; const dx = end.x - start.x; const dy = end.y - start.y;
//                     const dist = Math.sqrt(dx * dx + dy * dy); if (dist === 0) return;
//                     const tgtX = end.x - (dx / dist) * NODE_R; const tgtY = end.y - (dy / dist) * NODE_R;

//                     ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(tgtX, tgtY);
//                     ctx.lineWidth = 1.5 / globalScale; ctx.strokeStyle = '#999'; ctx.stroke();

//                     const arrowLen = 6 / globalScale * 2; const angle = Math.atan2(dy, dx);
//                     ctx.save(); ctx.translate(tgtX, tgtY); ctx.rotate(angle);
//                     ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-arrowLen, -arrowLen/2); ctx.lineTo(-arrowLen, arrowLen/2);
//                     ctx.lineTo(0, 0); ctx.fillStyle = '#555'; ctx.fill(); ctx.restore();

//                     if (link.label) {
//                         const midX = start.x + dx / 2; const midY = start.y + dy / 2; const fontSize = 10 / globalScale;
//                         ctx.font = `${fontSize}px Sans-Serif`;
//                         const textWidth = ctx.measureText(link.label).width; const bckgDim = [textWidth, fontSize].map(n => n + fontSize * 0.4);
//                         ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.fillRect(midX - bckgDim[0] / 2, midY - bckgDim[1] / 2, ...bckgDim);
//                         ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#555'; ctx.fillText(link.label, midX, midY);
//                     }
//                 }}

//                 nodeCanvasObject={(node, ctx, globalScale) => {
//                     const label = node.hoTen; 
//                     const fontSize = 12 / globalScale;
//                     ctx.font = `bold ${fontSize}px Sans-Serif`;
                    
//                     const isHousehold = node.gioiTinh === 'Household';
                    
//                     if (isHousehold) {
//                         // VẼ HÌNH VUÔNG CHO HỘ KHẨU
//                         const size = 16;
//                         ctx.fillStyle = '#52c41a'; // Xanh lá
//                         ctx.fillRect(node.x - size/2, node.y - size/2, size, size);
//                     } else {
//                         // VẼ HÌNH TRÒN CHO NGƯỜI
//                         const r = 8; 
//                         ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
//                         ctx.fillStyle = node.id === rootId ? '#ff4d4f' : (node.gioiTinh === 'Nam' ? '#1677ff' : '#eb2f96');
//                         ctx.fill(); 
//                     }
                    
//                     ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 / globalScale; ctx.stroke();
                    
//                     const textWidth = ctx.measureText(label).width;
//                     const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
//                     ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
//                     ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + 10, ...bckgDimensions);
//                     ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
//                     ctx.fillText(label, node.x, node.y + 10 + fontSize / 2);
//                 }}
//             />
            
//             <Modal title={selectedNode?.hoTen} open={!!selectedNode} onCancel={() => setSelectedNode(null)} footer={null}>
//                 {selectedNode && <Descriptions column={1} bordered size="small">
//                     {selectedNode.gioiTinh === 'Household' ? (
//                         <>
//                             <Descriptions.Item label="Mã hộ">{selectedNode.id}</Descriptions.Item>
//                             <Descriptions.Item label="Địa chỉ">{selectedNode.details['hoKhauSo'] || 'N/A'}</Descriptions.Item>
//                         </>
//                     ) : (
//                         <>
//                              <Descriptions.Item label="CCCD">{selectedNode.id}</Descriptions.Item>
//                              <Descriptions.Item label="Năm sinh">{selectedNode.ngaySinh}</Descriptions.Item>
//                              <Descriptions.Item label="Giới tính"><Tag color="blue">{selectedNode.gioiTinh}</Tag></Descriptions.Item>
//                         </>
//                     )}
//                     {selectedNode.details && Object.entries(selectedNode.details).map(([key, value]) => {
//                         if (['hoTen', 'cccd', 'ngaySinh', 'gioiTinh', 'hoKhauSo'].includes(key)) return null;
//                         return <Descriptions.Item key={key} label={key}>{String(value)}</Descriptions.Item>;
//                     })}
//                 </Descriptions>}
//             </Modal>
//         </div>
//     );
// };

// export default FamilyTreeViz;


import React, { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Spin, Modal, Descriptions, Tag, Button, Space } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined, ExpandOutlined } from '@ant-design/icons';

const FamilyTreeViz = ({ graphData, loading, rootId, onLinkClick, onNodeClick }) => {
    const fgRef = useRef();
    const containerRef = useRef();
    const [selectedNode, setSelectedNode] = useState(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [hoverLink, setHoverLink] = useState(null);

    // Auto-resize
    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
            }
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Force Config
    useEffect(() => {
        if (graphData && graphData.nodes.length > 0 && fgRef.current) {
            fgRef.current.d3Force('charge').strength(-300); // Đẩy mạnh hơn chút
            fgRef.current.d3Force('link').distance(100);
            setTimeout(() => { if(fgRef.current) fgRef.current.zoomToFit(400, 50); }, 800);
        }
    }, [graphData, dimensions]);

    // Zoom Controls
    const handleZoomIn = () => { fgRef.current.zoom(fgRef.current.zoom() * 1.2, 400); };
    const handleZoomOut = () => { fgRef.current.zoom(fgRef.current.zoom() / 1.2, 400); };
    const handleZoomReset = () => { fgRef.current.zoomToFit(400, 50); };

    const handleInternalNodeClick = (node) => {
        if (onNodeClick) onNodeClick(node);
        else setSelectedNode(node);
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}><Spin size="large" tip="Đang tải dữ liệu..." /></div>;
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Không có dữ liệu hiển thị</div>;

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#fafafa' }}>
            
            {/* Zoom Toolbar */}
            <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 99 }}>
                <Space direction="vertical">
                    <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} />
                    <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
                    <Button icon={<ExpandOutlined />} onClick={handleZoomReset} />
                </Space>
            </div>

            {/* Legend - ĐÃ SỬA: Thêm chú thích Hộ khẩu */}
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 9, background: 'rgba(255,255,255,0.95)', padding: '10px 14px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 12 }}>
                <div style={{fontWeight: 'bold', marginBottom: 8, borderBottom: '1px solid #eee', paddingBottom: 4}}>CHÚ THÍCH</div>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}><div style={{width: 12, height: 12, borderRadius: '50%', background: '#ff4d4f', border: '1px solid #fff'}}></div> Đối tượng chọn (Root)</div>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}><div style={{width: 12, height: 12, borderRadius: '50%', background: '#1677ff', border: '1px solid #fff'}}></div> Nam</div>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4}}><div style={{width: 12, height: 12, borderRadius: '50%', background: '#eb2f96', border: '1px solid #fff'}}></div> Nữ</div>
                {/* <div style={{display: 'flex', alignItems: 'center', gap: 8}}><div style={{width: 12, height: 12, borderRadius: '2px', background: '#52c41a', border: '1px solid #fff'}}></div> Hộ khẩu / Nhà</div> */}
            </div>

            <ForceGraph2D
                ref={fgRef}
                graphData={graphData}
                width={dimensions.width}
                height={dimensions.height}
                
                linkDirectionalArrowLength={0} // Tắt arrow mặc định để vẽ thủ công
                
                linkHoverPrecision={8} 
                onLinkHover={link => setHoverLink(link)}
                onLinkClick={onLinkClick}
                onNodeClick={handleInternalNodeClick}

                // --- VẼ DÂY & MŨI TÊN ---
                linkCanvasObject={(link, ctx, globalScale) => {
                    const start = link.source; const end = link.target;
                    if (typeof start !== 'object' || typeof end !== 'object') return;

                    const isHovered = hoverLink === link;
                    // ĐÃ SỬA: Nếu là quan hệ Vợ/Chồng thì không vẽ mũi tên (quan hệ song phương)
                    const isMarriage = (link.label === 'Vợ/Chồng' || link.type === 'MARRIED_TO');

                    const NODE_R = 14; 
                    const dx = end.x - start.x;
                    const dy = end.y - start.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist === 0) return;

                    const tgtX = end.x - (dx / dist) * NODE_R;
                    const tgtY = end.y - (dy / dist) * NODE_R;

                    // 1. VẼ DÂY
                    ctx.beginPath(); 
                    ctx.moveTo(start.x, start.y); 
                    ctx.lineTo(tgtX, tgtY);
                    
                    // Style dây
                    ctx.lineWidth = (isHovered ? 3 : (isMarriage ? 2 : 1.5)) / globalScale; 
                    ctx.strokeStyle = isHovered ? '#ff4d4f' : (isMarriage ? '#faad14' : '#999'); // Vợ chồng màu vàng cam
                    
                    // Nếu vợ chồng, vẽ nét đứt hoặc style khác nếu muốn (ở đây giữ nét liền màu khác)
                    ctx.stroke();

                    // 2. VẼ MŨI TÊN (Chỉ vẽ nếu KHÔNG phải là Vợ/Chồng)
                    if (!isMarriage) {
                        const arrowLen = 6 / globalScale * (isHovered ? 1.5 : 1);
                        const angle = Math.atan2(dy, dx);
                        
                        ctx.save();
                        ctx.translate(tgtX, tgtY);
                        ctx.rotate(angle);
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-arrowLen * 1.5, -arrowLen);
                        ctx.lineTo(-arrowLen * 1.5, arrowLen);
                        ctx.lineTo(0, 0);
                        ctx.fillStyle = isHovered ? '#ff4d4f' : '#666';
                        ctx.fill();
                        ctx.restore();
                    }

                    // 3. VẼ NHÃN (Label)
                    if (link.label) {
                        const midX = start.x + dx / 2; 
                        const midY = start.y + dy / 2; 
                        const fontSize = (isHovered ? 12 : 10) / globalScale;
                        ctx.font = `${isHovered ? 'bold' : ''} ${fontSize}px Sans-Serif`;
                        const textWidth = ctx.measureText(link.label).width;
                        const bckgDim = [textWidth, fontSize].map(n => n + fontSize * 0.6);
                        
                        ctx.fillStyle = isHovered ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.8)';
                        ctx.fillRect(midX - bckgDim[0] / 2, midY - bckgDim[1] / 2, ...bckgDim);
                        
                        if(isHovered) {
                            ctx.strokeStyle = '#ff4d4f';
                            ctx.lineWidth = 1 / globalScale;
                            ctx.strokeRect(midX - bckgDim[0] / 2, midY - bckgDim[1] / 2, ...bckgDim);
                        }

                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; 
                        ctx.fillStyle = isHovered ? '#ff4d4f' : '#333';
                        ctx.fillText(link.label, midX, midY);
                    }
                }}

                // --- VẼ NODE ---
                nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.hoTen; 
                    const fontSize = 12 / globalScale;
                    ctx.font = `bold ${fontSize}px Sans-Serif`;
                    
                    const isHousehold = node.gioiTinh === 'Household';
                    
                    if (isHousehold) {
                        const size = 18 / globalScale * 8; 
                        const staticSize = 16;
                        ctx.fillStyle = '#52c41a'; // Màu xanh lá cho Hộ khẩu
                        ctx.fillRect(node.x - staticSize/2, node.y - staticSize/2, staticSize, staticSize);
                        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 / globalScale; 
                        ctx.strokeRect(node.x - staticSize/2, node.y - staticSize/2, staticSize, staticSize);
                    } else {
                        const r = 8; 
                        ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                        ctx.fillStyle = node.id === rootId ? '#ff4d4f' : (node.gioiTinh === 'Nam' ? '#1677ff' : '#eb2f96');
                        ctx.fill(); 
                        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 / globalScale; ctx.stroke();
                    }
                    
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + 12, ...bckgDimensions);
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
                    ctx.fillText(label, node.x, node.y + 12 + fontSize / 2);
                }}
            />
            
            <Modal title={selectedNode?.hoTen} open={!!selectedNode} onCancel={() => setSelectedNode(null)} footer={null}>
                {selectedNode && <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="ID/CCCD">{selectedNode.id}</Descriptions.Item>
                    {selectedNode.gioiTinh !== 'Household' && (
                        <>
                            <Descriptions.Item label="Năm sinh">{selectedNode.ngaySinh}</Descriptions.Item>
                            <Descriptions.Item label="Giới tính"><Tag color="blue">{selectedNode.gioiTinh}</Tag></Descriptions.Item>
                            <Descriptions.Item label="Quê quán">{selectedNode.queQuan}</Descriptions.Item>
                        </>
                    )}
                    {selectedNode.details && Object.entries(selectedNode.details).map(([key, value]) => {
                        if (['hoTen', 'cccd', 'ngaySinh', 'gioiTinh', 'queQuan', 'ngheNghiep', 'maritalStatus'].includes(key)) return null;
                        return <Descriptions.Item key={key} label={key}>{String(value)}</Descriptions.Item>;
                    })}
                </Descriptions>}
            </Modal>
        </div>
    );
};

export default FamilyTreeViz;


// import React, { useRef, useEffect, useState } from 'react';
// import ForceGraph2D from 'react-force-graph-2d';
// import { Spin, Modal, Descriptions, Tag } from 'antd';

// const FamilyTreeViz = ({ graphData, loading, rootId, onLinkClick, onNodeClick }) => {
//     const fgRef = useRef();
//     const [selectedNode, setSelectedNode] = useState(null);

//     useEffect(() => {
//         if (graphData && graphData.nodes.length > 0 && fgRef.current) {
//             fgRef.current.d3Force('charge').strength(-400); 
//             fgRef.current.d3Force('link').distance(150); 
//             setTimeout(() => { if(fgRef.current) fgRef.current.zoomToFit(400, 50); }, 500);
//         }
//     }, [graphData]);

//     const handleInternalNodeClick = (node) => {
//         if (onNodeClick) onNodeClick(node);
//         else setSelectedNode(node);
//     };

//     if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}><Spin size="large" tip="Đang tải..." /></div>;
//     if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Chưa có dữ liệu hiển thị</div>;

//     return (
//         <div style={{ position: 'relative', height: '100%', width: '100%', border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden', background: '#fafafa' }}>
//             <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 9, background: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
//                 <div style={{fontWeight: 'bold', marginBottom: 5}}>Chú thích:</div>
//                 <div style={{display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2}}><div style={{width: 12, height: 12, borderRadius: '50%', background: '#ff4d4f'}}></div> Công dân mục tiêu</div>
//                 <div style={{display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2}}><div style={{width: 12, height: 12, borderRadius: '50%', background: '#1677ff'}}></div> Nam</div>
//                 <div style={{display: 'flex', alignItems: 'center', gap: 5}}><div style={{width: 12, height: 12, borderRadius: '50%', background: '#eb2f96'}}></div> Nữ</div>
//             </div>

//             <ForceGraph2D
//                 ref={fgRef}
//                 graphData={graphData}
//                 width={1200} // Tăng width ảo để render rõ hơn
                
//                 linkDirectionalArrowLength={6} // Mũi tên
//                 linkDirectionalArrowRelPos={0.5} // Vị trí giữa
                
//                 onLinkClick={onLinkClick}
//                 onNodeClick={handleInternalNodeClick}

//                 linkCanvasObject={(link, ctx, globalScale) => {
//                     const start = link.source; const end = link.target;
//                     if (typeof start !== 'object' || typeof end !== 'object') return;

//                     ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
//                     ctx.lineWidth = 2 / globalScale; ctx.strokeStyle = '#999'; ctx.stroke();

//                     if (link.label) {
//                         const midX = start.x + (end.x - start.x) / 2;
//                         const midY = start.y + (end.y - start.y) / 2;
//                         const fontSize = 12 / globalScale;
//                         ctx.font = `${fontSize}px Sans-Serif`;
//                         const textWidth = ctx.measureText(link.label).width;
//                         const bckgDim = [textWidth, fontSize].map(n => n + fontSize * 0.4);
                        
//                         ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
//                         ctx.fillRect(midX - bckgDim[0] / 2, midY - bckgDim[1] / 2, ...bckgDim);
//                         ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#555';
//                         ctx.fillText(link.label, midX, midY);
//                     }
//                 }}

//                 nodeCanvasObject={(node, ctx, globalScale) => {
//                     const label = node.hoTen; const fontSize = 14 / globalScale;
//                     ctx.font = `bold ${fontSize}px Sans-Serif`;
//                     const r = 8; 
//                     ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
//                     ctx.fillStyle = node.id === rootId ? '#ff4d4f' : (node.gioiTinh === 'Nam' ? '#1677ff' : '#eb2f96');
//                     ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2/globalScale; ctx.stroke();
                    
//                     const textWidth = ctx.measureText(label).width;
//                     const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
//                     ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
//                     ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + 10, ...bckgDimensions);
//                     ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
//                     ctx.fillText(label, node.x, node.y + 10 + fontSize / 2);
//                 }}
//             />
            
//             <Modal title={`Chi tiết: ${selectedNode?.hoTen}`} open={!!selectedNode} onCancel={() => setSelectedNode(null)} footer={null}>
//                 {selectedNode && <Descriptions column={1} bordered size="small">
//                     <Descriptions.Item label="CCCD">{selectedNode.id}</Descriptions.Item>
//                     <Descriptions.Item label="Năm sinh">{selectedNode.ngaySinh}</Descriptions.Item>
//                     <Descriptions.Item label="Giới tính"><Tag color={selectedNode.gioiTinh === 'Nam' ? 'blue' : 'magenta'}>{selectedNode.gioiTinh}</Tag></Descriptions.Item>
//                     <Descriptions.Item label="Quê quán">{selectedNode.queQuan}</Descriptions.Item>
//                     {selectedNode.details && Object.entries(selectedNode.details).map(([key, value]) => {
//                         if (['hoTen', 'cccd', 'ngaySinh', 'gioiTinh', 'queQuan', 'ngheNghiep', 'maritalStatus'].includes(key)) return null;
//                         return <Descriptions.Item key={key} label={key}>{String(value)}</Descriptions.Item>;
//                     })}
//                 </Descriptions>}
//             </Modal>
//         </div>
//     );
// };

// export default FamilyTreeViz;

// import React, { useRef, useEffect, useState } from 'react';
// import ForceGraph2D from 'react-force-graph-2d';
// import { Spin, Modal, Descriptions, Tag } from 'antd';

// const FamilyTreeViz = ({ graphData, loading, rootId, onLinkClick, onNodeClick }) => {
//     const fgRef = useRef();
//     const [selectedNode, setSelectedNode] = useState(null);

//     // Xử lý zoom và force khi có dữ liệu mới
//     useEffect(() => {
//         if (graphData && graphData.nodes.length > 0 && fgRef.current) {
//             fgRef.current.d3Force('charge').strength(-400); // Đẩy xa nhau ra
//             fgRef.current.d3Force('link').distance(100);    // Dây nối dài hơn để chứa chữ
//             setTimeout(() => {
//                 if(fgRef.current) fgRef.current.zoomToFit(400, 50);
//             }, 500);
//         }
//     }, [graphData]);

//     const handleInternalNodeClick = (node) => {
//         // Nếu cha truyền hàm onNodeClick (để xử lý ở trang chính), dùng nó
//         if (onNodeClick) {
//             onNodeClick(node);
//         } else {
//             // Mặc định hiển thị modal chi tiết tại chỗ
//             setSelectedNode(node);
//         }
//     };

//     if (loading) return (
//         <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
//             <Spin size="large" tip="Đang tải và tính toán sơ đồ..." />
//         </div>
//     );

//     if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
//         return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Chưa có dữ liệu hiển thị</div>;
//     }

//     return (
//         <div style={{ position: 'relative', height: '100%', width: '100%', border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden', background: '#fafafa' }}>
            
//             {/* Chú thích màu sắc */}
//             <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 9, background: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
//                 <div style={{fontWeight: 'bold', marginBottom: 5}}>Chú thích:</div>
//                 <div style={{display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2}}><div style={{width: 12, height: 12, borderRadius: '50%', background: '#ff4d4f'}}></div> Công dân mục tiêu</div>
//                 <div style={{display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2}}><div style={{width: 12, height: 12, borderRadius: '50%', background: '#1677ff'}}></div> Nam</div>
//                 <div style={{display: 'flex', alignItems: 'center', gap: 5}}><div style={{width: 12, height: 12, borderRadius: '50%', background: '#eb2f96'}}></div> Nữ</div>
//             </div>

//             <ForceGraph2D
//                 ref={fgRef}
//                 graphData={graphData}
//                 width={800} // Sẽ tự resize theo container cha
//                 nodeLabel="hoTen"
                
//                 // --- TÔ MÀU NODE ---
//                 nodeColor={node => {
//                     if (node.id === rootId) return '#ff4d4f'; 
//                     if (node.gioiTinh === 'Nam') return '#1677ff'; 
//                     return '#eb2f96'; 
//                 }}
//                 nodeRelSize={7}
                
//                 // --- VẼ LINK & NHÃN MỐI QUAN HỆ ---
//                 linkWidth={1.5}
//                 linkDirectionalArrowLength={3.5}
//                 linkDirectionalArrowRelPos={1}
                
//                 // Bắt sự kiện click link nếu có
//                 onLinkClick={onLinkClick}
                
//                 linkCanvasObject={(link, ctx, globalScale) => {
//                     // 1. Vẽ đường dây
//                     const start = link.source;
//                     const end = link.target;
//                     if (typeof start !== 'object' || typeof end !== 'object') return; // Chờ d3 tính toán xong

//                     ctx.beginPath();
//                     ctx.moveTo(start.x, start.y);
//                     ctx.lineTo(end.x, end.y);
//                     ctx.lineWidth = 1.5 / globalScale;
//                     ctx.strokeStyle = '#bfbfbf';
//                     ctx.stroke();

//                     // 2. Vẽ nhãn (Label) ở giữa dây
//                     if (link.label) {
//                         const midX = start.x + (end.x - start.x) / 2;
//                         const midY = start.y + (end.y - start.y) / 2;
//                         const fontSize = 10 / globalScale; // Font chữ nhỏ hơn node
//                         ctx.font = `${fontSize}px Sans-Serif`;
                        
//                         // Background cho chữ để không bị đường dây cắt ngang
//                         const textWidth = ctx.measureText(link.label).width;
//                         const bckgDim = [textWidth, fontSize].map(n => n + fontSize * 0.2);
//                         ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
//                         ctx.fillRect(midX - bckgDim[0] / 2, midY - bckgDim[1] / 2, ...bckgDim);

//                         ctx.textAlign = 'center';
//                         ctx.textBaseline = 'middle';
//                         ctx.fillStyle = '#666'; // Màu chữ xám đậm
//                         ctx.fillText(link.label, midX, midY);
//                     }
//                 }}

//                 // --- VẼ NODE (Hình tròn + Tên) ---
//                 nodeCanvasObject={(node, ctx, globalScale) => {
//                     const label = node.hoTen;
//                     const fontSize = 12 / globalScale;
//                     ctx.font = `bold ${fontSize}px Sans-Serif`;
                    
//                     // Vẽ hình tròn node
//                     const r = 6; 
//                     ctx.beginPath();
//                     ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
//                     ctx.fillStyle = node.id === rootId ? '#ff4d4f' : (node.gioiTinh === 'Nam' ? '#1677ff' : '#eb2f96');
//                     ctx.fill();
//                     // Viền trắng cho node nổi bật
//                     ctx.lineWidth = 1 / globalScale;
//                     ctx.strokeStyle = '#fff';
//                     ctx.stroke();

//                     // Vẽ nền trắng mờ cho tên
//                     const textWidth = ctx.measureText(label).width;
//                     const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
//                     ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
//                     ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + 8, ...bckgDimensions);

//                     // Vẽ tên
//                     ctx.textAlign = 'center';
//                     ctx.textBaseline = 'middle';
//                     ctx.fillStyle = '#000';
//                     ctx.fillText(label, node.x, node.y + 8 + fontSize / 2);
//                 }}
                
//                 onNodeClick={handleInternalNodeClick}
//             />

//             {/* Modal hiển thị chi tiết thông tin khi click vào Node (nếu không có handler ngoài) */}
//             <Modal
//                 title={`Chi tiết: ${selectedNode?.hoTen}`}
//                 open={!!selectedNode}
//                 onCancel={() => setSelectedNode(null)}
//                 footer={null}
//             >
//                 {selectedNode && (
//                     <Descriptions column={1} bordered size="small">
//                         <Descriptions.Item label="CCCD">{selectedNode.id}</Descriptions.Item>
//                         <Descriptions.Item label="Năm sinh">{selectedNode.ngaySinh}</Descriptions.Item>
//                         <Descriptions.Item label="Giới tính">
//                             <Tag color={selectedNode.gioiTinh === 'Nam' ? 'blue' : 'magenta'}>{selectedNode.gioiTinh}</Tag>
//                         </Descriptions.Item>
//                         <Descriptions.Item label="Quê quán">{selectedNode.queQuan}</Descriptions.Item>
//                         <Descriptions.Item label="Nghề nghiệp">{selectedNode.ngheNghiep}</Descriptions.Item>
//                         <Descriptions.Item label="Tình trạng">{selectedNode.maritalStatus}</Descriptions.Item>
                        
//                         {/* Hiển thị các thông tin Dynamic từ 'Details' */}
//                         {selectedNode.details && Object.entries(selectedNode.details).map(([key, value]) => {
//                             // Bỏ qua các trường đã hiển thị ở trên
//                             if (['hoTen', 'cccd', 'ngaySinh', 'gioiTinh', 'queQuan', 'ngheNghiep', 'maritalStatus'].includes(key)) return null;
//                             return (
//                                 <Descriptions.Item key={key} label={key}>
//                                     {String(value)}
//                                 </Descriptions.Item>
//                             );
//                         })}
//                     </Descriptions>
//                 )}
//             </Modal>
//         </div>
//     );
// };

// export default FamilyTreeViz;