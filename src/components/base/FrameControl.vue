<template>
  <div class="frame-control">
    <button :disabled="readonly || state <= min" @click.prevent="change(state - 1)">Prev</button>
    <slot></slot>
    <button :disabled="readonly || state >= max" @click.prevent="change(state + 1)">Next</button>
    <span class="main"> 当前第 </span>
    <input class="input" type="text" :value="state" :readonly="readonly" @change="change($event.target.value)">
    <span class="divisor"> / {{max}}</span>
    <span class="main"> 帧</span>
    <GlobalEvents
      @keydown.left="change(state - 1)"
      @keydown.right="change(state + 1)"
      @keydown.home="change(0)"
      @keydown.end="change(max)"
    />
  </div>
</template>

<script>
import GlobalEvents from 'vue-global-events'

export default {
  name: 'FrameControl',
  components: {
    GlobalEvents,
  },
  model: {
    prop: 'state',
    event: 'change',
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
    readonly: {
      type: Boolean
    }
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
        this.$emit('change', value);
      }
    }
  }
}
</script>

<style scoped lang="scss">
.frame-control {
  font-size: 12px;

  & > button {
    padding: 5px;
  }
}
.input {
  text-align: center;
  width: 40px;
  font-size: 12px;
  background-color: transparent;
  border: 1px solid #fff;
  color: #fff;
}
.main {
  @include main-color;
}
</style>