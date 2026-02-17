import express from 'express';
import * as productController from '../controllers/productController.js';
import { authenticate } from '../controllers/authMiddleware.js';

const router = express.Router();

/**
 * Product Management Routes
 */

// List products
router.get('/', productController.listProducts);

// Get product by ID
router.get('/:id', productController.getProductById);

// Create product
router.post('/', authenticate, productController.createProduct);

// Update product
router.put('/:id', authenticate, productController.updateProduct);

// Delete product
router.delete('/:id', authenticate, productController.deleteProduct);

// Search products
router.get('/search', productController.searchProducts);

export default router;
