module.exports = (sequelize, DataTypes) => {
    // One-time tokens for "forgot password". Only a SHA-256 hash of the token is stored,
    // so a database leak cannot be used to reset anyone's password.
    const PasswordResetToken = sequelize.define('PasswordResetToken', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        token_hash: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        used_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: 'password_reset_tokens',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    });

    PasswordResetToken.associate = (models) => {
        PasswordResetToken.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    };

    return PasswordResetToken;
};
