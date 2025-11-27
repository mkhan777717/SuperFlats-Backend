const { admin } = require("../config/firebase");
const logger = require('./logger'); 

const ADMIN_TOPIC = 'admin_alerts';

/**
 * Sends a push notification to all devices subscribed to the ADMIN_TOPIC.
 * @param {string} title - The notification title.
 * @param {string} body - The notification body text.
 * @param {Object} data - Custom key/value pairs for app logic (e.g., propertyId).
 */
async function sendAdminNotification(title, body, data = {}) {
    
    
    const dataStrings = Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key]);
        return acc;
    }, {});

    const message = {
        notification: {
            title: title,
            body: body,
        },
        data: dataStrings,
        topic: ADMIN_TOPIC,
    };

    try {
        const response = await admin.messaging().send(message);
      logger.info(`FCM Sent Success: ${JSON.stringify(message, null, 2)}. Topic: ${ADMIN_TOPIC}`);

        return true;
    } catch (error) {
        
        logger.error(`FCM Send Error: ${error.message}`, { error, message });
        return false;
    }
}




module.exports = {
    sendAdminNotification,
    
};