Object.defineProperty(Array.prototype, 'has', {
  value: function(searchElement) {
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
  // @example  {a: 1, b: 2, c: 3}.pick(['a','b']) => {a: 1, b: 2}
  pick: {
    value: function(keys) {
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
    value: function(keyPath) {
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
    value: function(keyPath, value) {
      const keys = keyPath.split('.');
      const lastKey = keys.pop();
      const parent = keys.reduce((previous, current) => {
        return previous[current];
      }, this);
      parent[lastKey] = value;
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