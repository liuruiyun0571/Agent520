-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  emp_id VARCHAR(20),
  role VARCHAR(50) NOT NULL DEFAULT '普通用户',
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP,
  ding_user_id VARCHAR(100) UNIQUE,
  ding_union_id VARCHAR(100),
  name VARCHAR(50),
  avatar VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建默认管理员账号
INSERT INTO users (username, password_hash, role, name, is_active) 
VALUES ('admin', '$2a$10$YourHashedPasswordHere', '系统管理员', '管理员', TRUE)
ON CONFLICT (username) DO NOTHING;
