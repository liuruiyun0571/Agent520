<template>
  <div class="org-management">
    <van-search
      v-model="keyword"
      placeholder="搜索组织名称"
      @search="onSearch"
    />
    
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <van-cell-group>
          <van-swipe-cell v-for="item in list" :key="item.id">
            <van-cell 
              :title="item.orgName" 
              :label="`${item.orgId} | ${item.orgType}`"
              is-link
              @click="onEdit(item)"
            >
              <template #right-icon>
                <van-tag :type="getStatusType(item.currentStatus)">
                  {{ item.currentStatus }}
                </van-tag>
              </template>
            </van-cell>
            <template #right>
              <van-button square type="danger" text="删除" @click="onDelete(item)" />
            </template>
          </van-swipe-cell>
        </van-cell-group>
      </van-list>
    </van-pull-refresh>

    <!-- 添加按钮 -->
    <van-floating-bubble axis="xy" icon="plus" @click="showAdd = true" />

    <!-- 添加/编辑弹窗 -->
    <van-popup v-model:show="showAdd" position="bottom" round :style="{ height: '70%' }">
      <div class="popup-header">
        <span class="popup-title">{{ editing ? '编辑组织' : '新增组织' }}</span>
        <van-icon name="cross" @click="showAdd = false" />
      </div>
      <van-form @submit="onSubmit" class="popup-form">
        <van-field
          v-model="form.orgType"
          name="orgType"
          label="组织类型"
          placeholder="选择类型"
          readonly
          @click="showTypePicker = true"
          :rules="[{ required: true }]"
        />
        <van-field
          v-model="form.orgName"
          name="orgName"
          label="组织名称"
          placeholder="请输入名称"
          :rules="[{ required: true }]"
        />
        <van-field
          v-model="form.parentOrgId"
          name="parentOrgId"
          label="上级组织"
          placeholder="可选"
        />
        <van-field
          v-model="form.startFundAmount"
          name="startFundAmount"
          label="启动资金"
          type="number"
          placeholder="默认1000000"
        />
        <div style="margin: 16px;">
          <van-button round block type="primary" native-type="submit">
            确认
          </van-button>
        </div>
      </van-form>
    </van-popup>

    <!-- 类型选择器 -->
    <van-popup v-model:show="showTypePicker" position="bottom">
      <van-picker
        :columns="['团队', '部门', '分院']"
        @confirm="onTypeConfirm"
        @cancel="showTypePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Toast, Dialog } from 'vant';
import axios from 'axios';

const keyword = ref('');
const list = ref([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);

const showAdd = ref(false);
const showTypePicker = ref(false);
const editing = ref(false);

const form = ref({
  orgType: '',
  orgName: '',
  parentOrgId: '',
  startFundAmount: 1000000
});

const getStatusType = (status) => {
  const map = { '健康': 'success', '预警': 'warning', '冻结': 'danger', '保护期': 'default' };
  return map[status] || 'default';
};

const fetchList = async () => {
  try {
    const { data } = await axios.get('/api/orgs/list', {
      params: { page: page.value, limit: 20, keyword: keyword.value }
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

const onTypeConfirm = (value) => {
  form.value.orgType = value;
  showTypePicker.value = false;
};

const onSubmit = async () => {
  try {
    const url = editing.value ? `/api/orgs/${form.value.orgId}` : '/api/orgs';
    const method = editing.value ? 'put' : 'post';
    const { data } = await axios[method](url, form.value);
    if (data.success) {
      Toast.success(editing.value ? '更新成功' : '创建成功');
      showAdd.value = false;
      onRefresh();
    }
  } catch (err) {
    Toast.fail(err.response?.data?.message || '操作失败');
  }
};

const onEdit = (item) => {
  editing.value = true;
  form.value = { ...item };
  showAdd.value = true;
};

const onDelete = (item) => {
  Dialog.confirm({
    title: '确认删除',
    message: `删除组织 ${item.orgName}？`
  }).then(async () => {
    try {
      await axios.delete(`/api/orgs/${item.orgId}`);
      Toast.success('删除成功');
      onRefresh();
    } catch (err) {
      Toast.fail('删除失败');
    }
  });
};

onMounted(onLoad);
</script>

<style scoped>
.org-management {
  padding: 12px;
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
