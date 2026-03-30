<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">{{ $t('admin.panel.title') }}</div>

    <q-tabs v-model="activeTab" dense align="left" class="q-mb-md">
      <q-tab name="parking" :label="$t('admin.panel.parking.tab')" />
      <q-tab name="space" :label="$t('admin.panel.space.tab')" />
      <q-tab name="rampa" :label="$t('admin.panel.rampa.tab')" />
      <q-tab name="kamera" :label="$t('admin.panel.kamera.tab')" />
      <q-tab name="stup" :label="$t('admin.panel.stup.tab')" />
    </q-tabs>

    <q-separator class="q-mb-md" />

    <!-- ============ PARKING TAB ============ -->
    <div v-if="activeTab === 'parking'">
      <div class="row justify-between items-center q-mb-sm">
        <span class="text-h6">{{ $t('admin.panel.parking.tab') }}</span>
        <q-btn
          color="primary"
          icon="add"
          :label="$t('admin.panel.parking.add')"
          @click="openParkingDialog(null)"
        />
      </div>
      <q-table
        :rows="parkings"
        :columns="parkingCols"
        row-key="Sifra_parkinga"
        flat
        bordered
        :loading="loadingParking"
      >
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense icon="edit" color="primary" @click="openParkingDialog(props.row)" />
            <q-btn
              flat
              dense
              icon="delete"
              color="negative"
              @click="deleteParking(props.row.Sifra_parkinga)"
            />
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- ============ PARKIRNO MJESTO TAB ============ -->
    <div v-if="activeTab === 'space'">
      <div class="row justify-between items-center q-mb-sm">
        <span class="text-h6">{{ $t('admin.panel.space.tab') }}</span>
        <div class="row q-gutter-sm items-center">
          <q-select
            v-model="spaceFilterParking"
            :options="parkingOptions"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            clearable
            outlined
            dense
            style="min-width: 220px"
            label="Filter po parkingu"
          />
          <q-btn
            color="primary"
            icon="add"
            :label="$t('admin.panel.space.add')"
            @click="openSpaceDialog(null)"
          />
        </div>
      </div>
      <q-table
        :rows="filteredSpaces"
        :columns="spaceCols"
        row-key="Broj_parkirnog_mjesta"
        flat
        bordered
        :loading="loadingSpace"
      >
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense icon="edit" color="primary" @click="openSpaceDialog(props.row)" />
            <q-btn
              flat
              dense
              icon="delete"
              color="negative"
              @click="deleteSpace(props.row.Broj_parkirnog_mjesta)"
            />
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- ============ RAMPA TAB ============ -->
    <div v-if="activeTab === 'rampa'">
      <div class="row justify-between items-center q-mb-sm">
        <span class="text-h6">{{ $t('admin.panel.rampa.tab') }}</span>
        <q-btn
          color="primary"
          icon="add"
          :label="$t('admin.panel.rampa.add')"
          @click="openRampaDialog(null)"
        />
      </div>
      <q-table
        :rows="rampe"
        :columns="rampaCols"
        row-key="Sifra_rampe"
        flat
        bordered
        :loading="loadingRampa"
      >
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense icon="edit" color="primary" @click="openRampaDialog(props.row)" />
            <q-btn
              flat
              dense
              icon="delete"
              color="negative"
              @click="deleteRampa(props.row.Sifra_rampe)"
            />
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- ============ KAMERA TAB ============ -->
    <div v-if="activeTab === 'kamera'">
      <div class="row justify-between items-center q-mb-sm">
        <span class="text-h6">{{ $t('admin.panel.kamera.tab') }}</span>
        <q-btn
          color="primary"
          icon="add"
          :label="$t('admin.panel.kamera.add')"
          @click="openKameraDialog(null)"
        />
      </div>
      <q-table
        :rows="kamere"
        :columns="kameraCols"
        row-key="Sifra_kamere"
        flat
        bordered
        :loading="loadingKamera"
      >
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense icon="edit" color="primary" @click="openKameraDialog(props.row)" />
            <q-btn
              flat
              dense
              icon="delete"
              color="negative"
              @click="deleteKamera(props.row.Sifra_kamere)"
            />
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- ============ STUP TAB ============ -->
    <div v-if="activeTab === 'stup'">
      <div class="row justify-between items-center q-mb-sm">
        <span class="text-h6">{{ $t('admin.panel.stup.tab') }}</span>
        <q-btn
          color="primary"
          icon="add"
          :label="$t('admin.panel.stup.add')"
          @click="openStupDialog(null)"
        />
      </div>
      <q-table
        :rows="stupovi"
        :columns="stupCols"
        row-key="Sifra_stupa"
        flat
        bordered
        :loading="loadingStup"
      >
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense icon="edit" color="primary" @click="openStupDialog(props.row)" />
            <q-btn
              flat
              dense
              icon="delete"
              color="negative"
              @click="deleteStup(props.row.Sifra_stupa)"
            />
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- ============ DIALOGS ============ -->

    <!-- Parking Dialog -->
    <q-dialog v-model="parkingDialog">
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">
          {{ editingParking ? $t('admin.panel.parking.edit') : $t('admin.panel.parking.add') }}
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input
            v-model="parkingForm.Adresa_parkinga"
            :label="$t('admin.panel.parking.address')"
            outlined
            dense
          />
          <q-input
            v-model.number="parkingForm.Kapacitet_parkinga"
            :label="$t('admin.panel.parking.capacity')"
            type="number"
            outlined
            dense
          />
          <q-input
            v-model.number="parkingForm.Cijena_parkinga"
            :label="$t('admin.panel.parking.price')"
            type="number"
            step="0.01"
            outlined
            dense
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('cancel')" v-close-popup />
          <q-btn color="primary" :label="$t('save')" :loading="saving" @click="saveParking" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Space Dialog -->
    <q-dialog v-model="spaceDialog">
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">
          {{ editingSpace ? $t('admin.panel.space.edit') : $t('admin.panel.space.add') }}
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input
            v-model.number="spaceForm.Sifra_parkinga"
            :label="$t('admin.panel.space.parkingId')"
            type="number"
            outlined
            dense
          />
          <q-input
            v-model.number="spaceForm.Sifra_stupa"
            :label="$t('admin.panel.space.stupId')"
            type="number"
            outlined
            dense
            clearable
          />
          <q-input
            v-model.number="spaceForm.Sifra_kamere"
            :label="$t('admin.panel.space.kameraId')"
            type="number"
            outlined
            dense
            clearable
          />
          <q-select
            v-model="spaceForm.Status_parkirnog_mjesta"
            :label="$t('admin.panel.space.status')"
            :options="['slobodno', 'zauzeto', 'rezervirano']"
            outlined
            dense
            emit-value
            map-options
          />
          <q-select
            v-model="spaceForm.Vrsta_parkirnog_mjesta"
            :label="$t('admin.panel.space.type')"
            :options="['standardno', 'invalidsko']"
            outlined
            dense
            emit-value
            map-options
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('cancel')" v-close-popup />
          <q-btn color="primary" :label="$t('save')" :loading="saving" @click="saveSpace" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Rampa Dialog -->
    <q-dialog v-model="rampaDialog">
      <q-card style="min-width: 320px">
        <q-card-section class="text-h6">
          {{ editingRampa ? $t('admin.panel.rampa.edit') : $t('admin.panel.rampa.add') }}
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input
            v-model.number="rampaForm.Sifra_parkinga"
            :label="$t('admin.panel.rampa.parkingId')"
            type="number"
            outlined
            dense
          />
          <q-select
            v-model="rampaForm.Vrsta_rampe"
            :label="$t('admin.panel.rampa.vrsta')"
            :options="['ulazna', 'izlazna']"
            outlined
            dense
            emit-value
            map-options
          />
          <q-select
            v-model="rampaForm.Status_rampe"
            :label="$t('admin.panel.rampa.status')"
            :options="['otvorena', 'zatvorena', 'kvar']"
            outlined
            dense
            emit-value
            map-options
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('cancel')" v-close-popup />
          <q-btn color="primary" :label="$t('save')" :loading="saving" @click="saveRampa" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Kamera Dialog -->
    <q-dialog v-model="kameraDialog">
      <q-card style="min-width: 280px">
        <q-card-section class="text-h6">
          {{ editingKamera ? $t('admin.panel.kamera.edit') : $t('admin.panel.kamera.add') }}
        </q-card-section>
        <q-card-section>
          <q-select
            v-model="kameraForm.Status_kamere"
            :label="$t('admin.panel.kamera.status')"
            :options="['on', 'off', 'idle']"
            outlined
            dense
            emit-value
            map-options
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('cancel')" v-close-popup />
          <q-btn color="primary" :label="$t('save')" :loading="saving" @click="saveKamera" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Stup Dialog -->
    <q-dialog v-model="stupDialog">
      <q-card style="min-width: 280px">
        <q-card-section class="text-h6">
          {{ editingStup ? $t('admin.panel.stup.edit') : $t('admin.panel.stup.add') }}
        </q-card-section>
        <q-card-section>
          <q-select
            v-model="stupForm.Status_stupa"
            :label="$t('admin.panel.stup.status')"
            :options="['aktivan', 'neaktivan', 'kvar']"
            outlined
            dense
            emit-value
            map-options
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('cancel')" v-close-popup />
          <q-btn color="primary" :label="$t('save')" :loading="saving" @click="saveStup" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const $q = useQuasar()
const { t } = useI18n()

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeaders() {
  const token = localStorage.getItem('auth_token')
  return { Authorization: `Bearer ${token}` }
}

// ---- Active tab ----
const activeTab = ref('parking')

watch(activeTab, (tab) => {
  if (tab === 'parking') loadParkings()
  if (tab === 'space') {
    loadSpaces()
    if (!parkings.value.length) loadParkings()
  }
  if (tab === 'rampa') loadRampe()
  if (tab === 'kamera') loadKamere()
  if (tab === 'stup') loadStupovi()
})

onMounted(() => loadParkings())

// ====================  PARKING  ====================
const parkings = ref([])
const loadingParking = ref(false)
const parkingDialog = ref(false)
const editingParking = ref(null)
const saving = ref(false)
const parkingForm = ref({ Adresa_parkinga: '', Kapacitet_parkinga: 0, Cijena_parkinga: 0 })

const parkingCols = [
  { name: 'Sifra_parkinga', label: 'ID', field: 'Sifra_parkinga', align: 'left' },
  {
    name: 'Adresa_parkinga',
    label: t('admin.panel.parking.address'),
    field: 'Adresa_parkinga',
    align: 'left',
  },
  {
    name: 'Kapacitet_parkinga',
    label: t('admin.panel.parking.capacity'),
    field: 'Kapacitet_parkinga',
    align: 'left',
  },
  {
    name: 'Cijena_parkinga',
    label: t('admin.panel.parking.price'),
    field: 'Cijena_parkinga',
    align: 'left',
  },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

async function loadParkings() {
  loadingParking.value = true
  try {
    const { data } = await axios.get(`${API}/api/admin/parking`, { headers: authHeaders() })
    parkings.value = data
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
  } finally {
    loadingParking.value = false
  }
}

function openParkingDialog(row) {
  editingParking.value = row
  parkingForm.value = row
    ? {
        Adresa_parkinga: row.Adresa_parkinga,
        Kapacitet_parkinga: row.Kapacitet_parkinga,
        Cijena_parkinga: row.Cijena_parkinga,
      }
    : { Adresa_parkinga: '', Kapacitet_parkinga: 0, Cijena_parkinga: 0 }
  parkingDialog.value = true
}

async function saveParking() {
  saving.value = true
  try {
    if (editingParking.value) {
      await axios.put(
        `${API}/api/admin/parking/${editingParking.value.Sifra_parkinga}`,
        parkingForm.value,
        { headers: authHeaders() },
      )
    } else {
      await axios.post(`${API}/api/admin/parking`, parkingForm.value, { headers: authHeaders() })
    }
    parkingDialog.value = false
    $q.notify({ type: 'positive', message: t('success') })
    loadParkings()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
  } finally {
    saving.value = false
  }
}

async function deleteParking(id) {
  $q.dialog({
    title: t('confirm'),
    message: t('admin.panel.parking.deleteConfirm'),
    cancel: true,
  }).onOk(async () => {
    try {
      await axios.delete(`${API}/api/admin/parking/${id}`, { headers: authHeaders() })
      $q.notify({ type: 'positive', message: t('success') })
      loadParkings()
    } catch (e) {
      $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
    }
  })
}

// ====================  PARKIRNO MJESTO  ====================
const spaces = ref([])
const loadingSpace = ref(false)
const spaceDialog = ref(false)
const editingSpace = ref(null)
const spaceFilterParking = ref(null)
const spaceForm = ref({
  Sifra_parkinga: null,
  Sifra_stupa: null,
  Sifra_kamere: null,
  Status_parkirnog_mjesta: 'slobodno',
  Vrsta_parkirnog_mjesta: 'standardno',
})

const parkingOptions = computed(() =>
  parkings.value.map((p) => ({ label: p.Adresa_parkinga, value: p.Sifra_parkinga })),
)

const filteredSpaces = computed(() => {
  if (!spaceFilterParking.value) return spaces.value
  return spaces.value.filter((s) => s.Sifra_parkinga === spaceFilterParking.value)
})

const spaceCols = [
  {
    name: 'Broj_parkirnog_mjesta',
    label: t('admin.panel.space.spaceNum'),
    field: 'Broj_parkirnog_mjesta',
    align: 'left',
  },
  {
    name: 'Adresa_parkinga',
    label: t('admin.panel.space.parkingId'),
    field: 'Adresa_parkinga',
    align: 'left',
  },
  {
    name: 'Status_parkirnog_mjesta',
    label: t('admin.panel.space.status'),
    field: 'Status_parkirnog_mjesta',
    align: 'left',
  },
  {
    name: 'Vrsta_parkirnog_mjesta',
    label: t('admin.panel.space.type'),
    field: 'Vrsta_parkirnog_mjesta',
    align: 'left',
  },
  {
    name: 'Sifra_stupa',
    label: t('admin.panel.space.stupId'),
    field: 'Sifra_stupa',
    align: 'left',
  },
  {
    name: 'Sifra_kamere',
    label: t('admin.panel.space.kameraId'),
    field: 'Sifra_kamere',
    align: 'left',
  },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

async function loadSpaces() {
  loadingSpace.value = true
  try {
    const { data } = await axios.get(`${API}/api/admin/parkirno-mjesto`, { headers: authHeaders() })
    spaces.value = data
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
  } finally {
    loadingSpace.value = false
  }
}

function openSpaceDialog(row) {
  editingSpace.value = row
  spaceForm.value = row
    ? {
        Sifra_parkinga: row.Sifra_parkinga,
        Sifra_stupa: row.Sifra_stupa,
        Sifra_kamere: row.Sifra_kamere,
        Status_parkirnog_mjesta: row.Status_parkirnog_mjesta,
        Vrsta_parkirnog_mjesta: row.Vrsta_parkirnog_mjesta,
      }
    : {
        Sifra_parkinga: null,
        Sifra_stupa: null,
        Sifra_kamere: null,
        Status_parkirnog_mjesta: 'slobodno',
        Vrsta_parkirnog_mjesta: 'standardno',
      }
  spaceDialog.value = true
}

async function saveSpace() {
  saving.value = true
  try {
    if (editingSpace.value) {
      await axios.put(
        `${API}/api/admin/parkirno-mjesto/${editingSpace.value.Broj_parkirnog_mjesta}`,
        spaceForm.value,
        { headers: authHeaders() },
      )
    } else {
      await axios.post(`${API}/api/admin/parkirno-mjesto`, spaceForm.value, {
        headers: authHeaders(),
      })
    }
    spaceDialog.value = false
    $q.notify({ type: 'positive', message: t('success') })
    loadSpaces()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
  } finally {
    saving.value = false
  }
}

async function deleteSpace(id) {
  $q.dialog({
    title: t('confirm'),
    message: t('admin.panel.space.deleteConfirm'),
    cancel: true,
  }).onOk(async () => {
    try {
      await axios.delete(`${API}/api/admin/parkirno-mjesto/${id}`, { headers: authHeaders() })
      $q.notify({ type: 'positive', message: t('success') })
      loadSpaces()
    } catch (e) {
      $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
    }
  })
}

// ====================  RAMPA  ====================
const rampe = ref([])
const loadingRampa = ref(false)
const rampaDialog = ref(false)
const editingRampa = ref(null)
const rampaForm = ref({ Sifra_parkinga: null, Vrsta_rampe: 'ulazna', Status_rampe: 'zatvorena' })

const rampaCols = [
  { name: 'Sifra_rampe', label: 'ID', field: 'Sifra_rampe', align: 'left' },
  {
    name: 'Adresa_parkinga',
    label: t('admin.panel.rampa.parkingId'),
    field: 'Adresa_parkinga',
    align: 'left',
  },
  { name: 'Vrsta_rampe', label: t('admin.panel.rampa.vrsta'), field: 'Vrsta_rampe', align: 'left' },
  {
    name: 'Status_rampe',
    label: t('admin.panel.rampa.status'),
    field: 'Status_rampe',
    align: 'left',
  },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

async function loadRampe() {
  loadingRampa.value = true
  try {
    const { data } = await axios.get(`${API}/api/admin/rampa`, { headers: authHeaders() })
    rampe.value = data
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
  } finally {
    loadingRampa.value = false
  }
}

function openRampaDialog(row) {
  editingRampa.value = row
  rampaForm.value = row
    ? {
        Sifra_parkinga: row.Sifra_parkinga,
        Vrsta_rampe: row.Vrsta_rampe,
        Status_rampe: row.Status_rampe,
      }
    : { Sifra_parkinga: null, Vrsta_rampe: 'ulazna', Status_rampe: 'zatvorena' }
  rampaDialog.value = true
}

async function saveRampa() {
  saving.value = true
  try {
    if (editingRampa.value) {
      await axios.put(`${API}/api/admin/rampa/${editingRampa.value.Sifra_rampe}`, rampaForm.value, {
        headers: authHeaders(),
      })
    } else {
      await axios.post(`${API}/api/admin/rampa`, rampaForm.value, { headers: authHeaders() })
    }
    rampaDialog.value = false
    $q.notify({ type: 'positive', message: t('success') })
    loadRampe()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
  } finally {
    saving.value = false
  }
}

async function deleteRampa(id) {
  $q.dialog({
    title: t('confirm'),
    message: t('admin.panel.rampa.deleteConfirm'),
    cancel: true,
  }).onOk(async () => {
    try {
      await axios.delete(`${API}/api/admin/rampa/${id}`, { headers: authHeaders() })
      $q.notify({ type: 'positive', message: t('success') })
      loadRampe()
    } catch (e) {
      $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
    }
  })
}

// ====================  KAMERA  ====================
const kamere = ref([])
const loadingKamera = ref(false)
const kameraDialog = ref(false)
const editingKamera = ref(null)
const kameraForm = ref({ Status_kamere: 'on' })

const kameraCols = [
  { name: 'Sifra_kamere', label: 'ID', field: 'Sifra_kamere', align: 'left' },
  {
    name: 'Status_kamere',
    label: t('admin.panel.kamera.status'),
    field: 'Status_kamere',
    align: 'left',
  },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

async function loadKamere() {
  loadingKamera.value = true
  try {
    const { data } = await axios.get(`${API}/api/admin/kamera`, { headers: authHeaders() })
    kamere.value = data
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
  } finally {
    loadingKamera.value = false
  }
}

function openKameraDialog(row) {
  editingKamera.value = row
  kameraForm.value = row ? { Status_kamere: row.Status_kamere } : { Status_kamere: 'on' }
  kameraDialog.value = true
}

async function saveKamera() {
  saving.value = true
  try {
    if (editingKamera.value) {
      await axios.put(
        `${API}/api/admin/kamera/${editingKamera.value.Sifra_kamere}`,
        kameraForm.value,
        { headers: authHeaders() },
      )
    } else {
      await axios.post(`${API}/api/admin/kamera`, kameraForm.value, { headers: authHeaders() })
    }
    kameraDialog.value = false
    $q.notify({ type: 'positive', message: t('success') })
    loadKamere()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
  } finally {
    saving.value = false
  }
}

async function deleteKamera(id) {
  $q.dialog({
    title: t('confirm'),
    message: t('admin.panel.kamera.deleteConfirm'),
    cancel: true,
  }).onOk(async () => {
    try {
      await axios.delete(`${API}/api/admin/kamera/${id}`, { headers: authHeaders() })
      $q.notify({ type: 'positive', message: t('success') })
      loadKamere()
    } catch (e) {
      $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
    }
  })
}

// ====================  STUP  ====================
const stupovi = ref([])
const loadingStup = ref(false)
const stupDialog = ref(false)
const editingStup = ref(null)
const stupForm = ref({ Status_stupa: 'aktivan' })

const stupCols = [
  { name: 'Sifra_stupa', label: 'ID', field: 'Sifra_stupa', align: 'left' },
  {
    name: 'Status_stupa',
    label: t('admin.panel.stup.status'),
    field: 'Status_stupa',
    align: 'left',
  },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

async function loadStupovi() {
  loadingStup.value = true
  try {
    const { data } = await axios.get(`${API}/api/admin/stup`, { headers: authHeaders() })
    stupovi.value = data
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
  } finally {
    loadingStup.value = false
  }
}

function openStupDialog(row) {
  editingStup.value = row
  stupForm.value = row ? { Status_stupa: row.Status_stupa } : { Status_stupa: 'aktivan' }
  stupDialog.value = true
}

async function saveStup() {
  saving.value = true
  try {
    if (editingStup.value) {
      await axios.put(`${API}/api/admin/stup/${editingStup.value.Sifra_stupa}`, stupForm.value, {
        headers: authHeaders(),
      })
    } else {
      await axios.post(`${API}/api/admin/stup`, stupForm.value, { headers: authHeaders() })
    }
    stupDialog.value = false
    $q.notify({ type: 'positive', message: t('success') })
    loadStupovi()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
  } finally {
    saving.value = false
  }
}

async function deleteStup(id) {
  $q.dialog({
    title: t('confirm'),
    message: t('admin.panel.stup.deleteConfirm'),
    cancel: true,
  }).onOk(async () => {
    try {
      await axios.delete(`${API}/api/admin/stup/${id}`, { headers: authHeaders() })
      $q.notify({ type: 'positive', message: t('success') })
      loadStupovi()
    } catch (e) {
      $q.notify({ type: 'negative', message: e.response?.data?.error || e.message })
    }
  })
}
</script>
