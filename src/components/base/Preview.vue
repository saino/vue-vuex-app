<template>
  <modal name="preview"
    :min-width="trueWidth" :min-height="trueHeight" :pivot-y="0.5"
    :adaptive="true" :reset="true"
    :width="0" :height="0"
    @before-open="beforeOpen">
    <div class="preview-panel">
      <audio v-if="type == 'audio'" :src="url" controls crossorigin="use-credentials"></audio>
      <video v-if="type == 'video'" :src="url" controls crossorigin="use-credentials"></video>
      <img v-if="type == 'image'" :src="url" crossorigin="use-credentials">
    </div>
  </modal>
</template>

<script>
export default {
  name: 'Preview',
  data() {
    return {
      type: '',
      url: '',
      trueWidth: 0,
      trueHeight: 0,
    }
  },
  methods: {
    beforeOpen(event) {
      const params = event.params;
      const { type, url, properties } = params;
      const { width, height } = properties;

      // 真实宽度
      let trueWidth = width;

      // 真实高度
      let trueHeight = height;

      if (type === 'audio') {
        // Todo: 以后跟着设计图优化
        trueWidth = 300;
        trueHeight = 54;
      } else {
        // 比例
        let scale = 1;

        // 留边间距
        const padding = 100;

        // 最大允许高度
        const maxHeight = trueHeight + padding;

        // 如果 最大允许高度 > 窗口的高度, 则按比例缩小
        if (maxHeight > window.innerHeight) {
          scale = window.innerHeight / maxHeight;

          trueHeight = trueHeight * scale;
          trueWidth = trueWidth * scale;
        }

      }

      Object.assign(this, {
        type,
        url,
        trueWidth,
        trueHeight,
      });
    },
  }
}
</script>

<style scoped lang="scss">
.preview-panel {
  max-width: 100%;
  max-height: 100%;
  @include center;
  background-color: black;
}
.preview-panel > * {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
