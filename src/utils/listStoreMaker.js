import Vue from 'vue'

export default function(
    entityExtender = undefined,
    idField = 'id',
    idsState = 'ids',
    entitiesState = 'entities',
    currentIdState = 'currentId'
){
  const state = {
    [idsState]: [],
    [entitiesState]: {},
    [currentIdState]: false,
  }


  const getters = {
    list(state){
      return state[idsState].map(id => state[entitiesState][id]);
    },
    current(state) {
      return state[currentIdState] !== false ? state[entitiesState][state[currentIdState]] : false;
    }
  }


  const mutations = {
    add (state, data) {
      const entity = entityExtender ? entityExtender(data) : data;
      Vue.set(state[entitiesState], entity[idField], entity);
      state[idsState].push(entity[idField]);
      state[currentIdState] = entity[idField];
    },
    insert (state, [ data, index ]) {
      const entity = entityExtender ? entityExtender(data) : data;
      Vue.set(state[entitiesState], entity[idField], entity);
      state[idsState].splice(index || 0, 0, entity[idField]);
      state[currentIdState] = entity[idField];
    },
    remove (state, id) {
      const index = state[idsState].indexOf(id);
      if (index !== -1) {
        state[idsState].splice(index, 1);
      }
      if (state[currentIdState] === id) {
        state[currentIdState] = false;
      }
      Vue.delete(state[entitiesState], id);
    },
    // 直接改 element，并不限定在当前 state 内，慎用
    set (state, [ element, pathOrDict, value ]) {
      element.batchSet(pathOrDict, value);
    },
    update (state, [ id, pathOrDict, value ]) {
      state[entitiesState][id].batchSet(pathOrDict, value);
    },
    pathUpdate (state, [ keyPath, value ]) {
      state.pathSet(keyPath, value);
    },
    reExtend (state) {
      if (!entityExtender) return;
      for (let id in state[entitiesState]) {
        Vue.set(state[entitiesState], id, entityExtender(state[entitiesState][id]));
      }
    }
  }


  const actions = {
    add ({ commit }, data) {
      commit('add', data);
    },
    insert ({ commit }, [ data, index ]) {
      commit('insert', [ data, index ]);
    },
    remove ({ commit }, id) {
      commit('remove', id);
    },
    clear ({ commit }) {
      commit(idsState, []);
      commit(currentIdState, false);
    },
    select ({ commit }, id) {
      commit(currentIdState, id);
    },
    update ({ commit }, [ id, pathOrDict, value ]) {
      commit('update', [ id, pathOrDict, value ]);
    },
    pathUpdate ({ commit }, [ keyPath, value ]) {
      commit('pathUpdate', [ keyPath, value ]);
    },
    reExtend ({ commit }) {
      commit('reExtend');
    }
  }

  return {
    state,
    getters,
    mutations,
    actions,
  }
}