<template>
  <ul class="list"
    v-infinite-scroll="loadMore" infinite-scroll-disabled="cantLoad" infinite-scroll-distance="10">
    <li class="material" :class="{ [types]: true }" v-for="(item, index) of list" :key="item.id">
      <button class="select" @click="select(item)" v-if="target"></button>
      <div class="thumb" v-if="item.type != 'audio'">
        <img :src="item.thumbUrl">
      </div>
      <div class="operation">
        <i class="icon icon-preview" @click="$modal.show('preview', item)">预览</i>
        <i class="icon icon-delete" @click="$cfm(`确定删除素材 ${item.name} ?`, () => remove(index))">删除</i>
      </div>
      <div class="info">
        <p class="name">{{ item.name }}</p>
        <p class="detail">
          <span>{{ item.properties.format }}</span>
          <span>{{ item.formattedSize }}</span>
          <span>{{ item.type == 'image' ? `${item.properties.width}x${item.properties.height}` : item.formattedDuration }}</span>
        </p>
      </div>
    </li>
  </ul>
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
  @include puregrid(147px, 15px);
  overflow-y: auto;
}
li.material {
  @include dashboard-item;

  &.audio {
    height: 70px;

    .operation {
      top: 50px;
    }
  }
  &:hover .select {
    display: block;
  }
  .select {
    display: none;
    @include absolute-mask;
    background-color: transparent;
    border: none;
  }

  .detail {
    display: table;
    border-spacing: 5px 0;
    width: 100%;
    span {
      display: table-cell;
    }
  }
}
</style>
