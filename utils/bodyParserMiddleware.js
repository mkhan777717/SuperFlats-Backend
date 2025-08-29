const parseJsonBody = (req, res, next) => {
  // Check if the request body exists
  if (req.body) {
    // Loop through all keys in the body
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        try {
          // Attempt to parse the string as JSON
          const parsed = JSON.parse(req.body[key]);
          // If successful, and it's an object or array, replace the original string
          if (typeof parsed === 'object' && parsed !== null) {
            req.body[key] = parsed;
          }
        } catch (error) {
          // If parsing fails, it's not JSON, so we just ignore it.
        }
      }
    }
  }
  // Move to the next middleware or the route handler
  next();
};

module.exports = parseJsonBody;
