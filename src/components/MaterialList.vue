<template>
  <ul class="list"
    v-infinite-scroll="loadMore" infinite-scroll-disabled="cantLoad" infinite-scroll-distance="10">
    <li class="material">
      <FileUpload :multiple="true" :thread="9" :maximum="9" ref="upload" class="upload" :accept="uploadType" 
      v-model="uploadFiles" @input-file="inputFile"
      :post-action="uploadURL" :headers="{Token: user.info.token}">
      </FileUpload>  
    </li>
    <li class="material" v-for="file of uploadFiles" :key="file.id">
      <div class="thumb upload-progress-container">
        <ProgressBar class="upload-progress" size="small" max="100" :val="file.progress" :bar-color="file.progress | progressBarColor"></ProgressBar>{{Math.round(file.progress)}}%
      </div>
      <div class="info">
        正在上传。。。
      </div>
    </li>
    <li class="material" :class="{ [types]: true }" v-for="item of list" :key="item.id">
      <button class="select" @click="select(item)" v-if="target"></button>
      <div class="thumb" v-if="item.type != 'audio'">
        <img :src="item.thumbUrl">
      </div>
      <div class="operation">
        <i class="icon icon-preview" @click="$modal.show('preview', item)">预览</i>
        <i class="icon icon-delete" @click="$cfm(`确定删除素材 ${item.name} ?`, () => remove(item))">删除</i>
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
import ProgressBar from 'vue-simple-progress'
import VueUploadComponent from 'vue-upload-component';
import { get } from 'vuex-pathify'

import listMixin from '@/utils/listMixin'
import Material from '@/entities/Material'
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
  filters: {
    progressBarColor (progress) {
        return progress < 100 ? "#2196f3" : "#52c41a";
    }
  },
  components: {
    'FileUpload': VueUploadComponent,
    ProgressBar
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
    inputFile(newFile, oldFile) {
      if (newFile && oldFile) {

        // 上传错误
        if (newFile.error !== oldFile.error) {
          console.log('error', newFile.error, newFile)
        }

        // 上传成功
        if (newFile.success !== oldFile.success) {
          this.$refs.upload.remove(newFile);
          this.insert(newFile.response.data);
        }

      }

      // 自动上传
      if (Boolean(newFile) !== Boolean(oldFile) || oldFile.error !== newFile.error) {
        if (!this.$refs.upload.active) {
          this.$refs.upload.active = true
        }
      }
    },
  },
}
</script>

<style scoped lang="scss">
ul {
  @include puregrid(147px, 15px);
  overflow-y: auto;
}
li.material{
  @include dashboard-item;
  .upload{
    height: 100%;
    width: 100%;
    cursor: pointer;
    background: url("../assets/image/upload-material.png");
  }
  .upload-progress-container{
    padding-right: 3px;
    .upload-progress{
      margin-left: 5px;
      margin-right: 5px;
    }
  }
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
