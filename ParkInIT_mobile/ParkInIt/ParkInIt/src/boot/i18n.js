import { defineBoot } from '#q-app/wrappers'
import { createI18n } from 'vue-i18n'
import messages from 'src/i18n'

export default defineBoot(({ app }) => {
  // Check for saved language preference, default to Croatian
  const savedLanguage = localStorage.getItem('user_language')
  const defaultLocale = savedLanguage || 'hr-HR'
  
  const i18n = createI18n({
    locale: defaultLocale,
    fallbackLocale: 'hr-HR',
    globalInjection: true,
    messages,
  })

  // Set i18n instance on app
  app.use(i18n)
})