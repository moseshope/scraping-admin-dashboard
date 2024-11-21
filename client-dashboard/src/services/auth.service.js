import api from './api';

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.email - User's email
   * @param {string} userData.password - User's password
   * @param {string} userData.name - User's full name
   * @returns {Promise} Response from the API
   */
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  }

  /**
   * Login user
   * @param {Object} credentials - User login credentials
   * @param {string} credentials.email - User's email
   * @param {string} credentials.password - User's password
   * @returns {Promise} Response from the API
   */
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  }

  /**
   * Logout user
   * @returns {Promise} Response from the API
   */
  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
    }
  }

  /**
   * Refresh access token
   * @returns {Promise} Response from the API
   */
  async refreshToken() {
    const response = await api.post('/auth/refresh-token');
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  }

  /**
   * Get user profile
   * @returns {Promise} Response from the API
   */
  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!localStorage.getItem('token');
  }

  /**
   * Get authentication token
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem('token');
  }
}

export default new AuthService();