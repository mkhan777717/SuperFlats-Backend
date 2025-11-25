module.exports = (sequelize, DataTypes) => {
    // The RefreshToken model stores the tokens used to renew the short-lived Access Tokens.
    const RefreshToken = sequelize.define("RefreshToken", {
      token: {
        type: DataTypes.STRING,
        allowNull: false, // Token string must exist
        unique: true, // Crucial: Each token must be unique for security checks
      },
      // The absolute expiry date (used for cleanup and maximum session length)
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    }, {
        tableName: "refresh_tokens",
      timestamps: true,
    });
  
    // Associate RefreshToken with a User
    RefreshToken.associate = (models) => {
        RefreshToken.belongsTo(models.User, {
            foreignKey: "userId",
            targetKey: "id",
            allowNull: false, // Token must always be linked to a user
            onDelete: 'CASCADE', // If the user is deleted, their tokens should also be deleted automatically
        });
    };
  
    return RefreshToken;
  };