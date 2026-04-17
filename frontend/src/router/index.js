import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/stores/user';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/Index.vue'),
        meta: { title: '驾驶舱', icon: 'chart-o' }
      },
      {
        path: 'team',
        name: 'Team',
        component: () => import('@/views/team/Index.vue'),
        meta: { title: '团队看板', icon: 'cluster-o' }
      },
      {
        path: 'project',
        name: 'Project',
        component: () => import('@/views/project/Index.vue'),
        meta: { title: '项目管理', icon: 'todo-list-o' }
      },
      {
        path: 'cost',
        name: 'Cost',
        component: () => import('@/views/cost/Index.vue'),
        meta: { title: '成本管理', icon: 'balance-list-o' }
      },
      {
        path: 'report',
        name: 'Report',
        component: () => import('@/views/report/Index.vue'),
        meta: { title: '报表中心', icon: 'bar-chart-o' }
      },
      {
        path: 'org',
        name: 'Org',
        component: () => import('@/views/org/Index.vue'),
        meta: { title: '组织架构', icon: 'friends-o', admin: true }
      },
      {
        path: 'employee',
        name: 'Employee',
        component: () => import('@/views/employee/Index.vue'),
        meta: { title: '人员管理', icon: 'contact-o', admin: true }
      },
      {
        path: 'admin/data-factory',
        name: 'DataFactory',
        component: () => import('@/views/admin/DataFactory.vue'),
        meta: { title: '数据工厂', icon: 'setting-o', admin: true }
      },
      {
        path: 'admin/role',
        name: 'Role',
        component: () => import('@/views/admin/Role.vue'),
        meta: { title: '角色权限', icon: 'manager-o', admin: true }
      },
      {
        path: 'notification',
        name: 'Notification',
        component: () => import('@/views/notification/Index.vue'),
        meta: { title: '消息通知', icon: 'bell', hideInTab: true }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  
  if (!to.meta.public && !userStore.token) {
    next('/login');
  } else {
    next();
  }
});

export default router;
