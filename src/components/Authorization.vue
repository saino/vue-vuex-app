<template>
  <div class="authorization">
    <a class="button" @click="isLoginForm = true; $modal.show('auth')">登录</a> | 
    <a class="button" @click="isLoginForm = false; $modal.show('auth')">注册</a>
    <modal name="auth" classes="transparent"
      :width="360" height="auto" :pivot-y="0.5"
      :adaptive="true" :reset="true">
      <form class="modal" autocomplete="false" action="javascript:;" @submit.prevent="validateBeforeSubmit">
        <div class="modal-title">
          <div class="tab" :class="{ active: isLoginForm }" @click="isLoginForm = true">登录</div>
          <div class="tab" :class="{ active: !isLoginForm }" @click="isLoginForm = false">注册</div>
        </div>
        <div class="loading" v-show="$wait.is('auth')">
          <spinner message="提交中..." text-fg-color="#fff" />
        </div>
        <fieldset class="modal-form" :disabled="$wait.is('auth')">
          <div class="field">
            <input placeholder="请输入手机号" type="text" name="phone" data-vv-as="手机号"
              v-model="form.phone"
              v-validate="'required|digits:11'"
              :class="{ error: errors.has('phone') }">
            <span class="error-tip" v-show="errors.has('phone')">{{ errors.first('phone') }}</span>
          </div>
          <div class="field verify-code" v-if="!isLoginForm">
            <input placeholder="请输入验证码" type="text" name="verifyCode" data-vv-as="验证码"
              v-model="form.verifyCode"
              v-validate="'required|digits:4'"
              :class="{ error: errors.has('verifyCode') }">
            <button class="form-btn" type="button" @click="sendVerifyCode"
              :disabled="errors.has('phone') || $wait.is('sendingCode')">
              {{ $wait.is('sendingCode') ? '验证码发送中...' : '发送验证码' }}
            </button>
            <span class="error-tip" v-show="errors.has('verifyCode')">{{ errors.first('verifyCode') }}</span>
          </div>
          <div class="field">
            <input placeholder="请输入密码" type="password" name="password" data-vv-as="密码"
              v-model="form.password"
              v-validate="'required|min:3'"
              :class="{ error: errors.has('password') }">
            <span class="error-tip" v-show="errors.has('password')">{{ errors.first('password') }}</span>
          </div>
          <div class="field" v-if="!isLoginForm">
            <input placeholder="请再次确认密码" type="password" name="password-cfm" data-vv-as="密码"
              v-model="form.passwordCfm"
              v-validate="{ is: form.password }"
              :class="{ error: errors.has('password-cfm') }">
            <span class="error-tip" v-show="errors.has('password-cfm')">{{ errors.first('password-cfm') }}</span>
          </div>
          <div class="submit">
            <button class="form-btn" type="submit"
              :disabled="errors.any()">{{ isLoginForm ? '登录' : '注册' }}</button>
          </div>
        </fieldset>
      </form>
    </modal>
  </div>
</template>

<script>
import { api } from '@/utils/api'
import Spinner from 'vue-simple-spinner'

export default {
  name: 'Authorization',
  components: {
    Spinner,
  },
  data: () => ({
    isLoginForm: true,
    form: {
      phone: '',
      password: '',
      passwordCfm: '',
      verifyCode: '',
    }
  }),
  methods: {
    sendVerifyCode() {
      this.$validator.validate('phone').then(() => {
        this.$wait.start('sendingCode');
        api.post('/auth/sendVerifyCode', {phone: this.form.phone})
          .then(() => {
            this.$notify({
              group: 'top',
              text: `验证码已发送`,
              duration: 2000,
            });
          }).finally(() => {
            // TODO: 暂时禁止发送倒计时
            this.$wait.end('sendingCode');
          });
      });
    },
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
  flex: 0 0 100px;
  color: #fff;
}
.button {
  cursor: pointer;
}

.modal {
  @include flex-col;
  color: #fff;
  font-size: 14px;
}
.modal-title {
  @include flex-row;
}
.tab {
  padding: 10px;
  cursor: pointer;
  @include modal-title-bg;
  &.active {
    @include main-color;
    background-color: transparent;
  }
}
.loading {
  @include absolute-mask;
  @include center;
  background-color: rgba(0,0,0,0.4);
}
.modal-form {
  @include flex-col;
  width: 240px;
  align-self: center;
  margin: 32px 0;
}
.field {
  margin-bottom: 16px;
  &.verify-code {
    input, .form-btn {
      width: 50%;
    }
  }
}
input {
  width: 100%;
  height: 40px;
  padding: 0 16px;
  font-size: 14px;
  background-color: rgba(0,0,0,0.60);
  color: #fff;
  border: none;
  border-bottom: 1px solid black;
  @include border-gradient;
}
.error-tip {
  color: #f55;
  font-weight: bold;
}
.form-btn {
  width: 100%;
  height: 40px;
  font-size: 14px;
  @include button-gradient;
  @include main-color(true);
  border: none;
  border-top: 1px solid black;
  @include border-gradient;
}
.submit {
  padding-top: 10px;
}
</style>
