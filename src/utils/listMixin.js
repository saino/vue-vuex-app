// 对接后端的通用列表组件
// TODO: 翻页改成指定明确的 offset，则直接用当前 list.length 就能支持新加元素不影响翻页

import { get } from 'vuex-pathify'
import { api } from '@/utils/api'

export default (loadPath, deletePath, extender) => ({
  data: () => ({
    list: [],
    page: 0,
    total: 0,
    allLoaded: false,
    busy: false,
  }),
  computed: {
    user: get('user'),
    cantLoad() {
      return !this.user.loggedIn || this.allLoaded || this.busy;
    }
  },
  methods: {
    insert(item) {
      extender && extender(item);
      this.list.unshift(item);
    },
    loadMore() {
      if (this.allLoaded) return;
      this.busy = true;
      // 自动带上 route 里的所有 props 作为参数
      api.post(loadPath, {...this.$props, page: this.page + 1})
        .then(resp => {
          if (extender) {
            resp.result.forEach(extender);
          }
          this.list = this.list.concat(resp.result);
          this.total = resp.total;
          this.page = resp.currentPage;
          this.allLoaded = resp.currentPage == resp.end;
          this.busy = false;
        });
    },
    remove(index) {
      const item = this.list[index];
      api.post(deletePath, {id: item.id})
        .then(() => {
          this.list.splice(index, 1); // TODO: 改成重新按 ID 搜索，否则异步回调时序号可能已发生变化
        });
    },
    reset() {
      this.list = [];
      this.page = 0;
      this.total = 0;
      this.allLoaded = false;
      this.busy = false;
    },
  },
  watch: {
    'user.loggedIn': function(val) {
      // 登出自动清空列表
      if (!val) {
        this.reset();
      }
    }
  },
})