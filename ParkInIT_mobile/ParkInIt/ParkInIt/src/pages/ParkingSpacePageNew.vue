<template>
  <q-page padding>
    <!-- Step 1: Select Parking -->
    <div v-if="currentStep === 'select-parking'">
      <div class="header-section">
        <q-btn flat round icon="arrow_back" @click="$router.back()" size="sm" />
      </div>

      <h3 class="q-pa-md">{{ $t('parking.selectLocation') || 'Odaberite parking' }}</h3>

      <!-- Loading -->
      <div v-if="loadingParkings" class="text-center q-pa-lg">
        <q-spinner color="primary" size="50px" />
      </div>

      <!-- Parkings List -->
      <div v-else class="parkings-list">
        <div
          v-for="parking in parkings"
          :key="parking.Sifra_parkinga"
          class="parking-card"
          @click="selectParking(parking)"
        >
          <div class="card-content">
            <h4 class="card-title">{{ parking.Adresa_parkinga }}</h4>
            <p class="card-price">
              {{ parking.Cijena_parkinga }}€{{ $t('parking.pricePerHour') || '/h' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="parkings.length === 0 && !loadingParkings" class="empty-state">
        <p>{{ $t('parking.noParkingsAvailable') || 'Nema dostupnih parkinga' }}</p>
      </div>
    </div>

    <!-- Step 2: Time Selection -->
    <div v-else-if="currentStep === 'time-select'" class="time-selection-section">
      <div class="header-section">
        <q-btn flat round icon="arrow_back" @click="currentStep = 'select-parking'" size="sm" />
      </div>

      <div v-if="selectedParking" class="q-px-md q-pb-sm text-subtitle1">
        <strong>{{ selectedParking.Adresa_parkinga }}</strong>
      </div>

      <h3>{{ $t('parking.selectTime') || 'Odaberite vremenski period' }}</h3>

      <div class="time-inputs">
        <div class="input-group">
          <label>{{ $t('reservation.date') || 'Datum' }}</label>
          <q-input v-model="reservationData.date" type="date" outlined dense :min="today" />
        </div>

        <div class="input-group">
          <label>{{ $t('reservation.startTime') || 'Početak' }}</label>
          <q-input v-model="reservationData.startTime" type="time" outlined dense />
        </div>

        <div class="input-group">
          <label>{{ $t('reservation.endTime') || 'Kraj' }}</label>
          <q-input v-model="reservationData.endTime" type="time" outlined dense />
        </div>
      </div>

      <q-btn
        color="primary"
        label="Dalje"
        @click="proceedToSelectSpace"
        class="full-width q-mt-md"
        :loading="loading"
        :disable="!isTimeValid"
      />
    </div>

    <!-- Step 3: Select Space -->
    <div v-else-if="currentStep === 'select-space'" class="select-space-view">
      <div class="header-section">
        <q-btn flat round icon="arrow_back" @click="currentStep = 'time-select'" size="sm" />
        <div class="price-info">{{ currentHourlyPrice.toFixed(2) }}€/h</div>
      </div>

      <div class="location-section">
        <h2 class="location-name">{{ selectedParking.Adresa_parkinga }}</h2>
        <p class="time-info">{{ selectedStartTime }} - {{ selectedEndTime }}</p>

        <!-- Stats -->
        <div class="stats-container">
          <div class="stat-box available">
            <span class="stat-number">{{ availableCount }}</span>
            <span class="stat-label">{{ $t('parking.available') }}</span>
          </div>
          <div class="stat-box occupied">
            <span class="stat-number">{{ occupiedCount }}</span>
            <span class="stat-label">{{ $t('parking.occupied') }}</span>
          </div>
          <div class="stat-box disabled">
            <span class="stat-number">{{ disabledCount }}</span>
            <span class="stat-label">{{ $t('parking.disabled') }}</span>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loadingSpaces" class="text-center q-pa-lg">
        <q-spinner color="primary" size="50px" />
      </div>

      <!-- Parking Spaces Grid -->
      <div v-else class="spaces-section">
        <div class="spaces-grid">
          <button
            v-for="space in parkingSpaces"
            :key="space.Broj_parkirnog_mjesta"
            @click="selectSpace(space)"
            :class="[
              'space-box',
              {
                available: space.is_available,
                unavailable: !space.is_available,
                disabled: space.Vrsta_parkirnog_mjesta === 'invalidsko',
                selected: selectedSpace?.Broj_parkirnog_mjesta === space.Broj_parkirnog_mjesta,
              },
            ]"
            :disabled="!space.is_available"
          >
            {{ space.Broj_parkirnog_mjesta }}
          </button>
        </div>
      </div>

      <!-- Selected Space Info -->
      <div v-if="selectedSpace" class="selected-info q-pa-md">
        <div class="info-row">
          <strong>{{ $t('parking.space') || 'Mjesto' }}:</strong>
          {{ selectedSpace.Broj_parkirnog_mjesta }}
        </div>
        <div class="info-row">
          <strong>{{ $t('parking.type') || 'Tip' }}:</strong>
          {{
            selectedSpace.Vrsta_parkirnog_mjesta === 'invalidsko'
              ? $t('parking.disabled')
              : $t('parking.standard')
          }}
        </div>
        <q-btn
          color="primary"
          label="Nastavi na rezervaci ju"
          @click="proceedToReservation"
          class="full-width q-mt-md"
          :loading="loading"
        />
      </div>

      <!-- Empty Spaces State -->
      <div v-if="parkingSpaces.length === 0 && !loadingSpaces" class="empty-state q-pa-md">
        <p>{{ $t('parking.noSpacesAvailable') || 'Nema dostupnih mjesta' }}</p>
      </div>
    </div>

    <div style="margin-bottom: 100px"></div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()

const API_URL = 'http://localhost:3000'
const DISABLED_SPACE_HOURLY_PRICE = 0.5

// State
const currentStep = ref('select-parking')
const loading = ref(false)
const loadingParkings = ref(false)
const loadingSpaces = ref(false)

// Time Selection
const today = new Date().toISOString().split('T')[0]
const reservationData = ref({
  date: today,
  startTime: '09:00',
  endTime: '11:00',
})

// Computed
const selectedStartTime = computed(() => {
  return reservationData.value.startTime || '--:--'
})

const selectedEndTime = computed(() => {
  return reservationData.value.endTime || '--:--'
})

const currentHourlyPrice = computed(() => {
  if (selectedSpace.value?.Vrsta_parkirnog_mjesta === 'invalidsko') {
    return DISABLED_SPACE_HOURLY_PRICE
  }
  return Number(selectedParking.value?.Cijena_parkinga) || 1.5
})

const isTimeValid = computed(() => {
  if (
    !reservationData.value.date ||
    !reservationData.value.startTime ||
    !reservationData.value.endTime
  ) {
    return false
  }
  const start = new Date(`${reservationData.value.date}T${reservationData.value.startTime}`)
  const end = new Date(`${reservationData.value.date}T${reservationData.value.endTime}`)
  return end > start
})

// Data
const parkings = ref([])
const parkingSpaces = ref([])
const selectedParking = ref(null)
const selectedSpace = ref(null)

const availableCount = computed(() => {
  return parkingSpaces.value.filter((s) => s.is_available).length
})

const occupiedCount = computed(() => {
  return parkingSpaces.value.filter(
    (s) => !s.is_available && s.Vrsta_parkirnog_mjesta !== 'invalidsko',
  ).length
})

const disabledCount = computed(() => {
  return parkingSpaces.value.filter((s) => s.Vrsta_parkirnog_mjesta === 'invalidsko').length
})

// Methods
const proceedToSelectSpace = () => {
  currentStep.value = 'select-space'
  loadParkingSpaces()
}

const loadParkings = async () => {
  loadingParkings.value = true
  try {
    const response = await fetch(`${API_URL}/api/parking`)
    if (response.ok) {
      parkings.value = await response.json()
    } else {
      $q.notify({ type: 'negative', message: 'Greška pri učitavanju parkinga' })
    }
  } catch (error) {
    console.error('Error loading parkings:', error)
    $q.notify({ type: 'negative', message: 'Greška pri povezivanju' })
  } finally {
    loadingParkings.value = false
  }
}

const selectParking = (parking) => {
  selectedParking.value = parking
  currentStep.value = 'time-select'
}

const loadParkingSpaces = async () => {
  if (!selectedParking.value) return

  loadingSpaces.value = true
  try {
    const startDateTime = `${reservationData.value.date}T${reservationData.value.startTime}:00`
    const endDateTime = `${reservationData.value.date}T${reservationData.value.endTime}:00`

    const url = new URL(`${API_URL}/api/parking/${selectedParking.value.Sifra_parkinga}/spaces`)
    url.searchParams.append('start_time', startDateTime)
    url.searchParams.append('end_time', endDateTime)

    const response = await fetch(url.toString())
    if (response.ok) {
      parkingSpaces.value = await response.json()
      selectedSpace.value = null
    } else {
      $q.notify({ type: 'negative', message: 'Greška pri učitavanju mjesta' })
    }
  } catch (error) {
    console.error('Error loading parking spaces:', error)
    $q.notify({ type: 'negative', message: 'Greška pri povezivanju' })
  } finally {
    loadingSpaces.value = false
  }
}

const selectSpace = (space) => {
  if (!space.is_available) {
    $q.notify({
      type: 'negative',
      message: 'Ovo parkirno mjesto nije dostupno za odabrani vremenski period',
    })
    return
  }

  if (selectedSpace.value?.Broj_parkirnog_mjesta === space.Broj_parkirnog_mjesta) {
    selectedSpace.value = null
  } else {
    selectedSpace.value = space
  }
}

const proceedToReservation = () => {
  if (!selectedSpace.value) {
    $q.notify({ type: 'warning', message: 'Molimo odaberite parkirno mjesto' })
    return
  }

  // Store data for ReservationConfirmPage
  const fullStartDateTime = `${reservationData.value.date}T${reservationData.value.startTime}:00`
  const fullEndDateTime = `${reservationData.value.date}T${reservationData.value.endTime}:00`

  localStorage.setItem(
    'reservationData',
    JSON.stringify({
      date: reservationData.value.date,
      startTime: reservationData.value.startTime,
      endTime: reservationData.value.endTime,
      startDateTime: fullStartDateTime,
      endDateTime: fullEndDateTime,
      parkingId: selectedParking.value.Sifra_parkinga,
      parkingAddress: selectedParking.value.Adresa_parkinga,
      parkingPrice: currentHourlyPrice.value,
      spaceNumber: selectedSpace.value.Broj_parkirnog_mjesta,
      spaceType: selectedSpace.value.Vrsta_parkirnog_mjesta,
    }),
  )

  router.push('/reservation-confirm')
}

onMounted(() => {
  loadParkings()
})
</script>

<style scoped>
.time-selection-section {
  max-width: 500px;
  margin: 2rem auto;
}

.time-inputs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 2rem 0;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-weight: 500;
  font-size: 0.9rem;
}

.header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.price-info {
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.location-section {
  padding: 1.5rem;
  background: #fafafa;
}

.location-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.time-info {
  margin: 0 0 1rem 0;
  color: #666;
  font-size: 0.9rem;
}

.stats-container {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.stat-box {
  flex: 1;
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-box.available {
  background: #e8f5e9;
  color: #2e7d32;
}

.stat-box.occupied {
  background: #ffebee;
  color: #c62828;
}

.stat-box.disabled {
  background: #e3f2fd;
  color: #1565c0;
}

.stat-number {
  font-weight: 700;
  font-size: 1.5rem;
}

.stat-label {
  font-size: 0.75rem;
}

.parkings-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.parking-card {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.parking-card:hover {
  border-color: #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-content {
  margin-bottom: 1rem;
}

.card-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.card-price {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.stats-mini {
  display: flex;
  gap: 1rem;
  justify-content: space-around;
}

.stat-mini {
  flex: 1;
  padding: 0.5rem;
  border-radius: 4px;
  text-align: center;
  font-size: 0.8rem;
}

.stat-mini.available {
  background: #e8f5e9;
  color: #2e7d32;
}

.stat-mini.occupied {
  background: #ffebee;
  color: #c62828;
}

.stat-number {
  font-weight: 700;
  display: block;
  margin-bottom: 0.25rem;
}

.spaces-section {
  padding: 1.5rem 1rem;
}

.spaces-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
}

.space-box {
  aspect-ratio: 1;
  border: 2px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #333;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  min-height: 40px;
}

.space-box:active:not(:disabled) {
  transform: scale(0.95);
}

.space-box.available {
  border-color: #2e7d32;
  color: #2e7d32;
}

.space-box.unavailable {
  background: #f0f0f0;
  color: #999;
  border-color: #ddd;
  cursor: not-allowed;
}

.space-box.disabled {
  border-style: dashed;
  border-color: #1565c0;
}

.space-box.selected {
  background: #333;
  color: white;
  border-color: #333;
}

.selected-info {
  background: #fafafa;
  border-top: 1px solid #ddd;
  position: sticky;
  bottom: 0;
}

.info-row {
  padding: 0.5rem 0;
  font-size: 0.95rem;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 2rem;
}

.full-width {
  width: 100%;
}
</style>
