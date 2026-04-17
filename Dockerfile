FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY backend/package*.json ./
RUN npm install --production

# 复制代码
COPY backend/ ./

# 创建数据库目录
RUN mkdir -p /tmp

# 暴露端口
EXPOSE 10000

# 启动
CMD ["node", "server.js"]
