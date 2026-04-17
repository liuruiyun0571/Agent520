<template>
  <div class="dashboard">
    <!-- 头部统计 -->
    <van-grid :column-num="2" :gutter="10" class="stats-grid">
      <van-grid-item>
        <div class="stat-card">
          <div class="stat-value text-green">{{ stats.healthyTeams }}</div>
          <div class="stat-label">健康团队</div>
        </div>
      </van-grid-item>
      <van-grid-item>
        <div class="stat-card">
          <div class="stat-value text-red">{{ stats.warningTeams }}</div>
          <div class="stat-label">预警团队</div>
        </div>
      </van-grid-item>
      <van-grid-item>
        <div class="stat-card">
          <div class="stat-value">{{ formatMoney(stats.monthlyIncome) }}</div>
          <div class="stat-label">本月回款</div>
        </div>
      </van-grid-item>
      <van-grid-item>
        <div class="stat-card">
          <div class="stat-value">{{ formatMoney(stats.monthlyCost) }}</div>
          <div class="stat-label">本月成本</div>
        </div>
      </van-grid-item>
    </van-grid>

    <!-- 团队资金热力图 -->
    <van-cell-group title="团队资金热力图" class="team-heatmap">
      <div class="team-cards">
        <div 
          v-for="team in teams" 
          :key="team.id"
          class="team-card"
          :class="getStatusClass(team.currentStatus)"
          @click="goToTeam(team)"
        >
          <div class="team-name">{{ team.orgName }}</div>
          <div class="team-balance">{{ formatMoney(team.providentFundBalance) }}</div>
          <div class="team-status">{{ team.currentStatus }}</div>
        </div>
      </div>
    </van-cell-group>

    <!-- 待处理预警 -->
    <van-cell-group title="预警待处理" v-if="warnings.length > 0">
      <van-cell 
        v-for="warn in warnings" 
        :key="warn.id"
        :title="warn.orgName"
        :label="warn.message"
        is-link
      >
        <template #right-icon>
          <van-tag :type="warn.level === 'high' ? 'danger' : 'warning'">
            {{ warn.level === 'high' ? '紧急' : '警告' }}
          </van-tag>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 快捷操作 -->
    <van-cell-group title="快捷操作">
      <van-grid :column-num="4" :border="false">
        <van-grid-item icon="records" text="登记回款" @click="$router.push('/project')" />
        <van-grid-item icon="balance-pay" text="登记成本" @click="$router.push('/cost')" />
        <van-grid-item icon="chart-trending-o" text="查看报表" />
        <van-grid-item icon="setting-o" text="系统配置" @click="$router.push('/org')" />
      </van-grid>
    </van-cell-group>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();

const stats = ref({
  healthyTeams: 0,
  warningTeams: 0,
  monthlyIncome: 0,
  monthlyCost: 0
});

const teams = ref([]);
const warnings = ref([]);

const formatMoney = (val) => {
  if (!val) return '¥0';
  return '¥' + (val / 10000).toFixed(1) + '万';
};

const getStatusClass = (status) => {
  const map = {
    '健康': 'status-healthy',
    '预警': 'status-warning',
    '冻结': 'status-frozen',
    '保护期': 'status-protected'
  };
  return map[status] || '';
};

const goToTeam = (team) => {
  router.push(`/team?id=${team.orgId}`);
};

const fetchData = async () => {
  try {
    const { data } = await axios.get('/api/orgs/list');
    if (data.success) {
      teams.value = data.data.list;
      stats.value.healthyTeams = teams.value.filter(t => t.currentStatus === '健康').length;
      stats.value.warningTeams = teams.value.filter(t => t.currentStatus !== '健康').length;
    }
  } catch (err) {
    console.error('获取数据失败:', err);
  }
};

onMounted(fetchData);
</script>

<style scoped>
.dashboard {
  padding: 12px;
}

.stats-grid {
  margin-bottom: 12px;
}

.stat-card {
  text-align: center;
  padding: 16px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.text-green { color: #07c160; }
.text-red { color: #ee0a24; }

.team-heatmap {
  margin-bottom: 12px;
}

.team-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 12px;
}

.team-card {
  padding: 12px 8px;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
}

.team-name {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}

.team-balance {
  font-size: 14px;
  font-weight: bold;
}

.team-status {
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.8;
}

.status-healthy {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-warning {
  background: #fff3e0;
  color: #ef6c00;
}

.status-frozen {
  background: #ffebee;
  color: #c62828;
}

.status-protected {
  background: #f3e5f5;
  color: #6a1b9a;
}
</style>
