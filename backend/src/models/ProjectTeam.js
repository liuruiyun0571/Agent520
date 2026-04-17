const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');
const OrgStructure = require('./OrgStructure');
const Project = require('./Project');

class ProjectTeam extends Model {}

ProjectTeam.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  allocationId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'allocation_id'
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
  orgId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'org_id',
    references: {
      model: 'org_structure',
      key: 'org_id'
    }
  },
  allocationRatio: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    },
    field: 'allocation_ratio'
  },
  effectiveDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'effective_date'
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'expiry_date'
  },
  isMainTeam: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_main_team'
  }
}, {
  sequelize,
  modelName: 'ProjectTeam',
  tableName: 'project_team',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 关联
ProjectTeam.belongsTo(Project, { foreignKey: 'project_id', targetKey: 'project_id' });
ProjectTeam.belongsTo(OrgStructure, { foreignKey: 'org_id', targetKey: 'org_id', as: 'organization' });

module.exports = ProjectTeam;
