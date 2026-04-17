const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');

class Project extends Model {}

Project.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'project_id'
  },
  projectName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'project_name'
  },
  contractAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'contract_amount'
  },
  estimatedGrossMargin: {
    type: DataTypes.INTEGER,
    defaultValue: 35,
    field: 'estimated_gross_margin'
  },
  actualGrossMargin: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'actual_gross_margin'
  },
  customerName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'customer_name'
  },
  signDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'sign_date'
  },
  completeDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'complete_date'
  },
  projectStatus: {
    type: DataTypes.STRING(20),
    defaultValue: '前期',
    validate: {
      isIn: [['前期', '进行中', '已完工', '已终止']]
    },
    field: 'project_status'
  },
  projectManagerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'project_manager_id'
  },
  paymentNodes: {
    type: DataTypes.JSONB,
    defaultValue: [],
    field: 'payment_nodes'
  },
  totalReceived: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'total_received'
  },
  remainingReceivable: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'remaining_receivable'
  }
}, {
  sequelize,
  modelName: 'Project',
  tableName: 'project',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Project;
