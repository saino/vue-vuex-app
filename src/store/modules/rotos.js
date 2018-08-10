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
  // overload for auto update modified field
  update (state, [ id, pathOrDict, value ]) {
    state.entities[id].batchSet(pathOrDict, value);
    if (pathOrDict.modified === undefined) {
      state.entities[id].modified = true;
    }
  },
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
    const entity = state.entities[guid];
    let data = entity.pick(['id', 'material_id']);
    // 首次保存时自动保存所有人工 mask
    if (!entity.id) {
      data['masks'] = entity.manualMasks;
    }
    return api.post('/roto/saveRoto', data)
      .then(resp => {
        Vue.notify({
          group: 'top',
          text: '抠像已保存',
        });
        commit('update', [guid, {
          id: resp,
          modified: false,
        }]);
      })
      .finally(() => {
        commit('update', [guid, 'saving', false]);
      });
  },
  saveMask ({ state, commit }, [guid, frame, maskData]) {
    commit('update', [guid, 'saving', true]);
    return api.post('/roto/saveMask', {
        id: state.entities[guid].id,
        frame: frame,
        mask: maskData,
      })
      .finally(() => {
        commit('update', [guid, 'saving', false]);
      });
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