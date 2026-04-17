const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');
const OrgStructure = require('./OrgStructure');

class TeamAccount extends Model {}

TeamAccount.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  accountId: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    field: 'account_id'
  },
  orgId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'org_id',
    references: {
      model: 'org_structure',
      key: 'org_id'
    }
  },
  belongMonth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'belong_month'
  },
  openingBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'opening_balance'
  },
  monthlyReceivedBonus: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'monthly_received_bonus'
  },
  monthlyCostConsumption: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'monthly_cost_consumption'
  },
  monthlyProvidentFund: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'monthly_provident_fund'
  },
  monthlyOverdraft: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'monthly_overdraft'
  },
  closingBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'closing_balance'
  },
  cumulativeOverdraftRatio: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    field: 'cumulative_overdraft_ratio'
  },
  accountStatus: {
    type: DataTypes.STRING(20),
    defaultValue: '健康',
    validate: {
      isIn: [['健康', '预警', '冻结', '保护期']]
    },
    field: 'account_status'
  },
  managerPerformanceRatio: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 1.0,
    field: 'manager_performance_ratio'
  },
  dataUpdatedAt: {
    type: DataTypes.DATE,
    field: 'data_updated_at'
  }
}, {
  sequelize,
  modelName: 'TeamAccount',
  tableName: 'team_account',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['org_id', 'belong_month'] }
  ]
});

TeamAccount.belongsTo(OrgStructure, { foreignKey: 'org_id', targetKey: 'org_id' });

module.exports = TeamAccount;
