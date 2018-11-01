<template>
    <div class="time-line-wrap" @mousemove="drag" @mouseleave="dragend" @mouseup="dragend">
        <slot></slot>
        <div class="zoom-buttom">
            <button :disabled="zoomRatio <= 1" @click="zoomOut">-</button>
            &nbsp;&nbsp;&nbsp;&nbsp;
            <button :disabled="cantZoomIn" @click="zoomIn">+</button>
        </div>
        <div class='time-line' ref='timeLine'>
            <div class="manual-line" :style="{'width':`calc(${zoomRatio*100}%)`, 'padding': `0 ${thumbWidth/2}px`}" >
                <!-- 显示当前帧与标记帧 -->
                <div class="manual-item current-frame" @click.prevent.stop="clickThumbFrame(currentFrame - 0)" @mousedown="dragstart" ref="currentFrame"
                :style="{
                    'transform': `translateX(${caculateX(currentFrame-0)}px)`,
                }"></div>
                <div class="manual-item" v-for="manual of current.manualFrames" :key="manual+current._guid" @click.prevent.stop="clickThumbFrame(manual - 0)" 
                :style="{
                    'transform': `translateX(${caculateX(manual-0)}px)`
                }">
                </div>
            </div>
            <div class="scale-mark-wrap" :style="{'width':`calc(${zoomRatio*100}%)`, 'padding': `0 ${thumbWidth/2}px`}" 
                @click="changeCurrentFrame" @mouseenter='showhovertip' @mousemove="hovertip" @mouseleave="hidehovertip">
                <div class="hover-tip" v-show="hovertipShow" :style="{
                    'transform': `translateX(${hovertipTranslateX}px)`,
                }">{{hovertipContent}}</div>
                <!-- 显示刻度线条。。。。 -->
                <div class="scale-mark" v-for="n in Math.floor(scaleMarkCount+1)" :key="n*frameUnitNum" :style="{
                    'transform': `translateX(${(n-1)*realthumbWidth}px)`
                }">
                </div>
            </div>
            <div class="thumb-wrap" :style="{'width': zoomRatio*100+'%', 'padding': `0 ${thumbWidth/2}px`}">
                <!-- 显示缩略图 -->
                <div class="thumb" v-for="n in Math.floor(scaleMarkCount+1)" :key="n*frameUnitNum" :style="{
                    'width': thumbWidth+'px',
                    'background-image': `url(${current.material.frameThumb((n-1)*frameUnitNum)})`,
                    'transform': `translateX(${(n-1)*realthumbWidth-thumbWidth/2}px)`
                }" @click.prevent.stop="clickThumbFrame(thumbsFrameIndex[n-1])">
                {{(n-1)*frameUnitNum}}
                </div>
            </div>

        </div>
    </div>
</template>
<script>
import { get, sync, call } from 'vuex-pathify'

import { HOST } from '@/config';
import { currentSync } from '@/utils/computedHelper'
export default {
    name: 'TimeLine',
    model: {
        prop: 'state',
        event: 'change',
    },
    data: ()=>({
        thumbHeight: 38,
        thumbGap: 15,
        defaultTimeLineWidth: 100,
        thumbsFrameIndex: [],
        draging: false,
        dragstartX: 0,
        dragMoveX: 0,
        ceilNum: 10,
        zoomRatio: 1,
        cantZoomIn: false,
        hovertipTranslateX: 100,
        hovertipContent: 0,
        hovertipShow: false,
    }),
    mounted() {
        this.defaultTimeLineWidth = this.$refs.timeLine.offsetWidth;
        window.addEventListener("resize", this.handlerResize);
        this.resetZoomRatio();
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.handlerResize);
    },
    computed: {
        current: get('rotos/current'),
        currentFrame: currentSync('rotos@viewConfig.currentFrame'),
        currentTimeLineWidth() {
            return this.defaultTimeLineWidth * this.zoomRatio - this.thumbWidth;
        },
        materialId() {
            return this.current.material_id;
        },
        materialHeight() {
            return this.current.material.properties.height;
        },
        materialWidth() {
            return this.current.material.properties.width;
        },
        materialFramesCount() {
            return this.current.material.properties.length - 1;
        },
        thumbWidth() {
            return  Math.round(this.thumbHeight * this.materialWidth / this.materialHeight );
        },
        currentFrameTranslateX(){
            return this.caculateX(this.currentFrame-0);
        },
        frameUnitNum() {
            const scaleMarkCount = this.currentTimeLineWidth / this.thumbWidth;
            return Math.ceil((this.materialFramesCount / scaleMarkCount) / this.ceilNum) * this.ceilNum;
        },
        scaleMarkCount() {
            return this.materialFramesCount / this.frameUnitNum;
        },
        realthumbWidth() {
            return this.currentTimeLineWidth / this.scaleMarkCount;
        }, 
    },
    methods: {
        changeCurrentFrame(e){
            const translateX = e.offsetX - this.thumbWidth/2;
            this.changeCurrentFrameIndexByTranslateX(translateX);
        },
        showhovertip() {
            this.hovertipShow = true;
        },
        hovertip(e) {
            this.hovertipTranslateX = e.offsetX - this.thumbWidth/2 - 20;
            const currentFrameTranslateX = e.offsetX - this.thumbWidth/2;
            let currentFrameIndex = Math.round(this.materialFramesCount * currentFrameTranslateX / this.currentTimeLineWidth);
            currentFrameIndex = currentFrameIndex < 0 ? 0 : currentFrameIndex > this.materialFramesCount ? this.materialFramesCount : currentFrameIndex;
            this.hovertipContent = currentFrameIndex;
        },
        hidehovertip() {
            this.hovertipShow = false;
        },
        resetCantZoomIn(){
            this.cantZoomIn = this.ceilNum >= this.frameUnitNum;
        },
        resetZoomRatio(){
            this.zoomRatio = 1;
            this.resetCantZoomIn();
        },
        zoomOut() {
            this.zoomRatio *= 0.8;
            this.zoomRatio =  this.zoomRatio < 1 ? 1 : this.zoomRatio;
        },
        zoomIn() {
            if(this.cantZoomIn){
                return;
            }
            this.zoomRatio *= 1.2;
        },
        handlerResize(event) {
            event.stopPropagation();
            event.preventDefault();
            this.defaultTimeLineWidth = this.$refs.timeLine.offsetWidth;
            this.resetCantZoomIn();
        },
        clickThumbFrame(n) {
            this.$emit('change', n);
        },
        resetFrameIndex(){
            this.thumbsFrameIndex = [];
            for (let thumbIndex=0; thumbIndex<=this.scaleMarkCount; thumbIndex++) {
                const frameIndex = thumbIndex*this.frameUnitNum;
                this.thumbsFrameIndex.push(frameIndex);
            }
        },
        caculateX(manualIndex) {
            return manualIndex/this.frameUnitNum*this.realthumbWidth
        },
        dragstart(e){
            this.draging = true;
            this.dragstartX = e.x;
        },
        drag(e){
            if (!this.draging) { return; };
            this.dragMoveX = e.x - this.dragstartX
            let currentFrameTranslateX = this.currentFrameTranslateX + this.dragMoveX;
            currentFrameTranslateX = currentFrameTranslateX < 0 ? 0 : currentFrameTranslateX > this.currentTimeLineWidth ? this.currentTimeLineWidth: currentFrameTranslateX;
            this.$refs.currentFrame.style.setProperty("transform" ,`translateX(${currentFrameTranslateX}px)`);
        },
        
        dragend(e){
            if(this.draging){
                this.changeCurrentFrameIndexByTranslateX(this.currentFrameTranslateX + this.dragMoveX);
            }
            this.draging = false;
        },
        changeCurrentFrameIndexByTranslateX(translateX){
            let currentFrameIndex = Math.round(this.materialFramesCount * translateX / this.currentTimeLineWidth);
            currentFrameIndex = currentFrameIndex < 0 ? 0 : currentFrameIndex > this.materialFramesCount ? this.materialFramesCount : currentFrameIndex;
            this.$emit('change', currentFrameIndex);
        },
    },
    watch: {
        scaleMarkCount(newValue, oldValue) {
            this.resetFrameIndex(); 
        },
        materialId(newId, oldId) {
            this.resetFrameIndex();
            this.resetZoomRatio();
        },
        zoomRatio() {
            this.resetCantZoomIn();
        },
    },
}
</script>
<style scoped lang="scss">
    .time-line-wrap{
      flex: 0 0 100px;
      background-color: #0e1b20;
      color: #fff;
    }
    .zoom-buttom{
        display: inline-block;
        height: 29px;
        >button{
            height: 25px;
            width: 30px;
        }
    }
    .time-line{
        width: 100%;
        overflow-x: scroll;
        overflow-y: hidden;
        font-size: 0;
        box-sizing: content-box;
    }
    .thumb-wrap{
        position: relative;
        width: 100%;
        height: 40px;
    }
    .thumb{
        background-size: cover;
        background-position: center;
        height: 40px;
        width: 40px;
        display: block;
        position: absolute;
        cursor: pointer;
        font-size: 14px;
        text-align: center;
        line-height: 40px;
    }
    .scale-mark-wrap{
        height: 18px;
        width: 100%;
        position: relative;
        background: gray;
        cursor: pointer;
    }
    .hover-tip{
        display: block;
        position: absolute;
        width: 40px;
        height: 18px;
        background: #fff;
        bottom: 18px;
        color: #000;
        text-align: center;
        font-size: 12px;
        z-index: 999;
        pointer-events: none;
    }
    .scale-mark{
        background: red;
        width: 1px;
        height: 16px;
        display: block;
        position: absolute;
        pointer-events: none;
    }
    .thumb:last-child{
        margin-right: 0;
    }
    .manual-line {
        height: 2px;
        margin-bottom: 16px;
        margin-top: 12px;
        position: relative;
        width: 100%;
        text-align: left;
        font-size: 0;
        z-index: 999;
    }
    .manual-item:before {
        @include main-bg-color;
        content: "";
        width: 12px;
        height: 12px;
        border-radius: 12px;
        position: absolute;
        left: -5px;
        top: -12px;
    }
    .manual-item {
        @include main-bg-color;
        width: 1px;
        height: 18px;
        -webkit-transform: translateX(57px);
        transform: translateX(57px);
        cursor: pointer;
        display: inline-block;
        position: absolute;
    }
    .current-frame::before{
        border-radius: 0px;
        top: 0px;
    }
    .current-frame{
        height: 74px;;
        top: 4px;
        z-index: 9999;
    }
</style>

