<template>
  <div class="authorization">
    <button @click="isLoginForm = true; $modal.show('auth')">登录</button>
    <button @click="isLoginForm = false; $modal.show('auth')">注册</button>
    <modal name="auth" :width="300" :height="200">
      <form autocomplete="false" action="javascript:;" @submit.prevent="validateBeforeSubmit">
        <div class="modal">
          <div class="modal-title">
            <span class="tab" :class="{active: isLoginForm}" @click="isLoginForm = true">登录</span>
            <span class="tab" :class="{active: !isLoginForm}" @click="isLoginForm = false">注册</span>
          </div>
          <fieldset class="modal-form" v-wait:disabled="'auth'">
            <div>
              <input placeholder="手机号" type="text" name="phone"
                v-model="form.phone"
                v-validate="'required|digits:11'"
                :class="{'input': true, 'is-danger': errors.has('phone') }">
              <span v-show="errors.has('phone')">{{ errors.first('phone') }}</span>
            </div>
            <div>
              <input placeholder="密码" type="password" name="password"
                v-model="form.password"
                v-validate="'required|min:3'"
                :class="{'input': true, 'is-danger': errors.has('password') }">
              <span v-show="errors.has('password')">{{ errors.first('password') }}</span>
            </div>
            <div v-if="!isLoginForm">
              <input placeholder="确认密码" type="password" name="password-cfm"
                v-model="form.passwordCfm"
                v-validate="{ is: form.password }"
                :class="{'input': true, 'is-danger': errors.has('password-cfm') }">
              <span v-show="errors.has('password-cfm')">{{ errors.first('password-cfm') }}</span>
            </div>
            <div class="button-set">
              <button type="submit">{{ isLoginForm ? '登录' : '注册' }}</button>
              <button type="button" @click="$modal.hide('auth')">关闭</button>
            </div>
          </fieldset>
        </div>
      </form>
    </modal>
  </div>
</template>

<script>
export default {
  name: 'Authorization',
  data: () => ({
    isLoginForm: true,
    form: {
      phone: '',
      password: '',
      passwordCfm: '',
    }
  }),
  methods: {
    validateBeforeSubmit() {
      this.$validator.validateAll().then(result => {
        if (result) {
          const action = this.isLoginForm ? 'login' : 'register';
          this.$wait.start('auth');
          this.$store.dispatch(action, this.form).then(() => {
            this.$router.push('/dashboard');
          }).finally(() => {
            this.$wait.end('auth');
          });
        }
      });
    },
  }
}
</script>

<style scoped lang="scss">
.authorization {
  display: inline;
}
.tab {
  padding: 10px;
  cursor: pointer;
  &.active {
    background-color: #ddf;
  }
}
</style>
