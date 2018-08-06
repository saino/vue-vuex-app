module.exports = {
  configureWebpack: {
  },
  css: {
    loaderOptions: {
      sass: {
        data: '@import "src/assets/base.scss";'
      }
    }
  }
}