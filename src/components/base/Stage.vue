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
      @keyup.a="activateTool('Pen')"
      @keyup.s="activateTool('Select')"
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
      ['Space', 'Pan', true],
      ['A', 'Foreground Pen'],
      ['S', 'Select'],
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
  draggingHandle: false,
  selectChanged: false,
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
      switch (this.currentTool) {
        case 'Pan':     return 'move';
        case 'Pen':     return 'crosshair';
        case 'Select':  return 'default';
        default:        return 'none';
      }
    }
  },
  mounted() {
    // 该操作并不保险，有时还是需要手动刷新
    paper.clear();  // Prevent re-define for Vue hot reloading

    paper.install(this);
    paper.setup(this.$refs.canvas);
    paper.settings.hitTolerance = 2;
    this.reset();
    const _this = this;

    this.addTool('Pan', {
      onActivate() {
        _this.resetCursor();
        _this.unselectAll();
        _this.closeCurrentPath();
      },
      onMouseDrag(event) {
        const offset = event.downPoint.subtract(event.point);
        const newCenter = _this.view.center.add(offset);
        _this.pan = {x: -newCenter.x, y: -newCenter.y};
      }
    });
    this.addTool('Pen', {
      onActivate() {
        _this.resetCursor();
        _this.unselectAll();
        _this.currentPath = undefined;
      },
      onMouseDown(event) {
        if (!_this.currentPath || _this.currentPath.closed) {
          _this.currentPath = (new _this.Path({
            strokeCap: 'round',
            strokeJoin: 'round',
            strokeColor: 'white',
            fillColor: 'white',
            fillRule: 'evenodd',
          })).addTo(_this.clip);
          
          _this.currentPath.add(new _this.Segment(event.point));
          _this.currentPath.fullySelected = true;
        }
        if (_this.currentPath.segments.length > 2 &&
          _this.currentPath.firstSegment.point.isClose(event.point, paper.settings.hitTolerance))
        {
          // 不保存，以支持最后调整控制点
          _this.closeCurrentPath(false);
          _this.currentPath.firstSegment.selected = true;
        }
      },
      onMouseMove(event) {
        if (!_this.currentPath || _this.currentPath.closed) return;
        _this.currentPath.lastSegment.point = event.point;
      },
      onMouseDrag(event) {
        if (!_this.currentPath) return;
        const offset = event.point.subtract(event.downPoint);
        const offsetOp = event.downPoint.subtract(event.point);
        if (_this.currentPath.closed) {
          // 闭合点只控制结束半边，初始半边即使一开始没有 drag 也不是 0，很难判断
          _this.currentPath.firstSegment.handleIn = offsetOp;
        } else {
          _this.currentPath.lastSegment.handleOut = offset;
          _this.currentPath.lastSegment.handleIn = offsetOp;
        }
      },
      onMouseUp(event) {
        if (!_this.currentPath) return;
        if (_this.currentPath.closed) {
          _this.closeCurrentPath();
        } else {
          // 只显示浮动点的控制点
          _this.currentPath.lastSegment.selected = false;
          _this.currentPath.add(new _this.Segment(event.point));
          _this.currentPath.lastSegment.selected = true;
        }
      },
      onKeyUp(event) {
        if (event.key == 'escape') {
          // 点够多自动闭合、提交
          if (_this.currentPath.segments.length > 2) {
            _this.closeCurrentPath();
          } else {
            _this.currentPath.remove();
            _this.currentPath = undefined;
          }
        }
      }
    });
    this.addTool('Select', {
      onActivate() {
        _this.resetCursor();
        _this.closeCurrentPath();
      },
      onMouseDown(event) {
        _this.draggingHandle = false;
        _this.selectChanged = false;
        const hits = _this.clip.hitTestAll(event.point, {
          tolerance: paper.settings.hitTolerance,
          fill: true,
          segments: true,
          curves: true,
          handles: true,
          match: hit => hit.type != 'pixel',  // 忽略 raster
        });
        // 如果 hit 包含于当前选中，则不变（保持多选移动）
        let selectHit = hits.find(hit => hit.item.selected);
        if (selectHit) {
          // 选中内部元素时取消其它曲线的选择，并禁止 MouseUp 时循环选择重叠区域
          if (selectHit.type != 'fill') {
            _this.selectChanged = true;
            if (!event.modifiers.shift) {
              _this.clip.children.forEach(item => {
                if (item != selectHit.item) {
                  item.selected = false;
                }
              });
            }
          }
        } else {
          _this.selectChanged = true;
          // 选中第一个未选中的
          if (hits.length > 0 && !hits[0].item.selected) {
            selectHit = hits[0];
          }
          if (!event.modifiers.shift) {
            _this.unselectAll();
          }
        }
        if (selectHit) {
          selectHit.item.selected = true;
          if (!selectHit.item.closed) return;  // 非闭合曲线暂时不允许选择内部元素
          // 选中新的内部元素时取消其它元素的选中状态
          const unselectSegments = () => {
            if (!event.modifiers.shift) {
              selectHit.item.segments.forEach(seg => {
                seg.selected = false;
              });
            }
          };
          switch (selectHit.type) {
            case 'segment':
              if (!selectHit.segment.selected) {
                unselectSegments();
              }
              selectHit.segment.selected = true;
              break;
            case 'curve':
              if (!selectHit.location.curve.selected) {
                unselectSegments();
              }
              selectHit.location.curve.selected = true;
              break;
            case 'handle-in':
            case 'handle-out':
              if (!selectHit.segment.selected) {
                unselectSegments();
              }
              selectHit.segment.selected = true;
              // 另一个控制点取消选中
              selectHit.segment[selectHit.type == 'handle-in' ? 'handleOut' : 'handleIn'].selected = false;
              // 必须依靠外部标记，否则单控制点的节点无法区分
              _this.draggingHandle = true;
              break;
            default:
              unselectSegments();
          }
        }
      },
      onMouseDrag(event) {
        const selected = _this.getSelected();
        if (selected.paths.length == 0) return;

        const delta = event.point.subtract(event.lastPoint);
        // 只移动控制点
        if (selected.handles.length == 1 && _this.draggingHandle) {
          selected.handles[0].set(selected.handles[0].add(delta));
          return;
        }
        // 单曲线选择的情况优先移动点
        if (selected.paths.length == 1 && selected.segments.length > 0) {
          selected.segments.forEach(seg => seg.point = seg.point.add(delta));
          return;
        }
        selected.paths.forEach(path => path.translate(delta));
      },
      onMouseUp(event) {
        // 无视已拖动的情况
        if (!event.point.isClose(event.downPoint, 0)) return;
        // MouseDown 选中内部且未改变选择的情况循环选择重叠的其它区域
        if (!_this.selectChanged) {
          const hits = _this.clip.hitTestAll(event.point, {
            tolerance: paper.settings.hitTolerance,
            fill: true,
            match: hit => hit.type != 'pixel',
          });
          if (hits.length <= 1) {
            return;
          }
          const lastSelectIndex = hits.findIndex((hit, index, arr) => {
            return hit.item.selected && !arr[(index + 1) % arr.length].item.selected
          });
          const nextHit = hits[(lastSelectIndex + 1) % hits.length];
          if (!event.modifiers.shift) {
            _this.unselectAll();
          }
          if (nextHit) {
            nextHit.item.selected = true;
          }
        // 单选结点的情况取消其它结点的选中
        } else if (!event.modifiers.shift) {
          const segmentHit = _this.clip.hitTest(event.point, {
            tolerance: paper.settings.hitTolerance,
            segments: true,
            selected: true,
          });
          if (segmentHit) {
            segmentHit.item.segments.forEach(seg => {
              if (seg != segmentHit.segment) {
                seg.selected = false;
              }
            });
          }
        }
      },
      onKeyUp(event) {
        if (event.key == 'delete' || event.key == 'backspace') {
          const selected = _this.getSelected();
          if (selected.paths.length == 0) return;
          // 删除控制点
          if (selected.handles.length == 1 && _this.draggingHandle) {
            selected.handles[0]._set(0, 0);
            return;
          }
          // 删除结点
          if (selected.segments.length > 0) {
            selected.segments.forEach(seg => seg.remove());
            return;
          }
          // 删除曲线
          selected.paths.forEach(path => path.remove());
        }
      }
    });
    const drawTool = {
      onActivate() {
        _this.resetCursor();
        _this.unselectAll();
        _this.closeCurrentPath();
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
        _this.save();
      }
    };
    this.addTool('DrawBG', drawTool);
    this.addTool('DrawFG', drawTool);
    this.activateTool('Pan');

    this.draggingHandle = false;
    this.selectChanged = false;
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
      // Tool 不支持 DoubleClick，只能放到 clip 上
      this.clip.onDoubleClick = event => {
        if (this.currentTool != 'Select') return;
        // 只有闭合曲线的选中子元素允许双击
        const hit = this.clip.hitTest(event.point, {
          tolerance: paper.settings.hitTolerance,
          segments: true,
          curves: true,
          handles: true,
          selected: true,
          match: hit => hit.item.closed,
        });
        if (!hit) return;
        switch (hit.type) {
          // 双击结点切换控制点有空
          case 'segment':
            if (hit.segment.hasHandles()) {
              hit.segment.clearHandles();
            } else {
              // 自动根据前后结点生成控制点
              const p = hit.segment;
              const vector = p.next.point.subtract(p.previous.point).normalize();
              hit.segment.handleIn = vector.normalize(-p.point.subtract(p.previous.point).length / 3);
              hit.segment.handleOut = vector.normalize(p.next.point.subtract(p.point).length / 3);
            }
            break;
          // 双击曲线增加结点
          case 'curve':
            hit.location.curve.divideAt(hit.location);
            break;
          // 双击控制点删除
          case 'handle-in':
          case 'handle-out':
            hit.segment[hit.type == 'handle-in' ? 'handleIn' : 'handleOut']._set(0, 0);
            break;
        }
      };
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
        this.unselectAll();
        const tempImg = this.clip.rasterize(undefined, false);
        url = tempImg.toDataURL();
        tempImg.remove();
        return url;
      }
    },
    save(clearUndo = true) {
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
        this.save(false);
      }
    },
    redo() {
      if (this.undoPaths.length > 0) {
        this.undoPaths.pop().addTo(this.clip);
        this.drew = 1;
        this.undoed = this.undoPaths.length;
        this.save(false);
      }
    },
    // 必须是 base64 uri，而不能是跨域 url
    overlay(imgUrl, emit = true) {
      (new this.Raster(imgUrl)).addTo(this.clip);
      this.drew = 1;
      if (!emit) return;
      // 莫名其妙这里不能保证立刻获取到 clip 的最终形态，只能强制延后
      setTimeout(() => {
        this.save();
      }, 0);
    },
    closeCurrentPath(alsoSave = true) {
      // 仅钢笔工具才需要自动闭合（暂且用是否填充来判断）
      if (!this.currentPath || !this.currentPath.fillColor) return;
      if (!this.currentPath.closed) {
        // 闭合时要删除浮动点
        this.currentPath.lastSegment.remove();
        this.currentPath.closePath();
      }
      if (!alsoSave) return;
      this.currentPath.selected = false;
      this.currentPath = undefined;
      this.drew = 1;
      this.save();
    },
    unselectAll() {
      this.clip.children.forEach(item => {
        item.selected = false;
      });
    },
    getSelected() {
      const selectedPaths = this.clip.getItems({
        recursive: false,
        match: item => item.selected,
      });
      let selectedSegs = [], selectedHandles = [];
      if (selectedPaths.length == 1) {
        selectedSegs = selectedPaths[0].segments.filter(seg => seg.selected);
        if (selectedSegs.length > 0) {
          selectedSegs.forEach(seg => {
            if (seg.handleIn.selected) selectedHandles.push(seg.handleIn);
            if (seg.handleOut.selected) selectedHandles.push(seg.handleOut);
          });
        }
      }
      return {
        paths: selectedPaths,
        segments: selectedSegs,
        handles: selectedHandles,
      };
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
      if (this.currentTool.startsWith('Draw')) {
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
        // 仅非闭合曲线支持线宽控制
        if (this.currentPath && !this.currentPath.closed) {
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
    height: 30px;
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