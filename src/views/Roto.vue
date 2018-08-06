<template>
  <div class="roto">
    <DashboardMenu />
    <div class="wrapper">
      <div class="sidebar">
        <ul class="list">
          <li class="list-item" @click="toMaterialList">
            添加素材
          </li>
          <li class="list-item" v-for="(roto, guid) of entities" :key="guid"
            :class="{ active: currentId === guid }" @click="currentId = guid">
            <span class="name"><i v-if="roto.modified">* </i>{{ roto.material.name }}</span>
            <button class="close" @click="$cfmWhen(roto.modified, '抠像尚未保存，确定关闭?', () => remove(guid))">关闭</button>
          </li>
        </ul>
      </div>
      <div class="workbench">
        <button v-show="!current" @click="toMaterialList">添加素材</button>
        <div class="stage" v-if="current">
          <div class="canvas">
            <video ref="video" :src="current.material.url" crossorigin="use-credentials"
              @durationchange="onFrameChange" @timeupdate="onTimeUpdate" muted></video>
          </div>
          <div class="stage-tool">
            <button :disabled="current.saving || (!current.modified && current.id)" @click="save(current._guid)">保存</button>
            <button @click="modify([current._guid])">修改测试</button>
          </div>
        </div>
        <div class="timeline" v-if="current">
          <FrameControl :max="current.material.maxFrame" v-model.number="currentFrame" @input="onFrameChange">
            <button @click="play">{{ playButton }}</button>
          </FrameControl>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { get, sync, call } from 'vuex-pathify'
import { currentSync } from '@/utils/computedHelper'

import DashboardMenu from '@/components/DashboardMenu.vue'
import FrameControl from '@/components/base/FrameControl.vue'

export default {
  name: 'Roto',
  components: {
    DashboardMenu,
    FrameControl,
  },
  data: () => ({
    playing: false,
  }),
  computed: {
    ...get('rotos/*'),
    currentId: sync('rotos/currentId'),
    currentFrame: currentSync('rotos@viewConfig.currentFrame'),
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
    play() {
      const video = this.$refs.video;
      if (this.playing) {
        video.pause();
      } else {
        video.play();
      }
      this.playing = !this.playing;
    },
    // 播放时由 video 时间单向转换到帧
    onTimeUpdate() {
      if (this.playing) {
        this.currentFrame = this.current.material.timeToFrame(this.$refs.video.currentTime);
      }
    },
    // 暂停时由帧单向转换到 video 时间
    onFrameChange() {
      if (!this.playing && this.$refs.video) {
        this.$refs.video.currentTime = this.current.material.frameToTime(this.currentFrame);
      }
    },
  },
  watch: {
    current() {
      this.playing = false;
      // 切换 current 时 video 尚未加载，不能修改时间，必须由 durationchange 事件触发
    },
  },
  beforeRouteLeave (to, from, next) {
    // 导航离开该组件的对应路由时调用
    this.playing = false;
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

    .stage {
      @include flex-row;

      .stage-tool {
        flex: 0 0 30px;
      }
    }
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
    @include text-omit;
  }
  .close {
    flex: 0 0 26px;
  }
}
video {
  max-width: 100%;
  max-height: 100%;
}
</style>
