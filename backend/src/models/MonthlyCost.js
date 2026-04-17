const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');
const Employee = require('./Employee');
const OrgStructure = require('./OrgStructure');

class MonthlyCost extends Model {}

MonthlyCost.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  recordId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'record_id'
  },
  empId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'emp_id',
    references: {
      model: 'employee',
      key: 'emp_id'
    }
  },
  belongMonth: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'belong_month'
  },
  costType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'cost_type'
  },
  originalCostStandard: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'original_cost_standard'
  },
  appliedCostStandard: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'applied_cost_standard'
  },
  costSource: {
    type: DataTypes.STRING(20),
    field: 'cost_source'
  },
  allocatedCost: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'allocated_cost'
  },
  splitRatio: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 1.00,
    field: 'split_ratio'
  },
  deductDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'deduct_days'
  },
  deductAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'deduct_amount'
  },
  finalCost: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'final_cost'
  },
  orgId: {
    type: DataTypes.STRING(20),
    field: 'org_id'
  },
  submitterId: {
    type: DataTypes.INTEGER,
    field: 'submitter_id'
  },
  submitDate: {
    type: DataTypes.DATEONLY,
    field: 'submit_date'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: '草稿',
    validate: {
      isIn: [['草稿', '已提交', '已确认']]
    }
  }
}, {
  sequelize,
  modelName: 'MonthlyCost',
  tableName: 'monthly_cost',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['emp_id', 'belong_month', 'cost_type'] }
  ]
});

MonthlyCost.belongsTo(Employee, { foreignKey: 'emp_id', targetKey: 'emp_id', as: 'employee' });

module.exports = MonthlyCost;
