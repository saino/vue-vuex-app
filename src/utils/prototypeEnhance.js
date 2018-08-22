Object.defineProperty(Array.prototype, 'has', {
  value(searchElement) {
    return this.indexOf(searchElement) !== -1;
  }
});

Object.defineProperties(Object.prototype, {
  // avoid redefine
  extendProps: {
    value(extendObj) {
      for (let name in extendObj) {
        if (!this.hasOwnProperty(name)) {
          this[name] = extendObj[name];
        }
      }
      return this;
    }
  },
  // @example  {a: 1, b: 2, c: 3}.pickKeys(['a','b']) => {a: 1, b: 2}
  pickKeys: {
    value(keys) {
      const result = {};
      for (let key of keys) {
        if (key in this) {
          result[key] = this[key];
        }
      }
      return result;
    }
  },
  // @example  {a: [1, {foo: {bar: 2}}]}.pathGet('a.1.foo.bar') === 2
  pathGet: {
    value(keyPath) {
      return keyPath.split('.').reduce((previous, current) => {
        // allow unexist path
        if (typeof previous === 'undefined') {
          return undefined;
        }
        return previous[current];
      }, this);
    }
  },
  // keyPath 必须保证叶子节点的父节点存在且是数组/对象，否则 Vue 不能保证响应新字段
  pathSet: {
    value(keyPath, value) {
      const keys = keyPath.split('.');
      const lastKey = keys.pop();
      const parent = keys.reduce((previous, current) => {
        return previous[current];
      }, this);
      // 有则使用 Vue 的 set 方法保证响应
      if (parent.$set) {
        parent.$set(lastKey, value);
      } else {
        parent[lastKey] = value;
      }
      return this;
    }
  },
  pathDel: {
    value(keyPath) {
      const keys = keyPath.split('.');
      const lastKey = keys.pop();
      const parent = keys.reduce((previous, current) => {
        return previous[current];
      }, this);
      if (parent.$delete) {
        parent.$delete(lastKey);
      } else {
        delete parent[lastKey];
      }
      return this;
    }
  },
  // @example  {a: []}.batchSet({'a.b': 1, 'b': 2}) => {a: {b: 1}, b: 2}
  batchSet: {
    value: function(dictOrPath, value) {
      let dict = {};
      if (typeof dictOrPath == 'string') {
        dict[dictOrPath] = value;
      } else {
        dict = dictOrPath;
      }
      for (let key in dict) {
        this.pathSet(key, dict[key]);
      }
      return this;
    }
  }
});

export {}