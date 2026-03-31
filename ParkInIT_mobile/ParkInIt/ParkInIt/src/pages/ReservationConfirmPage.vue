<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="reservation-page">
        <!-- Header -->
        <div class="header-section">
          <q-btn flat round icon="arrow_back" @click="goBack" class="back-btn" size="sm" />
          <h1 class="page-title">{{ t('reservation.titleNew') }}</h1>
        </div>

        <!-- Parking Details Card -->
        <div class="details-card">
          <p class="detail-row">
            <span class="detail-label">{{ t('parking.location') }}:</span>
            <span class="detail-value">{{ parkingData.address }}</span>
          </p>
          <p class="detail-row">
            <span class="detail-label">{{ t('parking.space') }}:</span>
            <span class="detail-value">{{ parkingData.spaceNumber }}</span>
          </p>
          <p class="detail-row">
            <span class="detail-label">{{ t('parking.type') }}:</span>
            <span class="detail-value">
              {{ parkingData.isDisabled ? t('parking.disabled') : t('parking.standard') }}
            </span>
          </p>
        </div>

        <!-- Form Section -->
        <div class="form-section">
          <!-- Date and Vehicle Row -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ t('reservation.date') }}</label>
              <q-input
                v-model="formData.date"
                type="date"
                outlined
                dense
                class="form-input"
                @update:model-value="updateCalculations"
              />
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('reservation.vehicle') }}</label>
              <q-select
                v-model="formData.vehicle"
                :options="vehicleOptions"
                use-input
                fill-input
                hide-selected
                input-debounce="0"
                new-value-mode="add-unique"
                :placeholder="t('reservation.vehiclePlaceholder')"
                outlined
                dense
                class="form-input"
              />
            </div>
          </div>

          <!-- Time Row -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ t('reservation.startTime') }}</label>
              <div class="time-inputs">
                <q-input
                  v-model.number="formData.startHours"
                  type="number"
                  min="0"
                  max="23"
                  outlined
                  dense
                  class="time-input"
                  @update:model-value="updateCalculations"
                />
                <span class="time-separator">:</span>
                <q-input
                  v-model.number="formData.startMinutes"
                  type="number"
                  min="0"
                  max="59"
                  outlined
                  dense
                  class="time-input"
                  @update:model-value="updateCalculations"
                />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">{{ t('reservation.endTime') }}</label>
              <div class="time-inputs">
                <q-input
                  v-model.number="formData.endHours"
                  type="number"
                  min="0"
                  max="23"
                  outlined
                  dense
                  class="time-input"
                  @update:model-value="updateCalculations"
                />
                <span class="time-separator">:</span>
                <q-input
                  v-model.number="formData.endMinutes"
                  type="number"
                  min="0"
                  max="59"
                  outlined
                  dense
                  class="time-input"
                  @update:model-value="updateCalculations"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Duration and Price Section -->
        <div class="calculation-section">
          <div class="calc-row">
            <div class="calc-item">
              <span class="calc-label">{{ t('reservation.duration') }}</span>
              <span class="calc-value">{{ durationText }}</span>
            </div>
            <div class="calc-item">
              <span class="calc-label">{{ t('reservation.price') }}</span>
              <span class="calc-value">{{ pricePerHour }}€ x {{ hours }}</span>
            </div>
          </div>
          <div class="calc-total">
            <span class="total-label">{{ t('reservation.total') }}</span>
            <span class="total-price">{{ totalPrice.toFixed(2) }}€</span>
          </div>
        </div>

        <!-- Payment Button -->
        <div class="button-section">
          <q-btn
            @click="handlePayment"
            :label="`${t('reservation.pay')} ${totalPrice.toFixed(2)}€`"
            color="primary"
            class="full-width pay-btn"
            :loading="loading"
          />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const $q = useQuasar()
const { t } = useI18n()

// API Configuration
const API_URL = import.meta.env.VITE_API_URL
const DISABLED_SPACE_HOURLY_PRICE = 0.5

// Get parking data from localStorage (set by new ParkingSpacePageNew)
const reservationDataStr = localStorage.getItem('reservationData')
const parsedReservationData = reservationDataStr ? JSON.parse(reservationDataStr) : null

const parkingData = ref({
  address: parsedReservationData?.parkingAddress || 'Rijeka',
  spaceNumber: parsedReservationData?.spaceNumber || '1',
  isDisabled: parsedReservationData?.spaceType === 'invalidsko',
  parkingId: parsedReservationData?.parkingId,
  parkingPrice: Number(parsedReservationData?.parkingPrice) || 1.5,
})

const pricePerHour = ref(
  parkingData.value.isDisabled
    ? DISABLED_SPACE_HOURLY_PRICE
    : Number(parsedReservationData?.parkingPrice) || 1.5,
)

// Pre-fill form with data from parking page
const formData = ref({
  date: parsedReservationData?.date || new Date().toISOString().split('T')[0],
  vehicle: '',
  startHours: parseInt(parsedReservationData?.startTime?.split(':')[0] || '13'),
  startMinutes: parseInt(parsedReservationData?.startTime?.split(':')[1] || '0'),
  endHours: parseInt(parsedReservationData?.endTime?.split(':')[0] || '15'),
  endMinutes: parseInt(parsedReservationData?.endTime?.split(':')[1] || '0'),
})

const loading = ref(false)

const userVehicles = ref([])
const vehicleOptions = computed(() => userVehicles.value.map((v) => v.registracija))

async function loadUserVehicles() {
  try {
    const res = await fetch(`${API_URL}/api/user/vehicles`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    })
    if (res.ok) userVehicles.value = await res.json()
  } catch {
    // silently fail - user can still type registration manually
  }
}

onMounted(loadUserVehicles)

// Computed properties for calculations
const hours = computed(() => {
  const startMinutesTotal = formData.value.startHours * 60 + formData.value.startMinutes
  const endMinutesTotal = formData.value.endHours * 60 + formData.value.endMinutes
  let diff = endMinutesTotal - startMinutesTotal

  if (diff < 0) {
    diff += 24 * 60 // next day
  }

  return Math.ceil(diff / 60) // round up to nearest hour
})

const durationText = computed(() => {
  if (formData.value.endHours < formData.value.startHours) {
    return `${formData.value.startHours}:${String(formData.value.startMinutes).padStart(2, '0')} - ${formData.value.endHours}:${String(formData.value.endMinutes).padStart(2, '0')} (${t('reservation.nextDay')})`
  }
  return `${formData.value.startHours}:${String(formData.value.startMinutes).padStart(2, '0')} - ${formData.value.endHours}:${String(formData.value.endMinutes).padStart(2, '0')} = ${hours.value}h`
})

const totalPrice = computed(() => {
  return hours.value * pricePerHour.value
})

function updateCalculations() {
  // Trigger reactivity for computed properties
  if (formData.value.startMinutes > 59) {
    formData.value.startMinutes = 59
  }
  if (formData.value.endMinutes > 59) {
    formData.value.endMinutes = 59
  }
  if (formData.value.startHours > 23) {
    formData.value.startHours = 23
  }
  if (formData.value.endHours > 23) {
    formData.value.endHours = 23
  }
}

function goBack() {
  router.back()
}

async function handlePayment() {
  // Validate each field individually
  if (!formData.value.date) {
    $q.notify({
      type: 'warning',
      message: t('reservation.date') + ' je obavezno',
      position: 'top',
    })
    return
  }

  if (!formData.value.vehicle) {
    $q.notify({
      type: 'warning',
      message: t('reservation.vehicle') + ' je obavezno',
      position: 'top',
    })
    return
  }

  if (formData.value.startHours === null || formData.value.startHours === '') {
    $q.notify({
      type: 'warning',
      message: t('reservation.startTime') + ' je obavezno',
      position: 'top',
    })
    return
  }

  if (formData.value.startMinutes === null || formData.value.startMinutes === '') {
    $q.notify({
      type: 'warning',
      message: t('reservation.startTime') + ' je obavezno',
      position: 'top',
    })
    return
  }

  if (formData.value.endHours === null || formData.value.endHours === '') {
    $q.notify({
      type: 'warning',
      message: t('reservation.endTime') + ' je obavezno',
      position: 'top',
    })
    return
  }

  if (formData.value.endMinutes === null || formData.value.endMinutes === '') {
    $q.notify({
      type: 'warning',
      message: t('reservation.endTime') + ' je obavezno',
      position: 'top',
    })
    return
  }

  if (hours.value <= 0) {
    $q.notify({
      type: 'warning',
      message: 'Vrijeme završetka mora biti nakon vremena početka',
      position: 'top',
    })
    return
  }

  loading.value = true

  try {
    // Generate a booking code (format: PKIT-YYYY-[random])
    const year = new Date().getFullYear()
    const random = String(Math.floor(Math.random() * 100000)).padStart(5, '0')
    const bookingCode = `PKIT-${year}-RE${random}`

    // Prepare the datetime strings in database format (YYYY-MM-DD HH:MM:SS)
    const startTimeStr = `${String(formData.value.startHours).padStart(2, '0')}:${String(formData.value.startMinutes).padStart(2, '0')}`
    const endTimeStr = `${String(formData.value.endHours).padStart(2, '0')}:${String(formData.value.endMinutes).padStart(2, '0')}`
    const Vrijeme_pocetka = `${formData.value.date} ${startTimeStr}:00`
    const Vrijeme_isteka = `${formData.value.date} ${endTimeStr}:00`

    // Prepare reservation data for payment initiation
    const reservationData = {
      bookingCode,
      spaceNumber: parkingData.value.spaceNumber,
      date: formData.value.date,
      vehicle: formData.value.vehicle,
      startTime: startTimeStr,
      endTime: endTimeStr,
      startDateTime: Vrijeme_pocetka,
      endDateTime: Vrijeme_isteka,
      duration: hours.value,
      totalPrice: totalPrice.value,
      isDisabledSpace: parkingData.value.isDisabled,
      address: parkingData.value.address,
      parkingId: parkingData.value.parkingId,
      parkingPrice: pricePerHour.value,
      spaceType: parkingData.value.isDisabled ? 'invalidsko' : 'standardno',
    }

    // Call backend to initialize payment
    const response = await fetch(`${API_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({
        bookingCode: reservationData.bookingCode,
        amount: Math.round(totalPrice.value * 100), // Code expects amount in cents
        description: `Parking Reservation - ${reservationData.address} - Space ${reservationData.spaceNumber}`,
        reservation: reservationData,
      }),
    })

    if (!response.ok) {
      let errorMessage = 'Greška pri iniciiranju plaćanja'
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch {
        errorMessage = `Server error: ${response.status} ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    const paymentData = await response.json()

    if (!paymentData.success) {
      throw new Error(paymentData.message || 'Greška pri plaćanju')
    }

    // Store e-karta data for the success page
    localStorage.setItem('ekartaData', JSON.stringify(paymentData))
    localStorage.removeItem('reservationData')

    // Navigate to e-karta success page
    router.push('/payment-success')
  } catch (error) {
    console.error('Payment initiation error:', error)
    $q.notify({
      type: 'negative',
      message: error.message || t('reservation.paymentError') || 'Greška pri plaćanju',
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.reservation-page {
  padding: 0;
  background: white;
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Header */
.header-section {
  padding: 8px clamp(10px, 2.5vw, 14px);
  background: white;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.back-btn {
  color: #333;
  min-width: 32px;
  min-height: 32px;
  flex-shrink: 0;
}

.page-title {
  margin: 0;
  font-size: clamp(14px, 3.5vw, 16px);
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}

/* Details Card */
.details-card {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin: 10px clamp(10px, 2.5vw, 14px);
  padding: 10px 12px;
  flex-shrink: 0;
}

.detail-row {
  margin: 4px 0;
  font-size: clamp(10px, 2.5vw, 11px);
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.detail-label {
  font-weight: 600;
  color: #666;
}

.detail-value {
  color: #333;
  text-align: right;
  flex: 1;
}

/* Form Section */
.form-section {
  padding: 10px clamp(10px, 2.5vw, 14px);
  flex-shrink: 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: clamp(9px, 2.2vw, 10px);
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  font-size: clamp(10px, 2.5vw, 11px);
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
}

.time-input {
  flex: 1;
  font-size: clamp(10px, 2.5vw, 11px);
}

.time-input :deep(.q-field__control) {
  text-align: center;
}

.time-separator {
  font-size: clamp(12px, 3vw, 14px);
  font-weight: 600;
  color: #333;
  padding: 0 2px;
}

/* Calculation Section */
.calculation-section {
  padding: 10px clamp(10px, 2.5vw, 14px);
  border: 1px solid #ddd;
  border-radius: 6px;
  margin: 10px clamp(10px, 2.5vw, 14px);
  flex-shrink: 0;
}

.calc-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 8px;
}

.calc-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.calc-label {
  font-size: clamp(8px, 2vw, 9px);
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.calc-value {
  font-size: clamp(10px, 2.5vw, 11px);
  color: #333;
  font-weight: 500;
}

.calc-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
}

.total-label {
  font-size: clamp(9px, 2.2vw, 10px);
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
}

.total-price {
  font-size: clamp(11px, 2.8vw, 12px);
  font-weight: 700;
  color: #333;
}

/* Button Section */
.button-section {
  padding: 10px clamp(10px, 2.5vw, 14px);
  flex-shrink: 0;
  margin-bottom: 10px;
}

.pay-btn {
  min-height: 38px;
  font-size: clamp(11px, 2.5vw, 12px);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Responsive */
@media (min-width: 600px) {
  .form-row {
    gap: 14px;
  }

  .time-inputs {
    gap: 6px;
  }
}
</style>
