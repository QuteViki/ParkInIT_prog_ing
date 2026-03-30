import { api } from 'boot/axios'

// Use your backend as proxy to avoid CORS issues
const API_URL = 'http://192.168.146.153:3000'

/**
 * Fetch parking availability through backend proxy
 * Backend will fetch from Rijeka Plus API and return the data
 */
export async function fetchParkingAvailability () {
  try {
    const { data } = await api.get(`${API_URL}/api/parking/availability`, {
      timeout: 15000
    })
    return data
  } catch (error) {
    console.error('Parking API error:', error)
    throw error
  }
}