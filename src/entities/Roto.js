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
    saving: false,
    viewConfig: {
      currentFrame: 0,
      zoom: 1,
      pan: {
        x: 0,
        y: 0,
      },
    },
  });

  if (obj.material) {
    Material(obj.material);
  }
  return obj;
}
