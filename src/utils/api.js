import Vue from 'vue'

import axios from 'axios'
import { HOST } from '@/config'

// https://github.com/axios/axios/issues/587
axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: `${HOST}/api/2/`,
  timeout: 10000,
});
api.defaults.headers.post['Content-Type'] = 'application/json';
api.interceptors.response.use(function (response) {
    return response.data.data;  // 后端结构统一用 data 字段
  }, function (error) {
    const originalRequest = error.config;
    if (!originalRequest._silent) {
      Vue.notify({
        group: 'top',
        type: 'error',
        title: 'API error',
        text: error.response.data.errorMessage,
        duration: 10000,
      })
    }
    return Promise.reject(error.response);
  });

const data = axios.create({
  baseURL: `${HOST}/data/`,
  timeout: 120000,
  responseType: 'blob',
});

export { axios, api, data }