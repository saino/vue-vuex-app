<template>
  <div class="roto">
    <DashboardMenu />
    <div class="wrapper">
      <div class="sidebar">
        <ul class="list">
          <li class="list-item" @click="toMaterialList">
            添加素材
          </li>
          <li class="list-item"
            v-for="(roto, guid) of entities" :key="guid"
            :class="{ active: currentId === guid }"
            @click="currentId = guid">
            <span class="name" :title="roto.material.name">
              <i v-if="roto.modified">* </i>{{ roto.material.name }}
            </span>
            <button class="close" @click.stop="$cfmWhen(roto.modified, '抠像尚未保存，确定关闭?', () => remove(guid))">关闭</button>
          </li>
        </ul>
      </div>
      <div class="workbench">
        <button v-show="!current" @click="toMaterialList">添加素材</button>
        <Stage v-if="current" ref="stage"
          :guid="current._guid" :frame="currentFrame"
          :size="current.material.properties"
          :zoomSync.sync="zoom"
          :panSync.sync="pan"
          :imageData="current.masks[currentFrame]"
          :readonly="playing || $wait.is('grabcut')"
          @canvasChange="modifyMask"
        >
          <video slot="background" ref="video"
            :src="current.material.url" crossorigin="use-credentials" muted
            :style="{ transform: currentTransform }"
            @durationchange="updateVideoTime"></video>
          <template slot="tools">
            <button :disabled="current.saving || (!current.modified && current.id)"
              @click.prevent="save(current._guid)">保存</button>
          </template>
          <template slot="drawtools">
            <button :disabled="$wait.is('grabcut') || !current.masks[currentFrame]"
              @click.prevent="grabcut">Grab Cut</button>
          </template>
        </Stage>
        <div class="timeline" v-if="current">
          <FrameControl :max="current.material.maxFrame" :readonly="$wait.is('grabcut')" v-model.number="currentFrame">
            <button :disabled="$wait.is('grabcut')" @click.prevent="play">{{ playButton }}</button>
          </FrameControl>
          <div class="manual-frames">
            <span v-for="frame in current.manualFrames" :key="frame">{{ frame }}
              <img :src="current.material.frameThumb(frame)" crossorigin="use-credentials"
                @click="!$wait.is('grabcut') ? currentFrame = Number(frame) : 0">
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { get, sync, call } from 'vuex-pathify'
import { currentSync } from '@/utils/computedHelper'
import { api } from '@/utils/api'

import DashboardMenu from '@/components/DashboardMenu.vue'
import FrameControl from '@/components/base/FrameControl.vue'
import Stage from '@/components/base/Stage.vue'

export default {
  name: 'Roto',
  components: {
    DashboardMenu,
    FrameControl,
    Stage,
  },
  data: () => ({
    playing: false,
    timer: false,
  }),
  computed: {
    ...get('rotos/*'),
    currentId: sync('rotos/currentId'),
    currentFrame: currentSync('rotos@viewConfig.currentFrame'),
    zoom: currentSync('rotos@viewConfig.zoom'),
    pan: currentSync('rotos@viewConfig.pan'),
    currentTransform() {
      return `scale(${this.zoom}) translate(${this.pan.x}px, ${this.pan.y}px)`;
    },
    playButton() {
      return this.playing ? 'Stop' : 'Play';
    },
  },
  methods: {
    ...call('rotos/*'),
    toMaterialList() {
      this.$store.dispatch('useMaterial/set', ['/roto', ['videos']]);
      this.$router.push('/dashboard/videos');
    },
    modifyMask(data) {
      if (data.url) {
        data.manual = true;
        this.update([this.currentId, 'masks.' + this.currentFrame, data]);
      } else {
        this.delete([this.currentId, 'masks.' + this.currentFrame]);
      }
      this.$forceUpdate();  // current.masks 需要 deep watch 才能响应，索性直接更新了
      // 已保存的抠像自动更新 mask
      if (this.current.id) {
        this.saveMask([this.current._guid, this.currentFrame, data]);
      }
    },
    grabcut() {
      const imageUrl = this.$refs.stage.getImg();
      // TODO: 检测必须同时有黑白像素
      if (!imageUrl) {
        return this.$notify({
          group: 'top',
          text: '请先标注图像前景和背景',
        });
      }
      this.$wait.start('grabcut');
      api.post('/roto/grabcut', {
          material_id: this.current.material_id,
          frame: this.currentFrame,
          mask_url: imageUrl
        }).then(imgUrl => {
          this.$refs.stage.overlay(imgUrl);
        }).finally(() => {
          this.$wait.end('grabcut');
        });
    },
    resetPreview() {
      this.playing = false;
      window.clearInterval(this.timer);
      this.timer = false;
    },
    play() {
      if (this.playing) {
        this.resetPreview();
      } else {
        this.playing = true;
        this.timer = window.setInterval(() => {
          if (this.currentFrame >= this.current.material.maxFrame) {
            this.resetPreview();
            return;
          }
          ++ this.currentFrame;
        }, 1000 / this.current.material.properties.fps);
      }
    },
    updateVideoTime() {
      if (this.$refs.video) {
        this.$refs.video.currentTime = this.current.material.frameToTime(this.currentFrame);
      }
    }
  },
  watch: {
    current() {
      this.resetPreview();
    },
    // video 时间永远由 currentTime 决定，不允许自动播放
    currentFrame() {
      this.updateVideoTime();
    },
  },
  beforeRouteLeave (to, from, next) {
    // 导航离开该组件的对应路由时调用
    this.resetPreview();
    next();
  },
}
</script>

<style scoped lang="scss">
.roto {
  @include flex-col;
}
.wrapper {
  @include flex-row;

  .sidebar {
    flex: 0 0 160px;
    @include sidebar;
  }
  .workbench {
    @include flex-col;

    .timeline {
      flex: 0 0 100px;
    }
  }
}
.list {
  @include flex-col;
}
.list-item {
  @include sidebar-item;
  @include flex-row;
  justify-content: center;

  .name {
    flex: 1;
    word-break: break-all;  // keep width
    @include text-omit;
  }
  .close {
    flex: 0 0 26px;
  }
}
</style>
