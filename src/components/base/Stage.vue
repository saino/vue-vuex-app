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
    <div class="stage-tool">
      <slot name="tools"></slot>
      <button @click.prevent="undo" :disabled="readonly || !drew">Undo</button>
      <button @click.prevent="redo" :disabled="readonly || !undoed">Redo</button>
      <div class="spacing"></div>

      <button v-for="toolName in toolNames" :key="toolName"
        @click.prevent="activateTool(toolName)"
        :disabled="readonly || currentTool == toolName">{{ toolName }}</button>
      <span>
        Brush:
        <input type="number" :disabled="readonly" min="1" :max="maxBrush" v-model.number="brushSize">
      </span>
      <slot name="drawtools"></slot>
      <div class="spacing"></div>

      <button @click.prevent="opacity = 1" :disabled="opacity == 1">Solid Mask</button>
      <button @click.prevent="opacity = defaultOpacity" :disabled="opacity == defaultOpacity">Translucent</button>
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
      @keyup.b="activateTool('DrawBG')"
      @keyup.f="activateTool('DrawFG')"
      @keydown.equal="brushSize += 1"
      @keydown.minus="brushSize -= 1"
      @keyup.num1="changeBrushSize($event, 1)"
      @keyup.num2="changeBrushSize($event, 2)"
      @keyup.num3="changeBrushSize($event, 3)"
      @keyup.num4="changeBrushSize($event, 4)"
      @keyup.num5="changeBrushSize($event, 5)"
      @keyup.num6="changeBrushSize($event, 6)"
      @keyup.num7="changeBrushSize($event, 7)"
      @keyup.num8="changeBrushSize($event, 8)"
      @keyup.num9="changeBrushSize($event, 9)"
      @keyup.z="undo"
      @keyup.x="redo"
      @keyup.q="opacity = 1"
      @keyup.w="opacity = defaultOpacity"
      @keyup.e="opacity = 0"
      @keyup="onKey"
    />
    <modal name="stage-shortkey" :min-width="200" :min-height="200" :pivot-y="0.5" :adaptive="true" height="auto">
      <table class="shortkey">
        <tr>
          <th>Key</th>
          <th>Action</th>
        </tr>
        <tr v-for="(shortkey, index) of shortkeys" :key="index" :class="{ pad: shortkey[2] }">
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
    maxBrush: 999,
    opacity: 0.4,
    defaultOpacity: 0.4,

    // paper.js data
    drew: 0,  // 有手动绘画
    undoed: 0,  // 有撤销记录（记录本身不是 plain object，故不直接记到 vue data 里）
    toolNames: [],
    currentTool: '',

    shortkeys: [
      ['/', 'Show this window', true],
      ['`', 'Reset zoom and pan', true],
      ['Space', 'Pan'],
      ['B', 'Draw Background'],
      ['F', 'Draw Foreground'],
      ['1~9', 'Brush size', true],
      ['+ or =', 'Increase brush size'],
      ['-', 'Decrease brush size'],
      ['Z', 'Undo', true],
      ['X', 'Redo'],
      ['Q', 'Solid mask', true],
      ['W', 'Translucent mask'],
      ['E', 'Hide mask'],
      ['←', 'Previous frame', true],
      ['→', 'Next frame'],
      ['Home', 'First frame'],
      ['End', 'Last frame'],
    ],
  }),
  // non-reactive data, need to be inited in mounted
  cursorClip: undefined,
  clip: undefined,
  currentPath: undefined,
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
    const drawTool = {
      onActivate() {
        _this.resetCursor();
      },
      onMouseMove(event) {
        _this.cursorClip.position = event.point;
      },
      onMouseDown(event) {
        _this.currentPath = (new _this.Path({
          strokeCap: 'round',
          strokeJoin: 'round',
          strokeColor: _this.currentTool == 'DrawBG' ? 'black' : 'white',
          strokeWidth: _this.brushSize
        })).addTo(_this.clip);
        _this.currentPath.add(event.point);
        _this.drew = 1;
      },
      onMouseDrag(event) {
        _this.cursorClip.position = event.point;
        _this.currentPath.add(event.point);
      },
      onMouseUp(event) {
        if (_this.currentPath.segments.length == 1) {
          _this.currentPath.closePath();
        }
        _this.currentPath = undefined;
        _this.save(true);
      }
    };
    this.addTool('DrawBG', drawTool);
    this.addTool('DrawFG', drawTool);
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
    overlay(imgUrl, emit = true) {
      (new this.Raster(imgUrl)).addTo(this.clip);
      this.drew = 1;
      if (!emit) return;
      // 莫名其妙这里不能保证立刻获取到 clip 的最终形态，只能强制延后
      setTimeout(() => {
        this.save(true);
      }, 0);
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
      let pos = new paper.Point(0, 0);
      if (this.cursorClip) {
        pos = this.cursorClip.position;
        this.cursorClip.remove();
      }
      if (this.currentTool != 'Pan') {
        const fg = this.currentTool == 'DrawFG';
        const white = new this.Color(0.9, 0.8);
        const black = new this.Color(0.1, 0.8);
        const radius = Math.max((this.brushSize - 1) / 2, 1);
        this.cursorClip = new this.Group([
          // 内圈用画笔颜色
          new this.Path.Circle({
            center: pos,
            radius: radius,
            strokeWidth: 0.5,
            strokeColor: fg ? white : black,
            fillColor: fg ? white : black,
          }),
          // 外圈用相反颜色
          new this.Path.Circle({
            center: pos,
            radius: radius + 0.25,
            strokeWidth: 0.5,
            strokeColor: fg ? black : white,
          }),
          // 准星用相反颜色
          new this.Path.Line({
            from: pos.subtract([0, radius / 4]),
            to: pos.add([0, radius / 4]),
            strokeWidth: 0.25,
            strokeColor: fg ? black : white,
          }),
          new this.Path.Line({
            from: pos.subtract([radius / 4, 0]),
            to: pos.add([radius / 4, 0]),
            strokeWidth: 0.25,
            strokeColor: fg ? black : white,
          }),
        ]);
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
    changeBrushSize(event, val) {
      if (event.target.tagName == 'BODY'){
        this.brushSize = val;
      }
    },
    onKey(event) {
      // window.console.log(event.keyCode);
    },
    onContextMenu(event) {
      // window.console.log(event);
      const mousePos = new paper.Point(event.offsetX, event.offsetY);
      const realPos = this.view.viewToProject(mousePos).add(this.view.viewSize.divide(2));
      window.console.log(realPos);
      // window.console.log(this.clip);
      const raster = this.clip.rasterize(undefined, false);
      let color = raster.getPixel(realPos);
      color = !color.alpha ? 'Transparent' : (color.gray ? 'White' : 'Black');

      const imageData = raster.getImageData();
      raster.remove();
      const length = imageData.data.length;
      let counts = {
        transparent: 0,
        black: 0,
        white: 0,
        total: length / 4,
      };
      let i = -4;
      while ( (i += 4) < length ) {
        if (!imageData.data[i+3]) {
          counts.transparent ++;
        } else {
          counts[imageData.data[i] ? 'white' : 'black'] ++;
        }
      }
      const message = `<table style="border-spacing: 15px">
        <tr><th>Width</th><td>${imageData.width}</td></tr>
        <tr><th>Height</th><td>${imageData.height}</td></tr>
        <tr><th>Total pixels</th><td>${counts.total}</td></tr>
        <tr><th>White pixels</th><td>${counts.white}</td><td>${(counts.white / counts.total * 100).toFixed(1)}%</td></tr>
        <tr><th>Black pixels</th><td>${counts.black}</td><td>${(counts.black / counts.total * 100).toFixed(1)}%</td></tr>
        <tr><th>Transparent pixels</th><td>${counts.transparent}</td></tr>
        <tr><th>Current pixel color</th><td>${color}</td></tr></table>`;
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
.stage-tool {
  flex: 0 0 30px;
  @include flex-col;
  position: relative;
  background-color: rgba(29, 54, 57, 0.4);

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

  tr.pad > * {
    padding-top: 15px;
  }
  td {
    line-height: 30px;
  }
}
</style>