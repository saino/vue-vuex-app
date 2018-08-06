import Vue from 'vue'
import Vuex from 'vuex'

import createPersistedState from "vuex-persistedstate"
import pathify from './pathify'

import user from './modules/user'
import rotos from './modules/rotos'
// import materials from './modules/materials'
import useMaterial from './modules/useMaterial'

Vue.use(Vuex)

export default new Vuex.Store({
  strict: process.env.NODE_ENV !== 'production',
  plugins: [
    createPersistedState({
      paths: ['user', 'rotos'],
      subscriber(store) {
        // init hook
        store.dispatch('checkLogin');
        store.dispatch('rotos/reExtend');
        return function(handler) {
          return store.subscribe(handler);
        };
      }
    }),
    pathify.plugin
  ],
  modules: {
    user,
    rotos,
    // materials,  // 打开的抠像/特效项目使用到的素材引用，不受 dashboard 影响
    useMaterial,
  },
})
