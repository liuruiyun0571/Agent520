<template>
  <div class="notification-page">
    <van-nav-bar 
      title="消息通知" 
      left-arrow 
      @click-left="$router.back()"
      fixed
    >
      <template #right v-if="notifications.some(n => !n.isRead)">
        <van-button 
          size="small" 
          type="primary" 
          plain
          @click="markAllAsRead"
        >
          全部已读
        </van-button>
      </template>
    </van-nav-bar>

    <van-tabs v-model:active="activeTab" class="notification-tabs">
      <van-tab :title="`全部(${totalCount})`" name="all"></van-tab>
      <van-tab :title="`未读(${unreadCount})`" name="unread"></van-tab>
      <van-tab title="审批" name="approval"></van-tab>
      <van-tab title="系统" name="system"></van-tab>
    </van-tabs>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <van-empty v-if="filteredNotifications.length === 0" description="暂无通知" />

        <van-swipe-cell v-for="notify in filteredNotifications" :key="notify.notifyId">
          <van-cell
            :title="notify.title"
            :class="{ unread: !notify.isRead }"
            @click="handleClick(notify)"
          >
            <template #icon>
              <div class="notify-icon" :class="notify.type">
                <van-icon :name="getIcon(notify.type)" />
              </div>
            </template>
            
            <template #label>
              <div class="notify-content">{{ notify.content }}</div>
              <div class="notify-time">{{ formatTime(notify.createdAt) }}</div>
            </template>
            
            <template #value v-if="!notify.isRead">
              <van-badge dot />
            </template>
          </van-cell>
          
          <template #right>
            <van-button 
              square 
              type="danger" 
              text="删除"
              @click="deleteNotify(notify.notifyId)"
            />
          </template>
        </van-swipe-cell>
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Toast, Dialog } from 'vant';
import dayjs from 'dayjs';
import { notificationApi } from '@/api';

const router = useRouter();
const activeTab = ref('all');
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);

const notifications = ref([]);
const unreadCount = ref(0);
const totalCount = ref(0);

const filteredNotifications = computed(() => {
  let result = notifications.value;
  
  if (activeTab.value === 'unread') {
    result = result.filter(n => !n.isRead);
  } else if (activeTab.value !== 'all') {
    result = result.filter(n => n.type === activeTab.value);
  }
  
  return result;
});

const getIcon = (type) => {
  const map = {
    approval: 'records',
    system: 'volume-o',
    warning: 'warning-o'
  };
  return map[type] || 'bell';
};

const formatTime = (time) => {
  if (!time) return '';
  const date = dayjs(time);
  const now = dayjs();
  
  if (date.isSame(now, 'day')) {
    return date.format('HH:mm');
  } else if (date.isSame(now.subtract(1, 'day'), 'day')) {
    return '昨天 ' + date.format('HH:mm');
  } else if (date.isSame(now, 'year')) {
    return date.format('MM-DD HH:mm');
  }
  return date.format('YYYY-MM-DD HH:mm');
};

const loadNotifications = async () => {
  try {
    const res = await notificationApi.getList({
      page: page.value,
      limit: 20
    });
    
    if (res.success) {
      const { list, pagination, unreadCount: unread } = res.data;
      
      if (refreshing.value) {
        notifications.value = list;
        refreshing.value = false;
      } else {
        notifications.value.push(...list);
      }
      
      unreadCount.value = unread;
      totalCount.value = pagination.total;
      finished.value = page.value >= pagination.totalPages;
    }
  } catch (err) {
    console.error('加载通知失败:', err);
    // 使用模拟数据
    if (notifications.value.length === 0) {
      notifications.value = [
        {
          notifyId: 'NOT001',
          type: 'approval',
          title: '回款审批提醒',
          content: '您有一条来自张三的回款审批待处理，金额: ¥500,000',
          isRead: false,
          createdAt: new Date(),
          actionUrl: '/approval/payment/P001'
        },
        {
          notifyId: 'NOT002',
          type: 'system',
          title: '月度结算完成',
          content: '2024年3月的月度结算已完成，请查看团队账户',
          isRead: false,
          createdAt: dayjs().subtract(2, 'hour').toISOString(),
          actionUrl: '/team'
        },
        {
          notifyId: 'NOT003',
          type: 'warning',
          title: '团队资金预警',
          content: '创新院一部透支比例已达到68%，请及时关注',
          isRead: true,
          createdAt: dayjs().subtract(1, 'day').toISOString(),
          actionUrl: '/team?id=T001'
        }
      ];
      unreadCount.value = 2;
      totalCount.value = 3;
      finished.value = true;
    }
  }
};

const onLoad = async () => {
  loading.value = true;
  await loadNotifications();
  loading.value = false;
  page.value++;
};

const onRefresh = () => {
  page.value = 1;
  finished.value = false;
  onLoad();
};

const handleClick = async (notify) => {
  // 标记为已读
  if (!notify.isRead) {
    await notificationApi.markAsRead(notify.notifyId);
    notify.isRead = true;
    unreadCount.value = Math.max(0, unreadCount.value - 1);
  }
  
  // 跳转
  if (notify.actionUrl) {
    router.push(notify.actionUrl);
  }
};

const markAllAsRead = async () => {
  try {
    Toast.loading({ message: '处理中...', forbidClick: true });
    await notificationApi.markAllAsRead();
    notifications.value.forEach(n => n.isRead = true);
    unreadCount.value = 0;
    Toast.success('已全部标记为已读');
  } catch (err) {
    Toast.fail('操作失败');
  }
};

const deleteNotify = (notifyId) => {
  Dialog.confirm({
    title: '确认删除',
    message: '删除后无法恢复，是否确认？'
  }).then(async () => {
    try {
      await notificationApi.delete(notifyId);
      notifications.value = notifications.value.filter(n => n.notifyId !== notifyId);
      Toast.success('删除成功');
    } catch (err) {
      Toast.fail('删除失败');
    }
  });
};

onMounted(() => {
  loadNotifications();
});
</script>

<style scoped>
.notification-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-top: 46px;
}

.notification-tabs {
  margin-bottom: 12px;
}

.unread {
  background: #f0f9ff;
}

.notify-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 20px;
}

.notify-icon.approval {
  background: #e3f2fd;
  color: #2196f3;
}

.notify-icon.system {
  background: #f3e5f5;
  color: #9c27b0;
}

.notify-icon.warning {
  background: #fff3e0;
  color: #ff9800;
}

.notify-content {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notify-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>
