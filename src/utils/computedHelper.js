/**
 * 用于快速定义组件双向 computed 字段的方法
 * 要求 store 内必须有 entities State、currentId State 和 update Mutation（通常由 listStoreMaker 定义）
 *
 * @param {string} moduleAndKeyPath  类似 vue-pathify 语法 'module@key1.key2.key3' 例子 'rotos@viewConfig.currentFrame'
 * 为效率考虑暂时只支持一级模块
 */
export const currentSync = (moduleAndKeyPath, entitiesState = 'entities', currentIdState = 'currentId') => {
  const [mod, keyPath] = moduleAndKeyPath.split('@');
  return {
    get() {
      const state = this.$store.state[mod];
      if (state[currentIdState] === false) return undefined;
      return state[entitiesState][state[currentIdState]].pathGet(keyPath);
    },
    set(value) {
      const state = this.$store.state[mod];
      if (state[currentIdState] === false) return;
      this.$store.commit(mod + '/update', [state[currentIdState], keyPath, value]);
    },
  }
}
