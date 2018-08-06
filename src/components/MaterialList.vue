<template>
  <div class="list"
    v-infinite-scroll="loadMore" infinite-scroll-disabled="cantLoad" infinite-scroll-distance="10">
    <ul>
      <li class="material" v-for="(item, index) of list" :key="item.id">
        <div class="thumb" v-if="item.type != 'audio'">
          <img :src="item.thumbUrl">
        </div>
        <div v-if="item.type == 'audio'">
          <audio :src="item.url" controls></audio>
        </div>
        <div class="operation">
          <i class="icon icon-preview" v-if="item.type != 'audio'" @click="$modal.show('preview', item)">预览</i>
          <i class="icon icon-delete" @click="$cfm(`确定删除素材 ${item.name} ?`, () => remove(index))">删除</i>
          <i class="icon icon-select" @click="select(item)" v-if="target">选择</i>
        </div>
        <div class="info">
          <span class="name">{{ item.name }}</span>&nbsp;
          <span class="duration">{{ item.formattedDuration }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import { get } from 'vuex-pathify'
import listMixin from '@/utils/listMixin'
import Material from '@/entities/Material'

export default {
  mixins: [listMixin('/user/getMaterials', '/user/deleteMaterial', Material)],
  name: 'MaterialList',
  props: {
    types: {
      type: String,
      default: 'video',
      required: true,
    }
  },
  data: () => ({
    current: false
  }),
  computed: {
    target: get('useMaterial/target'),
  },
  methods: {
    select(material) {
      // 使用目标和 store 的对应关系
      const targetStoreMap = {
        '/roto': 'rotos',
        '/vfx': 'vfx',
      }
      // this.$store.dispatch('materials/add', material);
      const targetAction = `${targetStoreMap[this.target]}/addMaterial`;  // 要求对应 store 必须有 addMaterial 方法
      this.$store.dispatch(targetAction, material);
      this.$router.push(this.target); // useMaterial 会在 router 全局钩子里自动重置
    },
  },
}
</script>

<style scoped lang="scss">
ul {
  @include puregrid;
}
li.material {
  @include dashboard-item;
}
.icon {
  border: 1px solid #fff;
  color: #fff;
  padding: 5px;
  cursor: pointer;
}
</style>
