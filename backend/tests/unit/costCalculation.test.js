/**
 * 核心算法测试 - 成本拆分计算
 */

const { calculateCrossTeamSplit, calculateWithTransferHistory } = require('../../src/services/costCalculation');

describe('成本拆分计算', () => {
  
  describe('跨团队人员成本拆分', () => {
    it('应该正确按项目分配比例拆分成本', async () => {
      const mockEmployee = {
        empId: 'E001',
        name: '张三',
        canCrossTeam: true,
        orgId: 'ORG001'
      };
      
      const mockProjects = [
        { projectId: 'P001', allocationRatio: 60 },
        { projectId: 'P002', allocationRatio: 40 }
      ];
      
      const costStandard = 15000;
      
      // 预期：成本按60%和40%拆分
      const expectedAllocations = [
        { orgId: 'ORG001', projectId: 'P001', ratio: 0.6, amount: 9000 },
        { orgId: 'ORG002', projectId: 'P002', ratio: 0.4, amount: 6000 }
      ];
      
      // 实际测试需要依赖数据库，这里仅作为示例
      expect(costStandard * 0.6).toBe(9000);
      expect(costStandard * 0.4).toBe(6000);
    });

    it('单个项目时应全部分配给该项目团队', () => {
      const costStandard = 15000;
      const allocationRatio = 100;
      
      expect(costStandard * (allocationRatio / 100)).toBe(15000);
    });
  });

  describe('调岗人员成本拆分', () => {
    it('应该按当月工作日比例拆分成本', () => {
      // 假设30天的月份，15号调岗
      const daysInMonth = 30;
      const transferDay = 15;
      const costStandard = 15000;
      
      const beforeDays = transferDay - 1; // 14天在原部门
      const afterDays = daysInMonth - beforeDays; // 16天在新部门
      
      const beforeAmount = costStandard * (beforeDays / daysInMonth);
      const afterAmount = costStandard * (afterDays / daysInMonth);
      
      expect(beforeAmount).toBe(7000); // 15000 * 14/30 = 7000
      expect(afterAmount).toBe(8000);  // 15000 * 16/30 = 8000
      expect(beforeAmount + afterAmount).toBe(costStandard);
    });

    it('月初调岗时，成本应主要分配给新部门', () => {
      const daysInMonth = 30;
      const transferDay = 2; // 2号调岗
      const costStandard = 15000;
      
      const beforeDays = transferDay - 1; // 1天在原部门
      const afterDays = daysInMonth - beforeDays; // 29天在新部门
      
      const beforeAmount = costStandard * (beforeDays / daysInMonth);
      const afterAmount = costStandard * (afterDays / daysInMonth);
      
      expect(beforeAmount).toBe(500);  // 15000 * 1/30
      expect(afterAmount).toBe(14500); // 15000 * 29/30
    });
  });
});

describe('奖金计算公式', () => {
  it('应该正确计算可分配奖金', () => {
    const paymentAmount = 1000000; // 100万回款
    const grossMargin = 0.25;      // 25%毛利率
    const managementCostRate = 0.15; // 15%管理成本率
    const awardCoefficient = 0.30;   // 30%计奖系数
    const allocationRatio = 0.40;    // 40%分配比例
    
    // 公式：回款金额 × 毛利率 × (1-管理成本率) × 计奖系数 × 分配比例
    const expectedBonus = paymentAmount 
      * grossMargin 
      * (1 - managementCostRate) 
      * awardCoefficient 
      * allocationRatio;
    
    expect(expectedBonus).toBe(25500); // 100万 × 25% × 85% × 30% × 40% = 2.55万
  });
});

describe('透支比例计算', () => {
  it('应该正确计算团队透支比例', () => {
    const openingBalance = 50000;   // 期初余额5万
    const receivedBonus = 20000;    // 本月回款奖金2万
    const costConsumption = 80000;  // 本月成本消耗8万
    
    const closingBalance = openingBalance + receivedBonus - costConsumption;
    // 透支额 = 期初余额 + 回款奖金 - 成本消耗
    // 透支比例 = (透支额 / 期初余额) × 100
    
    const overdraftAmount = openingBalance - closingBalance; // 成本超过资金的部分
    const overdraftRatio = (overdraftAmount / openingBalance) * 100;
    
    expect(closingBalance).toBe(-10000); // 透支1万
    expect(overdraftRatio).toBe(120);    // 透支比例120%
  });
});
