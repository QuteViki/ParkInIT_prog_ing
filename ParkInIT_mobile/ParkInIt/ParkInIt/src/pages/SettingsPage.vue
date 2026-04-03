<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">{{ $t('settings.title') }}</div>

    <!-- Language Settings -->
    <q-card flat bordered class="q-pa-md q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">{{ $t('settings.language') }}</div>

        <q-select
          v-model="selectedLanguage"
          :options="languageOptions"
          :label="$t('settings.selectLanguage')"
          outlined
          emit-value
          map-options
          @update:model-value="changeLanguage"
        >
          <template v-slot:prepend>
            <q-icon name="language" />
          </template>
        </q-select>
      </q-card-section>
    </q-card>

    <!-- Theme Settings -->
    <q-card flat bordered class="q-pa-md q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">{{ $t('settings.theme') }}</div>

        <q-select
          v-model="selectedTheme"
          :options="themeOptions"
          :label="$t('settings.selectTheme')"
          outlined
          emit-value
          map-options
          @update:model-value="changeTheme"
        >
          <template v-slot:prepend>
            <q-icon :name="selectedTheme === 'dark' ? 'dark_mode' : 'light_mode'" />
          </template>
        </q-select>
      </q-card-section>
    </q-card>

    <!-- Font Size Settings -->
    <q-card flat bordered class="q-pa-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">{{ $t('settings.fontSize') }}</div>

        <q-toggle
          v-model="largeFontEnabled"
          :label="$t('settings.largerFont')"
          color="primary"
          @update:model-value="changeFontSize"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'

const { locale, t } = useI18n()
const $q = useQuasar()

const selectedLanguage = ref('hr-HR')
const selectedTheme = ref('light')
const largeFontEnabled = ref(false)

const languageOptions = [
  { label: 'Hrvatski', value: 'hr-HR' },
  { label: 'English', value: 'en-US' },
]

const themeOptions = computed(() => [
  { label: t('settings.light'), value: 'light' },
  { label: t('settings.dark'), value: 'dark' },
])

onMounted(() => {
  // Load saved language preference, default to English
  const savedLang = localStorage.getItem('user_language') || 'en-US'
  selectedLanguage.value = savedLang
  locale.value = savedLang

  // Load saved theme preference
  const savedTheme = localStorage.getItem('user_theme') || 'light'
  selectedTheme.value = savedTheme
  applyTheme(savedTheme)

  // Load saved font size preference
  const savedFontSize = localStorage.getItem('user_font_size') || 'normal'
  largeFontEnabled.value = savedFontSize === 'large'
  applyFontSize(savedFontSize)
})

function changeLanguage(newLang) {
  locale.value = newLang
  localStorage.setItem('user_language', newLang)

  $q.notify({
    type: 'positive',
    message: t('settings.languageChanged'),
    position: 'top',
  })
}

function changeTheme(newTheme) {
  localStorage.setItem('user_theme', newTheme)
  applyTheme(newTheme)

  $q.notify({
    type: 'positive',
    message: newTheme === 'dark' ? t('settings.themeChangedDark') : t('settings.themeChangedLight'),
    position: 'top',
  })
}

function changeFontSize(isLarge) {
  const size = isLarge ? 'large' : 'normal'
  localStorage.setItem('user_font_size', size)
  applyFontSize(size)

  $q.notify({
    type: 'positive',
    message: isLarge ? t('settings.fontSizeLarge') : t('settings.fontSizeNormal'),
    position: 'top',
  })
}

function applyFontSize(size) {
  const root = document.documentElement
  root.style.fontSize = size === 'large' ? '18px' : '16px'
}

function applyTheme(theme) {
  $q.dark.set(theme === 'dark')
}
</script>
