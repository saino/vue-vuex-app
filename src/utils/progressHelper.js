import { api } from '@/utils/api'

export default function(type, id, progressUpdater, callback) {
  const poll = () => {
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
    })
  }

  progressUpdater(0);
  poll();
}