<template>
  <div class="report-center">
    <van-sticky>
      <van-tabs v-model:active="activeTab" type="card" class="report-tabs">
        <van-tab title="团队报表" name="team"></van-tab>
        <van-tab title="项目报表" name="project"></van-tab>
        <van-tab title="成本分析" name="cost"></van-tab>
      </van-tabs>
    </van-sticky>

    <!-- 团队报表 -->
    <div v-if="activeTab === 'team'" class="tab-content">
      <van-cell-group title="月份选择">
        <van-field
          v-model="selectedMonth"
          label="统计月份"
          readonly
          @click="showMonthPicker = true"
        />
      </van-cell-group>

      <van-cell-group title="全院概览">
        <van-grid :column-num="2" :gutter="10">
          <van-grid-item>
            <div class="stat-box">
              <div class="stat-value text-primary">{{ teamStats.totalTeams }}</div>
              <div class="stat-label">团队总数</div>
            </div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-box">
              <div class="stat-value text-success">{{ formatMoney(teamStats.totalBalance) }}</div>
              <div class="stat-label">总余额</div>
            </div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-box">
              <div class="stat-value text-warning">{{ formatMoney(teamStats.totalBonus) }}</div>
              <div class="stat-label">本月回款奖金</div>
            </div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-box">
              <div class="stat-value text-danger">{{ formatMoney(teamStats.totalCost) }}</div>
              <div class="stat-label">本月成本消耗</div>
            </div>
          </van-grid-item>
        </van-grid>
      </van-cell-group>

      <van-cell-group title="团队排名">
        <van-cell
          v-for="(team, index) in teamRanking"
          :key="team.orgId"
          :title="`${index + 1}. ${team.orgName}`"
          :label="`透支比例: ${team.cumulativeOverdraftRatio}%`"
          is-link
          @click="viewTeamDetail(team)"
        >
          <template #value>
            <div :class="getBalanceClass(team.closingBalance)">
              {{ formatMoney(team.closingBalance) }}
            </div>
          </template>
          <template #right-icon>
            <van-tag :type="getStatusType(team.accountStatus)">
              {{ team.accountStatus }}
            </van-tag>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 项目报表 -->
    <div v-if="activeTab === 'project'" class="tab-content">
      <van-cell-group title="项目统计">
        <van-grid :column-num="2" :gutter="10">
          <van-grid-item>
            <div class="stat-box">
              <div class="stat-value text-primary">{{ projectStats.total }}</div>
              <div class="stat-label">项目总数</div>
            </div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-box">
              <div class="stat-value text-success">{{ formatMoney(projectStats.totalContract) }}</div>
              <div class="stat-label">合同总额</div>
            </div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-box">
              <div class="stat-value text-warning">{{ formatMoney(projectStats.totalReceived) }}</div>
              <div class="stat-label">已回款</div>
            </div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-box">
              <div class="stat-value text-info">{{ projectStats.avgMargin }}%</div>
              <div class="stat-label">平均毛利率</div>
            </div>
          </van-grid-item>
        </van-grid>
      </van-cell-group>

      <van-cell-group title="回款进度">
        <van-cell
          v-for="proj in projectProgress"
          :key="proj.projectId"
          :title="proj.projectName"
          :label="`合同: ${formatMoney(proj.contractAmount)}`"
        >
          <template #value>
            <div class="progress-info">
              <van-progress 
                :percentage="proj.receiveProgress" 
                :stroke-width="8"
                :color="getProgressColor(proj.receiveProgress)"
              />
              <span class="progress-text">{{ proj.receiveProgress }}%</span>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 成本分析 -->
    <div v-if="activeTab === 'cost'" class="tab-content">
      <van-cell-group title="成本结构">
        <van-grid :column-num="2" :gutter="10">
          <van-grid-item>
            <div class="stat-box">
              <div class="stat-value text-primary">{{ formatMoney(costStats.totalLabor) }}</div>
              <div class="stat-label">人工成本</div>
            </div>
          </van-grid-item>
          <van-grid-item>
            <div class="stat-box">
              <div class="stat-value text-warning">{{ formatMoney(costStats.totalSubcontract) }}</div>
              <div class="stat-label">分包成本</div>
            </div>
          </van-grid-item>
        </van-grid>
      </van-cell-group>

      <van-cell-group title="团队成本对比">
        <van-cell
          v-for="cost in teamCostComparison"
          :key="cost.orgId"
          :title="cost.orgName"
        >
          <template #label>
            <div class="cost-bar">
              <div class="cost-item">
                <span class="cost-label">人工:</span>
                <span class="cost-value">{{ formatMoney(cost.laborCost) }}</span>
              </div>
              <div class="cost-item">
                <span class="cost-label">分包:</span>
                <span class="cost-value">{{ formatMoney(cost.subcontractCost) }}</span>
              </div>
            </div>
          </template>
          <template #value>
            <div class="total-cost">{{ formatMoney(cost.totalCost) }}</div>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 月份选择器 -->
    <van-popup v-model:show="showMonthPicker" position="bottom">
      <van-date-picker
        v-model="monthPickerValue"
        title="选择月份"
        :columns-type="['year', 'month']"
        @confirm="onMonthConfirm"
        @cancel="showMonthPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { orgApi, projectApi, teamAccountApi } from '@/api';

const router = useRouter();
const activeTab = ref('team');
const selectedMonth = ref(dayjs().format('YYYY-MM'));
const showMonthPicker = ref(false);
const monthPickerValue = ref([dayjs().year().toString(), (dayjs().month() + 1).toString().padStart(2, '0')]);

// 团队报表数据
const teamStats = ref({
  totalTeams: 0,
  totalBalance: 0,
  totalBonus: 0,
  totalCost: 0
});
const teamRanking = ref([]);

// 项目报表数据
const projectStats = ref({
  total: 0,
  totalContract: 0,
  totalReceived: 0,
  avgMargin: 0
});
const projectProgress = ref([]);

// 成本分析数据
const costStats = ref({
  totalLabor: 0,
  totalSubcontract: 0
});
const teamCostComparison = ref([]);

const formatMoney = (val) => {
  if (!val) return '¥0';
  return '¥' + (val / 10000).toFixed(1) + '万';
};

const getBalanceClass = (balance) => {
  if (balance > 500000) return 'text-success';
  if (balance > 0) return 'text-warning';
  return 'text-danger';
};

const getStatusType = (status) => {
  const map = { '健康': 'success', '预警': 'warning', '冻结': 'danger', '保护期': 'primary' };
  return map[status] || 'default';
};

const getProgressColor = (progress) => {
  if (progress >= 80) return '#07c160';
  if (progress >= 50) return '#ff976a';
  return '#ee0a24';
};

const onMonthConfirm = ({ selectedOptions }) => {
  selectedMonth.value = `${selectedOptions[0].value}-${selectedOptions[1].value}`;
  showMonthPicker.value = false;
  loadData();
};

const viewTeamDetail = (team) => {
  router.push(`/team?id=${team.orgId}`);
};

const loadTeamData = async () => {
  try {
    // 获取团队列表
    const orgRes = await orgApi.getList({ orgType: '团队' });
    const teams = orgRes.data?.list || [];
    
    // 获取当月账户数据
    const month = selectedMonth.value + '-01';
    const accountRes = await teamAccountApi.getList({ belongMonth: month });
    const accounts = accountRes.data?.list || [];
    
    // 合并数据
    const mergedData = teams.map(team => {
      const account = accounts.find(a => a.orgId === team.orgId);
      return {
        ...team,
        ...account,
        closingBalance: account?.closingBalance || team.startFundAmount || 1000000,
        monthlyReceivedBonus: account?.monthlyReceivedBonus || 0,
        monthlyCostConsumption: account?.monthlyCostConsumption || 0,
        accountStatus: account?.accountStatus || team.currentStatus || '健康',
        cumulativeOverdraftRatio: account?.cumulativeOverdraftRatio || 0
      };
    });
    
    // 排序：按余额从高到低
    teamRanking.value = mergedData.sort((a, b) => b.closingBalance - a.closingBalance);
    
    // 统计
    teamStats.value = {
      totalTeams: teams.length,
      totalBalance: mergedData.reduce((sum, t) => sum + parseFloat(t.closingBalance || 0), 0),
      totalBonus: mergedData.reduce((sum, t) => sum + parseFloat(t.monthlyReceivedBonus || 0), 0),
      totalCost: mergedData.reduce((sum, t) => sum + parseFloat(t.monthlyCostConsumption || 0), 0)
    };
  } catch (err) {
    console.error('加载团队数据失败:', err);
    // 使用模拟数据
    teamRanking.value = [
      { orgId: 'T001', orgName: '创新院一部', closingBalance: 1250000, accountStatus: '健康', cumulativeOverdraftRatio: 0 },
      { orgId: 'T002', orgName: '创新院二部', closingBalance: 890000, accountStatus: '健康', cumulativeOverdraftRatio: 11 },
      { orgId: 'T003', orgName: '智慧园区部', closingBalance: 320000, accountStatus: '预警', cumulativeOverdraftRatio: 68 },
      { orgId: 'T004', orgName: '数字政府部', closingBalance: 150000, accountStatus: '冻结', cumulativeOverdraftRatio: 85 }
    ];
    teamStats.value = { totalTeams: 4, totalBalance: 2610000, totalBonus: 450000, totalCost: 520000 };
  }
};

const loadProjectData = async () => {
  try {
    const res = await projectApi.getList({ limit: 100 });
    const projects = res.data?.list || [];
    
    projectStats.value = {
      total: projects.length,
      totalContract: projects.reduce((sum, p) => sum + parseFloat(p.contractAmount || 0), 0),
      totalReceived: projects.reduce((sum, p) => sum + parseFloat(p.totalReceived || 0), 0),
      avgMargin: projects.length > 0 
        ? Math.round(projects.reduce((sum, p) => sum + parseFloat(p.estimatedGrossMargin || 0), 0) / projects.length)
        : 0
    };
    
    projectProgress.value = projects.map(p => ({
      projectId: p.projectId,
      projectName: p.projectName,
      contractAmount: p.contractAmount,
      totalReceived: p.totalReceived,
      receiveProgress: p.contractAmount > 0 
        ? Math.round((p.totalReceived / p.contractAmount) * 100) 
        : 0
    })).sort((a, b) => b.receiveProgress - a.receiveProgress);
  } catch (err) {
    console.error('加载项目数据失败:', err);
    projectStats.value = { total: 12, totalContract: 15000000, totalReceived: 8500000, avgMargin: 32 };
    projectProgress.value = [
      { projectId: 'P001', projectName: '智慧城市一期', contractAmount: 2000000, totalReceived: 1800000, receiveProgress: 90 },
      { projectId: 'P002', projectName: '智慧园区项目', contractAmount: 1500000, totalReceived: 900000, receiveProgress: 60 },
      { projectId: 'P003', projectName: '数字政府平台', contractAmount: 3000000, totalReceived: 1200000, receiveProgress: 40 }
    ];
  }
};

const loadCostData = async () => {
  // 模拟成本数据
  costStats.value = { totalLabor: 2800000, totalSubcontract: 1200000 };
  teamCostComparison.value = [
    { orgId: 'T001', orgName: '创新院一部', laborCost: 800000, subcontractCost: 200000, totalCost: 1000000 },
    { orgId: 'T002', orgName: '创新院二部', laborCost: 750000, subcontractCost: 300000, totalCost: 1050000 },
    { orgId: 'T003', orgName: '智慧园区部', laborCost: 650000, subcontractCost: 400000, totalCost: 1050000 },
    { orgId: 'T004', orgName: '数字政府部', laborCost: 600000, subcontractCost: 300000, totalCost: 900000 }
  ];
};

const loadData = () => {
  loadTeamData();
  loadProjectData();
  loadCostData();
};

onMounted(loadData);
</script>

<style scoped>
.report-center {
  padding: 12px;
}

.report-tabs {
  margin-bottom: 12px;
}

.tab-content {
  padding-bottom: 20px;
}

.stat-box {
  text-align: center;
  padding: 16px;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
}

.stat-label {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.text-primary { color: #1989fa; }
.text-success { color: #07c160; }
.text-warning { color: #ff976a; }
.text-danger { color: #ee0a24; }
.text-info { color: #00c8c8; }

.progress-info {
  width: 120px;
}

.progress-text {
  font-size: 12px;
  color: #666;
}

.cost-bar {
  font-size: 12px;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
}

.cost-label {
  color: #999;
}

.cost-value {
  color: #666;
}

.total-cost {
  font-weight: bold;
  color: #333;
}
</style>
