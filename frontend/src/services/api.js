import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // God Mode: super-admin org override
  const orgOverride = localStorage.getItem('orgOverride')
  if (orgOverride) {
    config.headers['X-Org-Override'] = orgOverride
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login on 401 from /auth/me (session check), not from data fetches
    if (error.response?.status === 401 && error.config?.url?.includes('/auth/me')) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
