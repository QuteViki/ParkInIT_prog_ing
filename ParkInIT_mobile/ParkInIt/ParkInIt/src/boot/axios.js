import { boot } from 'quasar/wrappers'
import axios from 'axios'

// baseURL ne koristimo za Rijeka+ jer je full URL u pozivu,
// ali ostavimo api instancu zbog standarda i timeouta.
const api = axios.create({
  timeout: 15000
})

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})


export { api }
