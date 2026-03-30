<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">E-Karte</div>

    <!-- Actions row -->
    <div class="row justify-between items-center q-mb-sm">
      <span class="text-subtitle1 text-grey">Sve generirane e-karte</span>
      <q-btn color="primary" icon="add" label="Generiraj kartu" @click="openOverrideDialog" />
    </div>

    <!-- Filters -->
    <div class="row q-gutter-sm q-mb-md items-center flex-wrap">
      <q-input
        v-model="ticketSearch"
        outlined
        dense
        clearable
        placeholder="Pretraži po imenu / prezimenu"
        style="min-width: 240px"
        @update:model-value="loadTickets"
      >
        <template #prepend><q-icon name="search" /></template>
      </q-input>
      <q-input
        v-model="ticketDateFilter"
        type="date"
        outlined
        dense
        clearable
        label="Datum"
        style="min-width: 180px"
        @update:model-value="loadTickets"
      />
      <q-btn flat icon="refresh" color="primary" @click="loadTickets" label="Osvježi" />
    </div>

    <!-- Tickets table -->
    <q-table
      :rows="allTickets"
      :columns="ticketCols"
      row-key="Br_rezervacije"
      flat
      bordered
      :loading="loadingTickets"
      :pagination="{ rowsPerPage: 20 }"
    >
      <template v-slot:body-cell-korisnik="props">
        <q-td :props="props">
          {{ props.row.Ime_korisnika }} {{ props.row.Prezime_korisnika }}
          <q-badge v-if="props.row.Admin_override" color="orange" class="q-ml-xs">ADMIN</q-badge>
        </q-td>
      </template>
      <template v-slot:body-cell-vrijedi="props">
        <q-td :props="props">
          {{ formatTicketDt(props.row.Vrijeme_pocetka) }}<br />
          <small class="text-grey">→ {{ formatTicketDt(props.row.Vrijeme_isteka) }}</small>
        </q-td>
      </template>
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-badge
            :color="
              props.row.Status_rezervacije === 'placena'
                ? 'positive'
                : props.row.Status_rezervacije === 'otkazana'
                  ? 'negative'
                  : 'primary'
            "
          >
            {{ props.row.Status_rezervacije }}
          </q-badge>
        </q-td>
      </template>
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            flat
            dense
            icon="confirmation_number"
            color="primary"
            @click="viewAdminTicket(props.row)"
            title="Prikaži e-kartu"
          />
        </q-td>
      </template>
    </q-table>

    <!-- ============ Generate Ticket (Admin Override) Dialog ============ -->
    <q-dialog v-model="overrideDialog" persistent>
      <q-card style="min-width: 360px; max-width: 500px; width: 90vw">
        <q-card-section class="text-h6 row items-center">
          <q-icon name="confirmation_number" color="primary" class="q-mr-sm" />
          Generiraj kartu (Admin Override)
        </q-card-section>

        <q-banner
          v-if="overrideForm.forceOverride"
          rounded
          class="bg-orange-2 q-mx-md q-mb-sm text-caption"
        >
          <template v-slot:avatar><q-icon name="warning" color="orange" /></template>
          Force Override je uključen — sve preklapajuće aktivne rezervacije bit će otkazane.
        </q-banner>

        <q-card-section class="q-gutter-sm">
          <q-select
            v-model="overrideForm.userId"
            :options="filteredUserOptions"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            outlined
            dense
            use-input
            input-debounce="0"
            @filter="filterUsers"
            label="Korisnik *"
          />
          <q-select
            v-model="overrideForm.parkingId"
            :options="parkingOptions"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            outlined
            dense
            label="Parking *"
            @update:model-value="loadSpacesForOverride"
          />
          <div class="row q-gutter-sm">
            <q-input
              v-model="overrideForm.date"
              type="date"
              outlined
              dense
              label="Datum *"
              class="col"
              @update:model-value="loadSpacesForOverride"
            />
            <q-input
              v-model="overrideForm.startTime"
              type="time"
              outlined
              dense
              label="Početak *"
              class="col"
              @update:model-value="loadSpacesForOverride"
            />
            <q-input
              v-model="overrideForm.endTime"
              type="time"
              outlined
              dense
              label="Kraj *"
              class="col"
              @update:model-value="loadSpacesForOverride"
            />
          </div>
          <q-select
            v-model="overrideForm.spaceNumber"
            :options="overrideSpaceOptions"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            outlined
            dense
            label="Parkirno mjesto *"
            :loading="loadingSpacesOverride"
            :disable="!overrideForm.parkingId"
          />
          <q-input
            v-model="overrideForm.vehicle"
            outlined
            dense
            label="Registracija *"
            placeholder="npr. RI-123-AB"
          />
          <q-toggle
            v-model="overrideForm.forceOverride"
            label="Force Override (ignoriraj konflikte i otkaži preklapajuće)"
            color="orange"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Odustani" v-close-popup />
          <q-btn
            :color="overrideForm.forceOverride ? 'orange' : 'primary'"
            label="Generiraj kartu"
            :loading="overrideSaving"
            @click="submitOverride"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ============ Admin View E-Karta Dialog ============ -->
    <q-dialog v-model="showAdminEkartaDialog" maximized>
      <q-card class="adm-ekarta-card">
        <q-bar class="bg-primary text-white">
          <div class="text-weight-bold">PARKIRNA E-KARTA (ADMIN)</div>
          <q-space />
          <q-btn dense flat icon="close" v-close-popup />
        </q-bar>
        <q-card-section class="adm-ekarta-body">
          <div v-if="adminEkartaLoading" class="adm-loading">
            <q-spinner color="white" size="40px" />
          </div>
          <div v-else class="adm-ticket-card">
            <div class="adm-title-row">
              <div class="adm-icon">P</div>
              <h2 class="adm-title">PARKIRNA E-KARTA</h2>
            </div>

            <div class="adm-badge-row">
              <span
                :class="[
                  'adm-badge',
                  adminEkartaData.statusRezervacije === 'placena'
                    ? 'adm-badge-green'
                    : 'adm-badge-grey',
                ]"
              >
                ✓ {{ adminEkartaData.statusRezervacije }}
              </span>
              <span v-if="adminEkartaData.adminOverride" class="adm-badge adm-badge-orange"
                >⚡ Admin override</span
              >
            </div>

            <div class="adm-qr-section">
              <div class="adm-qr-wrap">
                <img v-if="adminEkartaQrUrl" :src="adminEkartaQrUrl" alt="QR" class="adm-qr-img" />
                <div v-else class="adm-qr-placeholder">QR</div>
              </div>
              <div class="adm-code-info">
                <p class="adm-code-label">KOD KARTE (QR_KOD)</p>
                <p class="adm-code-value">{{ adminEkartaBookingCode }}</p>
                <p class="adm-code-sub">Br_rezervacije: #{{ adminEkartaData.brRezervacije }}</p>
              </div>
            </div>

            <div class="adm-details">
              <p class="adm-section-title">REZERVACIJA</p>
              <div class="adm-row">
                <span class="adm-lbl">Parking</span
                ><span class="adm-val">{{ adminEkartaData.parking }}</span>
              </div>
              <div class="adm-row">
                <span class="adm-lbl">Parkirno mjesto</span
                ><span class="adm-val"
                  >{{ adminEkartaData.spaceNumber }} • {{ adminEkartaData.spaceType }}</span
                >
              </div>
              <div class="adm-row">
                <span class="adm-lbl">Korisnik</span
                ><span class="adm-val"
                  >#{{ adminEkartaData.userId }} – {{ adminEkartaData.userName }}</span
                >
              </div>
              <div class="adm-row">
                <span class="adm-lbl">Status</span
                ><span class="adm-val">{{ adminEkartaData.statusRezervacije }}</span>
              </div>
            </div>

            <div class="adm-details">
              <p class="adm-section-title">E-KARTA</p>
              <div class="adm-row">
                <span class="adm-lbl">Vrijedi od</span
                ><span class="adm-val">{{ formatTicketDt(adminEkartaData.startDateTime) }}</span>
              </div>
              <div class="adm-row">
                <span class="adm-lbl">Vrijedi do</span
                ><span class="adm-val">{{ formatTicketDt(adminEkartaData.endDateTime) }}</span>
              </div>
            </div>

            <div class="adm-footer">
              <div class="adm-footer-vehicle">{{ adminEkartaData.vehicle }}</div>
              <div class="adm-footer-time">
                <p class="adm-footer-label">VRIJEDI</p>
                <p class="adm-footer-value">
                  {{ adminEkartaStartTime }} – {{ adminEkartaEndTime }}
                </p>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios'

const $q = useQuasar()
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeaders() {
  const token = localStorage.getItem('auth_token')
  return { Authorization: `Bearer ${token}` }
}

// ====================  PARKINGS (for override dropdown)  ====================
const parkings = ref([])

const parkingOptions = computed(() =>
  parkings.value.map((p) => ({ label: p.Adresa_parkinga, value: p.Sifra_parkinga })),
)

async function loadParkings() {
  if (parkings.value.length) return
  try {
    const { data } = await axios.get(`${API}/api/admin/parking`, { headers: authHeaders() })
    parkings.value = data
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
  }
}

// ====================  TICKETS (E-KARTE)  ====================
const allTickets = ref([])
const loadingTickets = ref(false)
const ticketSearch = ref('')
const ticketDateFilter = ref('')

const ticketCols = [
  { name: 'Br_rezervacije', label: '#', field: 'Br_rezervacije', align: 'left', sortable: true },
  { name: 'QR_kod', label: 'Booking kod', field: 'QR_kod', align: 'left' },
  { name: 'korisnik', label: 'Korisnik', field: 'korisnik', align: 'left' },
  { name: 'Adresa_parkinga', label: 'Parking', field: 'Adresa_parkinga', align: 'left' },
  { name: 'Broj_parkirnog_mjesta', label: 'Mjesto', field: 'Broj_parkirnog_mjesta', align: 'left' },
  { name: 'vrijedi', label: 'Vrijedi', field: 'vrijedi', align: 'left' },
  { name: 'Registracija', label: 'Vozilo', field: 'Registracija', align: 'left' },
  { name: 'status', label: 'Status', field: 'Status_rezervacije', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

async function loadTickets() {
  loadingTickets.value = true
  try {
    const params = new URLSearchParams()
    if (ticketSearch.value) params.append('search', ticketSearch.value)
    if (ticketDateFilter.value) params.append('date', ticketDateFilter.value)
    const { data } = await axios.get(`${API}/api/admin/tickets?${params}`, {
      headers: authHeaders(),
    })
    allTickets.value = data
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
  } finally {
    loadingTickets.value = false
  }
}

function formatTicketDt(dt) {
  if (!dt) return '—'
  const d = new Date(dt)
  return (
    `${String(d.getDate()).padStart(2, '0')}.` +
    `${String(d.getMonth() + 1).padStart(2, '0')}.` +
    `${d.getFullYear()} ` +
    `${String(d.getHours()).padStart(2, '0')}:` +
    `${String(d.getMinutes()).padStart(2, '0')}`
  )
}

// ====================  ADMIN OVERRIDE  ====================
const overrideDialog = ref(false)
const overrideSaving = ref(false)
const users = ref([])
const overrideSpaceOptions = ref([])
const loadingSpacesOverride = ref(false)
const userSearchText = ref('')

const overrideForm = ref({
  userId: null,
  parkingId: null,
  spaceNumber: null,
  date: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '11:00',
  vehicle: '',
  forceOverride: false,
})

const filteredUserOptions = computed(() => {
  const q = userSearchText.value?.toLowerCase() || ''
  return users.value
    .filter(
      (u) =>
        !q ||
        `${u.Ime_korisnika} ${u.Prezime_korisnika}`.toLowerCase().includes(q) ||
        u.Email_adresa_korisnika?.toLowerCase().includes(q),
    )
    .map((u) => ({
      label: `${u.Ime_korisnika} ${u.Prezime_korisnika} (${u.Email_adresa_korisnika})`,
      value: u.ID_korisnika,
    }))
})

function filterUsers(val, update) {
  userSearchText.value = val
  update()
}

async function loadUsers() {
  if (users.value.length) return
  try {
    const { data } = await axios.get(`${API}/api/admin/users`, { headers: authHeaders() })
    users.value = data
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
  }
}

async function loadSpacesForOverride() {
  overrideForm.value.spaceNumber = null
  if (!overrideForm.value.parkingId) return
  loadingSpacesOverride.value = true
  try {
    const url = new URL(`${API}/api/parking/${overrideForm.value.parkingId}/spaces`)
    if (overrideForm.value.date && overrideForm.value.startTime && overrideForm.value.endTime) {
      url.searchParams.append(
        'start_time',
        `${overrideForm.value.date}T${overrideForm.value.startTime}:00`,
      )
      url.searchParams.append(
        'end_time',
        `${overrideForm.value.date}T${overrideForm.value.endTime}:00`,
      )
    }
    const { data } = await axios.get(url.toString())
    overrideSpaceOptions.value = data.map((s) => ({
      label:
        `${s.Broj_parkirnog_mjesta} (${s.Vrsta_parkirnog_mjesta})` +
        (s.is_available === false ? ' — zauzeto' : ' — slobodno'),
      value: s.Broj_parkirnog_mjesta,
    }))
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
  } finally {
    loadingSpacesOverride.value = false
  }
}

function openOverrideDialog() {
  overrideForm.value = {
    userId: null,
    parkingId: null,
    spaceNumber: null,
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '11:00',
    vehicle: '',
    forceOverride: false,
  }
  overrideSpaceOptions.value = []
  overrideDialog.value = true
  loadUsers()
  loadParkings()
}

async function submitOverride() {
  const f = overrideForm.value
  if (!f.userId || !f.spaceNumber || !f.date || !f.startTime || !f.endTime || !f.vehicle) {
    $q.notify({ type: 'warning', message: 'Popunite sva obavezna polja (*)', position: 'top' })
    return
  }
  overrideSaving.value = true
  try {
    const { data } = await axios.post(
      `${API}/api/admin/tickets/override`,
      {
        userId: f.userId,
        spaceNumber: f.spaceNumber,
        startDateTime: `${f.date}T${f.startTime}:00`,
        endDateTime: `${f.date}T${f.endTime}:00`,
        vehicle: f.vehicle,
        forceOverride: f.forceOverride,
      },
      { headers: authHeaders() },
    )
    overrideDialog.value = false
    $q.notify({
      type: 'positive',
      message: `Karta generirana: ${data.bookingCode}`,
      position: 'top',
    })
    adminEkartaBookingCode.value = data.bookingCode
    adminEkartaQrUrl.value = data.qrCode
    adminEkartaData.value = { brRezervacije: data.brRezervacije, ...data.ekarta }
    adminEkartaLoading.value = false
    showAdminEkartaDialog.value = true
    loadTickets()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message, position: 'top' })
  } finally {
    overrideSaving.value = false
  }
}

// ====================  ADMIN E-KARTA VIEW  ====================
const showAdminEkartaDialog = ref(false)
const adminEkartaLoading = ref(false)
const adminEkartaBookingCode = ref('')
const adminEkartaQrUrl = ref('')
const adminEkartaData = ref({
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
  adminOverride: false,
})

const adminEkartaStartTime = computed(() => {
  if (!adminEkartaData.value.startDateTime) return ''
  const d = new Date(adminEkartaData.value.startDateTime)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})
const adminEkartaEndTime = computed(() => {
  if (!adminEkartaData.value.endDateTime) return ''
  const d = new Date(adminEkartaData.value.endDateTime)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

async function viewAdminTicket(row) {
  showAdminEkartaDialog.value = true
  adminEkartaLoading.value = true
  adminEkartaQrUrl.value = ''
  adminEkartaBookingCode.value = ''
  try {
    const { data } = await axios.get(`${API}/api/admin/tickets/${row.Br_rezervacije}/ekarta`, {
      headers: authHeaders(),
    })
    adminEkartaBookingCode.value = data.bookingCode
    adminEkartaQrUrl.value = data.qrCode
    adminEkartaData.value = { brRezervacije: data.brRezervacije, ...data.ekarta }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message, position: 'top' })
    showAdminEkartaDialog.value = false
  } finally {
    adminEkartaLoading.value = false
  }
}

onMounted(() => {
  loadTickets()
})
</script>

<style scoped>
.adm-ekarta-card {
  background: #1a1a2e;
  max-width: 500px;
  width: 100%;
  margin: auto;
}
.adm-ekarta-body {
  background: #1a1a2e;
  padding: 16px;
  overflow-y: auto;
}
.adm-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}
.adm-ticket-card {
  background: #16213e;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 20px;
}
.adm-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.adm-icon {
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
  flex-shrink: 0;
}
.adm-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: white;
  letter-spacing: 1px;
}
.adm-badge-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.adm-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}
.adm-badge-green {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid #4ade80;
}
.adm-badge-grey {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  border: 1px solid #94a3b8;
}
.adm-badge-orange {
  background: rgba(251, 146, 60, 0.15);
  color: #fb923c;
  border: 1px solid #fb923c;
}
.adm-qr-section {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 16px;
}
.adm-qr-wrap {
  flex-shrink: 0;
}
.adm-qr-img {
  width: 90px;
  height: 90px;
  border-radius: 8px;
  background: white;
  padding: 4px;
}
.adm-qr-placeholder {
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
.adm-code-info {
  flex: 1;
  min-width: 0;
}
.adm-code-label {
  margin: 0 0 4px;
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.adm-code-value {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
  color: white;
  font-family: 'Courier New', monospace;
  word-break: break-all;
}
.adm-code-sub {
  margin: 0;
  font-size: 11px;
  color: #64748b;
}
.adm-details {
  margin-bottom: 12px;
}
.adm-section-title {
  margin: 0 0 8px;
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border-bottom: 1px solid #334155;
  padding-bottom: 6px;
}
.adm-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 12px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}
.adm-row:last-child {
  border-bottom: none;
}
.adm-lbl {
  color: #94a3b8;
}
.adm-val {
  color: #e2e8f0;
  font-weight: 500;
  text-align: right;
  flex: 1;
  margin-left: 8px;
}
.adm-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px dashed #334155;
}
.adm-footer-vehicle {
  background: #dc2626;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 800;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}
.adm-footer-time {
  text-align: right;
}
.adm-footer-label {
  margin: 0;
  font-size: 9px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.adm-footer-value {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #4ade80;
}
</style>
