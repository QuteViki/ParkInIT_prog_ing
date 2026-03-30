<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="payment-callback-page">
        <!-- Loading State -->
        <div v-if="processingPayment" class="processing-container">
          <q-spinner color="primary" size="50px" />
          <p class="processing-text">{{ t('payment.processing') || 'Obrađujem vašu uplatu...' }}</p>
        </div>

        <!-- Success State -->
        <div v-else-if="paymentSuccess && reservationNumber" class="success-container">
          <q-icon name="check_circle" size="80px" color="positive" />
          <h2 class="success-title">{{ t('payment.success') || 'Uplata Uspješna' }}</h2>
          <p class="success-message">Vaša rezervacija je potvrđena!</p>
          <div class="reservation-info">
            <p class="reservation-label">Broj Rezervacije:</p>
            <p class="reservation-number">{{ reservationNumber }}</p>
          </div>
          <p class="redirect-message">Preusmjeravamo vas na stranicu potvrde...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="paymentError" class="error-container">
          <q-icon name="error" size="64px" color="negative" />
          <h2 class="error-title">{{ t('payment.failed') || 'Uplata Neuspješna' }}</h2>
          <p class="error-message">{{ paymentError }}</p>
          <div class="button-group">
            <q-btn @click="goBack" label="NATRAG" color="primary" class="full-width" />
            <q-btn
              @click="goToReservations"
              label="MOJE REZERVACIJE"
              flat
              color="primary"
              class="full-width"
            />
          </div>
        </div>

        <!-- Success will redirect automatically -->
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const { t } = useI18n()

const API_URL = 'http://localhost:3000'
const processingPayment = ref(true)
const paymentError = ref(null)
const paymentSuccess = ref(false)
const reservationNumber = ref(null)

onMounted(async () => {
  await verifyPayment()
})

async function verifyPayment() {
  try {
    // Get payment verification code from WSpay response
    const paymentCode = route.query.code || route.query.OrderId
    const status = route.query.Status || route.query.status
    const transactionId = route.query.TransactionId || route.query.transactionId

    if (!paymentCode) {
      throw new Error('Payment code not found')
    }

    // Verify payment with backend
    const response = await fetch(`${API_URL}/api/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({
        paymentCode,
        status,
        transactionId,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Payment verification failed')
    }

    const verificationData = await response.json()

    // Store payment and reservation data
    if (verificationData.success) {
      const pendingReservation = JSON.parse(sessionStorage.getItem('pendingReservation') || '{}')

      // Extract reservation number from backend response
      const brRezervacije = verificationData.Br_rezervacije || verificationData.reservationNumber

      // Store ticket data for success page
      localStorage.setItem('ticketLocation', pendingReservation.location || 'Parking')
      localStorage.setItem('ticketSpace', pendingReservation.spaceNumber || '0')
      localStorage.setItem('ticketSpaceType', pendingReservation.spaceType || 'Standardno')
      localStorage.setItem('ticketDate', pendingReservation.date || '')
      localStorage.setItem('ticketStartTime', pendingReservation.startTime || '')
      localStorage.setItem('ticketEndTime', pendingReservation.endTime || '')
      localStorage.setItem('ticketVehicle', pendingReservation.vehicle || '')
      localStorage.setItem('bookingCode', pendingReservation.bookingCode || '')
      localStorage.setItem('paymentStatus', 'success')
      localStorage.setItem('transactionId', transactionId || '')
      localStorage.setItem('reservationNumber', brRezervacije || '')

      // Clear session data
      sessionStorage.removeItem('pendingReservation')
      sessionStorage.removeItem('paymentData')

      // Show reservation number and success state
      reservationNumber.value = brRezervacije
      paymentSuccess.value = true
      processingPayment.value = false

      // Show success notification
      $q.notify({
        type: 'positive',
        message: `Uplata je uspješna! Broj rezervacije: ${brRezervacije}`,
        position: 'top',
      })

      // Redirect to payment success page after delay
      setTimeout(() => {
        router.push('/payment-success')
      }, 3000)
    } else {
      throw new Error('Payment was not successful')
    }
  } catch (error) {
    console.error('Payment verification error:', error)
    paymentError.value = error.message || 'Greška pri obradi uplate. Molimo pokušajte ponovno.'
    processingPayment.value = false

    $q.notify({
      type: 'negative',
      message: paymentError.value,
      position: 'top',
    })
  }
}

function goBack() {
  router.back()
}

function goToReservations() {
  router.push('/reservations')
}
</script>

<style scoped>
.payment-callback-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: white;
  padding: 20px;
}

.processing-container,
.error-container,
.success-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  max-width: 400px;
  text-align: center;
}

.processing-text {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.success-title {
  margin: 0;
  font-size: 24px;
  color: #2e7d32;
}

.success-message {
  margin: 12px 0 0 0;
  font-size: 16px;
  color: #555;
  line-height: 1.6;
}

.error-title {
  margin: 0;
  font-size: 24px;
  color: #c62828;
}

.error-message {
  margin: 12px 0;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.reservation-info {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 16px;
  width: 100%;
}

.reservation-label {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #999;
  text-transform: uppercase;
  font-weight: 600;
}

.reservation-number {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
  color: #2e7d32;
  font-family: 'Courier New', monospace;
}

.redirect-message {
  margin: 12px 0 0 0;
  font-size: 13px;
  color: #999;
  font-style: italic;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 20px;
}

.button-group .q-btn {
  font-weight: 600;
}
</style>
