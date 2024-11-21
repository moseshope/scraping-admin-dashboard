import api from './api';

class UserService {
  /**
   * Get all users with pagination and filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search term
   * @param {string} params.sortBy - Sort field
   * @param {string} params.sortOrder - Sort order (asc/desc)
   * @returns {Promise} Response from the API
   */
  async getUsers(params = {}) {
    const response = await api.get('/users', { params });
    return response.data;
  }

  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Promise} Response from the API
   */
  async getUserById(id) {
    const response = await api.get(`/users/${id}`);
    return response.data;
  }

  /**
   * Update user profile
   * @param {string} id - User ID
   * @param {Object} profileData - Profile data to update
   * @param {string} profileData.name - User's name
   * @param {string} profileData.email - User's email
   * @returns {Promise} Response from the API
   */
  async updateProfile(id, profileData) {
    const response = await api.put(`/users/${id}/profile`, profileData);
    return response.data;
  }

  /**
   * Update user password
   * @param {string} id - User ID
   * @param {Object} passwordData - Password data
   * @param {string} passwordData.currentPassword - Current password
   * @param {string} passwordData.newPassword - New password
   * @returns {Promise} Response from the API
   */
  async updatePassword(id, passwordData) {
    const response = await api.put(`/users/${id}/password`, passwordData);
    return response.data;
  }

  /**
   * Update user status (Admin only)
   * @param {string} id - User ID
   * @param {Object} statusData - Status data
   * @param {string} statusData.status - New status
   * @returns {Promise} Response from the API
   */
  async updateStatus(id, statusData) {
    const response = await api.put(`/users/${id}/status`, statusData);
    return response.data;
  }

  /**
   * Delete user (Admin only)
   * @param {string} id - User ID
   * @returns {Promise} Response from the API
   */
  async deleteUser(id) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }

  /**
   * Check if user has admin role
   * @returns {boolean}
   */
  isAdmin() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;
      
      // Decode JWT token to check role
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role === 'admin';
    } catch (error) {
      return false;
    }
  }
}

export default new UserService();