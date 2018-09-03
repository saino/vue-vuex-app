import { api } from '@/utils/api'

export default function(type, id, progressUpdater, callback, reset = false) {
  const poll = () => {
    // auto stop after logout
    if (!api.defaults.headers.common['token']) return;

    api.post('/getProgress', {
      type: type,
      object_id: id,
    }).then(resp => {
      progressUpdater(resp.progress);
      if (!resp.complete) {
        setTimeout(poll, 1000);
      } else {
        callback(resp.success);
      }
    }).catch(err => {
      setTimeout(poll, 3000); // as same as notification default disappear time
    })
  }

  if (reset) {
    progressUpdater(0);
  }
  poll();
}