import Vue from 'vue'
import { api, beacon } from '@/utils/api'
import { make } from 'vuex-pathify'

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
      text: `${name} 正在加载智能抠像结果...`,
      duration: 1500,
    });
    api.post('/roto/loadRoto', {id})
      .then(resp => {
        beacon(`Loaded ${Object.keys(resp.masks).length} masks from Roto ${id}`);
        commit('update', [guid, 'masks', resp.masks]);
      })
      .catch(() => {
        Vue.notify({
          type: 'error',
          text: `${name} 加载智能抠像结果失败，请关闭重新打开`,
          duration: -1,
        });
        beacon(`Failed to load Roto ${id}`);
      });
  },
  checkModified({ state, commit }, guid) {
    const entity = state.entities[guid];
    commit('update', [guid, 'modified', Boolean(entity.manualUnsavedMasks)]);
  },
  save ({ state, commit }, guid) {
    commit('update', [guid, 'saving', true]);
    const entity = state.entities[guid];
    let data = entity.pickKeys(['id', 'material_id']);
    // 自动保存所有尚未保存的人工 mask
    data['masks'] = entity.manualUnsavedMasks;
    return api.post('/roto/saveRoto', data)
      .then(resp => {
        Vue.notify({ text: '抠像已保存' });
        for (let frame of entity.manualFrames) {
          commit('update', [guid, `masks.${frame}.saved`, true]);
        }
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
  saveMask ({ state, commit, dispatch }, [guid, frame, maskData]) {
    const maskSavedPath = `masks.${frame}.saved`;
    commit('update', [guid, 'saving', true]);
    // 仅在修改图像时保证存储状态，删除图像失败的情况暂时靠刷新解决
    if (maskData.url) {
      commit('update', [guid, maskSavedPath, false]);
    }
    return api.post('/roto/saveMask', {
        id: state.entities[guid].id,
        frame: frame,
        mask: maskData,
      })
      .then(() => {
        if (maskData.url) {
          commit('update', [guid, maskSavedPath, true]);
        }
        dispatch('checkModified', guid);
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