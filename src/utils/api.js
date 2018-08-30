import Vue from 'vue'

import axios from 'axios'
import { HOST } from '@/config'

const beacon = data => {
  // 统一格式
  if (typeof data == "string") {
    data = { message: data };
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'text/plain; charset=UTF-8' });
  navigator.sendBeacon(HOST + '/logFrontend', blob);
}


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
    const resp = error.response;
    if (!originalRequest._silent) {
      Vue.notify({
        group: 'top',
        type: 'error',
        title: 'API error',
        text: resp ? resp.data.errorMessage : error.message,
        duration: 10000,
      })
      if (resp && resp.status >= 500) {
        beacon(resp.data.errorMessage);
      }
    }
    return Promise.reject(error);
  });

const data = axios.create({
  baseURL: `${HOST}/data/`,
  timeout: 120000,
  responseType: 'blob',
});

export { axios, api, data, beacon }