const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Appointment = sequelize.define('Appointment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        listing_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        employee_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        scheduled_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'non_assigned',
            validate: {
                isIn: [['pending', 'confirmed', 'cancelled', 'completed']],
            },
        },
        feedback: {
            type: DataTypes.TEXT,
            allowNull: true, 
        },

    }, {
        tableName: 'appointments',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['listing_id', 'scheduled_at'],
            },
        ],
    });

    Appointment.associate = (models) => {
        // An appointment belongs to a user (the one who booked it)
        Appointment.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user',
            onDelete: 'CASCADE',
        });

        Appointment.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company',
            onDelete: 'CASCADE',
        });

        // An appointment belongs to a specific listing
        Appointment.belongsTo(models.Listing, {
            foreignKey: 'listing_id',
            as: 'listing',
            onDelete: 'CASCADE',
        });

        // An appointment belongs to an employee (the one who's assigned to it)
        Appointment.belongsTo(models.User, {
            foreignKey: 'employee_id',
            as: 'employee',
            onDelete: 'SET NULL',
        });
    };

    return Appointment;
};