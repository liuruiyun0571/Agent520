// 统一响应格式
const success = (data = null, message = '操作成功') => ({
  code: 200,
  success: true,
  message,
  data,
  timestamp: new Date().toISOString()
});

const error = (code = 500, message = '操作失败', details = null) => ({
  code,
  success: false,
  message,
  details,
  timestamp: new Date().toISOString()
});

module.exports = { success, error };
