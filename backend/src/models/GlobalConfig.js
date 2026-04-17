const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');

class GlobalConfig extends Model {}

GlobalConfig.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  configId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    defaultValue: 'CFG001',
    field: 'config_id'
  },
  defaultAwardCoefficient: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.75,
    field: 'default_award_coefficient'
  },
  defaultManagementCostRate: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.15,
    field: 'default_management_cost_rate'
  },
  overdraftWarningLine: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    field: 'overdraft_warning_line'
  },
  protectionTriggerLine: {
    type: DataTypes.INTEGER,
    defaultValue: 80,
    field: 'protection_trigger_line'
  },
  providentFundRate: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
    field: 'provident_fund_rate'
  },
  targetHookCoefficient: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 1.1,
    field: 'target_hook_coefficient'
  },
  excessHookCoefficient: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.6,
    field: 'excess_hook_coefficient'
  },
  excessProfitShareRate: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    field: 'excess_profit_share_rate'
  },
  baseManagementAllowance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 220000,
    field: 'base_management_allowance'
  },
  protectionPeriodMonths: {
    type: DataTypes.INTEGER,
    defaultValue: 6,
    field: 'protection_period_months'
  },
  protectionInterestRate: {
    type: DataTypes.INTEGER,
    defaultValue: 6,
    field: 'protection_interest_rate'
  }
}, {
  sequelize,
  modelName: 'GlobalConfig',
  tableName: 'global_config',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = GlobalConfig;
