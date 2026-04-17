<template>
  <div class="team-board">
    <!-- 团队选择器 -->
    <van-cell-group title="选择团队" v-if="!currentTeamId">
      <van-field
        v-model="selectedTeamName"
        label="查看团队"
        placeholder="点击选择团队"
        readonly
        @click="showTeamPicker = true"
      />
    </van-cell-group>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <!-- 账户概览 -->
      <van-cell-group title="账户概览">
        <div class="account-card">
          <div class="account-header">
            <div class="team-title">
              <h3>{{ teamData.orgName || '未选择团队' }}</h3>
              <van-tag :type="getStatusType(teamData.accountStatus)" size="medium">
                {{ teamData.accountStatus }}
              </van-tag>
            </div>
            <div class="account-month">{{ currentMonth }}</div>
          </div>
          
          <div class="balance-display">
            <div class="balance-label">期末余额</div>
            <div class="balance-value" :class="getBalanceClass(teamData.closingBalance)">
              {{ formatMoney(teamData.closingBalance) }}
            </div>
          </div>
          
          <van-divider />
          
          <van-grid :column-num="4" :border="false">
            <van-grid-item>
              <div class="mini-stat">
                <div class="mini-value">{{ formatMoney(teamData.openingBalance) }}</div>
                <div class="mini-label">期初余额</div>
              </div>
            </van-grid-item>
            <van-grid-item>
              <div class="mini-stat">
                <div class="mini-value text-success">+{{ formatMoney(teamData.monthlyReceivedBonus, false) }}</div>
                <div class="mini-label">本月回款</div>
              </div>
            </van-grid-item>
            <van-grid-item>
              <div class="mini-stat">
                <div class="mini-value text-danger">-{{ formatMoney(teamData.monthlyCostConsumption, false) }}</div>
                <div class="mini-label">本月成本</div>
              </div>
            </van-grid-item>
            <van-grid-item>
              <div class="mini-stat">
                <div class="mini-value text-warning">-{{ formatMoney(teamData.monthlyProvidentFund, false) }}</div>
                <div class="mini-label">公积金</div>
              </div>
            </van-grid-item>
          </van-grid>
          
          <!-- 透支比例 -->
          <div v-if="teamData.cumulativeOverdraftRatio > 0" class="overdraft-warning">
            <van-cell 
              title="累计透支比例" 
              :value="teamData.cumulativeOverdraftRatio + '%'"
              :class="getOverdraftClass(teamData.cumulativeOverdraftRatio)"
            >
              <template #label>
                <van-progress 
                  :percentage="Math.min(teamData.cumulativeOverdraftRatio, 100)" 
                  :stroke-width="6"
                  :color="getOverdraftColor(teamData.cumulativeOverdraftRatio)"
                />
              </template>
            </van-cell>
          </div>
        </div>
      </van-cell-group>

      <!-- 历史趋势 -->
      <van-cell-group title="近6个月趋势">
        <div class="trend-chart">
          <div 
            v-for="item in historyData" 
            :key="item.month"
            class="trend-item"
            @click="switchMonth(item.month)"
          >
            <div class="trend-month">{{ formatMonth(item.month) }}</div>
            <div class="trend-bar-container">
              <div 
                class="trend-bar"
                :style="{ height: getTrendHeight(item.closingBalance) }"
                :class="getTrendBarClass(item.closingBalance)"
              ></div>
            </div>
            <div class="trend-value" :class="getBalanceClass(item.closingBalance)">
              {{ formatShortMoney(item.closingBalance) }}
            </div>
          </div>
        </div>
      </van-cell-group>

      <!-- 项目收支 -->
      <van-cell-group title="关联项目">
        <van-empty v-if="projects.length === 0" description="暂无关联项目" />
        
        <van-cell
          v-for="proj in projects"
          :key="proj.projectId"
          :title="proj.projectName"
          is-link
          @click="goToProject(proj)"
        >
          <template #label>
            <div class="project-info">
              <span>合同: {{ formatMoney(proj.contractAmount) }}</span>
              <span class="allocation">分配比例: {{ proj.allocationRatio }}%</span>
            </div>
          </template>
          <template #value>
            <div class="project-value">
              <div class="received">已回: {{ formatMoney(proj.totalReceived) }}</div>
              <van-tag :type="getProjectStatusType(proj.projectStatus)" size="small">
                {{ proj.projectStatus }}
              </van-tag>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 快捷操作 -->
      <van-cell-group title="快捷操作">
        <van-grid :column-num="4" :border="false">
          <van-grid-item icon="records" text="登记回款" @click="goToProjectList" />
          <van-grid-item icon="balance-pay" text="成本明细" @click="goToCost" />
          <van-grid-item icon="chart-trending-o" text="历史记录" @click="showHistoryDetail" />
          <van-grid-item icon="phone-o" text="联系支持" @click="contactSupport" />
        </van-grid>
      </van-cell-group>
    </van-pull-refresh>

    <!-- 团队选择器 -->
    <van-popup v-model:show="showTeamPicker" position="bottom">
      <van-picker
        :columns="teamOptions"
        @confirm="onTeamConfirm"
        @cancel="showTeamPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Toast, Dialog } from 'vant';
import dayjs from 'dayjs';
import { orgApi, teamAccountApi, projectApi } from '@/api';

const route = useRoute();
const router = useRouter();
const refreshing = ref(false);
const currentTeamId = ref(route.query.id || '');
const currentMonth = ref(dayjs().format('YYYY-MM'));

// 团队选择
const showTeamPicker = ref(false);
const selectedTeamName = ref('');
const teamOptions = ref([]);
const availableTeams = ref([]);

// 账户数据
const teamData = ref({
  orgName: '',
  orgId: '',
  accountStatus: '健康',
  openingBalance: 0,
  monthlyReceivedBonus: 0,
  monthlyCostConsumption: 0,
  monthlyProvidentFund: 0,
  closingBalance: 0,
  cumulativeOverdraftRatio: 0
});

const historyData = ref([]);
const projects = ref([]);

const formatMoney = (val, showSymbol = true) => {
  if (!val || isNaN(val)) return showSymbol ? '¥0' : '0';
  const num = parseFloat(val);
  if (showSymbol) {
    return '¥' + (num / 10000).toFixed(1) + '万';
  }
  return (num / 10000).toFixed(1) + '万';
};

const formatShortMoney = (val) => {
  if (!val || isNaN(val)) return '0';
  const num = parseFloat(val);
  if (num >= 1000000) return (num / 10000).toFixed(0) + '万';
  return (num / 10000).toFixed(1) + '万';
};

const formatMonth = (monthStr) => {
  if (!monthStr) return '';
  return monthStr.slice(5, 7) + '月';
};

const getStatusType = (status) => {
  const map = { '健康': 'success', '预警': 'warning', '冻结': 'danger', '保护期': 'primary' };
  return map[status] || 'default';
};

const getBalanceClass = (balance) => {
  const num = parseFloat(balance || 0);
  if (num >= 500000) return 'text-success';
  if (num > 0) return 'text-warning';
  return 'text-danger';
};

const getOverdraftClass = (ratio) => {
  if (ratio >= 80) return 'text-danger';
  if (ratio >= 50) return 'text-warning';
  return '';
};

const getOverdraftColor = (ratio) => {
  if (ratio >= 80) return '#ee0a24';
  if (ratio >= 50) return '#ff976a';
  return '#07c160';
};

const getTrendBarClass = (balance) => {
  const num = parseFloat(balance || 0);
  if (num >= 500000) return 'bar-success';
  if (num > 0) return 'bar-warning';
  return 'bar-danger';
};

const getTrendHeight = (balance) => {
  const num = Math.abs(parseFloat(balance || 0));
  const maxBalance = Math.max(...historyData.value.map(h => Math.abs(parseFloat(h.closingBalance || 0))), 1000000);
  const percentage = Math.min((num / maxBalance) * 100, 100);
  return percentage + '%';
};

const getProjectStatusType = (status) => {
  const map = { '前期': 'default', '进行中': 'primary', '已完工': 'success', '已终止': 'danger' };
  return map[status] || 'default';
};

const loadTeamData = async () => {
  if (!currentTeamId.value) return;
  
  try {
    // 获取团队信息
    const orgRes = await orgApi.getList({ orgId: currentTeamId.value });
    const org = orgRes.data?.list?.[0];
    if (org) {
      teamData.value.orgName = org.orgName;
    }
    
    // 获取当月账户数据
    const month = currentMonth.value + '-01';
    const accountRes = await teamAccountApi.getByOrgAndMonth(currentTeamId.value, month);
    
    if (accountRes.data) {
      teamData.value = { ...teamData.value, ...accountRes.data };
    } else {
      // 使用团队启动资金作为默认值
      teamData.value.openingBalance = org?.startFundAmount || 1000000;
      teamData.value.closingBalance = org?.startFundAmount || 1000000;
      teamData.value.accountStatus = org?.currentStatus || '健康';
    }
    
    selectedTeamName.value = teamData.value.orgName;
  } catch (err) {
    console.error('加载团队数据失败:', err);
    // 使用模拟数据
    teamData.value = {
      orgName: '创新院一部',
      accountStatus: '健康',
      openingBalance: 1000000,
      monthlyReceivedBonus: 150000,
      monthlyCostConsumption: 120000,
      monthlyProvidentFund: 6000,
      closingBalance: 1064000,
      cumulativeOverdraftRatio: 0
    };
  }
};

const loadHistoryData = async () => {
  if (!currentTeamId.value) return;
  
  try {
    const res = await teamAccountApi.getList({ 
      orgId: currentTeamId.value, 
      limit: 6 
    });
    
    if (res.data?.list?.length > 0) {
      historyData.value = res.data.list.slice(0, 6).reverse();
    } else {
      // 生成模拟历史数据
      const baseBalance = 1000000;
      historyData.value = Array.from({ length: 6 }, (_, i) => {
        const month = dayjs().subtract(5 - i, 'month').format('YYYY-MM-01');
        return {
          month,
          closingBalance: baseBalance + (i * 20000) + Math.random() * 50000
        };
      });
    }
  } catch (err) {
    console.error('加载历史数据失败:', err);
  }
};

const loadProjects = async () => {
  if (!currentTeamId.value) return;
  
  try {
    const res = await projectApi.getList({ teamId: currentTeamId.value, limit: 10 });
    projects.value = res.data?.list || [];
  } catch (err) {
    console.error('加载项目失败:', err);
    // 模拟数据
    projects.value = [
      {
        projectId: 'P001',
        projectName: '智慧城市一期',
        projectStatus: '进行中',
        contractAmount: 2000000,
        totalReceived: 600000,
        allocationRatio: 70
      },
      {
        projectId: 'P002',
        projectName: '智慧园区项目',
        projectStatus: '前期',
        contractAmount: 1500000,
        totalReceived: 0,
        allocationRatio: 30
      }
    ];
  }
};

const loadTeamOptions = async () => {
  try {
    const res = await orgApi.getList({ orgType: '团队' });
    availableTeams.value = res.data?.list || [];
    teamOptions.value = availableTeams.value.map(t => ({
      text: t.orgName,
      value: t.orgId
    }));
  } catch (err) {
    console.error('加载团队选项失败:', err);
    teamOptions.value = [
      { text: '创新院一部', value: 'T001' },
      { text: '创新院二部', value: 'T002' },
      { text: '智慧园区部', value: 'T003' },
      { text: '数字政府部', value: 'T004' }
    ];
  }
};

const onTeamConfirm = ({ selectedOptions }) => {
  currentTeamId.value = selectedOptions[0].value;
  selectedTeamName.value = selectedOptions[0].text;
  showTeamPicker.value = false;
  loadData();
};

const switchMonth = (month) => {
  currentMonth.value = month.slice(0, 7);
  loadTeamData();
};

const onRefresh = async () => {
  await loadData();
  refreshing.value = false;
  Toast.success('刷新成功');
};

const loadData = () => {
  loadTeamData();
  loadHistoryData();
  loadProjects();
};

const goToProject = (proj) => {
  router.push(`/project?id=${proj.projectId}`);
};

const goToProjectList = () => {
  router.push('/project');
};

const goToCost = () => {
  router.push(`/cost?orgId=${currentTeamId.value}`);
};

const showHistoryDetail = () => {
  Dialog.alert({
    title: '历史记录',
    message: '功能开发中...'
  });
};

const contactSupport = () => {
  Dialog.alert({
    title: '联系支持',
    message: '如有问题请联系系统管理员'
  });
};

onMounted(() => {
  loadTeamOptions();
  if (currentTeamId.value) {
    loadData();
  }
});
</script>

<style scoped>
.team-board {
  padding: 12px;
}

.account-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 16px;
  color: white;
  margin: 12px;
}

.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.team-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.team-title h3 {
  margin: 0;
  font-size: 18px;
}

.account-month {
  font-size: 14px;
  opacity: 0.8;
}

.balance-display {
  text-align: center;
  margin: 20px 0;
}

.balance-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.balance-value {
  font-size: 32px;
  font-weight: bold;
}

.mini-stat {
  text-align: center;
  padding: 8px 0;
}

.mini-value {
  font-size: 14px;
  font-weight: 500;
}

.mini-label {
  font-size: 11px;
  opacity: 0.8;
  margin-top: 4px;
}

.overdraft-warning {
  margin-top: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px;
}

.overdraft-warning :deep(.van-cell) {
  background: transparent;
  color: white;
}

.overdraft-warning :deep(.van-cell__value) {
  color: white;
  font-weight: bold;
}

.text-success { color: #07c160; }
.text-warning { color: #ff976a; }
.text-danger { color: #ee0a24; }

/* 趋势图表 */
.trend-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 150px;
  padding: 16px;
  background: #f7f8fa;
  border-radius: 8px;
  margin: 12px;
}

.trend-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  flex: 1;
}

.trend-month {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.trend-bar-container {
  width: 30px;
  height: 80px;
  display: flex;
  align-items: flex-end;
  background: #ebedf0;
  border-radius: 4px;
  overflow: hidden;
}

.trend-bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
}

.bar-success { background: #07c160; }
.bar-warning { background: #ff976a; }
.bar-danger { background: #ee0a24; }

.trend-value {
  font-size: 11px;
  margin-top: 4px;
  font-weight: 500;
}

.project-info {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.project-value {
  text-align: right;
}

.project-value .received {
  font-size: 12px;
  color: #07c160;
  margin-bottom: 4px;
}

.allocation {
  color: #1989fa;
}
</style>
