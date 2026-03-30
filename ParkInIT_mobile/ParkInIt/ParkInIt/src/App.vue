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
