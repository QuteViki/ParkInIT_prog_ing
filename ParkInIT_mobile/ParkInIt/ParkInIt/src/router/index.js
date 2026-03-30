import { route } from 'quasar/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'

export default route(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach((to) => {
    const token = localStorage.getItem('auth_token')
    const loggedIn = !!token

    const requiresAdmin = to.matched.some((r) => r.meta.requiresAdmin)

    let user = null
    try {
      const raw = localStorage.getItem('auth_user')
      user = raw ? JSON.parse(raw) : null
    } catch {
      // ako je JSON pokvaren, očisti session
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }

    const isAdmin = user?.role === 'admin'

    // Ako korisnik pokušava ići na login stranicu a već je ulogiran -> redirect na home
    if (to.path === '/login' && loggedIn) {
      return '/'
    }

    // Ako korisnik pokušava ići na register stranicu a već je ulogiran -> redirect na home
    if (to.path === '/register' && loggedIn) {
      return '/'
    }

    // Ako korisnik NIJE ulogiran i ne ide na login ili register -> šalji ga na login
    if (!loggedIn && to.path !== '/login' && to.path !== '/register') {
      return '/login'
    }

    // admin rute -> samo admin
    if (requiresAdmin && !isAdmin) {
      return '/'
    }

    // Allow navigation (implicitly by not returning anything)
  })

  return Router
})
