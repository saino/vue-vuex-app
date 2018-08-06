const VueConfirm = {}

VueConfirm.install = function (Vue, options) {
  Vue.prototype.$cfm = function (message, callback) {
    return this.$cfmWhen(true, message, callback);
  },
  Vue.prototype.$cfmWhen = function (valueToCheck, message, callback) {
    const promise = new Promise((resolve, reject) => {
      if (!valueToCheck) {
        return resolve();
      }
      this.$modal.show('dialog', {
        text: message,
        buttons: [
          {
            title: '确认',
            handler: () => {
              this.$modal.hide('dialog');
              resolve();
            }
          },
          {
            title: '取消',
            default: true,
          }
        ]
      });
    });
    if (typeof callback == 'function') {
      return promise.then(callback);
    } else {
      return promise;
    }
  }
}

export default VueConfirm;