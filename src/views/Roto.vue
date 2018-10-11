<template>
  <div class="roto">
    <div class="sidebar">
      <ul class="list">
        <li class="list-item add-material" @click="toMaterialList">
          添加素材
        </li>
        <li class="list-item"
          v-for="(roto, guid) of entities" :key="guid"
          :class="{ active: currentId === guid }"
          @click="currentId = guid">
          <span class="name" v-tooltip="roto.material.name">
            <i v-if="roto.modified">* </i>{{ roto.material.name }}
          </span>
          <button class="close" @click.stop="$cfmWhen(roto.modified, '抠像尚未保存，确定关闭?', () => remove(guid))">关闭</button>
        </li>
      </ul>
    </div>

    <button class="operation-button center" v-show="!current" @click="toMaterialList">添加抠像素材</button>

    <div class="workbench" v-if="current">
      <Stage ref="stage"
        :guid="current._guid" :frame="currentFrame"
        :size="current.material.properties"
        :zoomSync.sync="zoom"
        :panSync.sync="pan"
        :imageData="current.masks[currentFrame]"
        :readonly="readonly"
        @canvasChange="modifyMask"
      >
        <video slot="background" ref="video"
          :src="current.material.videoUrl" crossorigin="use-credentials" muted
          :style="{ transform: currentTransform }"
          @durationchange="updateVideoTime"></video>
        <template slot="tools">
          <button :disabled="current.saving || (!current.modified && current.id)"
            @click.prevent="save(current._guid)">保存</button>
        </template>
        <template slot="drawtools">
          <button :disabled="readonly || !current.masks[currentFrame]"
            @click.prevent="grabcut">Grab Cut</button>
          <button :disabled="readonly"
            @click.prevent="fillHole">Fill Hole</button>
        </template>
      </Stage>
      <div class="timeline">
        <FrameControl :max="current.material.maxFrame" :readonly="lockframe" v-model.number="currentFrame" :zoomOut="zoomOut" :zoomIn="zoomIn" 
        :maxZoomRatio="maxZoomRatio" :zoomRatio="zoomRatio">
          <button :disabled="lockframe" @click.prevent="play">{{ playButton }}</button>
        </FrameControl>
        <TimeLine ref="timeline" v-model.number="currentFrame" :zoomRatio="zoomRatio" :resetMaxZoomRotio="resetMaxZoomRotio"></TimeLine>
      </div>
    </div>

    <div class="operation" v-if="current">
      <modal name="ai-debug"
        :min-width="200" :min-height="200" :pivot-y="0.5"
        :adaptive="true" :reset="true" height="auto">
        <table class="ai-debug">
          <tr>
            <th>Max Training Iters</th>
            <td><input type="number" v-model.number="ai.max_training_iters" min="1" max="1000"></td>
          </tr>
          <tr>
            <th>Learning Rate</th>
            <td><input type="text" v-model="ai.learning_rate"></td>
          </tr>
          <tr>
            <th>Supervision</th>
            <td>
              <label><input type="radio" value="1" v-model="ai.supervision">Strong</label>&nbsp;
              <label><input type="radio" value="2" v-model="ai.supervision">Weak</label>&nbsp;
              <label><input type="radio" value="3" v-model="ai.supervision">No supervision</label>
            </td>
          </tr>
          <tr>
            <th>Memory Limit (0~1)</th>
            <td><input type="text" v-model="ai.memory_limit"><label> 0 means no limit</label></td>
          </tr>
          <tr v-if="current.jobStatus.roto == $JOB.DONE">
            <td colspan="2">
              <a :href="current.lossesPath" target="_blank">View latest losses</a>
            </td>
          </tr>
        </table>
      </modal>
      <button class="operation-button" @click.prevent="aiRoto"
        @contextmenu.prevent="$modal.show('ai-debug')"
        :disabled="lockframe || current.saving || [$JOB.QUEUE, $JOB.RUNNING].has(current.jobStatus.roto)">开始云端智能抠像</button>
      <JobProgress :jobStatus="current.jobStatus.roto" :jobName="'智能抠像'" :progress="current.progress" />

      <div class="frame-container">
        <label class="label">已抠像的关键帧序列</label>
        <ul class="manual-frames">
          <li v-for="frame in current.manualFrames" :key="frame"
            class="frame-thumb" :class="{ active: currentFrame == frame }"
            @click="!lockframe ? currentFrame = Number(frame) : 0">
            <img :src="current.material.frameThumb(frame)" crossorigin="use-credentials">
            <span class="frame-hover">{{ frame }}</span>
          </li>
        </ul>
      </div>

      <div class="export-operations" v-show="current.id && current.jobStatus.roto == $JOB.DONE">
        <button class="operation-button" @click.prevent="exportMaterial"
          :disabled="lockframe || current.saving || [$JOB.QUEUE, $JOB.RUNNING].has(current.jobStatus.export)">开始生成抠像素材</button>
        <JobProgress :jobStatus="current.jobStatus.export" :jobName="'生成抠像素材'" :progress="current.progress" />
        <div v-show="current.jobStatus.export == $JOB.DONE">
          <a class="operation-button download" :href="current.exportWebm" target="_blank">下载抠像素材</a>
          <a class="operation-button download" :href="current.exportPng" target="_blank">下载PNG序列帧</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { get, sync, call } from 'vuex-pathify'
import { currentSync } from '@/utils/computedHelper'
import { api, data } from '@/utils/api'
import JobStatus from '@/utils/jobConst'

import FrameControl from '@/components/base/FrameControl.vue'
import Stage from '@/components/base/Stage.vue'
import JobProgress from '@/components/base/JobProgress.vue'
import TimeLine from '@/components/base/TimeLine.vue'

export default {
  name: 'Roto',
  components: {
    FrameControl,
    Stage,
    JobProgress,
    TimeLine,
  },
  data: () => ({
    playing: false,
    timer: false,
    zoomRatio: 1,
    maxZoomRatio: 0,
    ai: {
      max_training_iters: 500,
      learning_rate: 1e-8,
      supervision: 3,
      memory_limit: 0,
    },
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
    readonly() {
      const jobRunning = [this.$JOB.QUEUE, this.$JOB.RUNNING];
      return this.playing || this.$wait.is('grabcut') || (this.current &&
        (jobRunning.has(this.current.jobStatus.roto) || jobRunning.has(this.current.jobStatus.export)));
    },
    lockframe() {
      return this.$wait.is('grabcut');
    },
  },
  methods: {
    ...call('rotos/*'),
    toMaterialList() {
      this.$store.dispatch('useMaterial/set', ['/roto', ['videos']]);
      this.$router.push('/dashboard/videos');
    },
    modifyMask(data) {
      data.manual = true;
      if (data.url) {
        this.update([this.currentId, 'masks.' + this.currentFrame, data]);
      } else {
        this.delete([this.currentId, 'masks.' + this.currentFrame]);
        this.loadAiMask();
      }
      this.checkModified(this.currentId);
      this.$forceUpdate();  // current.masks 需要 deep watch 才能响应，索性直接更新了
      this.$refs.timeline.$forceUpdate();
      // 已保存的抠像自动更新人工 mask
      if (this.current.id) {
        this.saveMask([this.currentId, this.currentFrame, data]);
      }
    },
    loadAiMask() {
      if (!this.current.id || this.current.jobStatus.roto != this.$JOB.DONE)
        return;
      data.get(`/rotos/${this.current.id}/output/${String(this.currentFrame).padStart(5, '0')}.png`, { responseType: 'blob' })
        .then(blob => {
          const reader = new FileReader();
          reader.readAsDataURL(blob.data);
          reader.onloadend = () => {
            this.update([this.currentId, 'masks.' + this.currentFrame, {
              url: reader.result,
              manual: false,
            }]);
            this.$refs.stage.overlay(reader.result, false);
          }
        });
    },
    grabcut() {
      const imageUrl = this.$refs.stage.getImg();
      // TODO: 检测必须同时有黑白像素
      if (!imageUrl) {
        return this.$notify({ type: 'warn', text: '请先标注图像前景和背景' });
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
    fillHole() {
      const imageUrl = this.$refs.stage.getImg();
      if (!imageUrl) {
        return this.$notify({ type: 'warn', text: '请先标注图像前景和背景' });
      }
      this.$wait.start('grabcut');
      api.post('/roto/fillHole', {mask_url: imageUrl})
        .then(imgUrl => {
          this.$refs.stage.overlay(imgUrl);
        }).finally(() => {
          this.$wait.end('grabcut');
        });
    },
    aiRoto() {
      if (Object.keys(this.current.manualFrames).length == 0) {
        return this.$notify({ type: 'warn', text: '请至少手工标注一帧图像' });
      }
      const guid = this.currentId;  // 允许任务进行中切换
      const promise = this.current.id ? Promise.resolve(this.current.id) : this.save(guid);
      const aiParams = this.ai;
      promise.then(rotoId => {
        api.post('/roto/aiRoto', { ...aiParams, id: rotoId }).then(() => {
          this.jobProgress([guid, 'roto', true]);
        });
      });
    },
    exportMaterial() {
      const guid = this.currentId;  // 允许任务进行中切换
      const rotoId = this.current.id;
      api.post('/roto/finishRoto', {id: rotoId}).then(() => {
        this.jobProgress([guid, 'export', true]);
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
        // 强制 Stage 重新加载当前帧（不在 Stage 里 watch readonly 的原因是会和 grabcut 导致的 readonly 冲突）
        this.$refs.stage.load();
      } else {
        this.playing = true;
        this.timer = window.setInterval(() => {
          if (this.currentFrame >= this.current.material.maxFrame) {
            this.resetPreview();
            this.$refs.stage.load();
            return;
          }
          ++ this.currentFrame;
        }, 1000 / this.current.material.properties.fps);
      }
    },
    updateVideoTime() {
      if (this.$refs.video && this.current) {
        this.$refs.video.currentTime = this.current.material.frameToTime(this.currentFrame);
      }
    },
    zoomOut() {
      this.zoomRatio *= 0.8;
      this.zoomRatio =  this.zoomRatio < 1 ? 1 : this.zoomRatio;
    },
    zoomIn() {
      this.zoomRatio *= 1.2;
      this.zoomRatio =  this.zoomRatio > this.maxZoomRatio ? this.maxZoomRatio : this.zoomRatio;
    },
    resetMaxZoomRotio() {
      this.zoomRatio = 1;
      const timeline = this.$refs.timeline;
      if(timeline){
        const maxTimeLineWidth = timeline.materialFramesCount*(timeline.thumbWidth+timeline.thumbGap)-timeline.thumbGap;
        this.maxZoomRatio = maxTimeLineWidth/timeline.defaultTimeLineWidth;
      }
    },
  },
  watch: {
    current() {
      this.resetPreview();
      this.resetMaxZoomRotio();
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
  @include flex-row;

  .sidebar {
    flex: 0 0 160px;
    width: 160px;
    @include sidebar;
  }
  .workbench {
    @include flex-col;

    .timeline {
      flex: 0 0 100px;
      background-color: #0e1b20;
      color: #fff;
    }
  }
  .operation {
    flex: 0 0 240px;
    @include flex-col;
    position: relative;
    background-color: #264246;
    z-index: 0; // hack for vue-simple-progress

    .export-operations {
      flex: 0;
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
  &.add-material {
    @include main-color;
    background: rgba(89,154,157,0.40);
  }
}
.operation-button {
  height: 40px;
  width: 100%;
  border: none;
  font-size: 14px;
  @include main-color(true);
  @include button-gradient;

  &.center {
    width: 200px;
    margin: auto;
  }
  &.download {
    display: inline-block;
    width: 50%;
    line-height: 40px;
  }
}
.frame-container {
  overflow-y: auto;
}
.label {
  display: block;
  margin: 18px;
  font-size: 12px;
  @include main-color;
}
.manual-frames {
  @include puregrid(38px, 10px);
}
.frame-thumb {
  position: relative;
  cursor: pointer;

  &.active {
    border: 1px solid yellow;
  }
  &:hover .frame-hover {
    @include center;
  }
  .frame-hover {
    display: none;
    @include absolute-mask;
    background-color: rgba(0, 0, 0, 0.4);
    border: 1px solid #fff;
    color: #fff;
    font-size: 10px;
    font-weight: bold;
  }
}
.ai-debug {
  th, td {
    padding: 5px;
  }
}
</style>
