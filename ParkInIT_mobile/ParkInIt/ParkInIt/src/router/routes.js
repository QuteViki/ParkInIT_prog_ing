const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: '/parking' },
      { path: 'parking', component: () => import('pages/ParkingSpacePageNew.vue') },
      { path: 'reservation-confirm', component: () => import('pages/ReservationConfirmPage.vue') },
      { path: 'payment-test', component: () => import('pages/PaymentTestPage.vue') },
      { path: 'payment-callback', component: () => import('pages/PaymentCallbackPage.vue') },
      { path: 'payment-success', component: () => import('pages/PaymentSuccessPage.vue') },
      { path: 'reservation', component: () => import('pages/ReservationPage.vue') },
      { path: 'profile', component: () => import('pages/ProfilePage.vue') },
      { path: 'settings', component: () => import('pages/SettingsPage.vue') },
      {
        path: 'admin',
        component: () => import('pages/AdminPage.vue'),
        meta: { requiresAdmin: true },
      },
      {
        path: 'admin-tickets',
        component: () => import('pages/AdminTicketsPage.vue'),
        meta: { requiresAdmin: true },
      },
    ],
  },

  // login i registracija su izvan MainLayouta (bez drawer/footer)
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue'),
  },

  {
    path: '/register',
    component: () => import('pages/RegisterPage.vue'),
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
