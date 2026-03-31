<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="login-page">
        <!-- Logo Section with Black Background -->
        <div class="logo-section">
          <img src="~assets/logo.png" alt="ParkInIT" class="logo-image" />
        </div>

        <!-- Form Section -->
        <div class="form-section">
          <q-form @submit="handleLogin" class="login-form">
            <!-- Email Input -->
            <q-input
              v-model="email"
              type="email"
              :placeholder="$t('login.email')"
              outlined
              :rules="[(val) => !!val || $t('login.emailRequired')]"
              autocomplete="email"
              class="form-input"
            />

            <!-- Password Input -->
            <q-input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="$t('login.password')"
              outlined
              :rules="[(val) => !!val || $t('login.passwordRequired')]"
              autocomplete="current-password"
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

            <!-- Forgot Password Link -->
            <div class="forgot-password-link">
              <a href="#" class="link-text">{{ $t('login.forgotPassword') }}</a>
            </div>

            <!-- Error message -->
            <div v-if="errorMessage" class="text-negative text-center q-my-md">
              {{ errorMessage }}
            </div>

            <!-- Login Button -->
            <q-btn
              type="submit"
              :label="$t('login.submit')"
              color="primary"
              class="full-width login-btn"
              :loading="loading"
              :disable="loading"
            />
          </q-form>

          <!-- Register Section -->
          <div class="register-section">
            <p class="register-text">{{ $t('login.noAccount') }}</p>
            <q-btn
              type="button"
              @click="goToRegister"
              :label="$t('login.register')"
              color="primary"
              outline
              class="full-width register-btn"
            />
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const $q = useQuasar()
const { t } = useI18n()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const API_URL = import.meta.env.VITE_API_URL

function goToRegister() {
  router.push('/register')
}

async function handleLogin() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      // Show error from server
      errorMessage.value = data.error || t('login.error')
      return
    }

    // Save token and user data
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('auth_user', JSON.stringify(data.user))

    // Show success notification
    $q.notify({
      type: 'positive',
      message: t('login.success'),
      position: 'top',
    })

    // Redirect to home
    router.replace('/parking')
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = 'Greška u povezivanju sa serverom'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Mobile-first responsive design */

.login-page {
  padding: 0;
  background: white;
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.logo-section {
  background-color: #f5f5f5;
  padding: clamp(8px, 3vw, 16px) clamp(16px, 4vw, 32px);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  min-height: clamp(60px, 15vh, 100px);
}

.logo-image {
  width: clamp(60px, 15vw, 120px);
  height: auto;
  object-fit: contain;
}

.form-section {
  padding: clamp(12px, 3vw, 20px) clamp(16px, 4vw, 40px);
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

.login-form {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.5vw, 12px);
}

.form-input {
  background: white;
  width: 100%;
}

.form-input :deep(.q-field__control) {
  font-size: clamp(12px, 3vw, 14px);
  padding: clamp(6px, 1.5vw, 8px) clamp(8px, 2vw, 10px);
  min-height: auto;
  height: auto;
}

.form-input :deep(.q-placeholder) {
  color: #999;
  font-size: clamp(11px, 2.8vw, 13px);
}

.forgot-password-link {
  text-align: center;
  margin: clamp(4px, 1vw, 8px) 0;
}

.link-text {
  color: #666;
  text-decoration: none;
  font-size: clamp(9px, 2.2vw, 11px);
  padding: 6px;
  display: inline-block;
  -webkit-user-select: none;
  user-select: none;
}

.link-text:hover {
  text-decoration: underline;
}

.link-text:active {
  opacity: 0.7;
}

.login-btn {
  padding: clamp(8px, 2vw, 10px);
  font-size: clamp(13px, 3vw, 15px);
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-top: clamp(2px, 0.5vw, 4px);
  min-height: clamp(40px, 10vw, 44px);
  width: 100%;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.login-btn:active {
  transform: scale(0.98);
}

.register-section {
  margin-top: clamp(12px, 2.5vw, 18px);
  text-align: center;
  width: 100%;
  flex-shrink: 0;
}

.register-text {
  margin: 0 0 clamp(8px, 1.5vw, 12px) 0;
  color: #666;
  font-size: clamp(10px, 2.5vw, 12px);
  line-height: 1.3;
}

.register-btn {
  padding: clamp(8px, 2vw, 10px);
  font-size: clamp(12px, 2.8vw, 14px);
  font-weight: 600;
  border: 2px solid var(--q-primary);
  min-height: clamp(40px, 10vw, 44px);
  width: 100%;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.register-btn:active {
  transform: scale(0.98);
}

/* Landscape orientation adjustments */
@media (max-height: 500px) and (orientation: landscape) {
  .logo-section {
    min-height: auto;
    padding: 8px clamp(16px, 4vw, 32px);
  }

  .logo-image {
    width: clamp(60px, 15vw, 100px);
  }

  .form-section {
    padding: clamp(8px, 3vw, 16px) clamp(16px, 4vw, 40px);
    justify-content: flex-start;
  }

  .login-form {
    gap: clamp(8px, 1.5vw, 12px);
  }

  .forgot-password-link {
    margin: clamp(4px, 1vw, 8px) 0;
  }

  .register-section {
    margin-top: clamp(8px, 2vw, 12px);
  }

  .register-text {
    margin-bottom: clamp(6px, 1.5vw, 10px);
  }
}

/* Tablet and larger devices */
@media (min-width: 600px) {
  .form-section {
    max-width: 100%;
    margin: 0 auto;
  }

  .login-form {
    gap: 16px;
  }

  .form-input :deep(.q-field__control) {
    font-size: 14px;
    padding: 10px 12px;
  }

  .login-btn,
  .register-btn {
    min-height: 48px;
    font-size: 16px;
  }
}

/* Extra large screens */
@media (min-width: 1024px) {
  .login-page {
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
  .login-btn,
  .register-btn {
    transition: none;
  }

  .login-btn:active,
  .register-btn:active {
    transform: none;
  }
}

/* High DPI / Retina displays */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .form-input :deep(.q-field__border) {
    border-width: 1px;
  }
}
</style>
