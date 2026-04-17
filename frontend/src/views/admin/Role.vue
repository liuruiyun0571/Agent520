<template>
  <div class="role-management">
    <van-nav-bar 
      title="角色权限管理" 
      left-arrow 
      @click-left="$router.back()"
      fixed
    >
      <template #right>
        <van-button size="small" type="primary" icon="plus" @click="showAdd = true">
          新增角色
        </van-button>
      </template>
    </van-nav-bar>

    <van-cell-group title="系统内置角色">
      <van-cell
        v-for="role in systemRoles"
        :key="role.id"
        :title="role.roleName"
        :label="role.roleCode + ' | ' + role.description"
      >
        <template #right-icon>
          <van-tag type="success">系统</van-tag>
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group title="自定义角色">
      <van-empty v-if="customRoles.length === 0" description="暂无自定义角色" />
      
      <van-cell
        v-for="role in customRoles"
        :key="role.id"
        :title="role.roleName"
        :label="role.roleCode + ' | ' + (role.description || '暂无描述')"
        is-link
        @click="editRole(role)"
      >
        <template #value>
          <span class="permission-count">{{ role.permissions?.length || 0 }} 项权限</span>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 新增/编辑弹窗 -->
    <van-popup v-model:show="showEdit" position="right" :style="{ width: '100%', height: '100%' }">
      <div class="edit-popup">
        <van-nav-bar 
          :title="isEdit ? '编辑角色' : '新增角色'" 
          left-arrow 
          @click-left="showEdit = false"
          fixed
        >
          <template #right v-if="isEdit && !currentRole.isSystem">
            <van-button size="small" type="danger" plain @click="deleteRole">删除</van-button>
          </template>
        </van-nav-bar>

        <div class="form-content">
          <van-field
            v-model="form.roleCode"
            label="角色编码"
            placeholder="如: team_manager"
            :disabled="isEdit"
            :rules="[{ required: true }]"
          />
          
          <van-field
            v-model="form.roleName"
            label="角色名称"
            placeholder="如: 团队经理"
            :rules="[{ required: true }]"
          />
          
          <van-field
            v-model="form.description"
            label="角色描述"
            type="textarea"
            rows="2"
            placeholder="描述该角色的职责"
          />
          
          <van-cell title="数据权限范围" is-link @click="showDataScopePicker = true">
            <template #value>{{ getDataScopeLabel(form.dataScope) }}</template>
          </van-cell>

          <van-divider content-position="left">权限配置</van-divider>
          
          
          <van-checkbox-group v-model="form.permissions">
            <van-collapse v-model="activeModules">
              <van-collapse-item 
                v-for="module in groupedPermissions" 
                :key="module.name"
                :title="module.name"
                :name="module.name"
              >
                <van-cell-group :border="false">
                  <van-cell v-for="perm in module.permissions" :key="perm.code">
                    <template #title>
                      <van-checkbox :name="perm.code">
                        <span class="perm-name">{{ perm.name }}</span>
                        <span class="perm-code">{{ perm.code }}</span>
                      </van-checkbox>
                    </template>
                  </van-cell>
                </van-cell-group>
              </van-collapse-item>
            </van-collapse>
          </van-checkbox-group>

          <div class="form-actions">
            <van-button type="primary" block @click="saveRole">保存</van-button>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 数据权限选择 -->
    <van-popup v-model:show="showDataScopePicker" position="bottom">
      <van-picker
        :columns="dataScopeOptions"
        @confirm="onDataScopeConfirm"
        @cancel="showDataScopePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Toast, Dialog } from 'vant';
import { roleApi } from '@/api';

const router = useRouter();
const showAdd = ref(false);
const showEdit = ref(false);
const showDataScopePicker = ref(false);
const isEdit = ref(false);
const activeModules = ref(['项目管理']);

const roles = ref([]);
const allPermissions = ref([]);

const currentRole = ref({});
const form = ref({
  roleCode: '',
  roleName: '',
  description: '',
  dataScope: 'personal',
  permissions: []
});

const dataScopeOptions = [
  { text: '个人数据', value: 'personal' },
  { text: '团队数据', value: 'team' },
  { text: '部门数据', value: 'dept' },
  { text: '全部数据', value: 'all' }
];

const systemRoles = computed(() => roles.value.filter(r => r.isSystem));
const customRoles = computed(() => roles.value.filter(r => !r.isSystem));

const groupedPermissions = computed(() => {
  const groups = {};
  allPermissions.value.forEach(perm => {
    if (perm.code === '*') return; // 跳过超级管理员
    const module = perm.module || '其他';
    if (!groups[module]) groups[module] = [];
    groups[module].push(perm);
  });
  
  return Object.entries(groups).map(([name, permissions]) => ({
    name,
    permissions
  }));
});

const getDataScopeLabel = (scope) => {
  const option = dataScopeOptions.find(o => o.value === scope);
  return option?.text || '个人数据';
};

const loadRoles = async () => {
  try {
    const res = await roleApi.getList();
    if (res.success) {
      roles.value = res.data.list;
    }
  } catch (err) {
    console.error('加载角色失败:', err);
    // 模拟数据
    roles.value = [
      {
        id: 1,
        roleCode: 'admin',
        roleName: '超级管理员',
        description: '系统管理员，拥有所有权限',
        permissions: ['*'],
        dataScope: 'all',
        isSystem: true
      },
      {
        id: 2,
        roleCode: 'team_manager',
        roleName: '团队经理',
        description: '团队负责人，管理本团队数据',
        permissions: ['project:view', 'project:create', 'payment:view', 'payment:create', 'cost:view', 'cost:create'],
        dataScope: 'team',
        isSystem: true
      },
      {
        id: 3,
        roleCode: 'finance',
        roleName: '财务人员',
        description: '财务人员，审批回款和成本',
        permissions: ['payment:view', 'payment:approve', 'cost:view', 'cost:confirm'],
        dataScope: 'all',
        isSystem: true
      },
      {
        id: 4,
        roleCode: 'project_manager',
        roleName: '项目经理',
        description: '项目经理，管理项目相关',
        permissions: ['project:view', 'project:create', 'project:edit'],
        dataScope: 'personal',
        isSystem: false
      }
    ];
  }
};

const loadPermissions = async () => {
  try {
    const res = await roleApi.getPermissions();
    if (res.success) {
      allPermissions.value = res.data;
    }
  } catch (err) {
    console.error('加载权限失败:', err);
    // 模拟数据
    allPermissions.value = [
      { code: '*', name: '超级管理员', description: '拥有所有权限' },
      { code: 'project:view', name: '查看项目', module: '项目管理' },
      { code: 'project:create', name: '创建项目', module: '项目管理' },
      { code: 'project:edit', name: '编辑项目', module: '项目管理' },
      { code: 'payment:view', name: '查看回款', module: '回款管理' },
      { code: 'payment:create', name: '登记回款', module: '回款管理' },
      { code: 'payment:approve', name: '审批回款', module: '回款管理' },
      { code: 'cost:view', name: '查看成本', module: '成本管理' },
      { code: 'cost:create', name: '登记成本', module: '成本管理' },
      { code: 'cost:confirm', name: '确认成本', module: '成本管理' }
    ];
  }
};

const editRole = (role) => {
  isEdit.value = true;
  currentRole.value = role;
  form.value = {
    roleCode: role.roleCode,
    roleName: role.roleName,
    description: role.description,
    dataScope: role.dataScope,
    permissions: role.permissions || []
  };
  showEdit.value = true;
};

const saveRole = async () => {
  if (!form.value.roleCode || !form.value.roleName) {
    Toast.fail('请填写完整信息');
    return;
  }
  
  try {
    Toast.loading({ message: '保存中...', forbidClick: true });
    
    if (isEdit.value) {
      await roleApi.update(currentRole.value.id, form.value);
    } else {
      await roleApi.create(form.value);
    }
    
    Toast.success('保存成功');
    showEdit.value = false;
    loadRoles();
  } catch (err) {
    Toast.fail('保存失败');
  }
};

const deleteRole = () => {
  Dialog.confirm({
    title: '确认删除',
    message: '删除后无法恢复，是否确认？'
  }).then(async () => {
    try {
      await roleApi.delete(currentRole.value.id);
      Toast.success('删除成功');
      showEdit.value = false;
      loadRoles();
    } catch (err) {
      Toast.fail('删除失败');
    }
  });
};

const onDataScopeConfirm = ({ selectedOptions }) => {
  form.value.dataScope = selectedOptions[0].value;
  showDataScopePicker.value = false;
};

// 监听新增按钮
showAdd.value = false; // 初始关闭

// 监听showAdd变化，打开编辑弹窗
import { watch } from 'vue';
watch(showAdd, (val) => {
  if (val) {
    isEdit.value = false;
    form.value = {
      roleCode: '',
      roleName: '',
      description: '',
      dataScope: 'personal',
      permissions: []
    };
    showEdit.value = true;
    showAdd.value = false; // 重置
  }
});

onMounted(() => {
  loadRoles();
  loadPermissions();
});
</script>

<style scoped>
.role-management {
  min-height: 100vh;
  background: #f7f8fa;
  padding-top: 46px;
}

.permission-count {
  font-size: 12px;
  color: #999;
}

.edit-popup {
  min-height: 100vh;
  background: #f7f8fa;
}

.form-content {
  padding: 56px 12px 20px;
}

.perm-name {
  margin-left: 8px;
}

.perm-code {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.form-actions {
  margin-top: 30px;
  padding: 0 16px;
}
</style>
