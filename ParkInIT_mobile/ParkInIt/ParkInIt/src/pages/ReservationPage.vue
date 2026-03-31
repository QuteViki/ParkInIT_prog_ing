<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="reservations-page">
        <!-- Header -->
        <div class="header-section">
          <h1 class="page-title">{{ t('reservations.title') }}</h1>
          <q-btn
            @click="goToNewReservation"
            label="+ NOVA"
            color="primary"
            class="new-reservation-btn"
            size="sm"
          />
        </div>

        <!-- Filter Tabs -->
        <div class="filter-tabs">
          <button
            v-for="tab in filterTabs"
            :key="tab.value"
            @click="activeFilter = tab.value"
            :class="['filter-tab', { active: activeFilter === tab.value }]"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Reservations List -->
        <div v-if="loading" class="loading-state">
          <q-spinner color="primary" size="40px" />
        </div>
        <div v-else class="reservations-list">
          <div
            v-for="reservation in filteredReservations"
            :key="reservation.id"
            class="reservation-card"
          >
            <!-- Card Header -->
            <div class="card-header">
              <h3 class="card-title">
                {{ reservation.location }} - {{ t('parking.space') }} {{ reservation.spaceNumber }}
              </h3>
              <span :class="['status-badge', `status-${getStatusClass(reservation.status)}`]">
                {{ getStatusLabel(reservation.status) }}
              </span>
            </div>

            <!-- Card Info -->
            <div class="card-info">
              <div class="info-item">
                <span class="info-label">{{ t('reservation.date') }}</span>
                <span class="info-value">{{ formatDate(reservation.date) }}</span>
              </div>
              <div class="divider"></div>
              <div class="info-item">
                <span class="info-label">{{ t('reservation.startTime') }}</span>
                <span class="info-value"
                  >{{ reservation.startTime }} - {{ reservation.endTime }}</span
                >
              </div>
              <div class="divider"></div>
              <div class="info-item">
                <span class="info-label">{{ t('reservation.vehicle') }}</span>
                <span class="info-value">{{ reservation.vehicle }}</span>
              </div>
            </div>

            <!-- Card Footer with Buttons -->
            <div class="card-footer">
              <q-btn
                flat
                label="E-KARTA"
                color="primary"
                size="sm"
                class="card-btn"
                @click="viewECard(reservation)"
              />
              <q-btn
                v-if="canCancelReservation(reservation)"
                flat
                label="OTKAŽI"
                color="negative"
                size="sm"
                class="card-btn"
                @click="cancelReservation(reservation)"
              />
              <q-btn
                v-if="canHideReservation(reservation)"
                flat
                round
                dense
                icon="delete"
                color="grey"
                size="sm"
                class="card-btn"
                @click="hideReservation(reservation.id)"
              />
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredReservations.length === 0" class="empty-state">
            <p>{{ t('reservations.noReservations') }}</p>
          </div>
        </div>

        <!-- E-Karta Dialog (blue design) -->
        <q-dialog v-model="showTicketDialog" maximized>
          <q-card class="ekarta-dialog">
            <q-bar class="bg-primary text-white">
              <div class="text-weight-bold">PARKIRNA E-KARTA</div>
              <q-space />
              <q-btn dense flat icon="close" v-close-popup />
            </q-bar>

            <q-card-section class="ekarta-dialog-body">
              <!-- Loading state -->
              <div v-if="ekartaLoading" class="ekarta-loading">
                <q-spinner color="white" size="40px" />
              </div>

              <!-- Ticket Card -->
              <div v-else class="ticket-card">
                <div class="ticket-title-row">
                  <div class="ticket-icon">P</div>
                  <h2 class="ticket-title">PARKIRNA E-KARTA</h2>
                </div>

                <div class="badge-row">
                  <span
                    :class="[
                      'badge',
                      ekartaData.statusRezervacije === 'placena' ? 'badge-green' : 'badge-grey',
                    ]"
                  >
                    {{
                      ekartaData.statusRezervacije === 'placena'
                        ? '✓ Plaćena'
                        : getStatusLabel(ekartaData.statusRezervacije)
                    }}
                  </span>
                  <span v-if="ekartaData.poslanaNamail" class="badge badge-blue"
                    >✉ Poslano na mail</span
                  >
                </div>

                <div class="qr-section">
                  <div class="qr-wrapper">
                    <img v-if="ekartaQrUrl" :src="ekartaQrUrl" alt="QR kod" class="qr-image" />
                    <div v-else class="qr-placeholder">QR</div>
                  </div>
                  <div class="code-info">
                    <p class="code-label">KOD KARTE (QR_KOD)</p>
                    <p class="code-value">{{ ekartaBookingCode }}</p>
                    <p class="code-sub">Br_rezervacije: #{{ ekartaData.brRezervacije }}</p>
                  </div>
                </div>

                <div class="details-section">
                  <p class="section-title">REZERVACIJA</p>
                  <div class="detail-row">
                    <span class="detail-label">Parking</span>
                    <span class="detail-value">{{ ekartaData.parking }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Broj_parkirnog_mjesta</span>
                    <span class="detail-value"
                      >{{ ekartaData.spaceNumber }} • {{ ekartaData.spaceType }}</span
                    >
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">ID_korisnika</span>
                    <span class="detail-value"
                      >#{{ ekartaData.userId }} – {{ ekartaData.userName }}</span
                    >
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Status_rezervacije</span>
                    <span class="detail-value">{{ ekartaData.statusRezervacije }}</span>
                  </div>
                </div>

                <div class="details-section">
                  <p class="section-title">E-KARTA</p>
                  <div class="detail-row">
                    <span class="detail-label">Vrijeme_pocetka</span>
                    <span class="detail-value">{{ formatDateTime(ekartaData.startDateTime) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Vrijeme_isteka</span>
                    <span class="detail-value">{{ formatDateTime(ekartaData.endDateTime) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Poslana_na_mail</span>
                    <span class="detail-value">{{
                      ekartaData.poslanaNamail ? '✓ Da (1)' : '✗ Ne (0)'
                    }}</span>
                  </div>
                </div>

                <div class="ticket-footer-blue">
                  <div class="footer-vehicle">{{ ekartaData.vehicle }}</div>
                  <div class="footer-time">
                    <p class="footer-label">VRIJEDI</p>
                    <p class="footer-value">{{ ekartaStartTime }} – {{ ekartaEndTime }}</p>
                    <p class="footer-date">{{ formatDate2(ekartaData.startDateTime) }}</p>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-dialog>
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

const API_URL = import.meta.env.VITE_API_URL

const HIDDEN_KEY = 'hidden_reservations'
const hiddenIds = ref(new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]')))

function hideReservation(id) {
  hiddenIds.value.add(id)
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hiddenIds.value]))
}

const activeFilter = ref('all')
const loading = ref(false)
const reservations = ref([])

// E-karta dialog state
const showTicketDialog = ref(false)
const ekartaLoading = ref(false)
const ekartaBookingCode = ref('')
const ekartaQrUrl = ref('')
const ekartaData = ref({
  brRezervacije: '',
  parking: '',
  spaceNumber: '',
  spaceType: '',
  startDateTime: '',
  endDateTime: '',
  vehicle: '',
  userName: '',
  userId: '',
  statusRezervacije: '',
  poslanaNamail: false,
})

const ekartaStartTime = computed(() => {
  if (!ekartaData.value.startDateTime) return ''
  const d = new Date(ekartaData.value.startDateTime)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

const ekartaEndTime = computed(() => {
  if (!ekartaData.value.endDateTime) return ''
  const d = new Date(ekartaData.value.endDateTime)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

const filterTabs = [
  { label: 'SVE', value: 'all' },
  { label: 'AKTIVNE', value: 'aktivna' },
  { label: 'ISKORIŠTENE', value: 'placena' },
  { label: 'OTKAZANE', value: 'otkazana' },
]

function isExpiredReservation(reservation) {
  if (!reservation?.endDateTimeRaw) return false
  const end = new Date(reservation.endDateTimeRaw)
  return !Number.isNaN(end.getTime()) && end.getTime() <= Date.now()
}

function getTabBucket(reservation) {
  const status = String(reservation?.status || '')
    .trim()
    .toLowerCase()
  if (status === 'otkazana' || status === 'cancelled') return 'otkazana'

  // Invalid/expired tickets go to Iskoristene in pilot mode.
  if (status === 'placena' || status === 'aktivna' || status === 'active') {
    return isExpiredReservation(reservation) ? 'placena' : 'aktivna'
  }

  // Future-ready: if a true "used" status exists, place it in Iskoristene.
  if (status === 'iskoristena' || status === 'istekla' || status === 'finished') return 'placena'
  return status
}

function canCancelReservation(reservation) {
  return getTabBucket(reservation) === 'aktivna'
}

function canHideReservation(reservation) {
  const bucket = getTabBucket(reservation)
  return bucket === 'placena' || bucket === 'otkazana'
}

// Map backend Status_rezervacije to display labels
function getStatusLabel(status) {
  const labels = {
    aktivna: 'AKTIVAN',
    placena: 'PLAĆENA',
    otkazana: 'OTKAZANA',
    // keep old values for safety
    active: 'AKTIVAN',
    finished: 'ZAVRŠENA',
    cancelled: 'OTKAZANA',
  }
  return labels[status] || status?.toUpperCase() || ''
}

// Map backend status to CSS class suffix
function getStatusClass(status) {
  const map = {
    aktivna: 'active',
    placena: 'active',
    otkazana: 'cancelled',
    active: 'active',
    finished: 'finished',
    cancelled: 'cancelled',
  }
  return map[status] || 'finished'
}

const filteredReservations = computed(() => {
  const list =
    activeFilter.value === 'all'
      ? reservations.value
      : reservations.value.filter((r) => getTabBucket(r) === activeFilter.value)
  return list.filter((r) => !hiddenIds.value.has(r.id))
})

// Convert ISO datetime to time string "HH:MM"
function toTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDate(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

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

function formatDate2(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}.`
}

function goToNewReservation() {
  router.push('/parking')
}

async function loadReservations() {
  loading.value = true
  try {
    const res = await fetch(`${API_URL}/api/reservations`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    })
    if (!res.ok) throw new Error('Greška pri učitavanju')
    const data = await res.json()
    // Map backend fields to display model
    reservations.value = data.map((r) => ({
      id: r.Br_rezervacije,
      location: r.Adresa_parkinga || `Parkirno mjesto ${r.Broj_parkirnog_mjesta}`,
      spaceNumber: r.Broj_parkirnog_mjesta,
      date: r.Vrijeme_pocetka ? new Date(r.Vrijeme_pocetka).toISOString().split('T')[0] : '',
      startTime: toTime(r.Vrijeme_pocetka),
      endTime: toTime(r.Vrijeme_isteka),
      endDateTimeRaw: r.Vrijeme_isteka,
      vehicle: r.Registracija || '—',
      status: r.Status_rezervacije,
      price: '',
    }))
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.message || 'Greška pri učitavanju rezervacija',
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

async function viewECard(reservation) {
  showTicketDialog.value = true
  ekartaLoading.value = true
  ekartaBookingCode.value = ''
  ekartaQrUrl.value = ''
  ekartaData.value = {
    brRezervacije: reservation.id,
    parking: reservation.location,
    spaceNumber: reservation.spaceNumber,
    spaceType: '',
    startDateTime: '',
    endDateTime: '',
    vehicle: reservation.vehicle,
    userName: '',
    userId: '',
    statusRezervacije: reservation.status,
    poslanaNamail: false,
  }

  try {
    const res = await fetch(`${API_URL}/api/reservations/${reservation.id}/ekarta`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    })
    if (!res.ok) throw new Error('E-karta nije pronađena')
    const data = await res.json()
    ekartaBookingCode.value = data.bookingCode || ''
    ekartaQrUrl.value = data.qrCode || ''
    ekartaData.value = {
      brRezervacije: data.brRezervacije,
      ...data.ekarta,
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.message || 'Greška pri učitavanju e-karte',
      position: 'top',
    })
  } finally {
    ekartaLoading.value = false
  }
}

function cancelReservation(reservation) {
  $q.dialog({
    title: 'Otkaži rezervaciju?',
    message: `${reservation.location} - ${t('parking.space')} ${reservation.spaceNumber}`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const res = await fetch(`${API_URL}/api/reservations/${reservation.id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Greška pri otkazivanju')
      }
      $q.notify({ type: 'positive', message: 'Rezervacija je otkazana', position: 'top' })
      await loadReservations()
    } catch (err) {
      $q.notify({ type: 'negative', message: err.message, position: 'top' })
    }
  })
}

onMounted(loadReservations)
</script>

<style scoped>
.reservations-page {
  padding: 0 !important;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
}

/* Header */
.header-section {
  padding: clamp(10px, 2.5vw, 14px);
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.page-title {
  margin: 0;
  font-size: clamp(16px, 4vw, 18px);
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.new-reservation-btn {
  font-size: clamp(10px, 2.5vw, 11px);
  font-weight: 700;
  padding: 6px 10px;
  min-height: auto;
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  overflow-x: auto;
  flex-shrink: 0;
  -webkit-overflow-scrolling: touch;
}

.filter-tab {
  flex: 1;
  padding: 10px clamp(8px, 2vw, 12px);
  background: white;
  border: none;
  border-bottom: 3px solid transparent;
  color: #666;
  font-size: clamp(10px, 2.5vw, 11px);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.filter-tab.active {
  color: #333;
  border-bottom-color: #333;
  background: #f9f9f9;
}

/* Loading state */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
}

/* Reservations List */
.reservations-list {
  flex: 1;
  padding: clamp(8px, 2vw, 12px);
  overflow-y: auto;
  padding-bottom: 90px;
}

.reservation-card {
  background: white;
  border-radius: 8px 8px 20px 20px;
  margin-bottom: clamp(8px, 2vw, 12px);
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card-header {
  padding: clamp(10px, 2.5vw, 12px);
  background: #333;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.card-title {
  margin: 0;
  font-size: clamp(12px, 3vw, 13px);
  font-weight: 700;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: clamp(9px, 2vw, 10px);
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.status-badge.status-active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.status-badge.status-finished {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.status-badge.status-cancelled {
  background: rgba(255, 0, 0, 0.2);
  color: white;
}

.card-info {
  padding: clamp(10px, 2.5vw, 12px);
  background: #fafafa;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: clamp(10px, 2.5vw, 11px);
  padding: 4px 0;
}

.info-label {
  color: #666;
  font-weight: 600;
}

.info-value {
  color: #333;
  text-align: right;
}

.divider {
  height: 1px;
  border-top: 1px dashed #ccc;
  margin: 4px 0;
}

.card-footer {
  padding: clamp(8px, 2vw, 10px);
  background: #fafafa;
  display: flex;
  gap: 6px;
  border-top: 1px solid #e0e0e0;
}

.card-btn {
  flex: 1;
  font-size: clamp(9px, 2.2vw, 10px);
  font-weight: 700;
  border: 1px solid #333;
  border-radius: 4px;
}

.card-btn.q-btn--flat {
  border-color: currentColor;
}

/* Empty State */
.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #999;
  font-size: clamp(12px, 3vw, 14px);
}

/* Bottom Navigation */
.bottom-nav {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  background: white;
  border-top: 1px solid #e0e0e0;
  margin-top: auto;
  flex-shrink: 0;
}

.nav-btn {
  padding: 8px clamp(6px, 2vw, 10px);
  border: none;
  background: white;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: clamp(9px, 2.2vw, 10px);
  color: #666;
  transition: all 0.2s ease;
  min-height: 60px;
}

.nav-btn:first-child {
  border-right: 1px solid #e0e0e0;
}

.nav-btn:nth-child(2) {
  border-right: 1px solid #e0e0e0;
  background: #333;
  color: white;
}

.nav-btn.active {
  background: #333;
  color: white;
}

.nav-icon {
  font-size: clamp(16px, 4vw, 18px);
}

.nav-label {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Responsive */
@media (min-width: 600px) {
  .reservation-card {
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }
}

/* E-Karta Dialog (blue design) */
.ekarta-dialog {
  background: #1a1a2e;
  width: 100%;
  max-width: 500px;
  margin: auto;
}

.ekarta-dialog-body {
  background: #1a1a2e;
  padding: 16px;
  overflow-y: auto;
}

.ekarta-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.ticket-card {
  background: #16213e;
  border: 1px solid #334155;
  border-radius: 16px;
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

.badge-grey {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  border: 1px solid #94a3b8;
}

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
  width: 90px;
  height: 90px;
  border-radius: 8px;
  background: white;
  padding: 4px;
}

.qr-placeholder {
  width: 90px;
  height: 90px;
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
  min-width: 0;
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
  font-size: 13px;
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
  flex: 1;
  margin-left: 8px;
}

.ticket-footer-blue {
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
</style>
