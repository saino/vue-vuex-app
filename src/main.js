import '@/utils/prototypeEnhance'

import Vue from 'vue'
import App from './App.vue'
// import { sync } from 'vuex-router-sync'
import store from './store/index'
import router from './router'
// sync(store, router)

import VModal from 'vue-js-modal'
Vue.use(VModal, { dialog: true })

import Notifications from 'vue-notification'
Vue.use(Notifications)

import VueWait from 'vue-wait'
Vue.use(VueWait)

import infiniteScroll from 'vue-infinite-scroll'
Vue.use(infiniteScroll)

import vuewheel from 'vuewheel'
Vue.use(vuewheel)

import VeeValidate from 'vee-validate'
Vue.use(VeeValidate)

import VueConfirm from '@/plugins/VueConfirm'
Vue.use(VueConfirm)


Vue.config.productionTip = false

Vue.config.keyCodes = {
  equal: 187,
  minus: 189,
  slash: 191,
  backquote: 192,
  num1: 49,
  num2: 50,
  num3: 51,
  num4: 52,
  num5: 53,
  num6: 54,
  num7: 55,
  num8: 56,
  num9: 57,
}

new Vue({
  router,
  store,
  wait: new VueWait({
    useVuex: true,
  }),
  render: h => h(App)
}).$mount('#app')

