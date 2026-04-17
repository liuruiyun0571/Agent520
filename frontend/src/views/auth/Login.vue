<template>
  <div class="login-page">
    <div class="login-box">
      <h1 class="title">云工程绩效管理</h1>
      <p class="subtitle">预算制管理系统</p>
      
      <!-- 钉钉扫码登录 -->
      <div id="dingtalk-qr-container" class="dingtalk-qr"></div>
      
      <div class="divider">
        <span>或</span>
      </div>
      
      <!-- 账号密码登录 -->
      <van-form @submit="onSubmit">
        <van-field
          v-model="form.username"
          name="username"
          label="用户名"
          placeholder="请输入用户名"
          :rules="[{ required: true, message: '请填写用户名' }]"
        />
        <van-field
          v-model="form.password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请填写密码' }]"
        />
        <div class="submit-btn">
          <van-button round block type="primary" native-type="submit" :loading="loading">
            登录
          </van-button>
        </div>
      </van-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Toast } from 'vant';
import { useUserStore } from '@/stores/user';
import axios from 'axios';

const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);

const form = reactive({
  username: '',
  password: ''
});

// 钉钉登录处理
const handleDingTalkLogin = async (code) => {
  try {
    Toast.loading({ message: '登录中...', forbidClick: true });
    
    const response = await axios.post('/api/dingtalk/login-by-code', { code });
    
    if (response.data?.code === 200) {
      const { token, user } = response.data.data;
      
      // 保存 token
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      Toast.success('钉钉登录成功');
      
      // 新用户提示完善信息
      if (user.isNewUser) {
        Toast('请完善个人信息');
      }
      
      router.push('/');
    } else {
      Toast.fail(response.data?.message || '登录失败');
    }
  } catch (err) {
    console.error('钉钉登录失败:', err);
    Toast.fail('钉钉登录失败');
  }
};

// 初始化钉钉扫码
const initDingTalkQR = async () => {
  try {
    // 获取 JS 配置
    const currentUrl = window.location.href.split('#')[0];
    const configRes = await axios.get(`/api/dingtalk/js-config?url=${encodeURIComponent(currentUrl)}`);
    
    if (configRes.data?.code !== 200) {
      console.error('获取钉钉配置失败');
      return;
    }
    
    const { corpId, agentId } = configRes.data.data;
    
    // 加载钉钉 JS-SDK
    const script = document.createElement('script');
    script.src = 'https://g.alicdn.com/dingding/dinglogin/0.0.5/ddLogin.js';
    script.onload = () => {
      // 初始化扫码登录
      window.DTFrameLogin(
        {
          id: 'dingtalk-qr-container',
          width: 300,
          height: 300
        },
        {
          redirect_uri: encodeURIComponent(currentUrl),
          client_id: agentId,
          scope: 'openid',
          response_type: 'code',
          prompt: 'consent'
        },
        (result) => {
          // 扫码成功回调
          const { authCode } = result;
          handleDingTalkLogin(authCode);
        },
        (errorMsg) => {
          console.error('钉钉扫码失败:', errorMsg);
          Toast.fail('钉钉扫码失败');
        }
      );
    };
    document.head.appendChild(script);
  } catch (err) {
    console.error('初始化钉钉登录失败:', err);
  }
};

onMounted(() => {
  // 检查是否已有 token
  const token = localStorage.getItem('token');
  if (token) {
    router.push('/');
    return;
  }
  
  // 初始化钉钉登录
  initDingTalkQR();
});

// 账号密码登录
const onSubmit = async () => {
  loading.value = true;
  try {
    const result = await userStore.login(form);
    if (result.success) {
      Toast.success('登录成功');
      router.push('/');
    } else {
      Toast.fail(result.message || '登录失败');
    }
  } catch (err) {
    Toast.fail('网络错误');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-box {
  width: 100%;
  max-width: 360px;
  background: white;
  border-radius: 16px;
  padding: 40px 24px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}

.title {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.subtitle {
  text-align: center;
  font-size: 14px;
  color: #999;
  margin-bottom: 24px;
}

.dingtalk-qr {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  min-height: 300px;
}

.divider {
  display: flex;
  align-items: center;
  margin: 20px 0;
  color: #999;
  font-size: 14px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e0e0e0;
}

.divider span {
  padding: 0 16px;
}

.submit-btn {
  margin-top: 24px;
}
</style>
