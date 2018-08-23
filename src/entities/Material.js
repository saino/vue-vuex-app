import moment from "moment";
import "moment-duration-format";
import filesize from "filesize";

import { HOST } from '@/config'

export default function(obj) {
  obj.extendProps({
    frames: [],
    decoded: false,
  });

  // ignore redefine
  try {
    Object.defineProperties(obj, {
      url: {
        get() { return HOST + this.path; }
      },
      videoUrl: {
        get() { return HOST + this.video_path; }
      },
      thumbUrl: {
        get() { return `${HOST}/data/materials/${this.id}/thumb.jpg`; }
      },
      framePath: {
        get() { return `${HOST}/data/materials/${this.id}/sequence/`; }
      },
      maxFrame: {
        get() { return this.properties.length - 1; }
      },
      formattedDuration: {
        get() {
          if (!this.properties.duration) {
            return "";
          }
          return moment.duration(Number(this.properties.duration), 'seconds').format("hh:mm:ss", {trim: false});
        }
      },
      formattedSize: {
        get() {
          if (!this.properties.filesize) {
            return "";
          }
          return filesize(this.properties.filesize, {round: 0, spacer: ''});
        }
      },
      frameThumb: {
        value(frame) {
          return `${this.framePath}thumb_${String(frame).padStart(5,'0')}.jpg`;
        }
      },
      frameToTime: {
        value(frame) {
          return (frame + 0.35) / this.properties.fps + Number(this.properties.startTime || 0);
        }
      },
      timeToFrame: {
        value(time) {
          return Math.floor((time - Number(this.properties.startTime || 0)) * this.properties.fps - 0.35);
        }
      }
    });
  }
  catch (e) {}

  return obj;
}