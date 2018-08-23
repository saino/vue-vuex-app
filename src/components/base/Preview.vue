<template>
  <modal name="preview"
    :min-width="200" :min-height="200" :pivot-y="0.5"
    :adaptive="true" :reset="true"
    width="80%" height="auto"
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
  data () {
    return {
      type: '',
      url: '',
    }
  },
  methods: {
    beforeOpen (event) {
      this.type = event.params.type;
      this.url = event.params.url;
    },
  }
}
</script>

<style scoped lang="scss">
.preview-panel {
  max-width: 100%;
  max-height: 100%;
}
.preview-panel > * {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
