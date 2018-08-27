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
        // auto select previous or next
        state[currentIdState] = index > 0 ? state[idsState][index - 1] : (state[idsState][index] || false);
      }
      Vue.delete(state[entitiesState], id);
    },
    update (state, [ id, pathOrDict, value ]) {
      state[entitiesState][id].batchSet(pathOrDict, value);
    },
    delete (state, [ id, keyPath ]) {
      state[entitiesState][id].pathDel(keyPath);
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
    // base on vue-pathify simple mutations
    clear ({ commit }) {
      commit(idsState, []);
      commit(entitiesState, {});
      commit(currentIdState, false);
    },
    select ({ commit }, id) {
      commit(currentIdState, id);
    },
    update ({ commit }, [ id, pathOrDict, value ]) {
      commit('update', [ id, pathOrDict, value ]);
    },
    delete ({ commit }, [ id, keyPath ]) {
      commit('delete', [ id, keyPath ]);
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