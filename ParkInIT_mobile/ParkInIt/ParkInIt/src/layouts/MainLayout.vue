<template>
  <q-layout view="lHh Lpr lFf">
    <!-- HEADER -->
    <q-header elevated style="padding-top: env(safe-area-inset-top)">
      <q-toolbar>
        <img
          src="~assets/logo.png"
          alt="ParkInIT"
          style="width: 30px; height: 28px; margin-right: 10px; cursor: pointer"
          @click="toggleLeftDrawer"
        />
        <q-toolbar-title>ParkInIT</q-toolbar-title>
        <q-btn flat round dense icon="menu" aria-label="Izbornik" @click="toggleLeftDrawer" />
      </q-toolbar>
    </q-header>

    <!-- DRAWER (MENU) -->
    <q-drawer v-model="leftDrawerOpen" bordered>
      <q-list padding>
        <q-item-label header>{{ $t('menu.title') }}</q-item-label>

        <q-item clickable v-ripple to="/parking" @click="leftDrawerOpen = false">
          <q-item-section avatar><q-icon name="local_parking" /></q-item-section>
          <q-item-section>{{ $t('menu.parking') || 'Parking' }}</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/reservation" @click="leftDrawerOpen = false">
          <q-item-section avatar><q-icon name="event_available" /></q-item-section>
          <q-item-section>{{ $t('menu.reservation') }}</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/profile" @click="leftDrawerOpen = false">
          <q-item-section avatar><q-icon name="account_circle" /></q-item-section>
          <q-item-section>{{ $t('menu.profile') || 'My Profile' }}</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/settings" @click="leftDrawerOpen = false">
          <q-item-section avatar><q-icon name="settings" /></q-item-section>
          <q-item-section>{{ $t('menu.settings') }}</q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/help" @click="leftDrawerOpen = false">
          <q-item-section avatar><q-icon name="help" /></q-item-section>
          <q-item-section>{{ $t('menu.help') }}</q-item-section>
        </q-item>

        <template v-if="isAdmin">
          <q-separator class="q-my-sm" />
          <q-item-label header>{{ $t('menu.admin') }}</q-item-label>
          <q-item clickable v-ripple to="/admin" @click="leftDrawerOpen = false">
            <q-item-section avatar><q-icon name="admin_panel_settings" /></q-item-section>
            <q-item-section>{{ $t('menu.adminPanel') }}</q-item-section>
          </q-item>
          <q-item clickable v-ripple to="/admin-tickets" @click="leftDrawerOpen = false">
            <q-item-section avatar><q-icon name="confirmation_number" /></q-item-section>
            <q-item-section>E-Karte</q-item-section>
          </q-item>
        </template>

        <q-separator class="q-my-sm" />

        <q-item clickable v-ripple @click="logout">
          <q-item-section avatar><q-icon name="logout" /></q-item-section>
          <q-item-section>{{ $t('menu.logout') }}</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- CONTENT -->
    <q-page-container style="padding-bottom: env(safe-area-inset-bottom)">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const leftDrawerOpen = ref(false)

const isAdmin = computed(() => {
  try {
    const raw = localStorage.getItem('auth_user')
    const user = raw ? JSON.parse(raw) : null
    return user?.role === 'admin'
  } catch {
    return false
  }
})

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function logout() {
  leftDrawerOpen.value = false
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
  router.replace('/login')
}
</script>
