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
        employee_id: {
            type: DataTypes.INTEGER,
            allowNull: true, // This can be null until an employee is assigned
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
                isIn: [['non_assigned', 'assigned', 'pending', 'confirmed', 'cancelled', 'completed']],
            },
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'appointments',
        timestamps: false,
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
            onDelete: 'SET NULL', // Set to null if the employee is deleted
        });
    };

    return Appointment;
};