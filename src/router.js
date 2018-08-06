import Vue from 'vue'
import Router from 'vue-router'

import Home from './views/Home.vue'
import About from './views/About.vue'
import Dashboard from './views/Dashboard.vue'
import Roto from './views/Roto.vue'

Vue.use(Router)

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
  },
  {
    path: '/about',
    name: 'about',
    component: About
  },
  {
    path: '/dashboard',
    redirect: '/dashboard/rotos',
  },
  {
    path: '/dashboard/:currentTab',
    component: Dashboard,
    props: true,
    meta: {
      needAuth: true,
    },
  },
  {
    path: '/roto',
    name: 'roto',
    component: Roto,
    meta: {
      needAuth: true,
    }
  },
]

const router = new Router({
  mode: 'history',
  routes: routes,
})

router.beforeEach((to, from, next) => {
  if (to.meta.needAuth && !router.app.$store.state.user.loggedIn) {
    next('/');
  } else {
    next();
  }
})

// 添加素材时跳转到其它路由的话则取消素材目标(包括选中素材自动跳转和未选中手动跳转)
const materialPathRe = /^\/dashboard\/(videos|images|audios)/;
router.afterEach((to, from) => {
  const store = router.app.$store;
  if (store.state.useMaterial.target && from.path.match(materialPathRe) && !to.path.match(materialPathRe)) {
    store.dispatch('useMaterial/clear');
  }
})

export default router