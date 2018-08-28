import Vue from 'vue'
import { api } from '@/utils/api'
import { make } from 'vuex-pathify'
// import merge from 'deepmerge'

import listStoreMaker from '@/utils/listStoreMaker'
import Roto from '@/entities/Roto'
import JOB from '@/utils/jobConst'
import pollProgress from '@/utils/progressHelper'

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
        dispatch('checkProgress', id);
      });
  },
  reload ({ state, commit }, guid) {
    const id = state.entities[guid].id;
    if (!id) return;
    Vue.notify({
      group: 'top',
      text: `${name} 正在重新加载 Mask...`,
      duration: 1500,
    });
    api.post('/roto/loadRoto', {id})
      .then(resp => {
        commit('update', [guid, 'masks', resp.masks]);
      });
  },
  save ({ state, commit }, guid) {
    commit('update', [guid, 'saving', true]);
    const entity = state.entities[guid];
    let data = entity.pickKeys(['id', 'material_id']);
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
        return resp;
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
  jobProgress ({ state, commit, dispatch }, [guid, jobType, reset]) {
    const rotoId = state.entities[guid].id;
    const jobStatusPath = 'jobStatus.' + jobType;
    if (reset) {
      commit('update', [guid, jobStatusPath, JOB.QUEUE]);
    }
    pollProgress(jobType, rotoId,
      progress => {
        if (progress > 0) {
          commit('update', [guid, jobStatusPath, JOB.RUNNING]);
          commit('update', [guid, 'progress', progress]);
        }
      },
      success => {
        commit('update', [guid, jobStatusPath, success ? JOB.DONE : JOB.FAILED]);
        const name = state.entities[guid].material.name;
        const jobText = jobType == 'export' ? '生成抠像素材' : '智能抠像';
        Vue.notify({
          group: 'top',
          type: success ? 'success' : 'error',
          text: success ? `${name} ${jobText}完成` : `${name} ${jobText}失败`,
          duration: -1,
        });
        if (jobType == 'roto') {
          dispatch('reload', guid);
        }
      },
      reset
    );
  },
  checkProgress ({ state, dispatch }, id = false) {
    let entity;
    for (let guid in state.entities) {
      entity = state.entities[guid];
      if (id !== false && entity.id != id) continue;
      for (let job in entity.jobStatus) {
        if ([JOB.QUEUE, JOB.RUNNING].has(entity.jobStatus[job])) {
          dispatch('jobProgress', [guid, job, false]);
        }
      }
    }
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