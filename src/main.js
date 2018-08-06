import '@/utils/helper'

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

import VeeValidate from 'vee-validate'
Vue.use(VeeValidate)

import VueConfirm from '@/plugins/VueConfirm'
Vue.use(VueConfirm)


Vue.config.productionTip = false

new Vue({
  router,
  store,
  wait: new VueWait({
    useVuex: true,
  }),
  render: h => h(App)
}).$mount('#app')

