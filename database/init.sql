-- 云工程绩效管理系统 - 数据库初始化脚本
-- PostgreSQL 14+
-- 执行: psql -U postgres -d cloud_performance -f init.sql

-- 1. 创建数据库 (如果还没有创建)
-- CREATE DATABASE cloud_performance WITH ENCODING = 'UTF8' LC_COLLATE = 'zh_CN.UTF-8';

-- 2. 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. 创建更新时间自动更新函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 一、基础数据层 (3张表)
-- ============================================

-- 1.1 组织架构表
CREATE TABLE org_structure (
    id SERIAL PRIMARY KEY,
    org_id VARCHAR(20) UNIQUE NOT NULL,
    org_type VARCHAR(20) NOT NULL CHECK (org_type IN ('团队', '部门', '分院')),
    org_name VARCHAR(100) NOT NULL,
    parent_org_id VARCHAR(20),
    leader_id INTEGER,
    team_leader_id INTEGER,
    award_coefficient DECIMAL(3,2) DEFAULT 0.75,
    management_cost_rate DECIMAL(3,2) DEFAULT 0.15,
    start_fund_amount DECIMAL(15,2) DEFAULT 1000000,
    overdraft_warning_line INTEGER DEFAULT 50,
    target_per_capita_performance DECIMAL(15,2) DEFAULT 200000,
    current_status VARCHAR(20) DEFAULT '健康' CHECK (current_status IN ('健康', '预警', '冻结', '保护期')),
    provident_fund_balance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_org_type ON org_structure(org_type);
CREATE INDEX idx_parent_org ON org_structure(parent_org_id);
CREATE INDEX idx_org_status ON org_structure(current_status);

ALTER TABLE org_structure ADD CONSTRAINT fk_parent_org 
    FOREIGN KEY (parent_org_id) REFERENCES org_structure(org_id);

CREATE TRIGGER trg_org_structure_updated_at
    BEFORE UPDATE ON org_structure
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 1.2 用户表 (认证用,放在前面避免循环依赖)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    emp_id VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT '普通用户',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 1.3 人员主表
CREATE TABLE employee (
    id SERIAL PRIMARY KEY,
    emp_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    org_id VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    entry_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT '在职' CHECK (status IN ('在职', '离职', '待入职')),
    default_cost_standard DECIMAL(15,2) DEFAULT 30000,
    default_performance_base DECIMAL(15,2) DEFAULT 5000,
    can_cross_team BOOLEAN DEFAULT FALSE,
    cross_team_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_emp_org ON employee(org_id);
CREATE INDEX idx_emp_status ON employee(status);
CREATE INDEX idx_can_cross ON employee(can_cross_team);

ALTER TABLE employee ADD CONSTRAINT fk_emp_org 
    FOREIGN KEY (org_id) REFERENCES org_structure(org_id);

CREATE TRIGGER trg_employee_updated_at
    BEFORE UPDATE ON employee
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 1.4 全局参数配置表
CREATE TABLE global_config (
    id SERIAL PRIMARY KEY,
    config_id VARCHAR(20) UNIQUE DEFAULT 'CFG001',
    default_award_coefficient DECIMAL(3,2) DEFAULT 0.75,
    default_management_cost_rate DECIMAL(3,2) DEFAULT 0.15,
    overdraft_warning_line INTEGER DEFAULT 50,
    protection_trigger_line INTEGER DEFAULT 80,
    provident_fund_rate INTEGER DEFAULT 20,
    target_hook_coefficient DECIMAL(3,2) DEFAULT 1.1,
    excess_hook_coefficient DECIMAL(3,2) DEFAULT 0.6,
    excess_profit_share_rate INTEGER DEFAULT 10,
    base_management_allowance DECIMAL(15,2) DEFAULT 220000,
    protection_period_months INTEGER DEFAULT 6,
    protection_interest_rate INTEGER DEFAULT 6,
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
    FOR EACH ROW EXECUTE FUNCTION check_single_global_config();

CREATE TRIGGER trg_global_config_updated_at
    BEFORE UPDATE ON global_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 二、项目与回款层 (3张表)
-- ============================================

-- 2.1 项目主表
CREATE TABLE project (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(20) UNIQUE NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    contract_amount DECIMAL(15,2) NOT NULL,
    estimated_gross_margin INTEGER DEFAULT 35,
    actual_gross_margin INTEGER,
    customer_name VARCHAR(100) NOT NULL,
    sign_date DATE NOT NULL,
    complete_date DATE,
    project_status VARCHAR(20) DEFAULT '前期' CHECK (project_status IN ('前期', '进行中', '已完工', '已终止')),
    project_manager_id INTEGER NOT NULL,
    payment_nodes JSONB DEFAULT '[]',
    total_received DECIMAL(15,2) DEFAULT 0,
    remaining_receivable DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_project_status ON project(project_status);
CREATE INDEX idx_project_manager ON project(project_manager_id);
CREATE INDEX idx_sign_date ON project(sign_date);

CREATE TRIGGER trg_project_updated_at
    BEFORE UPDATE ON project
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2.2 项目团队分配表
CREATE TABLE project_team (
    id SERIAL PRIMARY KEY,
    allocation_id VARCHAR(20) UNIQUE NOT NULL,
    project_id VARCHAR(20) NOT NULL,
    org_id VARCHAR(20) NOT NULL,
    allocation_ratio INTEGER NOT NULL CHECK (allocation_ratio >= 0 AND allocation_ratio <= 100),
    effective_date DATE NOT NULL,
    expiry_date DATE,
    is_main_team BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pt_project ON project_team(project_id);
CREATE INDEX idx_pt_org ON project_team(org_id);

ALTER TABLE project_team ADD CONSTRAINT fk_pt_project 
    FOREIGN KEY (project_id) REFERENCES project(project_id);
ALTER TABLE project_team ADD CONSTRAINT fk_pt_org 
    FOREIGN KEY (org_id) REFERENCES org_structure(org_id);

-- 分配比例校验函数
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
        RAISE EXCEPTION '项目%的团队分配比例合计不能超过100%,当前合计%', 
            NEW.project_id, total_ratio + NEW.allocation_ratio;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_allocation_ratio
    BEFORE INSERT OR UPDATE ON project_team
    FOR EACH ROW EXECUTE FUNCTION check_project_allocation_ratio();

CREATE TRIGGER trg_project_team_updated_at
    BEFORE UPDATE ON project_team
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2.3 回款记录表
CREATE TABLE payment (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(20) UNIQUE NOT NULL,
    project_id VARCHAR(20) NOT NULL,
    payment_date DATE NOT NULL,
    payment_amount DECIMAL(15,2) NOT NULL,
    corresponding_node INTEGER NOT NULL,
    bank_serial_no VARCHAR(100),
    creator_id INTEGER NOT NULL,
    bonus_calc_status VARCHAR(20) DEFAULT '未计算' CHECK (bonus_calc_status IN ('未计算', '已计算', '计算失败')),
    allocatable_bonus DECIMAL(15,2) DEFAULT 0,
    process_status VARCHAR(20) DEFAULT '审批中' CHECK (process_status IN ('审批中', '已通过', '已驳回')),
    approver_id INTEGER,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_project ON payment(project_id);
CREATE INDEX idx_payment_date ON payment(payment_date);
CREATE INDEX idx_payment_status ON payment(process_status);

ALTER TABLE payment ADD CONSTRAINT fk_payment_project 
    FOREIGN KEY (project_id) REFERENCES project(project_id);

CREATE TRIGGER trg_payment_updated_at
    BEFORE UPDATE ON payment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 三、跨团队成本层 (3张表)
-- ============================================

-- 3.1 项目参与记录表
CREATE TABLE project_emp (
    id SERIAL PRIMARY KEY,
    participation_id VARCHAR(20) UNIQUE NOT NULL,
    project_id VARCHAR(20) NOT NULL,
    emp_id VARCHAR(20) NOT NULL,
    workload_ratio INTEGER NOT NULL CHECK (workload_ratio >= 0 AND workload_ratio <= 100),
    effective_date DATE NOT NULL,
    expiry_date DATE,
    effective_days INTEGER,
    cost_allocation_method VARCHAR(20) DEFAULT '按整月' CHECK (cost_allocation_method IN ('按整月', '按天折算')),
    remark TEXT,
    creator_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pe_project ON project_emp(project_id);
CREATE INDEX idx_pe_emp ON project_emp(emp_id);

-- 承担比例校验函数
CREATE OR REPLACE FUNCTION check_emp_participation_ratio()
RETURNS TRIGGER AS $$
DECLARE
    total_ratio INTEGER;
    current_month DATE;
BEGIN
    current_month := DATE_TRUNC('month', NEW.effective_date)::DATE;
    
    SELECT COALESCE(SUM(workload_ratio), 0) INTO total_ratio
    FROM project_emp
    WHERE emp_id = NEW.emp_id
    AND id <> NEW.id
    AND (expiry_date IS NULL OR expiry_date >= current_month)
    AND effective_date <= (current_month + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    IF total_ratio + NEW.workload_ratio > 100 THEN
        RAISE EXCEPTION '该人员当月已在其他项目承担%,本项目最多可分配%', 
            total_ratio, 100 - total_ratio;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_participation_ratio
    BEFORE INSERT OR UPDATE ON project_emp
    FOR EACH ROW EXECUTE FUNCTION check_emp_participation_ratio();

CREATE TRIGGER trg_project_emp_updated_at
    BEFORE UPDATE ON project_emp
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3.2 人员归属历史表
CREATE TABLE emp_history (
    id SERIAL PRIMARY KEY,
    history_id VARCHAR(20) UNIQUE NOT NULL,
    emp_id VARCHAR(20) NOT NULL,
    org_id VARCHAR(20) NOT NULL,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('入职', '调岗', '晋升', '离职')),
    adjustment_reason TEXT,
    operator_id INTEGER,
    operated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_eh_emp ON emp_history(emp_id);
CREATE INDEX idx_eh_org ON emp_history(org_id);

ALTER TABLE emp_history ADD CONSTRAINT fk_eh_emp 
    FOREIGN KEY (emp_id) REFERENCES employee(emp_id);
ALTER TABLE emp_history ADD CONSTRAINT fk_eh_org 
    FOREIGN KEY (org_id) REFERENCES org_structure(org_id);

-- 人员调岗触发器
CREATE OR REPLACE FUNCTION record_emp_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.org_id IS NOT NULL AND NEW.org_id <> OLD.org_id THEN
        UPDATE emp_history 
        SET expiry_date = CURRENT_DATE - 1,
            adjustment_type = '调岗'
        WHERE emp_id = OLD.emp_id 
        AND expiry_date IS NULL;
        
        INSERT INTO emp_history (history_id, emp_id, org_id, effective_date, adjustment_type, 
                                 adjustment_reason, operator_id)
        VALUES (
            'EH' || LPAD(NEXTVAL('emp_history_id_seq')::TEXT, 6, '0'),
            NEW.emp_id, NEW.org_id, CURRENT_DATE, '调岗', '系统自动', 
            NULL
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_emp_org_change
    AFTER UPDATE OF org_id ON employee
    FOR EACH ROW EXECUTE FUNCTION record_emp_history();

-- 创建序列用于history_id
CREATE SEQUENCE IF NOT EXISTS emp_history_id_seq START 1;

-- 3.3 月度成本记录表
CREATE TABLE cost (
    id SERIAL PRIMARY KEY,
    cost_id VARCHAR(20) UNIQUE NOT NULL,
    belong_month DATE NOT NULL,
    emp_id VARCHAR(20) NOT NULL,
    org_id VARCHAR(20) NOT NULL,
    project_id VARCHAR(20),
    cost_type VARCHAR(50) NOT NULL CHECK (cost_type IN ('标准成本', '绩效', '奖金', '公积金')),
    workload_ratio INTEGER DEFAULT 100 CHECK (workload_ratio >= 0 AND workload_ratio <= 100),
    standard_cost DECIMAL(15,2) NOT NULL,
    allocated_cost DECIMAL(15,2),
    actual_amount DECIMAL(15,2) DEFAULT 0,
    performance_bonus DECIMAL(15,2) DEFAULT 0,
    provident_fund DECIMAL(15,2) DEFAULT 0,
    cost_ownership VARCHAR(50) DEFAULT '本团队全职' CHECK (cost_ownership IN ('本团队全职', '跨团队分摊', '公共成本', '已拆分')),
    participation_id VARCHAR(20),
    parent_cost_id VARCHAR(20),
    status VARCHAR(20) DEFAULT '草稿' CHECK (status IN ('草稿', '已确认', '已发放')),
    confirmer_id INTEGER,
    confirmed_at TIMESTAMP,
    process_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cost_month ON cost(belong_month);
CREATE INDEX idx_cost_emp ON cost(emp_id);
CREATE INDEX idx_cost_org ON cost(org_id);
CREATE INDEX idx_cost_status ON cost(status);

ALTER TABLE cost ADD CONSTRAINT fk_cost_emp 
    FOREIGN KEY (emp_id) REFERENCES employee(emp_id);
ALTER TABLE cost ADD CONSTRAINT fk_cost_org 
    FOREIGN KEY (org_id) REFERENCES org_structure(org_id);

CREATE TRIGGER trg_cost_updated_at
    BEFORE UPDATE ON cost
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 四、计算引擎层 (2张表)
-- ============================================

-- 4.1 团队月度账户表
CREATE TABLE team_account (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(30) UNIQUE NOT NULL,
    org_id VARCHAR(20) NOT NULL,
    belong_month DATE NOT NULL,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    monthly_received_bonus DECIMAL(15,2) DEFAULT 0,
    monthly_cost_consumption DECIMAL(15,2) DEFAULT 0,
    monthly_provident_fund DECIMAL(15,2) DEFAULT 0,
    monthly_overdraft DECIMAL(15,2) DEFAULT 0,
    closing_balance DECIMAL(15,2) DEFAULT 0,
    cumulative_overdraft_ratio DECIMAL(5,2) DEFAULT 0,
    account_status VARCHAR(20) DEFAULT '健康' CHECK (account_status IN ('健康', '预警', '冻结', '保护期')),
    manager_performance_ratio DECIMAL(3,2) DEFAULT 1.0,
    data_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, belong_month)
);

CREATE INDEX idx_ta_org ON team_account(org_id);
CREATE INDEX idx_ta_month ON team_account(belong_month);
CREATE INDEX idx_ta_status ON team_account(account_status);

ALTER TABLE team_account ADD CONSTRAINT fk_ta_org 
    FOREIGN KEY (org_id) REFERENCES org_structure(org_id);

CREATE TRIGGER trg_team_account_updated_at
    BEFORE UPDATE ON team_account
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.2 经理激励表
CREATE TABLE manager_incentive (
    id SERIAL PRIMARY KEY,
    incentive_id VARCHAR(30) UNIQUE NOT NULL,
    org_id VARCHAR(20) NOT NULL,
    year INTEGER NOT NULL,
    team_count INTEGER,
    target_per_capita DECIMAL(15,2),
    actual_per_capita DECIMAL(15,2),
    target_gross_profit DECIMAL(15,2),
    actual_gross_profit DECIMAL(15,2),
    base_allowance DECIMAL(15,2),
    target_bonus DECIMAL(15,2),
    excess_bonus DECIMAL(15,2),
    profit_share DECIMAL(15,2),
    team_provident_fund DECIMAL(15,2),
    total_bonus DECIMAL(15,2),
    paid_monthly_performance DECIMAL(15,2) DEFAULT 0,
    year_end_payment DECIMAL(15,2),
    status VARCHAR(20) DEFAULT '计算中' CHECK (status IN ('计算中', '已确认')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, year)
);

CREATE INDEX idx_mi_org ON manager_incentive(org_id);
CREATE INDEX idx_mi_year ON manager_incentive(year);

ALTER TABLE manager_incentive ADD CONSTRAINT fk_mi_org 
    FOREIGN KEY (org_id) REFERENCES org_structure(org_id);

CREATE TRIGGER trg_manager_incentive_updated_at
    BEFORE UPDATE ON manager_incentive
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 五、辅助表 (4张表)
-- ============================================

-- 5.1 透支干预记录表
CREATE TABLE overdraft_intervention (
    id SERIAL PRIMARY KEY,
    intervention_id VARCHAR(30) UNIQUE NOT NULL,
    org_id VARCHAR(20) NOT NULL,
    trigger_date DATE NOT NULL,
    overdraft_ratio DECIMAL(5,2),
    intervention_type VARCHAR(50),
    status VARCHAR(20) DEFAULT '待处理',
    handled_by INTEGER,
    handled_at TIMESTAMP,
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_oi_org ON overdraft_intervention(org_id);
CREATE INDEX idx_oi_date ON overdraft_intervention(trigger_date);

ALTER TABLE overdraft_intervention ADD CONSTRAINT fk_oi_org 
    FOREIGN KEY (org_id) REFERENCES org_structure(org_id);

-- 5.2 保护期记录表
CREATE TABLE protection_period_record (
    id SERIAL PRIMARY KEY,
    record_id VARCHAR(30) UNIQUE NOT NULL,
    org_id VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    overdraft_ratio DECIMAL(5,2),
    advance_amount DECIMAL(15,2),
    interest_rate DECIMAL(5,2),
    status VARCHAR(20) DEFAULT '已启动',
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ppr_org ON protection_period_record(org_id);

ALTER TABLE protection_period_record ADD CONSTRAINT fk_ppr_org 
    FOREIGN KEY (org_id) REFERENCES org_structure(org_id);

-- 5.3 奖金分配明细表
CREATE TABLE bonus_allocation_detail (
    id SERIAL PRIMARY KEY,
    detail_id VARCHAR(20) UNIQUE NOT NULL,
    payment_id VARCHAR(20) NOT NULL,
    org_id VARCHAR(20) NOT NULL,
    allocation_amount DECIMAL(15,2),
    calculation_basis TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bad_payment ON bonus_allocation_detail(payment_id);
CREATE INDEX idx_bad_org ON bonus_allocation_detail(org_id);

ALTER TABLE bonus_allocation_detail ADD CONSTRAINT fk_bad_payment 
    FOREIGN KEY (payment_id) REFERENCES payment(payment_id);
ALTER TABLE bonus_allocation_detail ADD CONSTRAINT fk_bad_org 
    FOREIGN KEY (org_id) REFERENCES org_structure(org_id);

-- 5.4 分包记录表
CREATE TABLE subcontract (
    id SERIAL PRIMARY KEY,
    subcontract_id VARCHAR(20) UNIQUE NOT NULL,
    project_id VARCHAR(20) NOT NULL,
    subcontractor_name VARCHAR(100),
    subcontract_amount DECIMAL(15,2),
    subcontract_type VARCHAR(50),
    process_status VARCHAR(20) DEFAULT '审批中',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sub_project ON subcontract(project_id);

ALTER TABLE subcontract ADD CONSTRAINT fk_sub_project 
    FOREIGN KEY (project_id) REFERENCES project(project_id);

CREATE TRIGGER trg_subcontract_updated_at
    BEFORE UPDATE ON subcontract
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 六、插入初始数据
-- ============================================

-- 插入创新院作为顶级组织
INSERT INTO org_structure (org_id, org_type, org_name, current_status) 
VALUES ('D001', '分院', '创新院', '健康');

-- 插入6个团队
INSERT INTO org_structure (org_id, org_type, org_name, parent_org_id, current_status) VALUES
('T001', '团队', '创新院一部', 'D001', '健康'),
('T002', '团队', '创新院二部', 'D001', '健康'),
('T003', '团队', '创新院三部', 'D001', '健康'),
('T004', '团队', '创新院四部', 'D001', '健康'),
('T005', '团队', '创新院五部', 'D001', '健康'),
('T006', '团队', '创新院六部', 'D001', '健康');

-- 插入全局配置 (只能有一条)
INSERT INTO global_config (config_id) VALUES ('CFG001');

-- 插入管理员用户 (密码: admin123, 使用bcrypt哈希)
-- 注意: 实际使用时需要用bcrypt生成正确的哈希值
INSERT INTO users (username, password_hash, role) 
VALUES ('admin', '$2b$10$YourHashedPasswordHere', '系统管理员');

-- ============================================
-- 完成
-- ============================================
SELECT '数据库初始化完成!' AS message;
SELECT COUNT(*) AS org_count FROM org_structure;
SELECT COUNT(*) AS config_count FROM global_config;
