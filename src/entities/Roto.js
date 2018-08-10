import Material from '@/entities/Material'

function uuid4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

export default function(obj) {
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
      }
    });
  }
  catch(e) {}

  if (obj.material) {
    Material(obj.material);
  }
  return obj;
}
