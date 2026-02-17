/**
 * Product Controller
 * Handles product management operations
 */

/**
 * List all products with filtering and pagination
 */
export const listProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, minPrice, maxPrice } = req.query;

    // Simulated product data
    const products = [
      {
        id: 1,
        name: 'Laptop',
        description: 'High-performance laptop',
        price: 1200,
        category: 'Electronics',
        stock: 50
      },
      {
        id: 2,
        name: 'Mouse',
        description: 'Wireless mouse',
        price: 25,
        category: 'Accessories',
        stock: 200
      }
    ];

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: products.length
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
 * Get product by ID
 */
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Product ID is required'
      });
    }

    const product = {
      id: parseInt(id),
      name: 'Laptop',
      description: 'High-performance laptop',
      price: 1200,
      category: 'Electronics',
      stock: 50,
      specifications: {
        brand: 'TechBrand',
        model: 'X1000',
        warranty: '2 years'
      }
    };

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Product not found'
    });
  }
};

/**
 * Create new product
 */
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;

    // Validation
    if (!name || !price || !category) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name, price, and category are required',
        statusCode: 400
      });
    }

    if (price <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Price must be greater than 0',
        statusCode: 400
      });
    }

    const newProduct = {
      id: Date.now(),
      name,
      description,
      price: parseFloat(price),
      category,
      stock: stock || 0,
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Update product
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, stock } = req.body;

    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Product ID is required'
      });
    }

    const updatedProduct = {
      id: parseInt(id),
      name,
      description,
      price,
      category,
      stock,
      updatedAt: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

/**
 * Delete product
 */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Product ID is required'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
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
 * Search products
 */
export const searchProducts = async (req, res) => {
  try {
    const { q, category, sortBy } = req.query;

    if (!q) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Search query is required'
      });
    }

    const results = [
      {
        id: 1,
        name: 'Laptop',
        price: 1200,
        relevance: 0.95
      }
    ];

    res.status(200).json({
      success: true,
      query: q,
      results: results,
      count: results.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};
