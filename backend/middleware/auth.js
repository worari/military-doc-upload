// backend/middleware/auth.js
module.exports = (req, res, next) => {
    const token = req.headers.authorization;
    if (token !== 'your_secret_token') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
  };
  