'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class LedgerEntry extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // A LedgerEntry belongs to one Ledger
            LedgerEntry.belongsTo(models.Ledger, {
                foreignKey: 'tenant_id',
                as: 'ledger',
            });

            // A LedgerEntry also belongs to a Tenant
            LedgerEntry.belongsTo(models.Tenant, {
                foreignKey: 'tenant_id',
                as: 'tenant',
            });
        }
    }

    LedgerEntry.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        tenant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'tenants',
                key: 'id',
            },
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM('income', 'expense'),
            allowNull: false,
        },
        category: {
            type: DataTypes.STRING(100),
            defaultValue: 'Uncategorized',
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    }, {
        sequelize,
        modelName: 'LedgerEntry',
        tableName: 'ledger_entries',
        timestamps: false,
    });

    return LedgerEntry;
};
