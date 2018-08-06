import { make } from 'vuex-pathify'

const state = {
  target: false,
  filter: [],
}

const getters = make.getters(state)

const mutations = make.mutations(state)

const actions = {
  set({ commit }, [route, filter]) {
    commit('target', route);
    commit('filter', filter);
  },
  clear({ commit }) {
    commit('target', false);
    commit('filter', []);
  },
}

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
}