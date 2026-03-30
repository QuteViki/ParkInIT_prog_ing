<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="ekarta-page">
        <!-- Header -->
        <div class="ekarta-header">
          <p class="header-label">PLAĆANJE USPJEŠNO</p>
        </div>

        <!-- Ticket Card -->
        <div class="ticket-card">
          <!-- Ticket Title -->
          <div class="ticket-title-row">
            <div class="ticket-icon">P</div>
            <h2 class="ticket-title">PARKIRNA E-KARTA</h2>
          </div>

          <!-- Status Badges -->
          <div class="badge-row">
            <span class="badge badge-green">✓ Plaćena</span>
            <span class="badge badge-blue">✉ Poslano na mail</span>
          </div>

          <!-- QR + Code Section -->
          <div class="qr-section">
            <div class="qr-wrapper">
              <img v-if="qrCodeUrl" :src="qrCodeUrl" alt="QR kod" class="qr-image" />
              <div v-else class="qr-placeholder">QR</div>
            </div>
            <div class="code-info">
              <p class="code-label">KOD KARTE (QR_KOD)</p>
              <p class="code-value">{{ bookingCode }}</p>
              <p class="code-sub">Br_rezervacije: #{{ brRezervacije }}</p>
            </div>
          </div>

          <!-- Reservation Details -->
          <div class="details-section">
            <p class="section-title">REZERVACIJA</p>

            <div class="detail-row">
              <span class="detail-label">Parking</span>
              <span class="detail-value">{{ ekarta.parking }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Broj_parkirnog_mjesta</span>
              <span class="detail-value">{{ ekarta.spaceNumber }} • {{ ekarta.spaceType }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">ID_korisnika</span>
              <span class="detail-value">#{{ ekarta.userId }} – {{ ekarta.userName }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status_rezervacije</span>
              <span class="detail-value">{{ ekarta.statusRezervacije }}</span>
            </div>
          </div>

          <!-- E-Karta Time Details -->
          <div class="details-section">
            <p class="section-title">E-KARTA</p>

            <div class="detail-row">
              <span class="detail-label">Vrijeme_pocetka</span>
              <span class="detail-value">{{ formatDateTime(ekarta.startDateTime) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Vrijeme_isteka</span>
              <span class="detail-value">{{ formatDateTime(ekarta.endDateTime) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Poslana_na_mail</span>
              <span class="detail-value">✓ Da (1)</span>
            </div>
          </div>

          <!-- Vehicle + Time Footer -->
          <div class="ticket-footer">
            <div class="footer-vehicle">{{ ekarta.vehicle }}</div>
            <div class="footer-time">
              <p class="footer-label">VRIJEDI</p>
              <p class="footer-value">{{ startTime }} – {{ endTime }}</p>
              <p class="footer-date">{{ formatDate(ekarta.startDateTime) }}</p>
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <div class="action-section">
          <q-btn
            @click="goToReservations"
            label="Moje rezervacije"
            color="primary"
            class="full-width action-btn"
          />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const bookingCode = ref('')
const brRezervacije = ref('')
const qrCodeUrl = ref('')
const ekarta = ref({
  parking: '',
  spaceNumber: '',
  spaceType: '',
  startDateTime: '',
  endDateTime: '',
  vehicle: '',
  userName: '',
  userId: '',
  statusRezervacije: '',
})

const startTime = computed(() => {
  if (!ekarta.value.startDateTime) return ''
  const d = new Date(ekarta.value.startDateTime)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

const endTime = computed(() => {
  if (!ekarta.value.endDateTime) return ''
  const d = new Date(ekarta.value.endDateTime)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

onMounted(() => {
  const saved = localStorage.getItem('ekartaData')
  if (saved) {
    const data = JSON.parse(saved)
    bookingCode.value = data.bookingCode || ''
    brRezervacije.value = data.brRezervacije || ''
    qrCodeUrl.value = data.qrCode || ''
    if (data.ekarta) {
      ekarta.value = { ...ekarta.value, ...data.ekarta }
    }
  }
})

function formatDateTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year}. ${hours}:${minutes}`
}

function formatDate(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}.`
}

function goToReservations() {
  localStorage.removeItem('ekartaData')
  localStorage.removeItem('reservationData')
  router.push('/reservation')
}
</script>

<style scoped>
.ekarta-page {
  padding: 0 !important;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  overflow-y: auto;
}

.ekarta-header {
  text-align: center;
  padding: 16px;
}

.header-label {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #aaa;
  letter-spacing: 2px;
  text-transform: uppercase;
}

/* Ticket Card */
.ticket-card {
  background: #16213e;
  border: 1px solid #334155;
  border-radius: 16px;
  margin: 0 16px 16px;
  padding: 20px;
  overflow: hidden;
}

.ticket-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.ticket-icon {
  width: 40px;
  height: 40px;
  background: white;
  color: #1a1a2e;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 20px;
}

.ticket-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: white;
  letter-spacing: 1px;
}

/* Badges */
.badge-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.badge-green {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid #4ade80;
}

.badge-blue {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid #60a5fa;
}

/* QR Section */
.qr-section {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 16px;
}

.qr-wrapper {
  flex-shrink: 0;
}

.qr-image {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  background: white;
  padding: 4px;
}

.qr-placeholder {
  width: 100px;
  height: 100px;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #666;
}

.code-info {
  flex: 1;
}

.code-label {
  margin: 0 0 4px;
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.code-value {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: white;
  font-family: 'Courier New', monospace;
  word-break: break-all;
}

.code-sub {
  margin: 0;
  font-size: 11px;
  color: #64748b;
}

/* Details */
.details-section {
  margin-bottom: 12px;
}

.section-title {
  margin: 0 0 8px;
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border-bottom: 1px solid #334155;
  padding-bottom: 6px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 12px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  color: #94a3b8;
}

.detail-value {
  color: #e2e8f0;
  font-weight: 500;
  text-align: right;
}

/* Footer */
.ticket-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px dashed #334155;
}

.footer-vehicle {
  background: #dc2626;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 800;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}

.footer-time {
  text-align: right;
}

.footer-label {
  margin: 0;
  font-size: 9px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.footer-value {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #4ade80;
}

.footer-date {
  margin: 0;
  font-size: 11px;
  color: #64748b;
}

/* Action */
.action-section {
  padding: 0 16px 24px;
}

.action-btn {
  min-height: 44px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@media (min-width: 600px) {
  .ticket-card {
    max-width: 450px;
    margin-left: auto;
    margin-right: auto;
  }
  .action-section {
    max-width: 450px;
    margin-left: auto;
    margin-right: auto;
  }
}
</style>
