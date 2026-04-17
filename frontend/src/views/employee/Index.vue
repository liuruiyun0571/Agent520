<template>
  <div class="employee-management">
    <van-search
      v-model="keyword"
      placeholder="搜索姓名/工号"
      @search="onSearch"
    />
    
    <div class="filter-bar">
      <van-dropdown-menu>
        <van-dropdown-item v-model="filter.orgId" :options="orgOptions" @change="onFilterChange" />
        <van-dropdown-item v-model="filter.status" :options="statusOptions" @change="onFilterChange" />
      </van-dropdown-menu>
    </div>

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
          :title="item.name"
          :desc="`${item.empId} | ${item.organization?.orgName || '-'} | 入职${getEntryDays(item.entryDate)}天`"
          @click="onEdit(item)"
        >
          <template #tags>
            <van-tag :type="item.status === '在职' ? 'success' : 'default'" style="margin-right: 5px;">
              {{ item.status }}
            </van-tag>
            <van-tag v-if="item.canCrossTeam" type="warning">可跨团队</van-tag>
          </template>
          <template #price>
            <span class="cost-text">成本: ¥{{ item.defaultCostStandard }}/月</span>
          </template>
        </van-card>
      </van-list>
    </van-pull-refresh>

    <!-- Excel导入 -->
    <van-uploader 
      :after-read="onImport" 
      accept=".xlsx,.xls"
      style="position: fixed; bottom: 80px; right: 16px;"
    >
      <van-button icon="upload" round type="info">导入</van-button>
    </van-uploader>

    <van-floating-bubble axis="xy" icon="plus" @click="showAdd = true" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Toast } from 'vant';
import axios from 'axios';
import * as XLSX from 'xlsx';

const keyword = ref('');
const list = ref([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);

const filter = ref({
  orgId: '',
  status: ''
});

const orgOptions = ref([
  { text: '全部组织', value: '' },
  { text: '创新院一部', value: 'T001' },
  { text: '创新院二部', value: 'T002' }
]);

const statusOptions = ref([
  { text: '全部状态', value: '' },
  { text: '在职', value: '在职' },
  { text: '离职', value: '离职' }
]);

const getEntryDays = (date) => {
  const entry = new Date(date);
  const now = new Date();
  return Math.floor((now - entry) / (1000 * 60 * 60 * 24));
};

const fetchList = async () => {
  try {
    const { data } = await axios.get('/api/employees/list', {
      params: { 
        page: page.value, 
        limit: 20, 
        keyword: keyword.value,
        orgId: filter.value.orgId,
        status: filter.value.status
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
    Toast.fail('获取数据失败');
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

const onFilterChange = () => {
  page.value = 1;
  list.value = [];
  onLoad();
};

const onImport = async (file) => {
  try {
    const data = await file.file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    Toast.loading({ message: '导入中...', forbidClick: true });
    
    const formData = new FormData();
    formData.append('file', file.file);
    
    const res = await axios.post('/api/employees/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    Toast.success(`导入完成: 成功${res.data.data.success.length}条`);
    onRefresh();
  } catch (err) {
    Toast.fail('导入失败');
  }
};

const onEdit = (item) => {
  // 跳转到编辑页
  console.log('编辑:', item);
};

onMounted(async () => {
  // 加载组织选项
  const { data } = await axios.get('/api/orgs/list?limit=100');
  if (data.success) {
    orgOptions.value = [
      { text: '全部组织', value: '' },
      ...data.data.list.map(o => ({ text: o.orgName, value: o.orgId }))
    ];
  }
  onLoad();
});
</script>

<style scoped>
.employee-management {
  padding: 12px;
}

.filter-bar {
  margin-bottom: 8px;
}

.cost-text {
  color: #ee0a24;
  font-weight: bold;
}
</style>
