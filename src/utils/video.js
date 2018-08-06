export function getCanvasBlob(canvas, quality = 0.9) {
  return new Promise(function(resolve, reject) {
    canvas.toBlob(blob => {
      // TODO: persist blob to file
      resolve(URL.createObjectURL(blob))
    }, 'image/jpeg', quality);
  });
}

export function getVideoFrames(blob, startTime, fps, frameCount, frameSeekedCallback) {
  let video = document.createElement("video");
  video.src = URL.createObjectURL(blob);
  let i = 0;
  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext('2d');

  return new Promise(function(resolve, reject) {
    video.addEventListener("seeked", async function videoSeekListener() {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      let blobUrl = await getCanvasBlob(canvas);
      // window.console.log(i);
      frameSeekedCallback(blobUrl); // 只能顺序执行，故不传帧序号了
      ++ i;
      if (i >= frameCount) {
        // video.removeEventListener("seeked", videoSeekListener);
        resolve();
      } else {
        video.currentTime = video.currentTime + 1 / fps;
      }
    }, true);
    video.currentTime = Number(startTime || 0) + 0.35 / fps;
  });
}