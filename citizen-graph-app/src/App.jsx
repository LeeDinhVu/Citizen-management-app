import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/MainLayout';

// Import các trang (Sau này các bạn code xong trang nào thì import trang đó)
import Dashboard from './pages/Dashboard';
import DatabaseConnection from './pages/DatabaseConnection';
import ResidencyPage from './pages/Residency';
import CitizensManagement from './pages/CitizensManagement';
import FamilyGraphPage from './pages/FamilyGraph';
import AssetManagementPage from './pages/AssetManagement';
import CasesPage from "./pages/security/Cases";
import CaseDetail from "./pages/security/CaseDetail";
import CreateCase from "./pages/security/CreateCase";

// import CitizenPage from './pages/Citizen'; 
// ...

// Trang tạm thời (Placeholder) để demo khi chưa code xong
const Placeholder = ({ title }) => <h2>🚧 Chức năng {title} đang xây dựng...</h2>;

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* MainLayout bao bọc tất cả các Route con */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          
          <Route path="database" element={<DatabaseConnection />} />
          <Route path="citizens" element={<CitizensManagement />} />
          <Route path="residency" element={<ResidencyPage />} />
          <Route path="family" element={<FamilyGraphPage />} />
          <Route path="assets" element={<AssetManagementPage />} />
          <Route path="security">
            <Route index element={<CasesPage />} />
            <Route path="cases" element={<CasesPage />} />
            <Route path="cases/create" element={<CreateCase />} />   {/* ĐÃ SỬA */}
            <Route path="cases/:id" element={<CaseDetail />} />
          </Route>
          {/* <Route path="security" element={<Placeholder title="An ninh" />} /> */}
          <Route path="health" element={<Placeholder title="Y tế" />} />
          <Route path="trace" element={<Placeholder title="Truy vết Graph" />} />
          
          {/* Trang 404 */}
          <Route path="*" element={<h2>404 - Không tìm thấy trang</h2>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;