<template>
  <ul class="list"
    v-infinite-scroll="loadMore" infinite-scroll-disabled="cantLoad" infinite-scroll-distance="10">
    <FileUpload v-show="!$refs.upload || !$refs.upload.active || !$refs.upload.files[0]" 
    ref="upload" class="material" :accept="uploadType"  v-model="uploadFiles" @input="uploadHandler" 
    :post-action="uploadURL" :headers="{Token: user.info.token}">
      <li class="material" :class="{ [types]: true }" :key="'upload'">
        上传{{types}}
      </li>
    </FileUpload>  
    <li class="material" v-show="$refs.upload && $refs.upload.active && $refs.upload.files[0]">
      上传进度：{{$refs.upload&&$refs.upload.files[0]&&$refs.upload.files[0].progress}}
    </li>  
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
        <p class="name" v-tooltip="item.name">{{ item.name }}</p>
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
import VueUploadComponent from 'vue-upload-component';
import { HOST } from '@/config';

export default {
  mixins: [listMixin('/user/getMaterials', '/user/deleteMaterial', Material)],
  name: 'MaterialList',
  props: {
    types: {
      type: String,
      default: 'video',
      required: true,
    },
  },
  data: () => ({
    current: false,
    uploadFiles: [],
    uploadURL: `${HOST}/api/2/user/uploadMaterial`,
  }),
  computed: {
    target: get('useMaterial/target'),
    file: function(params) {
      return this.uploadFiles[0];
    },
    uploadType: function() {
      switch (this.types) {
        case "video":
          return "video/*";
        case "image":
          return "image/*";
        case "audio":
          return "audio/*";
        default:
          return "video/*";
      }
    },
  },
  watch: {
    'file.success': function(value, oldValue) {
      if(value&&!oldValue){
        this.insert(this.file.response.data);
      }
    },
  },
  components: {
    'FileUpload': VueUploadComponent
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
    uploadHandler(value){
      if(this.$refs.upload.active){
        return;
      }
      this.$refs.upload.active = true;
    }
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
