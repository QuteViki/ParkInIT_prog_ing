<template>
  <router-view v-if="!showSplash" />

  <div v-else class="splash">
    <img src="~assets/logo.png" class="logo" />
    <div class="title">ParkInIT</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const showSplash = ref(true)

onMounted(() => {
  const savedFontSize = localStorage.getItem('user_font_size') || 'normal'
  document.documentElement.style.fontSize = savedFontSize === 'large' ? '18px' : '16px'

  setTimeout(() => {
    showSplash.value = false
  }, 800)
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
