<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link> |
      <router-link to="/dashboard" v-if="$store.state.user.loggedIn">Dashboard</router-link>
      <Authorization v-if="!$store.state.user.loggedIn"/>
    </div>

    <keep-alive>
      <router-view/>
    </keep-alive>

    <Preview/>
    <v-dialog/>
    <notifications group="top" />
  </div>
</template>

<script>
import Authorization from '@/components/Authorization.vue'
import Preview from '@/components/base/Preview.vue'

export default {
  name: 'app',
  components: {
    Authorization,
    Preview
  },
}
</script>

<style lang="scss">
#app {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  @include flex-col;

  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
#nav {
  flex: 0 0 10px;
  padding: 10px;
  a {
    font-weight: bold;
    color: #2c3e50;
    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
