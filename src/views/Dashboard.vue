<template>
  <div class="dashboard" v-show="user.loggedIn">
    <div class="sidebar">
      <div class="profile" v-show="!target">
        <span class="phone">{{ user.info.phone }}</span>
      </div>
      <ul class="menu">
        <li class="menu-item main" v-show="target" @click="$router.push(target)">&lt; 返回制作</li>
        <li class="menu-item" v-for="(title, tab) of tabs" :key="tab" v-show="!target || filter.has(tab)"
          :class="{ active: tab == currentTab }" @click="$router.push(`/dashboard/${tab}`)">
          {{ title }}
          <img v-show="tab == currentTab" class="hover-tip" src="../assets/image/refresh.png" @click="clickTab(tab)"/>
        </li>
      </ul>
      <div class="menu-item logout main" @click="logout" v-show="!target">退出登录</div>
    </div>
    <div class="panel">
      <!-- <WorkList v-show="currentTab == 'works'" /> -->
      <RotoList ref="rotos" v-show="currentTab == 'rotos'" />
      <MaterialList ref="videos" :types="'video'" v-show="currentTab == 'videos'" />
      <MaterialList ref="images" :types="'image'" v-show="currentTab == 'images'" />
      <MaterialList ref="audios" :types="'audio'" v-show="currentTab == 'audios'" />
    </div>
  </div>
</template>

<script>
import { get } from 'vuex-pathify'

import MaterialList from '@/components/MaterialList.vue'
import RotoList from '@/components/RotoList.vue'

export default {
  name: 'dashboard',
  components: {
    MaterialList,
    RotoList,
  },
  props: {
    currentTab: {
      type: String,
      default: 'rotos',
    }
  },
  data: () => ({
    tabs: {
      // "works": "我的作品",
      "rotos": "我的抠像",
      "videos": "我的视频",
      "images": "我的图片",
      "audios": "我的音频",
    },
  }),
  computed: {
    ...get('useMaterial/*'),
    user: get('user'),
  },
  methods: {
    logout() {
      this.$router.push('/');
      this.$store.dispatch('logout');
    },
    clickTab(tab) {
      this.$refs[tab].reset();
    },
  },
}
</script>

<style scoped lang="scss">
.dashboard {
  @include flex-row;

  .sidebar {
    flex: 0 0 160px;
    @include flex-col;
    @include sidebar;

    .profile {
      flex: 0 0 200px;
      padding: 10px;
      @include desc-color;
    }
  }

  .panel {
    @include flex-col;
    height: 100%;
    background-color: #031016;
    font-size: 12px;
    color: #fff;
  }
}
.menu {
  @include flex-col;
  flex: 1;
}
.menu-item {
  @include sidebar-item;

  &.main {
    @include main-color;
  }
  position: relative;
  .hover-tip{
    display: none;
    position: absolute;
    right: 10px;
    top: 12px;
    height: 20px;
    width: 20px;
    padding: 2px;
    &:hover{
      background-color: #fff;
    }
  }
}
.logout {
  flex: 0 0 40px;
  @include button-gradient;
}
</style>