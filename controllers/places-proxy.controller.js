const logger = require('../utils/logger');
const axios = require('axios'); // Use axios or fetch for external HTTP calls

// ⚠️ WARNING: Your Google API Key MUST be retrieved from a secure environment variable
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY; 

/**
 * Proxies the request to the Google Places Details API to fetch LatLng
 * using a securely stored API Key.
 */
exports.getPlaceDetails = async (req, res) => {
    const { placeId } = req.body;

    if (!placeId) {
        return res.status(400).json({ message: 'Missing placeId.' });
    }
    
    // 🚨 CORRECTION: Use logger and avoid printing the key value.
    if (!GOOGLE_API_KEY) {
        logger.error('GOOGLE_API_KEY is not set in environment variables.');
        return res.status(500).json({ error: 'Server configuration error: Google API Key missing.' });
    }
    // Optionally log proxy usage
    logger.debug(`Fetching details for placeId: ${placeId}`);


    try {
        const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}&fields=geometry`;

        const response = await axios.get(googleUrl);
        const data = response.data;

        if (data.status !== 'OK' || !data.result || !data.result.geometry) {
            // Log the actual status returned by Google
            logger.warn('Google Places Details API returned status:', data.status, 'for placeId:', placeId);
            return res.status(404).json({ message: 'Place details not found.', status: data.status });
        }

        const { lat, lng } = data.result.geometry.location;

        // Send back only the clean, necessary data (lat and lng)
        res.status(200).json({ lat, lng }); 

    } catch (error) {
        // Log the error message and the failed placeId for debugging
        logger.error(`Error in Google Places proxy for placeId ${placeId}: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch location details from external service.' });
    }

    
};
/**
 * Proxies the request to the Google Places Autocomplete API to fetch suggestions
 * using a securely stored API Key.
 * Endpoint: GET /api/v1/search/suggestions?query=...
 */
exports.getPlaceSuggestions = async (req, res) => {
    const { query } = req.query; // Use req.query for GET parameters

    if (!query || query.length < 3) {
        // Return an empty array or 200 OK if the query is too short/missing
        return res.status(200).json({ suggestions: [] });
    }

    if (!GOOGLE_API_KEY) {
        logger.error('GOOGLE_API_KEY is not set in environment variables.');
        return res.status(500).json({ error: 'Server configuration error: Google API Key missing.' });
    }
    logger.debug(`Fetching suggestions for query: ${query}`);

    try {
        // Construct the Google Places Autocomplete URL
        const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&components=country:in&language=en`;

        const response = await axios.get(googleUrl);
        const data = response.data;

        if (data.status !== 'OK') {
            logger.warn('Google Places Autocomplete API returned status:', data.status, 'for query:', query);
            return res.status(500).json({ error: 'External API failure.', status: data.status });
        }

        // Map the verbose Google results to a clean array of strings/objects
        const suggestions = data.predictions.map(prediction => ({
            description: prediction.description, // What the user sees
            placeId: prediction.place_id,       // What we need for details (LatLng)
        }));

        // Send back a clean list of suggestions
        res.status(200).json({ suggestions }); 

    } catch (error) {
        logger.error(`Error in Google Autocomplete proxy for query ${query}: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch suggestions from external service.' });
    }
};