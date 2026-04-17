const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');
const Project = require('./Project');

class Payment extends Model {}

Payment.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paymentId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'payment_id'
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
  paymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'payment_date'
  },
  paymentAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'payment_amount'
  },
  correspondingNode: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'corresponding_node'
  },
  bankSerialNo: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'bank_serial_no'
  },
  creatorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'creator_id'
  },
  bonusCalcStatus: {
    type: DataTypes.STRING(20),
    defaultValue: '未计算',
    validate: {
      isIn: [['未计算', '已计算', '计算失败']]
    },
    field: 'bonus_calc_status'
  },
  allocatableBonus: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'allocatable_bonus'
  },
  processStatus: {
    type: DataTypes.STRING(20),
    defaultValue: '审批中',
    validate: {
      isIn: [['审批中', '已通过', '已驳回']]
    },
    field: 'process_status'
  },
  approverId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approver_id'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  }
}, {
  sequelize,
  modelName: 'Payment',
  tableName: 'payment',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Payment.belongsTo(Project, { foreignKey: 'project_id', targetKey: 'project_id' });

module.exports = Payment;
