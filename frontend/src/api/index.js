import axios from 'axios';
import { Toast } from 'vant';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    const { response } = error;
    if (response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    } else {
      Toast.fail(response?.data?.message || '网络错误');
    }
    return Promise.reject(error);
  }
);

// 组织架构API
export const orgApi = {
  getTree: () => api.get('/orgs/tree'),
  getList: (params) => api.get('/orgs/list', { params }),
  getById: (id) => api.get(`/orgs/${id}`),
  create: (data) => api.post('/orgs', data),
  update: (id, data) => api.put(`/orgs/${id}`, data),
  delete: (id) => api.delete(`/orgs/${id}`),
  importExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/orgs/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// 人员API
export const employeeApi = {
  getList: (params) => api.get('/employees/list', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  importExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/employees/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// 配置API
export const configApi = {
  get: () => api.get('/config'),
  update: (data) => api.put('/config', data)
};

// 项目API
export const projectApi = {
  getList: (params) => api.get('/projects/list', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  allocate: (id, data) => api.post(`/projects/${id}/allocate`, data)
};

// 回款API
export const paymentApi = {
  getList: (params) => api.get('/payments/list', { params }),
  create: (data) => api.post('/payments', data),
  approve: (id) => api.post(`/payments/${id}/approve`)
};

// 项目人员API
export const projectEmpApi = {
  getList: (params) => api.get('/project-emps/list', { params }),
  create: (data) => api.post('/project-emps', data),
  delete: (id) => api.delete(`/project-emps/${id}`)
};

// 月度成本API
export const monthlyCostApi = {
  getList: (params) => api.get('/monthly-costs/list', { params }),
  import: (file, month, orgId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('month', month);
    formData.append('orgId', orgId);
    return api.post('/monthly-costs/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  calculate: (data) => api.post('/monthly-costs/calculate', data),
  confirm: (id) => api.post(`/monthly-costs/${id}/confirm`)
};

// 团队账户API
export const teamAccountApi = {
  getList: (params) => api.get('/team-accounts/list', { params }),
  getByOrgAndMonth: (orgId, month) => api.get('/team-accounts/detail', { params: { orgId, month } })
};

// 数据工厂API
export const dataFactoryApi = {
  getStatus: () => api.get('/data-factory/status'),
  createMonthlyAccounts: (month) => api.post('/data-factory/monthly-accounts/create', { month }),
  checkOverdraft: () => api.post('/data-factory/overdraft-check'),
  transferProvidentFund: (month) => api.post('/data-factory/provident-fund/transfer', { month }),
  monthlySettlement: (month) => api.post('/data-factory/monthly-settlement', { month }),
  runJob: (jobName, params) => api.post(`/data-factory/jobs/${jobName}/run`, { params })
};

// 调岗历史API
export const empHistoryApi = {
  getList: (params) => api.get('/emp-history/list', { params }),
  create: (data) => api.post('/emp-history', data)
};

// 角色权限API (Phase 6)
export const roleApi = {
  getList: (params) => api.get('/roles/list', { params }),
  getById: (id) => api.get(`/roles/${id}`),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
  getPermissions: () => api.get('/roles/permissions'),
  assignToUser: (data) => api.post('/roles/assign', data)
};

// 通知消息API (Phase 6)
export const notificationApi = {
  getList: (params) => api.get('/notifications/list', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (notifyId) => api.post(`/notifications/${notifyId}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  delete: (notifyId) => api.delete(`/notifications/${notifyId}`)
};

// 操作日志API (Phase 6)
export const operationLogApi = {
  getList: (params) => api.get('/operation-logs/list', { params }),
  getModules: () => api.get('/operation-logs/modules'),
  getActions: () => api.get('/operation-logs/actions')
};

export default api;
