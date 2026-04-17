<template>
  <div class="layout">
    <van-nav-bar :title="pageTitle" fixed />
    
    <div class="content">
      <router-view />
    </div>
    
    <van-tabbar v-model="active" route>
      <van-tabbar-item
        v-for="route in routes"
        :key="route.path"
        :to="route.path"
        :icon="route.meta?.icon"
      >
        {{ route.meta?.title }}
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const active = ref(0);

const routes = [
  { path: '/dashboard', meta: { title: '驾驶舱', icon: 'chart-o' } },
  { path: '/team', meta: { title: '团队', icon: 'cluster-o' } },
  { path: '/project', meta: { title: '项目', icon: 'todo-list-o' } },
  { path: '/cost', meta: { title: '成本', icon: 'balance-list-o' } },
  { path: '/report', meta: { title: '报表', icon: 'bar-chart-o' } }
];

const pageTitle = computed(() => route.meta?.title || '云工程绩效');
</script>

<style scoped>
.layout {
  min-height: 100vh;
  padding-top: 46px;
  padding-bottom: 50px;
}

.content {
  min-height: calc(100vh - 96px);
}
</style>
