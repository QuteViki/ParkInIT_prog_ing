<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="payment-test-page">
        <!-- Header -->
        <q-bar class="bg-primary text-white">
          <div class="text-weight-bold">
            Platna Vrata - {{ testMode ? 'TEST NAČIN' : 'PRODUKCIJA' }}
          </div>
          <q-space />
          <q-toggle
            v-model="testMode"
            @update:model-value="toggleMode"
            label="Test Mode"
            dark
            size="lg"
          />
        </q-bar>

        <!-- Test Payment Form -->
        <div class="test-container">
          <div class="test-header" :class="{ 'prod-header': !testMode }">
            <q-icon
              :name="testMode ? 'bug_report' : 'security'"
              size="32px"
              :color="testMode ? 'info' : 'warning'"
            />
            <h2>{{ testMode ? 'Testiranje Plaćanja' : 'Produkcijska Plaćanja' }}</h2>
            <p class="info-text">
              {{
                testMode
                  ? 'Ovo je test stranica za razvoj. U produkciji, korisnici će biti obaviješteni na WSpay stranicu.'
                  : 'NAPOMENA: Broj Prodajnog Mjesta (OIB) će biti proslijeđen WSpay-u za stvarnu obradu uplate.'
              }}
            </p>
          </div>

          <!-- Order Details -->
          <div class="order-details">
            <div class="detail-row">
              <span class="label">Order ID:</span>
              <span class="value">{{ orderId }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Booking Code:</span>
              <span class="value">{{ bookingCode }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Amount:</span>
              <span class="value">{{ amount }}€</span>
            </div>
          </div>

          <!-- Test Options -->
          <div class="test-options">
            <h3>Odaberite Test Scenario:</h3>

            <q-btn
              @click="simulateSuccess"
              label="✓ Simuliraj Uspješnu Uplate"
              color="positive"
              class="full-width test-btn"
              icon="check_circle"
            />

            <q-btn
              @click="simulateFailure"
              label="✗ Simuliraj Neuspješnu Uplatu"
              color="negative"
              class="full-width test-btn"
              icon="cancel"
            />

            <q-btn
              @click="goBack"
              label="← Natrag"
              color="primary"
              flat
              class="full-width test-btn"
            />
          </div>

          <!-- Loading State -->
          <div v-if="processing" class="processing">
            <q-spinner color="primary" size="40px" />
            <p>Obrađujem test uplatu...</p>
          </div>

          <!-- Info Box -->
          <div class="info-box" :class="{ 'info-box-production': !testMode }">
            <h4>{{ testMode ? 'ℹ️ Test Način' : '⚠️ Produkcijski Način' }}</h4>
            <p v-if="testMode">
              Testirate token plaćanja bez stvarne integracije s WSpay-om. Sve uplate će biti
              simulirane i neće naplaćene stvarni novac.
            </p>
            <p v-else>
              <strong>UPOZORENJE:</strong> Sve uplate će biti obrađene kroz stvarni WSpay sustav.
              Korisnici će biti naplaćeni za svoje rezervacije!
            </p>
            <p v-if="testMode" style="margin-top: 8px">
              <strong>Za produkciju:</strong><br />
              1. Zamijenite testni ključ i ID trgovca s pravim WSpay podatcima<br />
              2. Postavite <code>WSPAY_MODE=production</code> u .env<br />
              3. Implementirajte MD5 signaturu u budžetskom postovi
            </p>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'

const router = useRouter()
const route = useRoute()
const $q = useQuasar()

const orderId = ref('')
const bookingCode = ref('')
const amount = ref(0)
const processing = ref(false)
const testMode = ref(true)

onMounted(() => {
  // Get query parameters from URL
  orderId.value = route.query.orderId || 'ORD-UNKNOWN'
  bookingCode.value = route.query.bookingCode || 'UNKNOWN'
  amount.value = route.query.amount || 0

  // Load test mode preference from localStorage
  const savedMode = localStorage.getItem('payment_test_mode')
  if (savedMode !== null) {
    testMode.value = savedMode === 'true'
  }
})

function toggleMode() {
  // Save mode preference to localStorage
  localStorage.setItem('payment_test_mode', testMode.value)

  $q.notify({
    type: 'info',
    message: testMode.value ? 'Prebačen na TEST način' : 'Prebačen na PRODUKCIJSKU plaćanja',
    position: 'top',
  })
}

async function simulateSuccess() {
  processing.value = true

  try {
    // Simulate WSpay callback with success status
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Mock successful payment status
    const transactionId = `TRX-${Date.now()}`

    // In production mode, show warning
    if (!testMode.value) {
      $q.notify({
        type: 'warning',
        message: 'UPOZORENJE: Ovo će poslati stvarnu uplatu preko WSpay-a!',
        position: 'top',
        timeout: 3000,
      })
    }

    // Verify payment with backend
    const response = await fetch('http://localhost:3000/api/payments/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({
        paymentCode: orderId.value,
        status: 'success',
        transactionId,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      $q.notify({
        type: 'positive',
        message: `Uplata uspješna! Broj rezervacije: ${data.Br_rezervacije || data.br_rezervacije}`,
        position: 'top',
      })

      // Redirect to payment callback as if returning from WSpay
      setTimeout(() => {
        router.push(
          `/payment-callback?code=${orderId.value}&Status=success&TransactionId=${transactionId}`,
        )
      }, 1000)
    } else {
      const error = await response.json()
      throw new Error(error.error || 'Verification failed')
    }
  } catch (error) {
    console.error('Test payment error:', error)
    $q.notify({
      type: 'negative',
      message: `Greška tijekom uplate: ${error.message}`,
      position: 'top',
    })
    processing.value = false
  }
}

async function simulateFailure() {
  processing.value = true

  try {
    // Simulate WSpay callback with failure status
    await new Promise((resolve) => setTimeout(resolve, 1500))

    $q.notify({
      type: 'warning',
      message: testMode.value ? 'Test uplata odbljena!' : 'Uplata je odbljena.',
      position: 'top',
    })

    // Redirect to payment callback as if returning from WSpay with failure
    setTimeout(() => {
      router.push(`/payment-callback?code=${orderId.value}&Status=failure&success=false`)
    }, 1000)
  } catch (error) {
    console.error('Test payment error:', error)
    $q.notify({
      type: 'negative',
      message: 'Greška tijekom testne uplate',
      position: 'top',
    })
    processing.value = false
  }
}

function goBack() {
  router.back()
}
</script>

<style scoped>
.payment-test-page {
  background: #f5f5f5;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.test-container {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 500px;
  margin: 0 auto;
  width: 100%;
}

.test-header {
  background: white;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.test-header.prod-header {
  background: #fff3e0;
  border-left: 4px solid #ff9800;
}

.test-header h2 {
  margin: 12px 0;
  color: #333;
}

.info-text {
  margin: 8px 0;
  color: #666;
  font-size: 14px;
}

.order-details {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.detail-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  color: #666;
}

.value {
  color: #333;
  word-break: break-all;
}

.test-options {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.test-options h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 16px;
}

.test-btn {
  margin-bottom: 10px;
  font-weight: 600;
  padding: 12px;
}

.test-btn:last-child {
  margin-bottom: 0;
}

.processing {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.processing p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.info-box {
  background: #e3f2fd;
  border-left: 4px solid #1976d2;
  border-radius: 4px;
  padding: 16px;
  color: #0d47a1;
  font-size: 13px;
}

.info-box.info-box-production {
  background: #ffebee;
  border-left: 4px solid #c62828;
  color: #b71c1c;
}

.info-box h4 {
  margin: 0 0 8px 0;
  color: #1565c0;
}

.info-box.info-box-production h4 {
  color: #c62828;
}

.info-box p {
  margin: 6px 0;
  line-height: 1.5;
}

.info-box p:last-child {
  margin-bottom: 0;
}

.info-box code {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 4px;
  border-radius: 2px;
  font-family: 'Courier New', monospace;
}
</style>
