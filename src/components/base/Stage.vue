<template>
  <div class="stage">
    <div class="canvas">
      <slot name="background"></slot>
      <canvas class="foreground" ref="canvas"
        v-show="!readonly"
        v-wheel="mouseZoom"
        :style="{ cursor: toolCursor, opacity: opacity }"
        @contextmenu.prevent="onContextMenu"
        ></canvas>
      <!-- 优化效率，预览时用 img 替代 canvas -->
      <img class="foreground"
        v-show="readonly"
        :src="imageData ? imageData.url : ''" crossorigin="use-credentials"
        :style="{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, opacity: opacity }">
    </div>
    <div class="stage-tool" :class="{ masked: readonly }">
      <div class="mask" v-show="readonly"></div>

      <slot name="tools"></slot>
      <button @click.prevent="undo" :disabled="!drew">Undo</button>
      <button @click.prevent="redo" :disabled="!undoed">Redo</button>
      <div class="spacing"></div>

      <button v-for="toolName in toolNames" :key="toolName"
        @click.prevent="activateTool(toolName)"
        :disabled="currentTool == toolName">{{ toolName }}</button>
      <span>
        Brush:
        <input type="number" min="1" :max="maxBrush" v-model.number="brushSize">
      </span>
      <slot name="drawtools"></slot>
      <div class="spacing"></div>

      <button @click.prevent="opacity = 1" :disabled="opacity == 1">Mask Only</button>
      <button @click.prevent="opacity = 0.6" :disabled="opacity == 0.6">Translucent</button>
      <button @click.prevent="opacity = 0" :disabled="opacity == 0">Hide Mask</button>
      <div class="spacing"></div>

      <button @click.prevent="zoom *= zoomRatio" :disabled="zoom >= maxZoom">Zoom In</button>
      <button @click.prevent="zoom = 1" :disabled="zoom == 1">Zoom 100%</button>
      <button @click.prevent="zoom /= zoomRatio" :disabled="zoom <= minZoom">Zoom Out</button>
      <button @click.prevent="pan = {x: 0, y: 0}" :disabled="pan.x == 0 && pan.y == 0">Pan Reset</button>
      <button @click.prevent="$modal.show('stage-shortkey')">Shortkeys</button>
    </div>
    <GlobalEvents
      @keyup.slash="$modal.show('stage-shortkey')"
      @keyup.backquote="zoom = 1; pan = {x: 0, y: 0};"
      @keyup.space="activateTool('Pan')"
      @keyup.num1="activateTool('DrawBG')"
      @keyup.num2="activateTool('DrawFG')"
      @keydown.equal="brushSize += 1"
      @keydown.minus="brushSize -= 1"
      @keyup.z="undo"
      @keyup.x="redo"
      @keyup.q="opacity = 1"
      @keyup.w="opacity = 0.6"
      @keyup.e="opacity = 0"
      @keyup="onKey"
    />
    <modal name="stage-shortkey" :min-width="200" :min-height="200" :pivot-y="0.5" :adaptive="true" height="auto">
      <table class="shortkey">
        <tr>
          <th>Key</th>
          <th>Action</th>
        </tr>
        <tr v-for="(shortkey, index) of shortkeys" :key="index">
          <td>{{ shortkey[0] }}</td>
          <td>{{ shortkey[1] }}</td>
        </tr>
      </table>
    </modal>
  </div>
</template>

<script>
import GlobalEvents from 'vue-global-events'
import paper from 'paper/dist/paper-core.js'
import { clamp } from '@/utils/helper'

export default {
  name: 'Stage',
  components: {
    GlobalEvents,
  },
  props: {
    guid: { type: String },
    frame: { type: Number },
    size: { type: Object },
    zoomSync: { type: Number },
    panSync: { type: Object },
    imageData: { type: Object },
    readonly: { type: Boolean },
  },
  data: () => ({
    minZoom: 0.1,
    maxZoom: 10,
    zoomRatio: 1.2,
    brushSize: 5,
    maxBrush: 100,

    // paper.js data
    drew: 0,  // 有手动绘画
    undoed: 0,  // 有撤销记录（记录本身不是 plain object，故不直接记到 vue data 里）
    toolNames: [],
    currentTool: '',

    opacity: 0.6,
    shortkeys: [
      ['/', 'Show this window'],
      ['`', 'Reset zoom and pan'],
      ['Space', 'Pan Tool'],
      ['1', 'Draw Background'],
      ['2', 'Draw Foreground'],
      ['+ or =', 'Increase brush size'],
      ['-', 'Decrease brush size'],
      ['Z', 'Undo'],
      ['X', 'Redo'],
      ['Q', 'Mask only'],
      ['W', 'Translucent mask'],
      ['E', 'Hide mask'],
    ],
  }),
  // non-reactive data, need to be inited in mounted
  clip: undefined,
  currentPath: undefined,
  cursorCircle: undefined,
  undoPaths: [],

  computed: {
    zoom: {
      get() { return this.zoomSync; },
      set(val) {
        val = clamp(val, this.minZoom, this.maxZoom);
        this.view.setZoom(val);
        this.$emit('update:zoomSync', val);
      }
    },
    pan: {
      get() { return this.panSync; },
      set(val) {
        this.view.setCenter(-val.x, -val.y);
        this.$emit('update:panSync', val);
      }
    },
    toolCursor() {
      return this.currentTool == 'Pan' ? 'move' : 'none';
    }
  },
  mounted() {
    // 该操作并不保险，有时还是需要手动刷新
    paper.clear();  // Prevent re-define for Vue hot reloading

    paper.install(this);
    paper.setup(this.$refs.canvas);
    // paper.settings.handleSize = 0;
    // paper.settings.hitTolerance = 4;
    this.reset();
    const _this = this;

    this.addTool('Pan', {
      onActivate() {
        _this.resetCursor();
      },
      onMouseDrag(event) {
        const offset = event.downPoint.subtract(event.point);
        const newCenter = _this.view.center.add(offset);
        _this.pan = {x: -newCenter.x, y: -newCenter.y};
      }
    });
    this.addTool('DrawBG', {
      onActivate() {
        _this.resetCursor();
      },
      onMouseMove(event) {
        _this.cursorCircle.position = event.point;
      },
      onMouseDown(event) {
        _this.currentPath = (new _this.Path({
          strokeCap: 'round',
          strokeJoin: 'round',
          strokeColor: 'black',
          strokeWidth: _this.brushSize
        })).addTo(_this.clip);
        _this.currentPath.add(event.point);
        _this.drew = 1;
      },
      onMouseDrag(event) {
        _this.cursorCircle.position = event.point;
        _this.currentPath.add(event.point);
      },
      onMouseUp(event) {
        _this.currentPath = undefined;
        _this.save(true);
      }
    });
    this.addTool('DrawFG', {
      onActivate() {
        _this.resetCursor();
      },
      onMouseMove(event) {
        _this.cursorCircle.position = event.point;
      },
      onMouseDown(event) {
        _this.currentPath = (new _this.Path({
          strokeCap: 'round',
          strokeJoin: 'round',
          strokeColor: 'white',
          strokeWidth: _this.brushSize
        })).addTo(_this.clip);
        _this.currentPath.add(event.point);
        _this.drew = 1;
      },
      onMouseDrag(event) {
        _this.cursorCircle.position = event.point;
        _this.currentPath.add(event.point);
      },
      onMouseUp(event) {
        _this.currentPath = undefined;
        _this.save(true);
      }
    });
    this.activateTool('Pan');

    this.undoPaths = [];
  },
  methods: {
    reset() {
      this.$el.width = this.size.width;
      this.$el.height = this.size.height;
      this.view.setViewSize(this.size.width, this.size.height);
      this.view.setCenter(-this.pan.x, -this.pan.y);
      this.view.setZoom(this.zoom);
      this.project.clear();
      const w = this.size.width / 2;
      const h = this.size.height / 2;
      const rect = new this.Path.Rectangle(-w, -h, this.size.width, this.size.height);
      this.clip = new this.Group(rect);
      this.clip.clipped = true;  // 所有元素都放在 clip 内才能保证不出界，同时 rasterize 也可以拿到完整的区域
      this.resetCursor();
      this.load();
    },
    load() {
      this.clip.children.slice(1).forEach(element => element.remove());
      this.drew = 0;
      this.undoed = 0;
      if (this.imageData) {
        (new this.Raster(this.imageData.url)).addTo(this.clip);
        // 方便开发时直接用 undo 清空，TODO: 正式版理论上应该另外加这个功能？
        this.drew = 1;
      }
    },
    getImg() {
      if (this.clip.children.length > 1) {
        let url;
        const tempImg = this.clip.rasterize();
        url = tempImg.toDataURL();
        tempImg.remove();
        return url;
      }
    },
    save(clearUndo = false) {
      if (clearUndo) {
        this.undoed = 0;
        this.undoPaths = [];
      }
      // 不直接写 imageData，因为父组件会增加额外字段
      this.$emit('canvasChange', { url: this.getImg() });
    },
    undo() {
      const elements = this.clip.children;
      if (elements.length > 1){
        const lastElement = elements[elements.length - 1];
        this.undoPaths.push(lastElement);
        lastElement.remove();
        this.drew = elements.length - 1;
        this.undoed = 1;
        this.save();
      }
    },
    redo() {
      if (this.undoPaths.length > 0) {
        this.undoPaths.pop().addTo(this.clip);
        this.drew = 1;
        this.undoed = this.undoPaths.length;
        this.save();
      }
    },
    // 必须是 base64 uri，而不能是跨域 url
    overlay(imgUrl) {
      (new this.Raster(imgUrl)).addTo(this.clip);
      this.save(true);
    },
    addTool(name, methods) {
      const tool = new this.Tool();
      tool.name = name;
      this.toolNames.push(name);
      return Object.assign(tool, methods);
    },
    activateTool(name) {
      const tool = this.tools.find(tool => tool.name === name);
      if (tool) {
        this.currentTool = tool.name;
        tool.activate();
      }
    },
    resetCursor() {
      if (!this.Path) return;
      let pos = [0, 0];
      if (this.cursorCircle) {
        pos = this.cursorCircle.position;
        this.cursorCircle.remove();
      }
      if (this.currentTool != 'Pan') {
        this.cursorCircle = new this.Path.Circle({
          center: pos,
          radius: Math.max((this.brushSize - 1) / 2, 1),
          strokeColor: 'blue',
          fillColor: new this.Color(this.currentTool == 'DrawFG' ? 0.9 : 0.1, 0.5),
        });
      }
    },
    mouseZoom(event) {
      const delta = event.wheelDeltaY;
      if (!delta) return;
      const mousePos = new paper.Point(event.offsetX, event.offsetY);
      const realPos = this.view.viewToProject(mousePos);
      const zoomChange = Math.pow(1 + Math.abs(delta) / 1000, Math.sign(delta));  // 保证系数一致
      this.zoom *= zoomChange;
      // 保证 mousePos 所在点的 realPos 不变，反算 view 的中心点
      // TRICK: 由于 this.zoom 的修改不是实时生效，故 newPan 的计算基于 view.zoom
      const newPan = mousePos.subtract(this.view.viewSize.divide(2)).divide(this.view.zoom).subtract(realPos);
      this.pan = {x: newPan.x, y: newPan.y};
    },
    onKey(event) {
      // window.console.log(event.keyCode);
    },
    onContextMenu(event) {
      // window.console.log(event);
      const mousePos = new paper.Point(event.offsetX, event.offsetY);
      const viewPos = this.view.viewToProject(mousePos);
      window.console.log(viewPos);
      // window.console.log(this.clip);
      const imageUrl = this.clip.rasterize().toDataURL();
      const message = `Clip URL Size: ${imageUrl.length}`
      this.$modal.show('dialog', {text: message});
    },
  },
  watch: {
    guid() {
      this.reset();
    },
    frame() {
      // 只读时避免操作 canvas
      if (this.readonly) return;
      this.load();
    },
    readonly(val) {
      // 取消只读时重新加载 canvas 数据
      if (!val) {
        this.load();
      }
    },
    brushSize: {
      immediate: true,
      handler(val) {
        this.brushSize = clamp(val, 1, this.maxBrush);
        if (this.currentPath) {
          this.currentPath.strokeWidth = this.brushSize;
        }
        this.resetCursor();
      }
    }
  }
}
</script>

<style scoped lang="scss">
.stage {
  @include flex-row;
}
.canvas {
  position: relative;
  overflow: hidden;

  & > * {
    position: absolute;
    top: 0;
    left: 0;
  }
}
.foreground {
  &.opacity {
    opacity: 0.6;
  }
  &.hide {
    display: none;
  }
}
.stage-tool {
  flex: 0 0 30px;
  @include flex-col;
  position: relative;
  background-color: rgba(29, 54, 57, 0.4);

  &.masked {
    filter: blur(1px);
  }
  .mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.3);
  }
  button {
    width: 100%;
    height: 40px;
    margin: 1px 0;
    &:disabled {
      color: #777;
    }
  }
  .spacing {
    flex: 1;
  }
}

.shortkey {
  width: 100%;
  padding: 30px;

  td {
    height: 30px;
  }
}
</style>