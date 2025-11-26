import React, { useEffect, useState } from 'react';
import { Card, Statistic, Row, Col, Alert, Spin, Button } from 'antd';
import { CheckCircleOutlined, ExclamationOutlined, LoadingOutlined } from '@ant-design/icons';
import axios from 'axios';

const API_URL ='http://localhost:5000/api';

const DatabaseConnection = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dbInfo, setDbInfo] = useState(null);

  const checkConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_URL}/database/status`, {
        timeout: 5000
      });
      
      console.log('✅ Backend response:', response.data);
      
      setStatus(response.data.isConnected);
      setDbInfo(response.data.databaseInfo);
      
      if (!response.data.isConnected) {
        setError(response.data.message || 'Không thể kết nối tới Neo4j');
      }
    } catch (err) { 
      console.error('❌ Lỗi kết nối backend:', err.message);
      
      if (err.code === 'ECONNREFUSED') {
        setError('❌ Không thể kết nối tới Backend (http://localhost:5000)');
      } else if (err.message.includes('timeout')) {
        setError('❌ Backend timeout - server không phản hồi');
      } else {
        setError(`❌ Lỗi: ${err.message}`);
      }
      
      setStatus(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <h1>🗄️ Database Connection</h1>
      
      {loading && (
        <Alert
          message="Đang kiểm tra kết nối..."
          icon={<Spin indicator={<LoadingOutlined style={{ fontSize: 14 }} />} />}
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}
      
      {status === true && (
        <Alert
          message="✅ Kết nối thành công"
          description="Backend và Neo4j database đang hoạt động bình thường"
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: '16px' }}
        />
      )}
      
      {status === false && (
        <Alert
          message="❌ Lỗi kết nối"
          description={error}
          type="error"
          showIcon
          icon={<ExclamationOutlined />}
          style={{ marginBottom: '16px' }}
        />
      )}
      
      {status === true && dbInfo && (
        <Card title="📊 Database Information" style={{ marginBottom: '16px' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic 
                  title="Version" 
                  value={dbInfo.version || 'N/A'} 
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic 
                  title="Node Count" 
                  value={dbInfo.nodeCount || 0}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic 
                  title="Relationship Count" 
                  value={dbInfo.relationshipCount || 0}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic 
                  title="Labels" 
                  value={dbInfo.labels?.length || 0}
                />
              </Card>
            </Col>
          </Row>
        </Card>
      )}
      
      <div style={{ marginBottom: '16px' }}>
        <Button
          type="primary"
          onClick={checkConnection}
          loading={loading}
        >
          🔄 Kiểm tra lại kết nối
        </Button>
      </div>
      
      <Card title="🔧 Debug Info">
        <p><strong>Backend URL:</strong> {API_URL}</p>
        <p><strong>Status:</strong> {status === true ? '✅ Connected' : status === false ? '❌ Disconnected' : '⏳ Checking'}</p>
        {dbInfo && (
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '12px', 
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {JSON.stringify(dbInfo, null, 2)}
          </pre>
        )}
      </Card>
    </div>
  );
};

export default DatabaseConnection;
