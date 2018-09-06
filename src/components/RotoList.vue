<template>
  <ul class="list"
    v-infinite-scroll="loadMore" infinite-scroll-disabled="cantLoad" infinite-scroll-distance="10">
    <li class="roto" v-for="(item, index) of list" :key="item.id">
      <div class="thumb">
        <img :src="item.material.thumbUrl">
      </div>
      <div class="operation">
        <i class="icon icon-select" @click="load(item)">编辑</i>
        <i class="icon icon-delete" @click="$cfm(`确定删除抠像 ${item.material.name} ?`, () => remove(index))">删除</i>
      </div>
      <div class="info">
        <p class="name" v-tooltip="item.material.name">{{ item.material.name }}</p>
        <p class="detail">{{ item.material.formattedDuration }}</p>
      </div>
    </li>
  </ul>
</template>

<script>
import listMixin from '@/utils/listMixin'
import Roto from '@/entities/Roto'

export default {
  mixins: [listMixin('/user/getRotos', '/roto/deleteRoto', Roto)],
  name: 'RotoList',
  methods: {
    load(roto) {
      this.$store.dispatch('rotos/load', roto.id);
      this.$router.push('/roto');
      this.$notify({
        text: `抠像 ${roto.material.name} 读取中`,
        duration: 2000,
      });
    },
  },
}
</script>

<style scoped lang="scss">
ul {
  @include puregrid(147px, 15px);
  overflow-y: auto;
}
li.roto {
  @include dashboard-item;
}

</style>
