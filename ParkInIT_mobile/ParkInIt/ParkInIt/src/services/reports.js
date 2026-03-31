import { api } from 'boot/axios'

const BASE_URL = import.meta.env.VITE_API_URL

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