'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class RentBill extends Model { 
        /**
         * A virtual field that directly calculates the outstanding balance.
         * If the bill is paid, the balance is 0.
         * If it's unpaid, the balance is the full amount of the bill.
         */
        get balance() {
            return this.is_paid ? 0 : parseFloat(this.amount);
        }

        static associate(models) {
            // Each bill belongs to a booking, which holds the rent details
            RentBill.belongsTo(models.Booking, { 
                foreignKey: 'booking_id',
                as: 'booking',
            });
            // Each bill also belongs to a tenant for easy lookups
            RentBill.belongsTo(models.Tenant, { 
                foreignKey: 'tenant_id',
                as: 'tenant',
            });
        }
    }

    RentBill.init({ 
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        booking_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'bookings', key: 'id' },
            onDelete: 'CASCADE',
        },
        tenant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'tenants', key: 'id' },
            onDelete: 'CASCADE',
        },
        // The rent amount for this specific month, copied from the booking
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        // The month this bill is for (e.g., '2025-11-01')
        bill_month: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            comment: 'The first day of the month this bill applies to.',
        },
        // The core status: is this bill paid or not?
        is_paid: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        // The date this bill was marked as paid
        payment_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        sequelize,
        modelName: 'RentBill', // Renamed from 'Rent'
        tableName: 'rent_bills',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        // Define the virtual field in the model's JSON output
        toJSON: {
            virtuals: true,
        },
        toClient: {
            virtuals: true,
        }
    });

    return RentBill; 
};