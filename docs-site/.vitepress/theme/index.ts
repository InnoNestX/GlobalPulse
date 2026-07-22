import DefaultTheme from 'vitepress/theme'
import { h, nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'
import './custom.css'
import { mountLandingEffects } from './terminal'

const Layout = {
  name: 'GlobalPulseLayout',
  setup() {
    const route = useRoute()
    const boot = () => {
      void nextTick(() => mountLandingEffects())
    }
    onMounted(boot)
    watch(() => route.path, boot)
    return () => h(DefaultTheme.Layout)
  },
}

export default {
  extends: DefaultTheme,
  Layout,
}
