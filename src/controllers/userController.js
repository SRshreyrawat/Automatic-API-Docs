/**
 * User Controller
 * Handles user management operations
 */

/**
 * Get all users with pagination
 */
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'createdAt' } = req.query;
    
    // Simulated database query
    const users = [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'user' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'admin' }
    ];

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length
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
 * Get user by ID
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User ID is required'
      });
    }

    // Simulated database query
    const user = {
      id: parseInt(id),
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user',
      createdAt: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Create new user
 */
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name, email, and password are required',
        statusCode: 400
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format',
        statusCode: 400
      });
    }

    // Create user (simulated)
    const newUser = {
      id: Date.now(),
      name,
      email,
      role: role || 'user',
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      statusCode: 500
    });
  }
};

/**
 * Update user
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User ID is required'
      });
    }

    // Update user (simulated)
    const updatedUser = {
      id: parseInt(id),
      name,
      email,
      role,
      updatedAt: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User ID is required'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const profile = {
      id: parseInt(id),
      name: 'John Doe',
      email: 'john@example.com',
      bio: 'Software developer',
      avatar: 'https://example.com/avatar.jpg',
      preferences: {
        theme: 'dark',
        notifications: true
      }
    };

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { bio, avatar, preferences } = req.body;

    const updatedProfile = {
      id: parseInt(id),
      bio,
      avatar,
      preferences,
      updatedAt: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};
