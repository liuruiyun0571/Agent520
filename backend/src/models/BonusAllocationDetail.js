const { DataTypes, Model } = require('sequelize');
const sequelize = require('./index');

class BonusAllocationDetail extends Model {}

BonusAllocationDetail.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  detailId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    field: 'detail_id'
  },
  paymentId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'payment_id'
  },
  orgId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'org_id'
  },
  allocationAmount: {
    type: DataTypes.DECIMAL(15, 2),
    field: 'allocation_amount'
  },
  calculationBasis: {
    type: DataTypes.TEXT,
    field: 'calculation_basis'
  }
}, {
  sequelize,
  modelName: 'BonusAllocationDetail',
  tableName: 'bonus_allocation_detail',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = BonusAllocationDetail;
