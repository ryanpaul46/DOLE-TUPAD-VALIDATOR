import api from '../api/axios';

class CSRFService {
  constructor() {
    this.token = null;
  }

  async getToken() {
    if (!this.token) {
      try {
        const response = await api.get('/api/csrf-token');
        this.token = response.data.csrfToken;
      } catch (error) {
        console.error('Failed to get CSRF token:', error);
        throw error;
      }
    }
    return this.token;
  }

  async setTokenHeader() {
    const token = await this.getToken();
    api.defaults.headers.common['X-CSRF-Token'] = token;
    return token;
  }

  clearToken() {
    this.token = null;
    delete api.defaults.headers.common['X-CSRF-Token'];
  }
}

export default new CSRFService();