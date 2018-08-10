import LocalForage from 'localforage'
import merge from 'deepmerge'

export default function (options) {
  // Configure localforage
  LocalForage.config({
    driver      : LocalForage.IndexedDB,
    name        : 'VueX',
    version     : options.dbVer || 1.0,
    storeName   : options.storeName || 'vuex'
  })

  return store => {
    const key = options.key || 'data';
    LocalForage.getItem(key).then(savedState => {
      if (typeof savedState === 'object' && savedState !== null) {
        if (options.strict) {
          store.commit(options.mergeMutation, savedState)
        } else {
          if (store.state) {
            savedState = merge(store.state, savedState)
          }
          store.replaceState(savedState)
        }
        if (options.initHook) {
          options.initHook(store)
        }
      }
      store.subscribe((mutations, state) => {
        LocalForage.setItem(key, options.filterFields ? state.pick(options.filterFields) : state)
      })
    })
  }
}