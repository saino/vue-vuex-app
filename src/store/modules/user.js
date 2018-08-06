import { make } from 'vuex-pathify'
import { api } from '@/utils/api'

const setToken = token => {
  api.defaults.headers.common['token'] = token;
  // data 请求和 src 一样靠 cookie，无需设置 header
}

const state = {
  loggedIn: false,
  info: {
    phone: '',
    avatar: '',
  }
}

const getters = make.getters(state)

const mutations = {
  ...make.mutations(state),
  login (state, data) {
    if (data) {
      state.loggedIn = true;
      state.info = data;
      setToken(data.token);
    }
  },
  logout (state) {
    state.loggedIn = false;
    state.info = {};
    setToken('');
  },
  updateToken (state, token) {
    state.info.token = token;
    setToken(token);
  },
}

const actions = {
  checkLogin ({ state, commit, dispatch }) {
    if (state.loggedIn) {
      // 验证通过前不算已登录
      commit('loggedIn', false);
      api.post('/user/refreshToken', {}, {
        // checkLogin 执行前尚未设置全局 token
        headers: {
          token: state.info.token
        },
        _silent: true
      }).then(token => {
        commit('updateToken', token);
        commit('loggedIn', true);
      }).catch(resp => {
        dispatch('logout');
      })
    }
  },
  login ({ commit }, form) {
    return api.post('/auth/login', form)
      .then(resp => {
        commit('login', resp);
      });
  },
  register ({ commit }, form) {
    return api.post('/auth/register', form)
      .then(resp => {
        commit('login', resp);
      });
  },
  loginTest ({ commit }, form) {
    commit('login', form);
  },
  logout ({ commit, dispatch }) {
    commit('logout');
    dispatch('rotos/clear', {}, {root: true});
  },
}

export default {
  // namespaced: true,
  state,
  getters,
  actions,
  mutations
}