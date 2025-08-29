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
        scheduled_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'confirmed', 'cancelled', 'completed']],
            },
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    }, {
        tableName: 'appointments',
        timestamps: false, // We're using a specific created_at column
        indexes: [
            // CRITICAL: This unique index prevents double-booking.
            // A listing can only have one appointment at a specific scheduled_at time.
            {
                unique: true,
                fields: ['listing_id', 'scheduled_at'],
            },
        ],
    });

    Appointment.associate = (models) => {
        // An appointment belongs to a user (the one who booked it)
        // onDelete: 'CASCADE' ensures the appointment is deleted if the user is deleted.
        Appointment.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user',
            onDelete: 'CASCADE',
        });

        // An appointment belongs to a specific listing
        // onDelete: 'CASCADE' ensures the appointment is deleted if the listing is deleted.
        Appointment.belongsTo(models.Listing, {
            foreignKey: 'listing_id',
            as: 'listing',
            onDelete: 'CASCADE',
        });
    };

    return Appointment;
};
