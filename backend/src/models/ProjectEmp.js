const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');
const Project = require('./Project');
const Employee = require('./Employee');
const OrgStructure = require('./OrgStructure');

class ProjectEmp extends Model {}

ProjectEmp.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  entryId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'entry_id'
  },
  projectId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'project_id',
    references: {
      model: 'project',
      key: 'project_id'
    }
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
  roleType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['技术负责人', '工作联系人', '工程协调人', '设计人', '校核人', '审核人', '团队成员']]
    },
    field: 'role_type'
  },
  joinDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'join_date'
  },
  leaveDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'leave_date'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: '进行中',
    validate: {
      isIn: [['进行中', '已退出']]
    }
  }
}, {
  sequelize,
  modelName: 'ProjectEmp',
  tableName: 'project_emp',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

ProjectEmp.belongsTo(Project, { foreignKey: 'project_id', targetKey: 'project_id' });
ProjectEmp.belongsTo(Employee, { foreignKey: 'emp_id', targetKey: 'emp_id', as: 'employee' });

module.exports = ProjectEmp;
