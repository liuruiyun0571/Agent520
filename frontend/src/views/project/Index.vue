<template>
  <div class="project-management">
    <van-search
      v-model="keyword"
      placeholder="搜索项目名称/客户"
      @search="onSearch"
    />

    <van-tabs v-model:active="activeTab" @change="onTabChange">
      <van-tab title="前期" name="前期"></van-tab>
      <van-tab title="进行中" name="进行中"></van-tab>
      <van-tab title="已完工" name="已完工"></van-tab>
      <van-tab title="已终止" name="已终止"></van-tab>
    </van-tabs>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <van-card
          v-for="item in list"
          :key="item.id"
          :title="item.projectName"
          :desc="`客户: ${item.customerName}`"
          @click="onView(item)"
        >
          <template #tags>
            <van-tag :type="getStatusType(item.projectStatus)">
              {{ item.projectStatus }}
            </van-tag>
            <van-tag type="primary" style="margin-left: 5px;">
              毛利{{ item.estimatedGrossMargin }}%
            </van-tag>
          </template>
          <template #price>
            <div class="price-info">
              <div class="contract-amount">合同: {{ formatMoney(item.contractAmount) }}</div>
              <div class="received-amount">已回: {{ formatMoney(item.totalReceived) }}</div>
            </div>
          </template>
          <template #footer>
            <van-button size="mini" icon="records" @click.stop="onPayment(item)">登记回款</van-button>
          </template>
        </van-card>
      </van-list>
    </van-pull-refresh>

    <van-floating-bubble axis="xy" icon="plus" @click="showAdd = true" />

    <!-- 登记回款弹窗 -->
    <van-popup v-model:show="showPayment" position="bottom" round :style="{ height: '60%' }">
      <div class="popup-header">
        <span class="popup-title">登记回款 - {{ selectedProject?.projectName }}</span>
        <van-icon name="cross" @click="showPayment = false" />
      </div>
      
      <van-form @submit="onPaymentSubmit" class="popup-form">
        <van-field
          v-model="paymentForm.amount"
          name="amount"
          label="回款金额"
          type="number"
          placeholder="请输入金额"
          :rules="[{ required: true }]"
        />
        <van-field
          v-model="paymentForm.date"
          name="date"
          label="回款日期"
          placeholder="选择日期"
          readonly
          @click="showDatePicker = true"
        />
        <van-field
          v-model="paymentForm.node"
          name="node"
          label="对应节点"
          placeholder="选择支付节点"
        />
        
        <div style="margin: 16px;">
          <van-button round block type="primary" native-type="submit">提交审批</van-button>
        </div>
      </van-form>
    </van-popup>

    <van-popup v-model:show="showDatePicker" position="bottom">
      <van-date-picker
        title="选择日期"
        :min-date="minDate"
        :max-date="maxDate"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Toast } from 'vant';
import axios from 'axios';

const keyword = ref('');
const activeTab = ref('进行中');
const list = ref([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);

const showAdd = ref(false);
const showPayment = ref(false);
const showDatePicker = ref(false);
const selectedProject = ref(null);

const paymentForm = ref({
  amount: '',
  date: '',
  node: ''
});

const minDate = new Date(2020, 0, 1);
const maxDate = new Date(2030, 11, 31);

const formatMoney = (val) => {
  if (!val) return '¥0';
  return '¥' + (val / 10000).toFixed(1) + '万';
};

const getStatusType = (status) => {
  const map = { 
    '前期': 'default', 
    '进行中': 'primary', 
    '已完工': 'success', 
    '已终止': 'danger' 
  };
  return map[status] || 'default';
};

const fetchList = async () => {
  try {
    const { data } = await axios.get('/api/projects/list', {
      params: { 
        page: page.value, 
        limit: 10, 
        keyword: keyword.value,
        status: activeTab.value
      }
    });
    if (data.success) {
      if (refreshing.value) {
        list.value = data.data.list;
        refreshing.value = false;
      } else {
        list.value.push(...data.data.list);
      }
      finished.value = page.value >= data.data.pagination.totalPages;
    }
  } catch (err) {
    // 使用模拟数据
    list.value = [
      {
        id: 1,
        projectName: '智慧城市一期',
        customerName: '某市政府',
        projectStatus: '进行中',
        contractAmount: 2000000,
        estimatedGrossMargin: 35,
        totalReceived: 600000
      },
      {
        id: 2,
        projectName: '智慧园区项目',
        customerName: '某科技园区',
        projectStatus: '前期',
        contractAmount: 1500000,
        estimatedGrossMargin: 30,
        totalReceived: 0
      }
    ];
    finished.value = true;
  }
};

const onLoad = async () => {
  loading.value = true;
  await fetchList();
  loading.value = false;
  page.value++;
};

const onRefresh = () => {
  page.value = 1;
  finished.value = false;
  onLoad();
};

const onSearch = () => {
  page.value = 1;
  list.value = [];
  onLoad();
};

const onTabChange = () => {
  page.value = 1;
  list.value = [];
  onLoad();
};

const onView = (item) => {
  console.log('查看项目:', item);
};

const onPayment = (item) => {
  selectedProject.value = item;
  showPayment.value = true;
};

const onDateConfirm = ({ selectedValues }) => {
  paymentForm.value.date = selectedValues.join('-');
  showDatePicker.value = false;
};

const onPaymentSubmit = () => {
  Toast.success('提交成功，等待审批');
  showPayment.value = false;
};

onMounted(onLoad);
</script>

<style scoped>
.project-management {
  padding: 12px;
}

.price-info {
  text-align: right;
}

.contract-amount {
  color: #333;
  font-weight: 500;
}

.received-amount {
  color: #07c160;
  font-size: 12px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.popup-title {
  font-size: 16px;
  font-weight: 500;
}

.popup-form {
  padding: 16px;
}
</style>
