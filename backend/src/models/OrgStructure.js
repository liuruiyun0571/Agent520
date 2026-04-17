const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');

class OrgStructure extends Model {}

OrgStructure.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orgId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'org_id'
  },
  orgType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['团队', '部门', '分院']]
    },
    field: 'org_type'
  },
  orgName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'org_name'
  },
  parentOrgId: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'parent_org_id',
    references: {
      model: 'org_structure',
      key: 'org_id'
    }
  },
  leaderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'leader_id'
  },
  teamLeaderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'team_leader_id'
  },
  awardCoefficient: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.75,
    field: 'award_coefficient'
  },
  managementCostRate: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.15,
    field: 'management_cost_rate'
  },
  startFundAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 1000000,
    field: 'start_fund_amount'
  },
  overdraftWarningLine: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    field: 'overdraft_warning_line'
  },
  targetPerCapitaPerformance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 200000,
    field: 'target_per_capita_performance'
  },
  currentStatus: {
    type: DataTypes.STRING(20),
    defaultValue: '健康',
    validate: {
      isIn: [['健康', '预警', '冻结', '保护期']]
    },
    field: 'current_status'
  },
  providentFundBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'provident_fund_balance'
  }
}, {
  sequelize,
  modelName: 'OrgStructure',
  tableName: 'org_structure',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 自关联
OrgStructure.belongsTo(OrgStructure, { 
  as: 'parentOrg', 
  foreignKey: 'parent_org_id', 
  targetKey: 'org_id' 
});
OrgStructure.hasMany(OrgStructure, { 
  as: 'childOrgs', 
  foreignKey: 'parent_org_id', 
  sourceKey: 'org_id' 
});

module.exports = OrgStructure;
