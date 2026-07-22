import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './custom.css'
import HomeLanding from './components/HomeLanding.vue'
import HomeTerminal from './components/HomeTerminal.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HomeLanding', HomeLanding)
    app.component('HomeTerminal', HomeTerminal)
  },
} satisfies Theme
