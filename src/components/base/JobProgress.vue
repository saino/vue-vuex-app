<template>
  <div class="progress">
    <label class="label" v-show="jobStatus == $JOB.QUEUE">{{ jobName }}任务排队中...</label>
    <progress-bar v-show="jobStatus == $JOB.RUNNING"
      size="medium" text-position="inside" text-fg-color="#fff"
      :val="progress" :text="progress + '%'" />
  </div>
</template>

<script>
import ProgressBar from 'vue-simple-progress'

export default {
  name: 'JobProgress',
  props: {
    jobStatus: {
      default: 0,
    },
    jobName: {
      default: '',
    },
    progress: {
      default: 0,
    },
  },
  components: {
    ProgressBar,
  }
}
</script>

<style scoped lang="scss">
.progress {
  flex: 0;
}
.label {
  font-size: 12px;
  color: #fff;
}
</style>
