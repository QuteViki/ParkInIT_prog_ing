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

            <!-- Embedded document viewer -->
            <div class="document-viewer">
              <iframe
                :src="documentUrl"
                width="100%"
                height="600px"
                frameborder="0"
                allowfullscreen
              ></iframe>
            </div>

            <!-- Fallback download link -->
            <q-btn
              flat
              color="primary"
              :href="documentUrl"
              target="_blank"
              download="ParkInIT_manual_merged.docx"
              class="q-mt-md"
            >
              <q-icon name="download" class="q-mr-sm" />
              {{ $t('help.download') }}
            </q-btn>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'

// Assuming the backend is running on the same host, adjust if needed
const documentUrl = computed(() => `${window.location.origin}/uploads/ParkInIT_manual_merged.docx`)
</script>

<style scoped>
.document-viewer {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}
</style>