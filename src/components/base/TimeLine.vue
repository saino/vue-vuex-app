<template>
    <div class='time-line' ref='timeLine'>
        <div class="manual-line" >
            <div class="manual-item" v-for="manual of current.manualFrames" :key="manual+current._guid" @click.prevent.stop="clickThumbFrame(manual - 0, true)" 
            :style="{
                'transform': `translateX(${((manual - 0 +1)/materialFramesCount)*currentTimeLineWidth - (manual-0 ? 18 : 8) }px)`
            }">
            </div>
        </div>
        <div class="thumb-wrap" :style="{'width': zoomRatio*100+'%'}" >
            <div class="thumb" v-for="n in thumbsCount" :key="materialId+n" :style="{
                'width': thumbWidth+'px',
                'background-image': `url(${thumbsFrameUrl[n-1]})`,
            }" @click.prevent.stop="clickThumbFrame(n)">
            </div>
        </div>
    </div>
</template>
<script>
import { get, sync, call } from 'vuex-pathify'
import leftPad from 'left-pad'

import { HOST } from '@/config';
export default {
    name: 'TimeLine',
    model: {
        prop: 'state',
        event: 'change',
    },
    props: {
        zoomRatio: {
            type: Number,
            default: 1.0,
            required: true,
        },
        resetMaxZoomRotio: {
            type: Function,
        },
    },
    data: ()=>({
        thumbHeight: 38,
        thumbGap: 15,
        defaultTimeLineWidth: 0,
        thumbsFrameIndex: [],
        thumbsFrameUrl: [],
    }),
    mounted() {
        this.defaultTimeLineWidth = this.$refs.timeLine.offsetWidth;
        window.addEventListener("resize", this.handlerResize);
        this.resetMaxZoomRotio();
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.handlerResize);
    },
    computed: {
        current: get('rotos/current'),
        currentTimeLineWidth() {
            return this.defaultTimeLineWidth * this.zoomRatio;
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
            return this.current.material.properties.length;
        },
        thumbWidth() {
            return  Math.round(this.thumbHeight * this.materialWidth / this.materialHeight );
        },
        thumbsCount() {
            let count =  Math.floor((this.currentTimeLineWidth - this.thumbWidth) / (this.thumbWidth + this.thumbGap) + 1);
            return count > this.materialFramesCount ? this.materialFramesCount : count;
        },
        
    },
    methods: {
        handlerResize(event) {
            event.stopPropagation();
            event.preventDefault();
            this.defaultTimeLineWidth = this.$refs.timeLine.offsetWidth;
        },
        clickThumbFrame(n, flag) {
            if(flag){
                this.$emit('change', n);
                return;
            }
            this.$emit('change', this.thumbsFrameIndex[n-1]);
        },
        resetFrameIndexAndUrl(){
            const framesGap = (this.materialFramesCount - this.thumbsCount) / (this.thumbsCount - 1);
            this.thumbsFrameIndex = [];
            this.thumbsFrameUrl = [];
            for (let thumbIndex=0; thumbIndex<this.thumbsCount; thumbIndex++) {
                const frameIndex = Math.round(thumbIndex * framesGap + thumbIndex);
                this.thumbsFrameIndex.push(frameIndex);
                const frameUrl = `${HOST}/data/materials/${this.materialId}/sequence/thumb_${leftPad(frameIndex, 5, "0")}.jpg`;
                this.thumbsFrameUrl.push(frameUrl);
            }
        }
    },
    watch: {
        thumbsCount(newValue, oldValue) {
            this.resetFrameIndexAndUrl(); 
        },
        materialId(newId, oldId) {
            this.resetFrameIndexAndUrl();
        },
    },
}
</script>
<style scoped lang="scss">
    .time-line{
        width: 100%;
        overflow-x: auto;
        overflow-y: hidden;
        font-size: 0;
    }
    .thumb-wrap{
        position: relative;
        width: 100%;
        
    }
    .thumb{
        background: #000;
        background-size: cover;
        background-position: center;
        height: 40px;
        width: 40px;
        margin-right: 15px;
        float: left;
        cursor: pointer;
    }
    .thumb:last-child{
        margin-right: 0;
    }
    .manual-line {
        height: 2px;
        // background: #fff;
        margin-bottom: 16px;
        margin-top: 12px;
        position: relative;
        width: 100%;
        text-align: left;
        font-size: 0;
        z-index: 999;
    }
    .manual-item:before {
        content: "";
        width: 12px;
        height: 12px;
        border-radius: 12px;
        position: absolute;
        background: #fff;
        left: -5px;
        top: -12px;
        // z-index: 999;
    }
    .manual-item {
        width: 1px;
        height: 42px;
        background: #fff;
        // z-index: 999;
        transform: translateX(57px);
        cursor: pointer;
        display: inline-block;
    }
</style>

