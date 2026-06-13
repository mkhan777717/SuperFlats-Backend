const { Company } = require('../models'); // Adjust path to your Sequelize models
const { google } = require('googleapis');
exports.googlePlayWebhook = async (req, res) => {
    try {
        // 1. Validate that the incoming payload structure is from Google Pub/Sub
        if (!req.body || !req.body.message || !req.body.message.data) {
            console.error('Invalid Pub/Sub payload received');
            return res.status(400).send('Bad Request: Missing message data');
        }

        // 2. Decode the Base64 data string sent by Google
        const base64Data = req.body.message.data;
        const decodedString = Buffer.from(base64Data, 'base64').toString('utf-8');
        const notificationJson = JSON.parse(decodedString);

        console.log('Decoded Google Play Notification:', notificationJson);

        // 3. Extract the sub-notification properties
        const { packageName, subscriptionNotification } = notificationJson;

        // If it's just a test ping from the Play Console, acknowledge it immediately
        if (!subscriptionNotification) {
            console.log('Received test notification from Google Play Console');
            return res.status(200).send('Test event acknowledged');
        }

        const { notificationType, purchaseToken, subscriptionId } = subscriptionNotification;

        // 4. Map the Google Subscription ID to your Sequelize plan types
        let planType = 'free';
        if (subscriptionId === 'com.superflats.app.admin.pro_monthly' || subscriptionId === 'com.superflats.app.admin.pro_yearly') {
            planType = 'pro';
        } else if (subscriptionId === 'com.superflats.app.admin.org_monthly') {
            planType = 'org';
        }

        // 5. Handle the different lifecycle events (Notification Types)
        switch (notificationType) {
            case 4: // SUBSCRIPTION_PURCHASED (First time buy)
            case 2: // SUBSCRIPTION_RENEWED (Successful billing cycle)

                // Find the company using the unique purchase token / order identifier
                // Note: During the initial Flutter purchase flow, your app should have saved 
                // this token to the database first, linking it to the user's account session.
                const company = await Company.findOne({
                    where: { google_original_order_id: purchaseToken }
                });

                if (company) {
                    // Calculate your new expiration date (e.g., +30 days for monthly)
                    // Ideally, you would fetch the exact timestamp from the Google Play Developer API here
                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + 30);

                    // Update your database columns matching your migration
                    await company.update({
                        plan_type: planType,
                        subscription_status: 'active',
                        subscription_expires_at: expirationDate
                    });

                    console.log(`Successfully updated Company ID ${company.id} to ${planType} plan.`);
                } else {
                    console.warn(`Purchase token ${purchaseToken} not found in database yet.`);
                    // Still send 200 so Google doesn't spam retries while you debug matching logic
                }
                break;

            case 3: // SUBSCRIPTION_CANCELED (Auto-renew turned off, but keep access alive until expires_at)
                await Company.update(
                    { subscription_status: 'cancelled' },
                    { where: { google_original_order_id: purchaseToken } }
                );
                break;

            case 12: // SUBSCRIPTION_EXPIRED (Time ran out completely, revoke access)
                await Company.update(
                    {
                        plan_type: 'free',
                        subscription_status: 'none',
                        subscription_expires_at: null
                    },
                    { where: { google_original_order_id: purchaseToken } }
                );
                break;

            default:
                console.log(`Unhandled notification type: ${notificationType}`);
        }

        // 6. CRITICAL: Acknowledge receipt to Google Pub/Sub
        // Returning a 200 OK tells Pub/Sub it can safely delete this message from the retention queue.
        return res.status(200).send('Event processed');

    } catch (error) {
        console.error('Webhook Error:', error);
        // Returning a 500 tells Pub/Sub the server crashed, triggering an automatic retry later
        return res.status(500).send('Internal Server Error');
    }
}


/**
 * @route   POST /subscriptions/verify
 * @desc    Handles 1st-time purchase links directly from the Flutter App
 * @access  Private (Authenticated User)
 */
exports.verifyPurchase = async (req, res) => {
    try {
        const { purchaseToken, subscriptionId } = req.body;

        console.log(req.body);
        console.log(req.user);
        const companyId = req.user.company_id;

        // 1. Basic validation
        if (!purchaseToken || !subscriptionId) {
            return res.status(400).json({ error: 'Missing purchaseToken or subscriptionId' });
        }

        // 2. Initialize Google Play Developer API connection
        // Note: Requires a Google Service Account JSON key configured in your environment
        const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            scopes: ['https://www.googleapis.com/auth/androidpublisher'],
        });
        const playDeveloperApi = google.androidpublisher({ version: 'v3', auth });

        console.log(`Verifying 1st-time purchase token for Company: ${companyId}`);

        // 3. Query Google Play directly to ensure this token is valid and active
        let googleResponse;
        try {
            googleResponse = await playDeveloperApi.purchases.subscriptions.get({
                packageName: 'com.superflats.app.admin', // Your actual package name
                subscriptionId: subscriptionId,
                token: purchaseToken,
            });
        } catch (googleError) {
            console.error('Google API validation failed:', googleError.message);
            return res.status(400).json({ error: 'Invalid purchase token provided by store client.' });
        }

        const subscriptionData = googleResponse.data;

        // 4. Verify the payment state (startTimeMillis should exist, and it shouldn't be expired)
        const expiryTimeMillis = parseInt(subscriptionData.expiryTimeMillis);
        const now = Date.now();

        if (expiryTimeMillis < now) {
            return res.status(400).json({ error: 'This subscription has already expired.' });
        }

        // 5. Look up the company record in your Sequelize database
        const company = await Company.findByPk(companyId);
        if (!company) {
            return res.status(404).json({ error: 'Company record not found.' });
        }

        // 6. Map the subscription ID string to your database plan types
        let planType = 'free';
        if (subscriptionId.includes('pro')) planType = 'pro';
        if (subscriptionId.includes('org')) planType = 'org';

        // 7. Save the token and unlock premium parameters using Sequelize
        await company.update({
            google_original_order_id: purchaseToken, // 💡 Crucial: This links the column for future webhooks!
            plan_type: planType,
            subscription_status: 'active',
            subscription_expires_at: new Date(expiryTimeMillis), // Directly use Google's expiration timestamp
        });

        console.log(`Successfully verified and updated Company ID ${companyId} to ${planType} plan.`);

        // 8. Return success state back to your Flutter app
        return res.status(200).json({
            success: true,
            message: 'Subscription verified and activated.',
            plan_type: planType,
            expires_at: company.subscription_expires_at,
        });

    } catch (error) {
        console.error('Verify Subscription Route Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
