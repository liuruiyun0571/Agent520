#!/usr/bin/env node
/**
 * 部署前环境检查脚本
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(command, name) {
  try {
    execSync(command, { stdio: 'ignore' });
    log(`✓ ${name} 已安装`, 'green');
    return true;
  } catch {
    log(`✗ ${name} 未安装`, 'red');
    return false;
  }
}

function checkFile(filePath, name) {
  if (fs.existsSync(filePath)) {
    log(`✓ ${name} 存在`, 'green');
    return true;
  } else {
    log(`✗ ${name} 不存在: ${filePath}`, 'red');
    return false;
  }
}

function checkEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    log(`✗ 环境文件不存在: ${filePath}`, 'red');
    log('  请复制 .env.example 为 .env 并配置', 'yellow');
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const required = ['DB_PASSWORD', 'JWT_SECRET'];
  const missing = [];

  for (const key of required) {
    const regex = new RegExp(`^${key}=.+`, 'm');
    if (!regex.test(content) || content.includes(`${key}=your_`) || content.includes(`${key}=change_`)) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    log(`✗ 环境变量未配置: ${missing.join(', ')}`, 'red');
    return false;
  }

  log(`✓ 环境文件配置正确`, 'green');
  return true;
}

async function main() {
  log('\n🔍 云工程绩效管理系统 - 部署前检查\n', 'blue');

  let allPassed = true;

  // 检查工具
  log('📦 检查必要工具...', 'blue');
  allPassed &= check('docker --version', 'Docker');
  allPassed &= check('docker-compose --version', 'Docker Compose');
  allPassed &= check('git --version', 'Git');
  allPassed &= check('node --version', 'Node.js');

  // 检查文件
  log('\n📁 检查项目文件...', 'blue');
  allPassed &= checkFile('docker-compose.yml', 'docker-compose.yml');
  allPassed &= checkFile('backend/Dockerfile', '后端 Dockerfile');
  allPassed &= checkFile('frontend/Dockerfile', '前端 Dockerfile');
  allPassed &= checkFile('backend/package.json', '后端 package.json');
  allPassed &= checkFile('frontend/package.json', '前端 package.json');

  // 检查环境配置
  log('\n⚙️  检查环境配置...', 'blue');
  allPassed &= checkEnvFile('.env');

  // 检查端口占用
  log('\n🔌 检查端口占用...', 'blue');
  const ports = [80, 3000, 5432];
  for (const port of ports) {
    try {
      execSync(`lsof -i :${port}`, { stdio: 'ignore' });
      log(`⚠️  端口 ${port} 已被占用`, 'yellow');
    } catch {
      log(`✓ 端口 ${port} 可用`, 'green');
    }
  }

  // 检查磁盘空间
  log('\n💾 检查磁盘空间...', 'blue');
  try {
    const output = execSync('df -h .', { encoding: 'utf8' });
    const lines = output.trim().split('\n');
    const dataLine = lines[1];
    const parts = dataLine.split(/\s+/);
    const available = parts[3];
    const usePercent = parts[4];
    
    log(`  可用空间: ${available}, 使用率: ${usePercent}`, 'reset');
    
    if (parseInt(usePercent) > 80) {
      log('⚠️  磁盘使用率超过80%，建议清理', 'yellow');
    }
  } catch {
    log('  无法获取磁盘信息', 'yellow');
  }

  // 总结
  log('\n' + '='.repeat(50), 'blue');
  if (allPassed) {
    log('✅ 所有检查通过，可以开始部署！', 'green');
    log('\n部署命令:', 'blue');
    log('  docker-compose up -d', 'reset');
    log('  docker-compose exec backend node scripts/initDatabase.js', 'reset');
  } else {
    log('❌ 部分检查未通过，请修复后再部署', 'red');
    process.exit(1);
  }
  log('='.repeat(50) + '\n', 'blue');
}

main().catch(err => {
  log(`\n❌ 检查出错: ${err.message}`, 'red');
  process.exit(1);
});
