# 数据库设计文档

## 数据库: PostgreSQL
## 字符集: UTF-8
## 时区: Asia/Shanghai

---

## 一、基础数据层 (3张表)

### 1.1 组织架构表 (org_structure)
存储所有团队、部门、分院的母体信息

```sql
CREATE TABLE org_structure (
    id SERIAL PRIMARY KEY,
    org_id VARCHAR(20) UNIQUE NOT NULL,           -- 组织ID: T001/T002/D001格式
    org_type VARCHAR(20) NOT NULL,                -- 组织类型: 团队/部门/分院
    org_name VARCHAR(100) NOT NULL,               -- 组织名称
    parent_org_id VARCHAR(20),                    -- 父组织ID,自关联
    leader_id INTEGER,                            -- 分管领导(关联users表)
    team_leader_id INTEGER,                       -- 团队负责人(组织类型=团队时)
    award_coefficient DECIMAL(3,2) DEFAULT 0.75,  -- 计奖系数
    management_cost_rate DECIMAL(3,2) DEFAULT 0.15, -- 管理成本率
    start_fund_amount DECIMAL(15,2) DEFAULT 1000000, -- 启动资金额度
    overdraft_warning_line INTEGER DEFAULT 50,    -- 透支预警线(%)
    target_per_capita_performance DECIMAL(15,2) DEFAULT 200000, -- 目标人均绩效
    current_status VARCHAR(20) DEFAULT '健康',     -- 状态: 健康/预警/冻结/保护期
    provident_fund_balance DECIMAL(15,2) DEFAULT 0, -- 累计公积金余额
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_org_type ON org_structure(org_type);
CREATE INDEX idx_parent_org ON org_structure(parent_org_id);
CREATE INDEX idx_status ON org_structure(current_status);

-- 外键约束
ALTER TABLE org_structure ADD CONSTRAINT fk_parent_org 
    FOREIGN KEY (parent_org_id) REFERENCES org_structure(org_id);
```

**业务规则**:
- org_id生成规则: 'T' + 3位序号(团队) / 'D' + 3位序号(分院)
- parent_org_id为空表示顶级组织(如创新院)
- 组织类型为'团队'时,team_leader_id必填

---

### 1.2 人员主表 (employee)
存储全院人员信息

```sql
CREATE TABLE employee (
    id SERIAL PRIMARY KEY,
    emp_id VARCHAR(20) UNIQUE NOT NULL,           -- 人员ID: E001格式
    name VARCHAR(50) NOT NULL,                    -- 姓名
    org_id VARCHAR(20) NOT NULL,                  -- 当前归属组织
    email VARCHAR(100),                           -- 邮箱(加密存储)
    phone VARCHAR(20),                            -- 手机号(加密存储)
    entry_date DATE NOT NULL,                     -- 入职日期
    status VARCHAR(20) DEFAULT '在职',            -- 状态: 在职/离职/待入职
    default_cost_standard DECIMAL(15,2) DEFAULT 30000, -- 默认成本标准(月度)
    default_performance_base DECIMAL(15,2) DEFAULT 5000, -- 默认绩效基数(月度)
    can_cross_team BOOLEAN DEFAULT FALSE,         -- 是否可跨团队
    cross_team_count INTEGER DEFAULT 0,           -- 当前跨团队数量
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_emp_org ON employee(org_id);
CREATE INDEX idx_emp_status ON employee(status);
CREATE INDEX idx_can_cross ON employee(can_cross_team);

-- 外键
ALTER TABLE employee ADD CONSTRAINT fk_emp_org 
    FOREIGN KEY (org_id) REFERENCES org_structure(org_id);
```

**触发器**: 人员调岗自动记录历史
```sql
CREATE OR REPLACE FUNCTION record_emp_history()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果组织发生变更
    IF OLD.org_id IS NOT NULL AND NEW.org_id <> OLD.org_id THEN
        -- 关闭旧记录
        UPDATE emp_history 
        SET expiry_date = CURRENT_DATE - 1,
            adjustment_type = '调岗'
        WHERE emp_id = OLD.emp_id 
        AND expiry_date IS NULL;
        
        -- 创建新记录
        INSERT INTO emp_history (emp_id, org_id, effective_date, adjustment_type, 
                                 adjustment_reason, operator_id)
        VALUES (NEW.emp_id, NEW.org_id, CURRENT_DATE, '调岗', '系统自动', 
                COALESCE(current_setting('app.current_user_id', true)::INTEGER, 1));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_emp_org_change
    AFTER UPDATE OF org_id ON employee
    FOR EACH ROW
    EXECUTE FUNCTION record_emp_history();
```

---

### 1.3 全局参数配置表 (global_config)
单条记录表,整个系统只有一条配置

```sql
CREATE TABLE global_config (
    id SERIAL PRIMARY KEY,
    config_id VARCHAR(20) UNIQUE DEFAULT 'CFG001', -- 配置ID固定
    default_award_coefficient DECIMAL(3,2) DEFAULT 0.75,     -- 计奖系数默认
    default_management_cost_rate DECIMAL(3,2) DEFAULT 0.15, -- 管理成本率默认
    overdraft_warning_line INTEGER DEFAULT 50,      -- 透支预警线
    protection_trigger_line INTEGER DEFAULT 80,     -- 保护期触发线
    provident_fund_rate INTEGER DEFAULT 20,         -- 公积金计提比例(%)
    target_hook_coefficient DECIMAL(3,2) DEFAULT 1.1,  -- 目标挂钩系数
    excess_hook_coefficient DECIMAL(3,2) DEFAULT 0.6,  -- 超额挂钩系数
    excess_profit_share_rate INTEGER DEFAULT 10,    -- 超额利润分享比例
    base_management_allowance DECIMAL(15,2) DEFAULT 220000, -- 基础管理津贴(年)
    protection_period_months INTEGER DEFAULT 6,     -- 保护期时长(月)
    protection_interest_rate INTEGER DEFAULT 6,     -- 保护期利息率(年化%)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 约束: 只能有一条记录
CREATE OR REPLACE FUNCTION check_single_global_config()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM global_config) > 0 THEN
        RAISE EXCEPTION '全局配置已存在,请勿重复创建,请编辑现有记录';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_single_global_config
    BEFORE INSERT ON global_config
    FOR EACH ROW
    EXECUTE FUNCTION check_single_global_config();
```

---

## 二、项目与回款层 (3张表)

### 2.1 项目主表 (project)

```sql
CREATE TABLE project (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(20) UNIQUE NOT NULL,       -- 项目ID: XM2024001格式
    project_name VARCHAR(200) NOT NULL,           -- 项目名称
    contract_amount DECIMAL(15,2) NOT NULL,       -- 合同金额
    estimated_gross_margin INTEGER DEFAULT 35,    -- 预估毛利率(%)
    actual_gross_margin INTEGER,                  -- 实际毛利率(%)
    customer_name VARCHAR(100) NOT NULL,          -- 客户名称
    sign_date DATE NOT NULL,                      -- 签订日期
    complete_date DATE,                           -- 完工日期
    project_status VARCHAR(20) DEFAULT '前期',     -- 状态: 前期/进行中/已完工/已终止
    project_manager_id INTEGER NOT NULL,          -- 项目经理
    payment_nodes JSONB DEFAULT '[]',             -- 支付节点(JSON数组)
    total_received DECIMAL(15,2) DEFAULT 0,       -- 累计已回款
    remaining_receivable DECIMAL(15,2) DEFAULT 0, -- 剩余应收款
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_project_status ON project(project_status);
CREATE INDEX idx_project_manager ON project(project_manager_id);
CREATE INDEX idx_sign_date ON project(sign_date);
```

**payment_nodes JSON结构**:
```json
[
  {
    "node_no": 1,
    "payment_ratio": 30,
    "planned_date": "2024-03-01",
    "is_received": false,
    "actual_receive_date": null,
    "actual_receive_amount": 0
  }
]
```

---

### 2.2 项目团队分配表 (project_team)

```sql
CREATE TABLE project_team (
    id SERIAL PRIMARY KEY,
    allocation_id VARCHAR(20) UNIQUE NOT NULL,    -- 分配ID: PT000001格式
    project_id VARCHAR(20) NOT NULL,              -- 项目ID
    org_id VARCHAR(20) NOT NULL,                  -- 团队ID
    allocation_ratio INTEGER NOT NULL,            -- 分配比例(%)
    effective_date DATE NOT NULL,                 -- 生效日期
    expiry_date DATE,                             -- 失效日期(空表示当前有效)
    is_main_team BOOLEAN DEFAULT FALSE,           -- 是否主责团队
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_pt_project ON project_team(project_id);
CREATE INDEX idx_pt_org ON project_team(org_id);
CREATE INDEX idx_pt_effective ON project_team(effective_date, expiry_date);

-- 外键
ALTER TABLE project_team ADD CONSTRAINT fk_pt_project 
    FOREIGN KEY (project_id) REFERENCES project(project_id);
ALTER TABLE project_team ADD CONSTRAINT fk_pt_org 
    FOREIGN KEY (org_id) REFERENCES org_structure(org_id);

-- 约束: 同一项目分配比例合计不超过100%
CREATE OR REPLACE FUNCTION check_project_allocation_ratio()
RETURNS TRIGGER AS $$
DECLARE
    total_ratio INTEGER;
BEGIN
    SELECT COALESCE(SUM(allocation_ratio), 0) INTO total_ratio
    FROM project_team
    WHERE project_id = NEW.project_id
    AND id <> NEW.id
    AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE);
    
    IF total_ratio + NEW.allocation_ratio > 100 THEN
        RAISE EXCEPTION '项目%的团队分配比例合计不能超过100%%,当前合计%%', 
            NEW.project_id, total_ratio + NEW.allocation_ratio;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_allocation_ratio
    BEFORE INSERT OR UPDATE ON project_team
    FOR EACH ROW
    EXECUTE FUNCTION check_project_allocation_ratio();
```

---

### 2.3 回款记录表 (payment)
流程表单,需审批

```sql
CREATE TABLE payment (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(20) UNIQUE NOT NULL,       -- 回款ID: HK000001格式
    project_id VARCHAR(20) NOT NULL,              -- 项目ID
    payment_date DATE NOT NULL,                   -- 回款日期
    payment_amount DECIMAL(15,2) NOT NULL,        -- 回款金额
    corresponding_node INTEGER NOT NULL,          -- 对应节点序号
    bank_serial_no VARCHAR(100),                  -- 银行流水号
    creator_id INTEGER NOT NULL,                  -- 录入人
    bonus_calc_status VARCHAR(20) DEFAULT '未计算', -- 奖金计算状态
    allocatable_bonus DECIMAL(15,2) DEFAULT 0,    -- 可分配奖金
    process_status VARCHAR(20) DEFAULT '审批中',   -- 流程状态: 审批中/已通过/已驳回
    approver_id INTEGER,                          -- 审批人
    approved_at TIMESTAMP,                        -- 审批时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_payment_project ON payment(project_id);
CREATE INDEX idx_payment_date ON payment(payment_date);
CREATE INDEX idx_payment_status ON payment(process_status);
CREATE INDEX idx_bonus_status ON payment(bonus_calc_status);
```

---

## 三、跨团队成本层 (3张表)

### 3.1 项目参与记录表 (project_emp)
跨团队成本分摊的唯一依据

```sql
CREATE TABLE project_emp (
    id SERIAL PRIMARY KEY,
    participation_id VARCHAR(20) UNIQUE NOT NULL, -- 参与ID: PE000001格式
    project_id VARCHAR(20) NOT NULL,              -- 项目ID
    emp_id VARCHAR(20) NOT NULL,                  -- 人员ID
   承担比例 INTEGER NOT NULL,                    -- 承担比例(%)
    effective_date DATE NOT NULL,                 -- 生效日期
    expiry_date DATE,                             -- 失效日期
    effective_days INTEGER,                       -- 当月有效天数
    cost_allocation_method VARCHAR(20) DEFAULT '按整月', -- 分摊方式: 按整月/按天折算
    remark TEXT,                                  -- 备注
    creator_id INTEGER,                           -- 创建人
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_pe_project ON project_emp(project_id);
CREATE INDEX idx_pe_emp ON project_emp(emp_id);
CREATE INDEX idx_pe_effective ON project_emp(effective_date, expiry_date);

-- 约束: 同一人员当月承担比例合计不超过100%
CREATE OR REPLACE FUNCTION check_emp_participation_ratio()
RETURNS TRIGGER AS $$
DECLARE
    total_ratio INTEGER;
    current_month DATE;
BEGIN
    current_month := DATE_TRUNC('month', NEW.effective_date)::DATE;
    
    SELECT COALESCE(SUM(承担比例), 0) INTO total_ratio
    FROM project_emp
    WHERE emp_id = NEW.emp_id
    AND id <> NEW.id
    AND (expiry_date IS NULL OR expiry_date >= current_month)
    AND effective_date <= (current_month + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    IF total_ratio + NEW.承担比例 > 100 THEN
        RAISE EXCEPTION '该人员当月已在其他项目承担%%%,本项目最多可分配%%%', 
            total_ratio, 100 - total_ratio;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_participation_ratio
    BEFORE INSERT OR UPDATE ON project_emp
    FOR EACH ROW
    EXECUTE FUNCTION check_emp_participation_ratio();
```

---

### 3.2 人员归属历史表 (emp_history)

```sql
CREATE TABLE emp_history (
    id SERIAL PRIMARY KEY,
    history_id VARCHAR(20) UNIQUE NOT NULL,       -- 历史ID: EH000001格式
    emp_id VARCHAR(20) NOT NULL,                  -- 人员ID
    org_id VARCHAR(20) NOT NULL,                  -- 组织ID
    effective_date DATE NOT NULL,                 -- 生效日期
    expiry_date DATE,                             -- 失效日期
    adjustment_type VARCHAR(20) NOT NULL,         -- 调整类型: 入职/调岗/晋升/离职
    adjustment_reason TEXT,                       -- 调整原因
    operator_id INTEGER,                          -- 操作人
    operated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_eh_emp ON emp_history(emp_id);
CREATE INDEX idx_eh_org ON emp_history(org_id);
CREATE INDEX idx_eh_effective ON emp_history(effective_date, expiry_date);
```

---

### 3.3 月度成本记录表 (cost)
流程表单,需审批,支持跨团队拆分

```sql
CREATE TABLE cost (
    id SERIAL PRIMARY KEY,
    cost_id VARCHAR(20) UNIQUE NOT NULL,          -- 成本ID: C000001格式
    belong_month DATE NOT NULL,                   -- 所属月份(YYYY-MM-01)
    emp_id VARCHAR(20) NOT NULL,                  -- 人员ID
    org_id VARCHAR(20) NOT NULL,                  -- 成本归属团队
    project_id VARCHAR(20),                       -- 项目ID(可空表示公共成本)
    cost_type VARCHAR(50) NOT NULL,               -- 成本类型: 标准成本/绩效/奖金/公积金
   承担比例 INTEGER DEFAULT 100,                -- 在该团队的比例
    standard_cost DECIMAL(15,2) NOT NULL,         -- 标准成本
    allocated_cost DECIMAL(15,2),                 -- 分摊后成本
    actual_amount DECIMAL(15,2),                  -- 实发金额
    performance_bonus DECIMAL(15,2),              -- 绩效奖金
    provident_fund DECIMAL(15,2),                 -- 公积金计提
    cost_ownership VARCHAR(50) DEFAULT '本团队全职', -- 成本归属类型
    participation_id VARCHAR(20),                 -- 关联参与ID
    parent_cost_id VARCHAR(20),                   -- 父成本ID(拆分后的子记录指向父记录)
    status VARCHAR(20) DEFAULT '草稿',            -- 状态: 草稿/已确认/已发放
    confirmer_id INTEGER,                         -- 确认人
    confirmed_at TIMESTAMP,                       -- 确认时间
    process_status VARCHAR(20),                   -- 流程状态
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_cost_month ON cost(belong_month);
CREATE INDEX idx_cost_emp ON cost(emp_id);
CREATE INDEX idx_cost_org ON cost(org_id);
CREATE INDEX idx_cost_status ON cost(status);
CREATE INDEX idx_cost_parent ON cost(parent_cost_id);
```

---

## 四、计算引擎层 (2张表)

### 4.1 团队月度账户表 (team_account)
数据工厂回写,人工不直接编辑

```sql
CREATE TABLE team_account (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(30) UNIQUE NOT NULL,       -- 账户ID: TA+团队ID+年月
    org_id VARCHAR(20) NOT NULL,                  -- 团队ID
    belong_month DATE NOT NULL,                   -- 所属月份
    opening_balance DECIMAL(15,2) DEFAULT 0,      -- 期初余额
    monthly_received_bonus DECIMAL(15,2) DEFAULT 0, -- 本月回款奖金
    monthly_cost_consumption DECIMAL(15,2) DEFAULT 0, -- 本月成本消耗
    monthly_provident_fund DECIMAL(15,2) DEFAULT 0, -- 本月公积金计提
    monthly_overdraft DECIMAL(15,2) DEFAULT 0,    -- 本月透支额度
    closing_balance DECIMAL(15,2) DEFAULT 0,      -- 期末余额
    cumulative_overdraft_ratio DECIMAL(5,2) DEFAULT 0, -- 累计透支比例
    account_status VARCHAR(20) DEFAULT '健康',     -- 状态: 健康/预警/冻结/保护期
    manager_performance_ratio DECIMAL(3,2) DEFAULT 1.0, -- 经理绩效发放比例
    data_updated_at TIMESTAMP,                    -- 数据更新时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, belong_month)
);

-- 索引
CREATE INDEX idx_ta_org ON team_account(org_id);
CREATE INDEX idx_ta_month ON team_account(belong_month);
CREATE INDEX idx_ta_status ON team_account(account_status);
```

---

### 4.2 经理激励表 (manager_incentive)

```sql
CREATE TABLE manager_incentive (
    id SERIAL PRIMARY KEY,
    incentive_id VARCHAR(30) UNIQUE NOT NULL,     -- 激励ID: MI+组织ID+年度
    org_id VARCHAR(20) NOT NULL,                  -- 组织ID
    year INTEGER NOT NULL,                        -- 年度
    team_count INTEGER,                           -- 团队人数
    target_per_capita DECIMAL(15,2),              -- 目标人均绩效
    actual_per_capita DECIMAL(15,2),              -- 实际人均绩效
    target_gross_profit DECIMAL(15,2),            -- 目标总毛利
    actual_gross_profit DECIMAL(15,2),            -- 实际总毛利
    base_allowance DECIMAL(15,2),                 -- 基础管理津贴
    target_bonus DECIMAL(15,2),                   -- 目标部分奖金
    excess_bonus DECIMAL(15,2),                   -- 超额部分奖金
    profit_share DECIMAL(15,2),                   -- 超额利润分享
    team_provident_fund DECIMAL(15,2),            -- 团队公积金计提
    total_bonus DECIMAL(15,2),                    -- 年度总奖金
    paid_monthly_performance DECIMAL(15,2) DEFAULT 0, -- 已发月度绩效
    year_end_payment DECIMAL(15,2),               -- 年终补发
    status VARCHAR(20) DEFAULT '计算中',           -- 状态: 计算中/已确认
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, year)
);

-- 索引
CREATE INDEX idx_mi_org ON manager_incentive(org_id);
CREATE INDEX idx_mi_year ON manager_incentive(year);
```

---

## 五、辅助表 (3张表)

### 5.1 透支干预记录表 (overdraft_intervention)

```sql
CREATE TABLE overdraft_intervention (
    id SERIAL PRIMARY KEY,
    intervention_id VARCHAR(30) UNIQUE NOT NULL,  -- 干预ID: OI+团队ID+日期
    org_id VARCHAR(20) NOT NULL,                  -- 团队ID
    trigger_date DATE NOT NULL,                   -- 触发日期
    overdraft_ratio DECIMAL(5,2),                 -- 透支比例
    intervention_type VARCHAR(50),                -- 干预类型: 院长约谈/冻结账户等
    status VARCHAR(20) DEFAULT '待处理',          -- 状态
    handled_by INTEGER,                           -- 处理人
    handled_at TIMESTAMP,                         -- 处理时间
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 5.2 保护期记录表 (protection_period_record)

```sql
CREATE TABLE protection_period_record (
    id SERIAL PRIMARY KEY,
    record_id VARCHAR(30) UNIQUE NOT NULL,        -- 记录ID: PP+团队ID+日期
    org_id VARCHAR(20) NOT NULL,                  -- 团队ID
    start_date DATE NOT NULL,                     -- 启动日期
    overdraft_ratio DECIMAL(5,2),                 -- 透支比例
    advance_amount DECIMAL(15,2),                 -- 垫付金额
    interest_rate DECIMAL(5,2),                   -- 利息率
    status VARCHAR(20) DEFAULT '已启动',          -- 状态
    end_date DATE,                                -- 结束日期
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 5.3 奖金分配明细表 (bonus_allocation_detail)

```sql
CREATE TABLE bonus_allocation_detail (
    id SERIAL PRIMARY KEY,
    detail_id VARCHAR(20) UNIQUE NOT NULL,        -- 明细ID
    payment_id VARCHAR(20) NOT NULL,              -- 回款ID
    org_id VARCHAR(20) NOT NULL,                  -- 团队ID
    allocation_amount DECIMAL(15,2),              -- 分配金额
    calculation_basis TEXT,                       -- 计算依据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_bad_payment ON bonus_allocation_detail(payment_id);
CREATE INDEX idx_bad_org ON bonus_allocation_detail(org_id);
```

---

### 5.4 分包记录表 (subcontract)

```sql
CREATE TABLE subcontract (
    id SERIAL PRIMARY KEY,
    subcontract_id VARCHAR(20) UNIQUE NOT NULL,   -- 分包ID
    project_id VARCHAR(20) NOT NULL,              -- 项目ID
    subcontractor_name VARCHAR(100),              -- 分包商名称
    subcontract_amount DECIMAL(15,2),             -- 分包金额
    subcontract_type VARCHAR(50),                 -- 分包类型
    process_status VARCHAR(20) DEFAULT '审批中',   -- 流程状态
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 5.5 用户表 (users)
认证用

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,         -- 用户名
    password_hash VARCHAR(255) NOT NULL,          -- 密码哈希
    emp_id VARCHAR(20),                           -- 关联人员ID
    role VARCHAR(50) NOT NULL,                    -- 角色
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初始管理员账号 (密码: admin123)
-- INSERT INTO users (username, password_hash, role) 
-- VALUES ('admin', '$2b$10$...', '系统管理员');
```

---

## 六、表关系图

```
┌─────────────────────────────────────────────────────────────┐
│                      基础数据层                              │
├─────────────┬─────────────┬─────────────────────────────────┤
│org_structure│  employee   │        global_config            │
│   (组织)     │   (人员)    │         (全局配置)               │
└──────┬──────┴──────┬──────┴─────────────────────────────────┘
       │             │
       │    ┌────────┘
       │    │
       ▼    ▼
┌─────────────────────────────────────────────────────────────┐
│                    项目与回款层                              │
├─────────────┬─────────────┬─────────────────────────────────┤
│   project   │project_team │          payment                │
│   (项目)     │ (团队分配)   │          (回款)                 │
└──────┬──────┴──────┬──────┴─────────────────────────────────┘
       │             │
       ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                    跨团队成本层                              │
├─────────────┬─────────────┬─────────────────────────────────┤
│ project_emp │ emp_history │            cost                 │
│  (项目参与)  │  (归属历史)  │          (成本)                 │
└─────────────┴─────────────┴─────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    计算引擎层                                │
├─────────────────────────┬───────────────────────────────────┤
│      team_account       │       manager_incentive           │
│       (团队账户)         │         (经理激励)                 │
└─────────────────────────┴───────────────────────────────────┘
```

---

## 七、数据类型说明

| 类型 | PostgreSQL类型 | 说明 |
|------|---------------|------|
| ID字段 | VARCHAR(20) | 业务ID,如T001/E001 |
| 金额 | DECIMAL(15,2) | 精确到分 |
| 比例 | INTEGER/DECIMAL(5,2) | 百分比存储 |
| 状态 | VARCHAR(20) | 枚举值 |
| 日期 | DATE | 年月日 |
| 时间戳 | TIMESTAMP | 带时区 |
| JSON | JSONB | 支付节点等灵活结构 |
| 布尔 | BOOLEAN | 是/否 |

---

## 八、命名规范

1. **表名**: 小写,下划线分隔,如 `team_account`
2. **字段名**: 小写,下划线分隔,如 `org_id`
3. **索引名**: `idx_表名_字段名`
4. **外键名**: `fk_表名_字段名`
5. **触发器名**: `trg_功能描述`
6. **函数名**: 动词_名词,如 `check_allocation_ratio`
