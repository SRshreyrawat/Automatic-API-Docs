/**
 * Authentication Middleware
 * Handles authentication and authorization
 */

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization header provided',
        statusCode: 401
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
        statusCode: 401
      });
    }

    // Simulated token verification
    // In production, you would verify the JWT token here
    req.user = {
      id: 1,
      email: 'user@example.com',
      role: 'user'
    };

    next();
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
      statusCode: 401
    });
  }
};

/**
 * Authorization middleware
 * Checks if user has required role
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
        statusCode: 401
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        statusCode: 403
      });
    }

    next();
  };
};
