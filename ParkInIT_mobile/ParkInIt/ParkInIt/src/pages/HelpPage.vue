<template>
  <q-page class="q-pa-md">
    <div class="row justify-center">
      <div class="col-12 col-sm-10 col-md-8">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">{{ $t('help.title') }}</div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <div class="text-body1 q-mb-md">
              {{ $t('help.description') }}
            </div>

            <q-banner v-if="!isManualAvailable" dense class="bg-orange-1 text-dark q-mb-md">
              {{ $t('help.unavailable') }}
            </q-banner>

            <div v-if="isManualAvailable" class="row q-col-gutter-sm q-mt-sm">
              <div class="col-12">
                <q-btn
                  color="primary"
                  icon="open_in_new"
                  :label="$t('help.open')"
                  class="full-width"
                  @click="openManual"
                />
              </div>
              <div class="col-12">
                <q-btn
                  outline
                  color="primary"
                  icon="download"
                  :label="$t('help.download')"
                  class="full-width"
                  @click="downloadManual"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

const $q = useQuasar()
const { t } = useI18n()

const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const manualFileName = 'ParkInIT_manual_merged.docx'
const isManualAvailable = ref(true)

const documentUrl = computed(() => `${apiUrl}/uploads/${manualFileName}`)

onMounted(async () => {
  try {
    const response = await fetch(documentUrl.value, { method: 'HEAD' })
    isManualAvailable.value = response.ok
  } catch {
    isManualAvailable.value = false
  }
})

async function openManual() {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: documentUrl.value })
  } else {
    window.open(documentUrl.value, '_blank', 'noopener')
  }
}

async function downloadManual() {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: documentUrl.value })
  } else {
    const link = document.createElement('a')
    link.href = documentUrl.value
    link.target = '_blank'
    link.rel = 'noopener'
    link.download = manualFileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  $q.notify({
    color: 'primary',
    message: t('help.downloadStarted'),
  })
}
</script>
