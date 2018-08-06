// app 当前加载的素材，方便日后前端解帧的情况可以重用帧数据

import { data } from '@/utils/api'
import { make } from 'vuex-pathify'

import listStoreMaker from '@/utils/listStoreMaker'
import Material from '@/entities/Material'
import { getVideoFrames } from '@/utils/video'

const listStore = listStoreMaker(Material);


const state = listStore.state;

const getters = {
  ...make.getters(state),
  ...listStore.getters,
}

const mutations = {
  ...make.mutations(state),
  ...listStore.mutations,
  decodeFrame (state, [ id, frameUrl ]) {
    state.entities[id].frames.push(frameUrl);
  },
}

const actions = {
  ...listStore.actions,
  decode ({ state, commit }, [id, fps]) {
    let mat = state.entities[id];
    if (!mat || mat.type != 'video') return;
    const task = `decode(${mat.id})`;
    // 优先用纯视频
    return data.get(mat.videoUrl || mat.url, {responseType: 'blob'})
      .then(videoBlob => {
        window.console.log(`start ${task}`);
        window.console.time(task);
        return getVideoFrames(videoBlob.data,
          mat.properties.start_time,
          fps || mat.properties.fps,
          mat.properties.length,
          frameUrl => {
            commit('decodeFrame', [id, frameUrl]);
          });
      })
      .then(() => {
        window.console.timeEnd(task);
        commit('update', [id, 'decoded', true]);
      });
  },
}

// export store
export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
}