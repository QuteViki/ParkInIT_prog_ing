<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="status-page">
        <div class="status-card cancel-card">
          <div class="icon-wrap cancel-icon">!</div>

          <h1 class="status-title">Plaćanje je otkazano</h1>
          <p class="status-text">
            Otkazali ste postupak plaćanja. Rezervacija nije potvrđena i možete pokušati ponovno.
          </p>

          <div class="info-box">
            <p class="info-label">Order ID</p>
            <p class="info-value">{{ orderId || 'Nije dostupan' }}</p>
          </div>

          <div class="button-group">
            <q-btn
              @click="retryPayment"
              label="Pokušaj ponovno"
              color="primary"
              class="full-width action-btn"
            />
            <q-btn
              @click="goToParking"
              label="Natrag na parking"
              flat
              color="white"
              class="full-width secondary-btn q-mt-sm"
            />
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const orderId = computed(() => route.query.orderId || '')

function retryPayment() {
  router.push('/reservation-confirm')
}

function goToParking() {
  router.push('/parking')
}
</script>

<style scoped>
.status-page {
  min-height: 100vh;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.status-card {
  width: 100%;
  max-width: 420px;
  background: #16213e;
  border: 1px solid #334155;
  border-radius: 18px;
  padding: 28px 22px;
  text-align: center;
  color: white;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.icon-wrap {
  width: 72px;
  height: 72px;
  margin: 0 auto 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  font-weight: 700;
}

.cancel-icon {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 2px solid #f59e0b;
}

.status-title {
  margin: 0 0 10px;
  font-size: 24px;
  font-weight: 700;
}

.status-text {
  margin: 0 0 20px;
  color: #cbd5e1;
  font-size: 14px;
  line-height: 1.5;
}

.info-box {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 22px;
}

.info-label {
  margin: 0 0 6px;
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.info-value {
  margin: 0;
  font-size: 14px;
  color: #f8fafc;
  font-weight: 600;
  word-break: break-all;
}

.button-group {
  margin-top: 8px;
}

.action-btn {
  min-height: 44px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.secondary-btn {
  min-height: 42px;
  border: 1px solid #475569;
}
</style>
