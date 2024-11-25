import api from './api';

class ProjectService {
  /**
   * Create a new project
   * @param {Object} projectData - Project data
   * @returns {Promise} Response from the API
   */
  async createProject(projectData) {
    const response = await api.post('/projects', projectData);
    return response.data;
  }

  /**
   * Get all projects
   * @returns {Promise} Response from the API
   */
  async getProjects() {
    const response = await api.get('/projects');
    return response.data;
  }

  /**
   * Get project by ID
   * @param {string} id - Project ID
   * @returns {Promise} Response from the API
   */
  async getProjectById(id) {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  }

  /**
   * Update project
   * @param {string} id - Project ID
   * @param {Object} projectData - Updated project data
   * @returns {Promise} Response from the API
   */
  async updateProject(id, projectData) {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data;
  }

  /**
   * Delete project
   * @param {string} id - Project ID
   * @returns {Promise} Response from the API
   */
  async deleteProject(id) {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  }

  /**
   * Start project scraping
   * @param {string} id - Project ID
   * @returns {Promise} Response from the API
   */
  async startProject(id) {
    const response = await api.post(`/projects/${id}/start`);
    return response.data;
  }

  /**
   * Pause project scraping
   * @param {string} id - Project ID
   * @returns {Promise} Response from the API
   */
  async pauseProject(id) {
    const response = await api.post(`/projects/${id}/pause`);
    return response.data;
  }

  /**
   * Resume project scraping
   * @param {string} id - Project ID
   * @returns {Promise} Response from the API
   */
  async resumeProject(id) {
    const response = await api.post(`/projects/${id}/resume`);
    return response.data;
  }

  /**
   * Get project status
   * @param {string} id - Project ID
   * @returns {Promise} Response from the API
   */
  async getProjectStatus(id) {
    const response = await api.get(`/projects/${id}/status`);
    return response.data;
  }

  /**
   * Get project statistics
   * @param {string} id - Project ID
   * @returns {Promise} Response from the API
   */
  async getProjectStats(id) {
    const response = await api.get(`/projects/${id}/stats`);
    return response.data;
  }
}

export default new ProjectService();