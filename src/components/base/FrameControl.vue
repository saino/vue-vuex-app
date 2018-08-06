<template>
  <div class="frame-control">
    <button :disabled="state <= min" @click="change(state - 1)">Prev</button>
    <slot></slot>
    <button :disabled="state >= max" @click="change(state + 1)">Next</button>
    <input type="text" :value="state" @change="change($event.target.value)"> / {{max}}
  </div>
</template>

<script>
export default {
  name: 'FrameControl',
  model: {
    prop: 'state'
  },
  props: {
    min: {
      type: Number,
      default: 0,
    },
    max: {
      type: Number,
    },
    state: {
      type: Number,
    },
  },
  methods: {
    change (value) {
      if (value > this.max) {
        value = this.max;
      } else if (value < this.min) {
        value = 0;
      }
      if (value != this.state) {
        // 不能直接修改该值，必须由父组件控制和 store 的通讯
        this.$emit('input', value);
      }
    }
  }
}
</script>

<style scoped lang="scss">
</style>