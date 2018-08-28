import Vue from 'vue'
import Vuex from 'vuex'

import createPersistedState from "vuex-persistedstate"
import IDBPersist from '@/plugins/IDBPersist'
import pathify from './pathify'

import user from './modules/user'
import rotos from './modules/rotos'
// import materials from './modules/materials'
import useMaterial from './modules/useMaterial'

Vue.use(Vuex)

const DEBUG = process.env.NODE_ENV !== 'production'

export default new Vuex.Store({
  strict: DEBUG,
  mutations: {
    // 要求 IDB 异步持久化的字段/模块和同步持久化的字段不冲突才可以直接用 assign
    asyncRestore(state, asyncState) {
      if (state.user.loggedIn) {
        Object.assign(state, asyncState);
      }
    }
  },
  plugins: [
    // 同步持久化到 localStorage
    createPersistedState({
      paths: ['user'],
      subscriber(store) {
        // init hook
        store.dispatch('checkLogin');
        return function(handler) {
          return store.subscribe(handler);
        };
      }
    }),
    // 异步持久化大数据到 IndexedDB
    IDBPersist({
      strict: DEBUG,
      mergeMutation: 'asyncRestore',
      filterFields: ['rotos'],
      initHook(store) {
        store.dispatch('rotos/reExtend');
        store.dispatch('rotos/checkProgress');
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
