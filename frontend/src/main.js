import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import { permissionDirective, roleDirective } from '@/utils/permission';

// Vant组件
import { 
  Button, 
  NavBar, 
  Tabbar, 
  TabbarItem, 
  Cell, 
  CellGroup,
  Field,
  Form,
  Toast,
  Dialog,
  Loading,
  List,
  PullRefresh,
  Search,
  Tag,
  Icon,
  Popup,
  Picker,
  DatetimePicker,
  DatePicker,
  Uploader,
  Card,
  Grid,
  GridItem,
  NoticeBar,
  SwipeCell,
  Empty,
  Tabs,
  Tab,
  Table,
  Progress,
  Circle,
  Collapse,
  CollapseItem,
  FloatingBubble,
  Stepper,
  Switch,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
  ActionSheet,
  DropdownMenu,
  DropdownItem,
  Sticky,
  Divider,
  Image as VanImage,
  Skeleton
} from 'vant';

// Vant样式
import 'vant/lib/index.css';

const app = createApp(App);

// 注册Vant组件
const components = [
  Button, NavBar, Tabbar, TabbarItem, Cell, CellGroup,
  Field, Form, Toast, Dialog, Loading, List, PullRefresh,
  Search, Tag, Icon, Popup, Picker, DatetimePicker, DatePicker, Uploader,
  Card, Grid, GridItem, NoticeBar, SwipeCell, Empty, Tabs, Tab, Table,
  Progress, Circle, Collapse, CollapseItem, FloatingBubble,
  Stepper, Switch, Checkbox, CheckboxGroup, Radio, RadioGroup,
  ActionSheet, DropdownMenu, DropdownItem, Sticky, Divider, VanImage, Skeleton
];

components.forEach(component => {
  app.use(component);
});

app.use(createPinia());
app.use(router);

// 注册权限指令
app.directive('permission', permissionDirective);
app.directive('role', roleDirective);

app.mount('#app');
