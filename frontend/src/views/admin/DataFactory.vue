<template>
  <div class="data-factory">
    <van-cell-group title="系统状态">
      <van-cell title="定时任务状态" :value="systemStatus.isRunning ? '运行中' : '已停止'">
        <template #right-icon>
          <van-tag :type="systemStatus.isRunning ? 'success' : 'danger'">
            {{ systemStatus.isRunning ? '●' : '○' }}
          </van-tag>
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group title="定时任务列表">
      <van-collapse v-model="activeJobs">
        <van-collapse-item 
          v-for="job in jobList" 
          :key="job.name"
          :title="job.name"
          :name="job.name"
        >
          <template #value>
            <van-tag type="primary">{{ job.cron }}</van-tag>
          </template>
          
          <div class="job-detail">
            <p><strong>说明:</strong> {{ job.desc }}</p>
            <van-button 
              type="primary" 
              size="small" 
              block
              :loading="runningJob === job.key"
              @click="runJob(job.key)"
            >
              手动执行
            </van-button>
          </div>
        </van-collapse-item>
      </van-collapse>
    </van-cell-group>

    <van-cell-group title="快捷操作">
      <van-grid :column-num="2" :gutter="10">
        <van-grid-item>
          <van-button 
            type="primary" 
            block
            icon="calendar-o"
            @click="showCreateAccount = true"
          >
            创建月度账户
          </van-button>
        </van-grid-item>
        
        <van-grid-item>
          <van-button 
            type="warning" 
            block
            icon="warning-o"
            :loading="checkingOverdraft"
            @click="checkOverdraft"
          >
            超支检测
          </van-button>
        </van-grid-item>
        
        <van-grid-item>
          <van-button 
            type="info" 
            block
            icon="balance-pay"
            :loading="transferringFund"
            @click="showTransferFund = true"
          >
            公积金划转
          </van-button>
        </van-grid-item>
        
        <van-grid-item>
          <van-button 
            type="success" 
            block
            icon="records"
            :loading="doingSettlement"
            @click="showSettlement = true"
          >
            月度结算
          </van-button>
        </van-grid-item>
      </van-grid>
    </van-cell-group>

    <van-cell-group title="执行日志" v-if="logs.length > 0">
      <van-cell 
        v-for="(log, index) in logs.slice(0, 10)" 
        :key="index"
        :title="log.job"
        :label="log.time"
      >
        <template #value>
          <van-tag :type="log.success ? 'success' : 'danger'">
            {{ log.success ? '成功' : '失败' }}
          </van-tag>
        </template>
        <template #right-icon>
          <span class="log-message">{{ log.message }}</span>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 创建月度账户弹窗 -->
    <van-dialog
      v-model:show="showCreateAccount"
      title="创建月度账户"
      show-cancel-button
      @confirm="confirmCreateAccount"
    >
      <van-field
        v-model="createAccountForm.month"
        label="目标月份"
        placeholder="YYYY-MM"
      />
      <van-cell title="将创建所有团队的月度账户，期初余额自动结转自上月"></van-cell>
    </van-dialog>

    <!-- 公积金划转弹窗 -->
    <van-dialog
      v-model:show="showTransferFund"
      title="公积金自动划转"
      show-cancel-button
      @confirm="confirmTransferFund"
    >
      <van-field
        v-model="transferFundForm.month"
        label="目标月份"
        placeholder="YYYY-MM"
      />
      <van-cell title="盈利团队将按比例自动划转公积金到团队公积金账户"></van-cell>
    </van-dialog>

    <!-- 月度结算弹窗 -->
    <van-dialog
      v-model:show="showSettlement"
      title="月度结算"
      show-cancel-button
      @confirm="confirmSettlement"
    >
      <van-field
        v-model="settlementForm.month"
        label="结算月份"
        placeholder="YYYY-MM"
      />
      <van-cell title="执行完整的月度结算流程：汇总奖金、成本、公积金、超支检测"></van-cell>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Toast, Dialog } from 'vant';
import dayjs from 'dayjs';
import { dataFactoryApi } from '@/api';

const activeJobs = ref([]);
const runningJob = ref(null);
const checkingOverdraft = ref(false);
const transferringFund = ref(false);
const doingSettlement = ref(false);
const logs = ref([]);

const systemStatus = ref({
  isRunning: true,
  jobs: []
});

const jobList = ref([
  { name: '日结任务', key: 'dailySettlement', cron: '0 1 * * *', desc: '每日汇总回款和成本数据' },
  { name: '月度账户创建', key: 'monthlyAccount', cron: '0 2 1 * *', desc: '每月1日创建新账户并结转余额' },
  { name: '超支检测', key: 'overdraftCheck', cron: '0 3 * * *', desc: '检测超支并冻结/预警团队' },
  { name: '月度结算', key: 'monthlySettlement', cron: '0 4 1 * *', desc: '月末完整结算流程' },
  { name: '公积金划转', key: 'providentFund', cron: '30 2 5 * *', desc: '每月5日划转盈利团队公积金' },
  { name: '保护期检查', key: 'protectionCheck', cron: '0 4 * * 1', desc: '每周一检查保护期状态' }
]);

// 弹窗状态
const showCreateAccount = ref(false);
const showTransferFund = ref(false);
const showSettlement = ref(false);

const createAccountForm = ref({ month: dayjs().format('YYYY-MM') });
const transferFundForm = ref({ month: dayjs().subtract(1, 'month').format('YYYY-MM') });
const settlementForm = ref({ month: dayjs().subtract(1, 'month').format('YYYY-MM') });

const addLog = (job, success, message) => {
  logs.value.unshift({
    job,
    success,
    message,
    time: dayjs().format('MM-DD HH:mm:ss')
  });
  if (logs.value.length > 20) logs.value.pop();
};

const runJob = async (jobKey) => {
  runningJob.value = jobKey;
  Toast.loading({ message: '执行中...', forbidClick: true });
  
  try {
    const result = await dataFactoryApi.runJob(jobKey);
    Toast.success('执行成功');
    addLog(jobKey, true, result.message || '完成');
  } catch (err) {
    Toast.fail('执行失败');
    addLog(jobKey, false, err.message);
  } finally {
    runningJob.value = null;
  }
};

const checkOverdraft = async () => {
  checkingOverdraft.value = true;
  Toast.loading({ message: '检测中...', forbidClick: true });
  
  try {
    const result = await dataFactoryApi.checkOverdraft();
    const { warnings, frozen } = result.data || {};
    const totalAlert = (warnings?.length || 0) + (frozen?.length || 0);
    
    if (totalAlert > 0) {
      Dialog.alert({
        title: '超支检测结果',
        message: `发现 ${frozen?.length || 0} 个团队冻结，${warnings?.length || 0} 个团队预警`
      });
    } else {
      Toast.success('所有团队正常');
    }
    
    addLog('超支检测', true, `冻结:${frozen?.length || 0}, 预警:${warnings?.length || 0}`);
  } catch (err) {
    Toast.fail('检测失败');
    addLog('超支检测', false, err.message);
  } finally {
    checkingOverdraft.value = false;
  }
};

const confirmCreateAccount = async () => {
  Toast.loading({ message: '创建中...', forbidClick: true });
  
  try {
    const month = createAccountForm.value.month + '-01';
    const result = await dataFactoryApi.createMonthlyAccounts(month);
    const { created, updated } = result.data || {};
    
    Toast.success(`创建成功: 新建${created}个, 更新${updated}个`);
    addLog('创建月度账户', true, `新建${created}个`);
  } catch (err) {
    Toast.fail('创建失败');
    addLog('创建月度账户', false, err.message);
  }
};

const confirmTransferFund = async () => {
  transferringFund.value = true;
  Toast.loading({ message: '划转中...', forbidClick: true });
  
  try {
    const month = transferFundForm.value.month + '-01';
    const result = await dataFactoryApi.transferProvidentFund(month);
    const { transfers } = result.data || {};
    
    Toast.success(`划转完成: ${transfers?.length || 0} 个团队`);
    addLog('公积金划转', true, `${transfers?.length || 0}个团队`);
  } catch (err) {
    Toast.fail('划转失败');
    addLog('公积金划转', false, err.message);
  } finally {
    transferringFund.value = false;
  }
};

const confirmSettlement = async () => {
  doingSettlement.value = true;
  Toast.loading({ message: '结算中...', forbidClick: true, duration: 0 });
  
  try {
    const month = settlementForm.value.month + '-01';
    await dataFactoryApi.monthlySettlement(month);
    
    Toast.success('月度结算完成');
    addLog('月度结算', true, '完成');
  } catch (err) {
    Toast.fail('结算失败');
    addLog('月度结算', false, err.message);
  } finally {
    doingSettlement.value = false;
  }
};

onMounted(async () => {
  try {
    const result = await dataFactoryApi.getStatus();
    systemStatus.value = result.data || { isRunning: true, jobs: [] };
  } catch (err) {
    console.log('获取状态失败，使用默认值');
  }
});
</script>

<style scoped>
.data-factory {
  padding: 12px;
}

.job-detail {
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
}

.job-detail p {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
}

.log-message {
  font-size: 12px;
  color: #999;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
