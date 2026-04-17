/**
 * API 集成测试 - 认证和权限
 */

const request = require('supertest');
const app = require('../../src/app');

describe('认证 API', () => {
  describe('POST /api/auth/login', () => {
    it('应该返回 401 当用户名或密码错误', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('应该返回 400 当缺少必填字段', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin'
          // 缺少 password
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('应该返回 401 当未提供令牌', async () => {
      const response = await request(app)
        .get('/api/auth/me');
      
      expect(response.status).toBe(401);
    });

    it('应该返回 401 当令牌无效', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
    });
  });
});

describe('API 响应格式', () => {
  it('应该返回标准响应格式', async () => {
    const response = await request(app)
      .get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
  });
});
