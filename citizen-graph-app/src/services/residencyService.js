import axios from 'axios';

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = 'http://localhost:5000/api';

const residencyService = {
  /**
   * Lấy tất cả hộ khẩu
   */
  getAllHouseholds: async () => {
    try {
      const response = await axios.get(`${API_URL}/residency/households`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      return response.data;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách hộ khẩu:', error);
      throw error;
    }
  },

  /**
   * Lấy danh sách thành viên của một hộ khẩu
   * @param {string} soHoKhau - Số hộ khẩu
   */
  getMembersByHousehold: async (soHoKhau) => {
    try {
      const response = await axios.get(`${API_URL}/residency/households/${soHoKhau}/members`);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách thành viên:', error);
      throw error;
    }
  },

  /**
   * Chuyển khẩu người dân (hỗ trợ nhiều người)
   * @param {Object} data - Dữ liệu chuyển khẩu
   * @param {Array<string>} data.cccds - Danh sách CCCD người chuyển
   * @param {string} data.targetHouseholdId - ID hộ khẩu đích
   * @param {string} data.reason - Lý do chuyển
   * @param {string} data.loaiCuTru - Loại cư trú (Thường trú/Tạm trú)
   */
  moveMember: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/residency/move`, data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi chuyển khẩu:', error);
      throw error;
    }
  },

  /**
   * Lấy lịch sử cư trú của một người
   * @param {string} cccd - CCCD người dân
   */
  getResidencyHistory: async (cccd) => {
    try {
      const response = await axios.get(`${API_URL}/residency/history/${cccd}`);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử cư trú:', error);
      throw error;
    }
  },

  /**
   * Đăng ký hộ khẩu mới
   * @param {Object} data - Dữ liệu hộ khẩu mới
   * @param {string} data.householdId - Mã hộ khẩu
   * @param {string} data.registrationNum - Số đăng ký
   * @param {string} data.addressText - Địa chỉ
   * @param {string} data.residencyType - Loại cư trú
   * @param {string} data.chuHoCCCD - CCCD chủ hộ
   */
  createHousehold: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/residency/households`, data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tạo hộ khẩu:', error);
      throw error;
    }
  },

  /**
   * Nhập khẩu - Thêm thành viên vào hộ khẩu
   * @param {Object} data - Dữ liệu thêm thành viên
   * @param {string} data.cccd - CCCD người được thêm vào
   * @param {string} data.householdId - Mã hộ khẩu
   * @param {string} data.quanHe - Quan hệ với chủ hộ
   * @param {string} data.loaiCuTru - Loại cư trú (Thường trú/Tạm trú)
   * @param {Date} data.tuNgay - Ngày bắt đầu
   * @param {string} data.lyDo - Lý do thêm vào hộ khẩu
   */
  addMember: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/residency/add-member`, data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi thêm thành viên:', error);
      throw error;
    }
  },

  /**
   * Xóa khẩu - Khai tử hoặc định cư nước ngoài
   * @param {Object} data - Dữ liệu xóa khẩu
   * @param {string} data.cccd - CCCD người cần xóa
   * @param {string} data.householdId - Mã hộ khẩu
   * @param {string} data.lyDo - Lý do xóa
   * @param {Date} data.ngayXoa - Ngày xóa
   * @param {string} data.loaiXoa - Loại xóa (Đã chết/Định cư nước ngoài)
   */
  removeMember: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/residency/remove-member`, data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi xóa khẩu:', error);
      throw error;
    }
  },

  /**
   * Tách khẩu + lập hộ mới
   * @param {Object} data - Dữ liệu tách khẩu
   * @param {string} data.sourceHouseholdId - Mã hộ khẩu nguồn
   * @param {Array<string>} data.memberCCCDs - Danh sách CCCD thành viên tách
   * @param {string} data.newHouseholdId - Mã hộ khẩu mới
   * @param {string} data.newRegistrationNum - Số đăng ký mới
   * @param {string} data.newAddress - Địa chỉ mới
   * @param {string} data.residencyType - Loại cư trú
   * @param {string} data.lyDo - Lý do tách
   */
  splitNewHousehold: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/residency/split-new-household`, data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tách khẩu + lập hộ mới:', error);
      throw error;
    }
  }
};

export default residencyService;