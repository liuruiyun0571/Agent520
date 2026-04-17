/**
 * 权限工具函数
 * 用于组件内权限检查
 */

import { useUserStore } from '@/stores/user';

/**
 * 检查是否有指定权限
 * @param {string|string[]} permission 权限编码
 * @returns {boolean}
 */
export function hasPermission(permission) {
  const userStore = useUserStore();
  return userStore.hasPermission(permission);
}

/**
 * 检查是否有指定角色
 * @param {string|string[]} role 角色编码
 * @returns {boolean}
 */
export function hasRole(role) {
  const userStore = useUserStore();
  return userStore.hasRole(role);
}

/**
 * 检查是否为管理员
 * @returns {boolean}
 */
export function isAdmin() {
  const userStore = useUserStore();
  return userStore.isAdmin;
}

/**
 * 获取数据权限范围
 * @returns {string} 'personal' | 'team' | 'dept' | 'all'
 */
export function getDataScope() {
  const userStore = useUserStore();
  return userStore.dataScope;
}

/**
 * 权限指令 (用于v-permission)
 * 使用方式: v-permission="'project:create'" 或 v-permission="['project:create', 'project:edit']"
 */
export const permissionDirective = {
  mounted(el, binding) {
    const { value } = binding;
    if (!value) return;
    
    const userStore = useUserStore();
    const hasPerm = userStore.hasPermission(value);
    
    if (!hasPerm) {
      el.parentNode?.removeChild(el);
    }
  }
};

/**
 * 角色指令 (用于v-role)
 * 使用方式: v-role="'admin'" 或 v-role="['admin', 'finance']"
 */
export const roleDirective = {
  mounted(el, binding) {
    const { value } = binding;
    if (!value) return;
    
    const userStore = useUserStore();
    const hasRoleFlag = userStore.hasRole(value);
    
    if (!hasRoleFlag) {
      el.parentNode?.removeChild(el);
    }
  }
};
