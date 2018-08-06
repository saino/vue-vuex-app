import Vue from 'vue'
import { api } from '@/utils/api'
import { make } from 'vuex-pathify'
// import merge from 'deepmerge'

import listStoreMaker from '@/utils/listStoreMaker'
import Roto from '@/entities/Roto'

const listStore = listStoreMaker(Roto, '_guid');


const state = listStore.state;

const getters = {
  ...make.getters(state),
  ...listStore.getters,
}

const mutations = {
  ...make.mutations(state),
  ...listStore.mutations,
}

const actions = {
  ...listStore.actions,
  load ({ dispatch }, id) {
    return api.post('/roto/loadRoto', {id})
      .then(resp => {
        dispatch('add', resp);
      });
  },
  save ({ state, commit }, guid) {
    commit('update', [guid, 'saving', true]);
    return api.post('/roto/saveRoto', state.entities[guid].pick(['id', 'config', 'material_id']))
      .then(resp => {
        Vue.notify({
          group: 'top',
          text: '抠像已保存',
        });
        commit('update', [guid, {
          id: resp,
          saving: false,
          modified: false,
        }]);
      });
  },
  // 所有可回溯的操作均调用该接口
  modify ({ commit }, [guid, data]) {
    commit('update', [guid, { ...data, modified: true }]);
    // TODO: take snapshot
  },
  addMaterial ({ commit }, material) {
    const newRoto = {
      material_id: material.id,
      material: material
    };
    commit('add', newRoto);
  },
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
}