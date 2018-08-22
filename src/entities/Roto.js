import Material from '@/entities/Material'
import { HOST } from '@/config'
import JOB from '@/utils/jobConst'

function uuid4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

export default function(obj) {
  // 根据后端返回的任务状态进行转换
  if (!obj.jobStatus) {
    obj.jobStatus = {
      ai: obj.ai_job ? obj.ai_job.status : JOB.INIT,
      export: obj.export_job ? obj.export_job.status : JOB.INIT,
    }
  }
  obj.extendProps({
    _guid: uuid4(),
    masks: {},
    modified: false,
    viewConfig: {
      currentFrame: 0,
      zoom: 1,
      pan: {
        x: 0,
        y: 0,
      },
    },
    jobStatus: {
      ai: JOB.INIT,
      export: JOB.INIT,
    },
    progress: 0,  // 目前同时只允许进行一项任务
  });
  obj.saving = false; // 强制初始化为 false，避免异常情况被持久化

  try {
    Object.defineProperties(obj, {
      manualFrames: {
        get() {
          let result = [];
          for (let frame in this.masks) {
            if (this.masks[frame].manual) {
              result.push(frame);
            }
          }
          return result;
        }
      },
      manualMasks: {
        get() {
          let masks = {};
          for (let frame in this.masks) {
            if (this.masks[frame].manual) {
              masks[frame] = this.masks[frame];
            }
          }
          return masks;
        }
      },
      exportWebm: {
        get() {
          return `${HOST}/data/rotos/${this.id}/export/output.webm`;
        }
      },
      exportPng: {
        get() {
          return `${HOST}/data/rotos/${this.id}/export/frames.zip`;
        }
      },
    });
  }
  catch(e) {}

  if (obj.material) {
    Material(obj.material);
  }
  return obj;
}
