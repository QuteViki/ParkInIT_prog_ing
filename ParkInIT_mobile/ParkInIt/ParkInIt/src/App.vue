<template>
  <router-view v-if="!showSplash" />

  <div v-else class="splash">
    <img src="~assets/logo.png" class="logo" />
    <div class="title">ParkInIT</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { App as CapApp } from '@capacitor/app'

const showSplash = ref(true)
const router = useRouter()

onMounted(() => {
  const savedFontSize = localStorage.getItem('user_font_size') || 'normal'
  document.documentElement.style.fontSize = savedFontSize === 'large' ? '18px' : '16px'

  setTimeout(() => {
    showSplash.value = false
  }, 800)

  // Handle deep links (App Links) — fires when Android intercepts payment redirect URLs
  CapApp.addListener('appUrlOpen', (event) => {
    try {
      const url = new URL(event.url)
      if (url.pathname === '/payment-return') {
        const orderId = url.searchParams.get('orderId')
        const t = url.searchParams.get('t')
        const query = {}
        if (orderId) query.orderId = orderId
        if (t) query.t = t
        router.push({ path: '/payment-success', query })
      }
    } catch (e) {
      console.error('appUrlOpen error:', e)
    }
  })
})
</script>

<style scoped>
.splash {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.logo {
  width: 120px;
  height: 120px;
}
.title {
  margin-top: 12px;
  font-size: 20px;
  font-weight: 600;
}
</style>
