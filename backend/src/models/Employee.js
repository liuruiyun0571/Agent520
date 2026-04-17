const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');
const OrgStructure = require('./OrgStructure');

class Employee extends Model {}

Employee.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  empId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'emp_id'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
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
  email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  entryDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'entry_date'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: '在职',
    validate: {
      isIn: [['在职', '离职', '待入职']]
    }
  },
  defaultCostStandard: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 30000,
    field: 'default_cost_standard'
  },
  defaultPerformanceBase: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 5000,
    field: 'default_performance_base'
  },
  canCrossTeam: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'can_cross_team'
  },
  crossTeamCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'cross_team_count'
  }
}, {
  sequelize,
  modelName: 'Employee',
  tableName: 'employee',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 关联
Employee.belongsTo(OrgStructure, { 
  as: 'organization', 
  foreignKey: 'org_id', 
  targetKey: 'org_id' 
});

module.exports = Employee;
