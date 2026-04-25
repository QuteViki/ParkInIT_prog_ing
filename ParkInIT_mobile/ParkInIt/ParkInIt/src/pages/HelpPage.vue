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

            <div class="row q-col-gutter-sm q-mt-sm">
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
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { Browser } from '@capacitor/browser'

const $q = useQuasar()
const { t } = useI18n()

const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const manualFileName = 'ParkInIT_manual_merged.docx'
const documentUrl = `${apiUrl}/uploads/${manualFileName}`

async function openManual() {
  await Browser.open({ url: documentUrl })
}

async function downloadManual() {
  await Browser.open({ url: documentUrl })
  $q.notify({
    color: 'primary',
    message: t('help.downloadStarted'),
  })
}
</script>
