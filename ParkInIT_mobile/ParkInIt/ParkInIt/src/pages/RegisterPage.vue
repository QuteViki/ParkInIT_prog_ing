<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="register-page">
        <!-- Header with Back Button -->
        <div class="header-section">
          <q-btn flat round icon="arrow_back" @click="goBack" class="back-btn" />
          <h1 class="header-title">{{ $t('registration.title') }}</h1>
          <div style="width: 40px"></div>
        </div>

        <!-- Form Section -->
        <div class="form-section">
          <q-form @submit="handleRegister" class="register-form">
            <!-- First Name Input -->
            <q-input
              v-model="formData.firstName"
              :placeholder="$t('registration.firstName')"
              outlined
              :rules="[(val) => !!val || $t('registration.firstNameRequired')]"
              class="form-input"
            />

            <!-- Last Name Input -->
            <q-input
              v-model="formData.lastName"
              :placeholder="$t('registration.lastName')"
              outlined
              :rules="[(val) => !!val || $t('registration.lastNameRequired')]"
              class="form-input"
            />

            <!-- Personal ID (OIB) Input -->
            <q-input
              v-model="formData.personalId"
              :placeholder="$t('registration.personalId')"
              outlined
              :rules="[(val) => !!val || $t('registration.personalIdRequired')]"
              class="form-input"
            />

            <!-- Phone Number Input -->
            <q-input
              v-model="formData.phone"
              type="tel"
              :placeholder="$t('registration.phone')"
              outlined
              :rules="[(val) => !!val || $t('registration.phoneRequired')]"
              class="form-input"
            />

            <!-- Email Input -->
            <q-input
              v-model="formData.email"
              type="email"
              :placeholder="$t('registration.email')"
              outlined
              :rules="[(val) => !!val || $t('registration.emailRequired')]"
              class="form-input"
            />

            <!-- Password Input -->
            <q-input
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="$t('registration.password')"
              outlined
              :rules="[(val) => !!val || $t('registration.passwordRequired')]"
              class="form-input"
            >
              <template v-slot:append>
                <q-icon
                  :name="showPassword ? 'visibility' : 'visibility_off'"
                  class="cursor-pointer"
                  @click="showPassword = !showPassword"
                />
              </template>
            </q-input>

            <!-- Error message -->
            <div v-if="errorMessage" class="text-negative text-center q-my-md">
              {{ errorMessage }}
            </div>

            <!-- Register Button -->
            <q-btn
              type="submit"
              :label="$t('registration.submit')"
              color="primary"
              class="full-width register-btn"
              :loading="loading"
              :disable="loading"
            />
          </q-form>

          <!-- Login Section
          <div class="login-section">
            <p class="login-text">{{ $t('registration.haveAccount') }}</p>
            <q-btn
              type="button"
              @click="goToLogin"
              :label="$t('registration.login')"
              color="primary"
              outline
              class="full-width login-btn"
            />
          </div> -->
        </div>
      </q-page>
    </q-page-container>
  </q-layout>

  <!-- Add First Vehicle Dialog -->
  <q-dialog v-model="vehicleDialog" persistent>
    <q-card style="min-width: 320px; max-width: 95vw">
      <q-card-section class="column items-center q-pt-lg">
        <q-icon name="directions_car" size="48px" color="primary" class="q-mb-sm" />
        <div class="text-h6 text-center">{{ $t('registration.addFirstVehicle') }}</div>
        <div class="text-body2 text-grey text-center q-mt-xs">
          {{ $t('registration.addFirstVehicleDesc') }}
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <q-form @submit.prevent="addVehicleAndGo" class="q-gutter-md">
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
            <q-btn flat :label="$t('registration.skipForNow')" @click="skipVehicle" />
            <q-btn type="submit" color="primary" :label="$t('add')" :loading="savingVehicle" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const $q = useQuasar()
const { t } = useI18n()

const formData = ref({
  firstName: '',
  lastName: '',
  personalId: '',
  phone: '',
  email: '',
  password: '',
})

const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const vehicleDialog = ref(false)
const vehicleForm = ref({ registracija: '', marka: '', tip: '' })
const savingVehicle = ref(false)

const API_URL = import.meta.env.VITE_API_URL

async function handleRegister() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: formData.value.firstName,
        lastName: formData.value.lastName,
        personalId: formData.value.personalId,
        phone: formData.value.phone,
        email: formData.value.email,
        password: formData.value.password,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      errorMessage.value = data.error || t('registration.error')
      return
    }

    // Show success notification
    $q.notify({
      type: 'positive',
      message: t('registration.success'),
      position: 'top',
    })

    // Auto-login the new user
    try {
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.value.email, password: formData.value.password }),
      })
      if (loginRes.ok) {
        const loginData = await loginRes.json()
        localStorage.setItem('auth_token', loginData.token)
        localStorage.setItem('auth_user', JSON.stringify(loginData.user))
      }
    } catch {
      // auto-login failed silently; user will be asked to log in manually
    }

    // Show vehicle dialog (works even if auto-login failed — vehicle save will just 401 silently)
    vehicleDialog.value = true
  } catch (error) {
    console.error('Registration error:', error)
    errorMessage.value = 'Greška u povezivanju sa serverom'
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}

async function addVehicleAndGo() {
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
    $q.notify({ type: 'positive', message: t('profile.vehicleAdded'), position: 'top' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message, position: 'top' })
  } finally {
    savingVehicle.value = false
    vehicleDialog.value = false
    router.replace('/')
  }
}

function skipVehicle() {
  vehicleDialog.value = false
  router.replace('/')
}

// function goToLogin() {
//   router.push('/login')
// }
</script>

<style scoped>
/* Mobile-first responsive design */

.register-page {
  padding: 0;
  background: white;
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.header-section {
  padding: 2px clamp(8px, 2vw, 12px);
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  gap: clamp(4px, 1vw, 6px);
  min-height: auto;
  height: auto;
}

.back-btn {
  color: #333;
  min-width: 32px;
  min-height: 32px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
}

.header-title {
  margin: 0;
  font-size: clamp(13px, 3.5vw, 15px);
  font-weight: 600;
  color: #333;
  flex: 1;
  text-align: center;
  word-break: break-word;
  line-height: 1.2;
}

.form-section {
  padding: clamp(10px, 2.5vw, 16px) clamp(16px, 4vw, 40px);
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  width: 100%;
  max-width: 100%;
  -webkit-overflow-scrolling: touch;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.2vw, 10px);
}

.form-input {
  background: white;
  width: 100%;
}

.form-input :deep(.q-field__control) {
  font-size: clamp(12px, 3vw, 13px);
  padding: clamp(5px, 1.2vw, 7px) clamp(8px, 2vw, 10px);
  min-height: auto;
  height: auto;
}

.form-input :deep(.q-placeholder) {
  color: #999;
  font-size: clamp(11px, 2.8vw, 12px);
}

.register-btn {
  padding: clamp(7px, 1.8vw, 9px);
  font-size: clamp(12px, 3vw, 14px);
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-top: clamp(2px, 0.5vw, 4px);
  min-height: clamp(40px, 10vw, 44px);
  width: 100%;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.register-btn:active {
  transform: scale(0.98);
}

.login-section {
  margin-top: clamp(8px, 2vw, 14px);
  text-align: center;
  width: 100%;
  flex-shrink: 0;
}

.login-text {
  margin: 0 0 clamp(6px, 1.2vw, 10px) 0;
  color: #666;
  font-size: clamp(10px, 2.5vw, 11px);
  line-height: 1.3;
}

.login-btn {
  padding: clamp(7px, 1.8vw, 9px);
  font-size: clamp(11px, 2.8vw, 13px);
  font-weight: 600;
  border: 2px solid var(--q-primary);
  min-height: clamp(40px, 10vw, 44px);
  width: 100%;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.login-btn:active {
  transform: scale(0.98);
}

/* Landscape orientation adjustments */
@media (max-height: 600px) and (orientation: landscape) {
  .header-section {
    padding: 8px clamp(12px, 3vw, 24px);
  }

  .header-title {
    font-size: clamp(14px, 3.5vw, 16px);
  }

  .form-section {
    padding: clamp(8px, 3vw, 12px) clamp(16px, 4vw, 40px);
  }

  .register-form {
    gap: clamp(8px, 1.5vw, 12px);
  }

  .login-section {
    margin-top: clamp(8px, 2vw, 12px);
  }

  .login-text {
    margin-bottom: clamp(6px, 1.5vw, 10px);
  }
}

/* Tablet and larger devices */
@media (min-width: 600px) {
  .form-section {
    max-width: 100%;
    margin: 0 auto;
    padding: clamp(20px, 5vw, 36px) clamp(20px, 5vw, 48px);
  }

  .register-form {
    gap: 16px;
  }

  .form-input :deep(.q-field__control) {
    font-size: 14px;
    padding: 10px 12px;
  }

  .register-btn,
  .login-btn {
    min-height: 48px;
    font-size: 16px;
  }

  .header-title {
    font-size: 20px;
  }
}

/* Extra large screens */
@media (min-width: 1024px) {
  .register-page {
    justify-content: center;
  }

  .form-section {
    max-width: 500px;
    margin: auto;
    align-self: center;
  }
}

/* Accessibility - reduce motion */
@media (prefers-reduced-motion: reduce) {
  .register-btn,
  .login-btn {
    transition: none;
  }

  .register-btn:active,
  .login-btn:active {
    transform: none;
  }
}

/* High DPI / Retina displays */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .form-input :deep(.q-field__border) {
    border-width: 1px;
  }
}

/* Support for notched displays (iPhone X+) */
@supports (padding: max(0px)) {
  .form-section,
  .register-form {
    padding-left: max(clamp(16px, 4vw, 40px), env(safe-area-inset-left));
    padding-right: max(clamp(16px, 4vw, 40px), env(safe-area-inset-right));
  }
}
</style>
