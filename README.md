# Citizen Management Application

Ứng dụng quản lý công dân với đồ thị quan hệ gia đình, hồ sơ tội phạm và quản lý tài sản.

## Yêu cầu hệ thống

- Node.js >= 18.x
- .NET SDK 10.0
- Neo4j Database

---

## Cài đặt và Chạy Dự án

### 1. Frontend (React + Vite)

**Bước 1: Di chuyển vào thư mục frontend**
```bash
cd citizen-graph-app
```

**Bước 2: Cài đặt tất cả thư viện**
```bash
npm install
```
> Lệnh này sẽ tự động cài đặt tất cả thư viện được liệt kê trong file `package.json`

**Bước 3: Chạy ứng dụng**
```bash
npm run dev
```
**Ứng dụng chạy tại:** `http://localhost:5173`

---

#### Danh sách thư viện Frontend được cài đặt:

**UI & Icons:**
```bash
npm install antd@^6.0.0
npm install @ant-design/icons@^6.1.0
npm install lucide-react@^0.554.0
```

**Biểu đồ & Đồ thị:**
```bash
npm install @ant-design/charts@^2.6.6
npm install d3@^7.9.0
npm install react-d3-tree@^3.6.6
npm install react-force-graph-2d@^1.29.0
npm install recharts@^3.5.0
npm install vis-network@^10.0.2
npm install vis-data@^8.0.3
```

**Bản đồ:**
```bash
npm install leaflet@^1.9.4
npm install react-leaflet@^5.0.0
```

**Routing & HTTP:**
```bash
npm install react-router-dom@^7.9.6
npm install axios@^1.13.2
```

**Tiện ích khác:**
```bash
npm install react-hot-toast@^2.6.0
npm install dayjs@^1.11.19
```

**React Core:**
```bash
npm install react@^19.2.0 react-dom@^19.2.0
```

> **Lưu ý:** Không cần chạy từng lệnh trên! Chỉ cần `npm install` là đủ.
> Các lệnh riêng lẻ trên chỉ để tham khảo khi muốn cài thêm thư viện mới.

### 2. Backend (ASP.NET Core)

```bash
cd CitizenGraph-Backend
dotnet restore
dotnet run
```

**API chạy tại:** `http://localhost:5134`  
**Swagger UI:** `http://localhost:5134/swagger`

#### Các thư viện Backend đang sử dụng:
```xml
<PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.0.0" />
<PackageReference Include="Neo4j.Driver" Version="5.28.3" />
<PackageReference Include="Newtonsoft.Json" Version="13.0.4" />
<PackageReference Include="Swashbuckle.AspNetCore" Version="10.0.1" />
```

### 3. Cấu hình Neo4j Database

Chỉnh sửa `CitizenGraph-Backend/appsettings.json`:

```json
{
  "Neo4j": {
    "Uri": "bolt://localhost:7687",
    "Username": "neo4j",
    "Password": "your-password"
  }
}
```

**Cài đặt Neo4j:**
- Tải [Neo4j Desktop](https://neo4j.com/download/) hoặc dùng Docker:
```bash
docker run -d --name neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/your-password neo4j:latest
```

---

## Chạy toàn bộ dự án

Mở 2 terminal và chạy lần lượt:

**Terminal 1 - Backend:**
```bash
cd CitizenGraph-Backend
dotnet run
```

**Terminal 2 - Frontend:**
```bash
cd citizen-graph-app
npm install
npm run dev
```

**Đảm bảo Neo4j đã khởi động trước khi chạy Backend!**

---

## Các lệnh hữu ích

### Frontend
```bash
npm run build          # Build production
npm run preview        # Preview build
npm run lint           # Kiểm tra code
```

### Backend
```bash
dotnet watch run       # Chạy với auto-reload
dotnet build           # Build dự án
dotnet restore         # Restore packages
```

---

## Endpoints API chính

- `/api/dashboard` - Dashboard thống kê
- `/api/citizens` - Quản lý công dân
- `/api/family` - Đồ thị gia đình
- `/api/assets` - Quản lý tài sản
- `/api/residency` - Quản lý nơi cư trú
- `/api/criminalcase` - Hồ sơ tội phạm

**Chi tiết đầy đủ:** `http://localhost:5134/swagger`