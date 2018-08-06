<template>
  <div class="dashboard_menu">
    <router-link to="/roto">智能抠像</router-link> |
    <!-- <router-link to="/vfx">特效制作</router-link> | -->
    <router-link to="/dashboard">个人中心</router-link>
  </div>
</template>

<script>
export default {
  name: 'DashboardMenu',
}
</script>

<style scoped lang="scss">
.dashboard_menu {
  flex: 0 0 30px;
}
</style>
