const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');
const Employee = require('./Employee');
const OrgStructure = require('./OrgStructure');

class EmpHistory extends Model {}

EmpHistory.init({
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
  employeeName: {
    type: DataTypes.STRING(50),
    field: 'employee_name'
  },
  oldOrgId: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'old_org_id'
  },
  newOrgId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'new_org_id',
    references: {
      model: 'org_structure',
      key: 'org_id'
    }
  },
  transferDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'transfer_date'
  },
  transferReason: {
    type: DataTypes.STRING(200),
    field: 'transfer_reason'
  },
  // 成本分摊相关
  originalOrg: {
    type: DataTypes.STRING(20),
    field: 'original_org'
  },
  targetOrg: {
    type: DataTypes.STRING(20),
    field: 'target_org'
  },
  costShareRatio: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 1.00,
    field: 'cost_share_ratio'
  },
  shareExpiryDate: {
    type: DataTypes.DATEONLY,
    field: 'share_expiry_date'
  }
}, {
  sequelize,
  modelName: 'EmpHistory',
  tableName: 'emp_history',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

EmpHistory.belongsTo(Employee, { foreignKey: 'emp_id', targetKey: 'emp_id' });
EmpHistory.belongsTo(OrgStructure, { foreignKey: 'new_org_id', targetKey: 'org_id', as: 'newOrg' });

module.exports = EmpHistory;
