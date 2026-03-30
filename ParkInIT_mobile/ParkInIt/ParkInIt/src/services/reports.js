import { api } from 'boot/axios'

// IMPORTANT: Change this to your actual server IP
// For physical Android device, use your computer's local IP
// For emulator, use 10.0.2.2
const BASE_URL = 'http://192.168.146.153:3000'

/**
 * Upload reporta (slika + meta) u backend -> MySQL parking_reports
 *
 * payload:
 * - fileBlob: Blob (obavezno)
 * - parkingId: string (obavezno)
 * - description: string (opcionalno)
 * - userId: number|string (opcionalno)
 * - latitude, longitude: number (opcionalno)
 */
export async function uploadReport ({
  fileBlob,
  parkingId,
  description,
  userId,
  latitude,
  longitude
}) {
  if (!fileBlob) throw new Error('fileBlob is required')
  if (!parkingId) throw new Error('parkingId is required')

  const form = new FormData()
  form.append('image', fileBlob, 'report.jpg')
  form.append('parking_id', parkingId)

  if (description) form.append('description', description)
  if (userId != null && userId !== '') form.append('user_id', String(userId))
  if (latitude != null) form.append('latitude', String(latitude))
  if (longitude != null) form.append('longitude', String(longitude))

  // Get auth token from localStorage
  const token = localStorage.getItem('auth_token')
  
  const { data } = await api.post(`${BASE_URL}/api/reports`, form, {
    headers: { 
      'Content-Type': 'multipart/form-data',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    timeout: 60000 // Increased to 60 seconds for slower networks
  })

  return data
}