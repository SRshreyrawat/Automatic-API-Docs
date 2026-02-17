/**
 * Authentication Controller
 * Handles user authentication operations
 */

/**
 * User login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required',
        statusCode: 400
      });
    }

    // Simulated authentication
    const user = {
      id: 1,
      email: email,
      name: 'John Doe',
      role: 'user'
    };

    const token = 'simulated_jwt_token_' + Date.now();
    const refreshToken = 'simulated_refresh_token_' + Date.now();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
        refreshToken,
        expiresIn: 3600
      }
    });
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid credentials',
      statusCode: 401
    });
  }
};

/**
 * User registration
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'All fields are required',
        statusCode: 400
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Passwords do not match',
        statusCode: 400
      });
    }

    // Password strength check
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters',
        statusCode: 400
      });
    }

    const newUser = {
      id: Date.now(),
      name,
      email,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    const token = 'simulated_jwt_token_' + Date.now();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: newUser,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * User logout
 */
export const logout = async (req, res) => {
  try {
    // In a real app, you would invalidate the token
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required'
      });
    }

    const newToken = 'simulated_new_jwt_token_' + Date.now();

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
        expiresIn: 3600
      }
    });
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid refresh token'
    });
  }
};

/**
 * Forgot password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email is required'
      });
    }

    // Simulated email sending
    const resetToken = 'simulated_reset_token_' + Date.now();

    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
      data: {
        resetToken // In production, this would be sent via email
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Reset password
 */
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'All fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};
