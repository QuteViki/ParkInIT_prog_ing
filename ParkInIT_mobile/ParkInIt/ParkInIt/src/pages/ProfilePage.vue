<template>
  <q-page class="q-pa-md">
    <div class="row justify-center">
      <div class="col-12 col-sm-8 col-md-5">
        <!-- Profile Card -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="column items-center q-pt-xl">
            <q-avatar size="80px" color="primary" text-color="white" class="q-mb-md">
              <span class="text-h5">{{ initials }}</span>
            </q-avatar>
            <div class="text-h6">{{ profile.ime }} {{ profile.prezime }}</div>
            <q-badge :color="profile.role === 'admin' ? 'negative' : 'primary'" class="q-mt-xs">
              {{ profile.role === 'admin' ? $t('profile.roleAdmin') : $t('profile.roleUser') }}
            </q-badge>
          </q-card-section>

          <q-separator />

          <!-- View mode -->
          <q-card-section v-if="!editMode">
            <q-list>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="email" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label caption>{{ $t('profile.email') }}</q-item-label>
                  <q-item-label>{{ profile.email }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="phone" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label caption>{{ $t('profile.phone') }}</q-item-label>
                  <q-item-label>{{ profile.telefonski_broj || '—' }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="badge" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label caption>{{ $t('profile.oib') }}</q-item-label>
                  <q-item-label>{{ profile.oib || '—' }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>

            <div class="row q-gutter-sm q-mt-md justify-center">
              <q-btn
                outline
                color="primary"
                icon="edit"
                :label="$t('profile.editProfile')"
                @click="startEdit"
              />
              <q-btn
                outline
                color="orange"
                icon="lock"
                :label="$t('profile.changePassword')"
                @click="passwordDialog = true"
              />
            </div>
          </q-card-section>

          <!-- Edit mode -->
          <q-card-section v-else>
            <q-form @submit.prevent="saveProfile" class="q-gutter-md">
              <q-input
                v-model="editForm.ime"
                :label="$t('profile.firstName')"
                outlined
                :rules="[(val) => !!val || $t('profile.firstNameRequired')]"
              />
              <q-input
                v-model="editForm.prezime"
                :label="$t('profile.lastName')"
                outlined
                :rules="[(val) => !!val || $t('profile.lastNameRequired')]"
              />
              <q-input
                v-model="editForm.email"
                :label="$t('profile.email')"
                type="email"
                outlined
                :rules="[(val) => !!val || $t('profile.emailRequired')]"
              />
              <q-input v-model="editForm.telefonski_broj" :label="$t('profile.phone')" outlined />

              <div class="row q-gutter-sm justify-center">
                <q-btn
                  type="submit"
                  color="primary"
                  icon="save"
                  :label="$t('save')"
                  :loading="saving"
                />
                <q-btn flat color="grey" icon="close" :label="$t('cancel')" @click="cancelEdit" />
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- My Vehicles Card - only for regular users -->
        <q-card v-if="profile.role === 'user'" flat bordered class="q-mb-md">
          <q-card-section class="row items-center justify-between q-py-sm">
            <div class="text-subtitle1 text-weight-medium">
              <q-icon name="directions_car" color="primary" class="q-mr-sm" />
              {{ $t('profile.myVehicles') }}
            </div>
            <q-btn flat round dense icon="add" color="primary" @click="vehicleDialog = true" />
          </q-card-section>

          <q-separator />

          <q-card-section>
            <q-list v-if="vehicles.length">
              <q-item v-for="v in vehicles" :key="v.registracija" dense>
                <q-item-section avatar>
                  <q-icon name="directions_car" color="grey-6" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ v.registracija }}</q-item-label>
                  <q-item-label caption>{{ v.marka }}{{ v.tip ? ' · ' + v.tip : '' }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    color="negative"
                    size="sm"
                    @click="deleteVehicle(v.registracija)"
                  />
                </q-item-section>
              </q-item>
            </q-list>
            <div v-else class="text-grey text-center q-py-sm text-body2">
              {{ $t('profile.noVehicles') }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Password Change Dialog -->
    <q-dialog v-model="passwordDialog">
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">{{ $t('profile.passwordDialog') }}</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-form @submit.prevent="changePassword" class="q-gutter-md">
            <q-input
              v-model="pwForm.currentPassword"
              :label="$t('profile.currentPassword')"
              :type="showPw.current ? 'text' : 'password'"
              outlined
            >
              <template #append>
                <q-icon
                  :name="showPw.current ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showPw.current = !showPw.current"
                />
              </template>
            </q-input>
            <q-input
              v-model="pwForm.newPassword"
              :label="$t('profile.newPassword')"
              :type="showPw.new ? 'text' : 'password'"
              outlined
            >
              <template #append>
                <q-icon
                  :name="showPw.new ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showPw.new = !showPw.new"
                />
              </template>
            </q-input>
            <q-input
              v-model="pwForm.confirmPassword"
              :label="$t('profile.confirmPassword')"
              :type="showPw.confirm ? 'text' : 'password'"
              outlined
              :rules="[(val) => val === pwForm.newPassword || $t('profile.passwordMismatch')]"
            >
              <template #append>
                <q-icon
                  :name="showPw.confirm ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showPw.confirm = !showPw.confirm"
                />
              </template>
            </q-input>

            <div class="row q-gutter-sm justify-end">
              <q-btn flat :label="$t('cancel')" v-close-popup />
              <q-btn
                type="submit"
                color="primary"
                :label="$t('profile.changeBtn')"
                :loading="changingPw"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Add Vehicle Dialog -->
    <q-dialog v-model="vehicleDialog">
      <q-card style="min-width: 320px">
        <q-card-section>
          <div class="text-h6">{{ $t('profile.addVehicleTitle') }}</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-form @submit.prevent="addVehicle" class="q-gutter-md">
            <q-input
              v-model="vehicleForm.registracija"
              :label="$t('profile.vehicleReg')"
              outlined
              :rules="[(val) => !!val || $t('profile.vehicleRegRequired')]"
            />
            <q-input
              v-model="vehicleForm.marka"
              :label="$t('profile.vehicleBrand')"
              outlined
              :rules="[(val) => !!val || $t('profile.vehicleBrandRequired')]"
            />
            <q-input v-model="vehicleForm.tip" :label="$t('profile.vehicleType')" outlined />
            <div class="row q-gutter-sm justify-end">
              <q-btn flat :label="$t('cancel')" v-close-popup />
              <q-btn type="submit" color="primary" :label="$t('save')" :loading="savingVehicle" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'

const $q = useQuasar()
const { t } = useI18n()

const API_URL = import.meta.env.VITE_API_URL

const profile = ref({
  ime: '',
  prezime: '',
  email: '',
  oib: '',
  telefonski_broj: '',
  role: 'user',
})
const editMode = ref(false)
const editForm = ref({})
const saving = ref(false)

const passwordDialog = ref(false)
const pwForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const showPw = ref({ current: false, new: false, confirm: false })
const changingPw = ref(false)

const vehicles = ref([])
const vehicleDialog = ref(false)
const vehicleForm = ref({ registracija: '', marka: '', tip: '' })
const savingVehicle = ref(false)

const initials = computed(() => {
  const i = (profile.value.ime || '').charAt(0).toUpperCase()
  const p = (profile.value.prezime || '').charAt(0).toUpperCase()
  return i + p || '?'
})

async function loadProfile() {
  try {
    const res = await fetch(`${API_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    })
    if (!res.ok) throw new Error('Failed to load profile')
    profile.value = await res.json()
  } catch {
    $q.notify({ type: 'negative', message: t('profile.loadError'), position: 'top' })
  }
}

function startEdit() {
  editForm.value = { ...profile.value }
  editMode.value = true
}

function cancelEdit() {
  editMode.value = false
}

async function saveProfile() {
  saving.value = true
  try {
    const res = await fetch(`${API_URL}/api/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({
        email: editForm.value.email,
        ime: editForm.value.ime,
        prezime: editForm.value.prezime,
        telefonski_broj: editForm.value.telefonski_broj,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || t('profile.saveError'))
    }
    profile.value = { ...profile.value, ...editForm.value }
    editMode.value = false
    $q.notify({ type: 'positive', message: t('profile.saveSuccess'), position: 'top' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message, position: 'top' })
  } finally {
    saving.value = false
  }
}

async function changePassword() {
  if (pwForm.value.newPassword !== pwForm.value.confirmPassword) {
    $q.notify({ type: 'negative', message: t('profile.passwordMismatch'), position: 'top' })
    return
  }
  changingPw.value = true
  try {
    const res = await fetch(`${API_URL}/api/user/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({
        currentPassword: pwForm.value.currentPassword,
        newPassword: pwForm.value.newPassword,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || t('profile.passwordError'))
    }
    passwordDialog.value = false
    pwForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    $q.notify({ type: 'positive', message: t('profile.passwordSuccess'), position: 'top' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message, position: 'top' })
  } finally {
    changingPw.value = false
  }
}

async function loadVehicles() {
  try {
    const res = await fetch(`${API_URL}/api/user/vehicles`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    })
    if (res.ok) vehicles.value = await res.json()
  } catch {
    // silently fail
  }
}

async function addVehicle() {
  savingVehicle.value = true
  try {
    const res = await fetch(`${API_URL}/api/user/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify(vehicleForm.value),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || t('profile.vehicleAddError'))
    }
    vehicleDialog.value = false
    vehicleForm.value = { registracija: '', marka: '', tip: '' }
    await loadVehicles()
    $q.notify({ type: 'positive', message: t('profile.vehicleAdded'), position: 'top' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message, position: 'top' })
  } finally {
    savingVehicle.value = false
  }
}

async function deleteVehicle(reg) {
  try {
    const res = await fetch(`${API_URL}/api/user/vehicles/${encodeURIComponent(reg)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    })
    if (!res.ok) throw new Error(t('profile.vehicleDeleteError'))
    await loadVehicles()
    $q.notify({ type: 'positive', message: t('profile.vehicleDeleted'), position: 'top' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message, position: 'top' })
  }
}

onMounted(() => {
  loadProfile()
  loadVehicles()
})
</script>
