<template>
  <div id="app">
    <div class="nav">
      <router-link to="/" class="home">LIANGZIVFX</router-link>
      <router-link to="/roto" v-if="user.loggedIn">智能抠像</router-link>
      <!-- <router-link to="/vfx" v-if="user.loggedIn">特效制作</router-link>-->
      <!-- <router-link to="/about">联系我们</router-link> -->
      <div class="spacing"></div>
      <router-link to="/dashboard" v-if="user.loggedIn">个人中心</router-link>
      <Authorization v-if="!user.loggedIn"/>
    </div>

    <keep-alive>
      <router-view/>
    </keep-alive>

    <Preview/>
    <v-dialog/>
    <notifications/>
  </div>
</template>

<script>
import { get } from 'vuex-pathify'

import Authorization from '@/components/Authorization.vue'
import Preview from '@/components/base/Preview.vue'

export default {
  name: 'app',
  components: {
    Authorization,
    Preview
  },
  computed: {
    user: get('user'),
  },
  watch: {
    'user.loggedIn': function(val) {
      if (!val && this.$route.meta.needAuth) {
        this.$router.push('/');
      }
    }
  }
}
</script>

<style lang="scss" src="@/assets/global.scss">
</style>

<style scoped lang="scss">
#app {
  @include absolute-mask;
  @include flex-col;
}
.nav {
  flex: 0 0 50px;
  @include flex-row;
  align-items: center;
  background-image: radial-gradient(ellipse farthest-corner at 50% 1450%, #00141a, #010104);

  a {
    padding: 0 20px;
    font-weight: bold;
    color: #fff;
    &.router-link-active {
      @include main-color;
    }
    &.home {
      width: 160px;
      color: rgb(67,124,127);
    }
  }
  .spacing {
    flex: 1;
  }
}
</style>
