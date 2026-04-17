import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

const API_BASE = '/api';

export const useUserStore = defineStore('user', () => {
  // State
  const token = ref(localStorage.getItem('token') || '');
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || '{}'));

  // Getters
  const isLoggedIn = computed(() => !!token.value);
  
  // 检查是否为管理员 (兼容旧版role字段和新版roles数组)
  const isAdmin = computed(() => {
    // 新版: roles数组中包含admin
    if (userInfo.value?.roles) {
      return userInfo.value.roles.some(r => r.roleCode === 'admin');
    }
    // 旧版: role字段为'系统管理员'
    return userInfo.value?.role === '系统管理员';
  });

  // 获取用户所有权限
  const permissions = computed(() => {
    if (!userInfo.value?.roles) return [];
    // 合并所有角色的权限
    const perms = userInfo.value.roles.flatMap(r => r.permissions || []);
    return [...new Set(perms)]; // 去重
  });

  // 获取数据权限范围
  const dataScope = computed(() => {
    if (!userInfo.value?.roles) return 'personal';
    const scopeLevel = { personal: 1, team: 2, dept: 3, all: 4 };
    return userInfo.value.roles.reduce((max, r) => {
      return scopeLevel[r.dataScope] > scopeLevel[max] ? r.dataScope : max;
    }, 'personal');
  });

  // Actions
  const setToken = (newToken) => {
    token.value = newToken;
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const setUserInfo = (info) => {
    userInfo.value = info;
    localStorage.setItem('userInfo', JSON.stringify(info));
  };

  const login = async (credentials) => {
    const { data } = await axios.post(`${API_BASE}/auth/login`, credentials);
    if (data.success) {
      setToken(data.data.token);
      setUserInfo(data.data.user);
    }
    return data;
  };

  const logout = () => {
    token.value = '';
    userInfo.value = {};
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    delete axios.defaults.headers.common['Authorization'];
  };

  const fetchUserInfo = async () => {
    const { data } = await axios.get(`${API_BASE}/auth/me`);
    if (data.success) {
      setUserInfo(data.data);
    }
  };

  /**
   * 检查是否有指定权限
   * @param {string|string[]} required 需要的权限
   * @returns {boolean}
   */
  const hasPermission = (required) => {
    const perms = permissions.value;
    // 超级管理员拥有所有权限
    if (perms.includes('*')) return true;
    
    if (Array.isArray(required)) {
      return required.every(p => perms.includes(p));
    }
    return perms.includes(required);
  };

  /**
   * 检查是否有指定角色
   * @param {string|string[]} required 需要的角色
   * @returns {boolean}
   */
  const hasRole = (required) => {
    if (!userInfo.value?.roles) return false;
    const roleCodes = userInfo.value.roles.map(r => r.roleCode);
    
    if (Array.isArray(required)) {
      return required.some(r => roleCodes.includes(r));
    }
    return roleCodes.includes(required);
  };

  // 初始化axios
  if (token.value) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    permissions,
    dataScope,
    login,
    logout,
    fetchUserInfo,
    hasPermission,
    hasRole
  };
});
