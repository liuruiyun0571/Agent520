<template>
  <div class="cost-management">
    <van-cell-group title="月度选择">
      <van-field
        v-model="selectedMonth"
        label="所属月份"
        placeholder="选择月份"
        readonly
        @click="showMonthPicker = true"
      />
    </van-cell-group>

    <van-cell-group title="团队选择">
      <van-field
        v-model="selectedOrg"
        label="成本归属"
        placeholder="选择团队"
        readonly
        @click="showOrgPicker = true"
      />
    </van-cell-group>

    <van-cell-group title="人员成本列表">
      <van-empty v-if="costList.length === 0" description="暂无数据" />
      
      <van-cell
        v-for="item in costList"
        :key="item.id"
        :title="item.employeeName"
        :label="`${item.empId} | ${item.costType}`"
        :value="formatMoney(item.allocatedCost)"
        is-link
        @click="onEdit(item)"
      >
        <template #right-icon>
          <van-tag :type="item.status === '已确认' ? 'success' : 'warning'">
            {{ item.status }}
          </van-tag>
        </template>
      </van-cell>
    </van-cell-group>

    <div class="action-bar">
      <van-uploader :after-read="onImport" accept=".xlsx,.xls">
        <van-button icon="upload" type="info" block>导入Excel</van-button>
      </van-uploader>
      
      <van-button 
        icon="success" 
        type="primary" 
        block 
        style="margin-top: 10px;"
        :disabled="costList.length === 0"
        @click="onConfirm"
      >
        确认提交
      </van-button>
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

    <!-- 组织选择器 -->
    <van-popup v-model:show="showOrgPicker" position="bottom">
      <van-picker
        :columns="orgOptions"
        @confirm="onOrgConfirm"
        @cancel="showOrgPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Toast, Dialog } from 'vant';
import axios from 'axios';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const selectedMonth = ref(dayjs().format('YYYY-MM'));
const selectedOrg = ref('');
const showMonthPicker = ref(false);
const showOrgPicker = ref(false);
const monthPickerValue = ref([dayjs().year().toString(), (dayjs().month() + 1).toString().padStart(2, '0')]);

const orgOptions = ref([]);
const costList = ref([]);

const formatMoney = (val) => {
  if (!val) return '¥0';
  return '¥' + (val / 10000).toFixed(2) + '万';
};

const onMonthConfirm = ({ selectedOptions }) => {
  selectedMonth.value = `${selectedOptions[0].value}-${selectedOptions[1].value}`;
  showMonthPicker.value = false;
  fetchCostList();
};

const onOrgConfirm = ({ selectedOptions }) => {
  selectedOrg.value = selectedOptions[0].text;
  showOrgPicker.value = false;
  fetchCostList();
};

const fetchCostList = async () => {
  // 模拟数据
  costList.value = [
    { id: 1, empId: 'E001', employeeName: '张三', costType: '标准成本', allocatedCost: 30000, status: '草稿' },
    { id: 2, empId: 'E002', employeeName: '李四', costType: '标准成本', allocatedCost: 30000, status: '草稿' },
    { id: 3, empId: 'E003', employeeName: '王五', costType: '绩效', allocatedCost: 15000, status: '草稿' }
  ];
};

const onImport = async (file) => {
  try {
    Toast.loading({ message: '解析中...', forbidClick: true });
    
    const data = await file.file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    // 校验数据
    const validData = jsonData.filter(row => row['姓名'] && row['成本类型']);
    
    Dialog.confirm({
      title: '导入确认',
      message: `共${jsonData.length}条数据，有效${validData.length}条，确认导入？`
    }).then(() => {
      // 添加到列表
      validData.forEach(row => {
        costList.value.push({
          id: Date.now() + Math.random(),
          empId: row['工号'] || '待生成',
          employeeName: row['姓名'],
          costType: row['成本类型'],
          allocatedCost: row['金额'] || 30000,
          status: '草稿'
        });
      });
      Toast.success(`成功导入${validData.length}条`);
    });
  } catch (err) {
    Toast.fail('导入失败: ' + err.message);
  }
};

const onEdit = (item) => {
  console.log('编辑:', item);
};

const onConfirm = () => {
  Dialog.confirm({
    title: '提交确认',
    message: '确认提交本月成本数据？提交后将进入审批流程。'
  }).then(() => {
    Toast.success('提交成功');
  });
};

onMounted(async () => {
  // 加载组织列表
  try {
    const { data } = await axios.get('/api/orgs/list?limit=100');
    if (data.success) {
      orgOptions.value = data.data.list
        .filter(o => o.orgType === '团队')
        .map(o => ({ text: o.orgName, value: o.orgId }));
    }
  } catch (err) {
    orgOptions.value = [
      { text: '创新院一部', value: 'T001' },
      { text: '创新院二部', value: 'T002' }
    ];
  }
  fetchCostList();
});
</script>

<style scoped>
.cost-management {
  padding: 12px;
}

.action-bar {
  margin-top: 20px;
  padding: 0 12px;
}
</style>
