import express from 'express';

/**
 * Express Route Reflection Engine
 * Walks through Express router stack to discover all registered routes
 * Extracts path, method, handler, and middleware information
 * Supports nested routers and dynamic route parameters
 */
class RouteReflector {
  constructor() {
    this.routes = [];
  }

  /**
   * Main entry point: Extract all routes from Express app
   * @param {express.Application} app - Express application instance
   * @returns {Array} Array of route objects
   */
  extractRoutes(app) {
    this.routes = [];
    
    if (!app || !app._router) {
      throw new Error('Invalid Express application provided');
    }

    // Walk through the router stack
    this._walkStack(app._router.stack, '');
    
    return this.routes;
  }

  /**
   * Recursively walk through router stack layers
   * @param {Array} stack - Router stack array
   * @param {string} basePath - Base path for nested routers
   * @private
   */
  _walkStack(stack, basePath = '') {
    if (!stack || !Array.isArray(stack)) {
      return;
    }

    stack.forEach(layer => {
      if (layer.route) {
        // Direct route (not a middleware)
        this._processRoute(layer.route, basePath);
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        // Nested router
        const nestedPath = this._cleanPath(basePath + (layer.regexp.source.match(/^\\\/([^\\?]+)/) || ['', ''])[1]);
        this._walkStack(layer.handle.stack, nestedPath);
      } else if (layer.name === 'bound dispatch') {
        // Router with bound dispatch
        if (layer.handle && layer.handle.stack) {
          this._walkStack(layer.handle.stack, basePath);
        }
      }
    });
  }

  /**
   * Process individual route and extract metadata
   * @param {Object} route - Express route object
   * @param {string} basePath - Base path from nested routers
   * @private
   */
  _processRoute(route, basePath) {
    const path = this._cleanPath(basePath + route.path);
    
    // Get all HTTP methods for this route
    const methods = Object.keys(route.methods)
      .filter(method => route.methods[method])
      .map(method => method.toUpperCase());

    methods.forEach(method => {
      // Extract middleware chain
      const middleware = this._extractMiddleware(route.stack);
      
      // Get the actual handler (last in the stack)
      const handler = route.stack[route.stack.length - 1];
      const handlerInfo = this._extractHandlerInfo(handler);

      this.routes.push({
        method,
        path,
        basePath,
        fullPath: path,
        ...handlerInfo,
        middleware: middleware.map(m => m.name || 'anonymous'),
        middlewareHandlers: middleware,
        routeParameters: this._extractPathParameters(path),
        regexp: route.regexp ? route.regexp.source : null,
        keys: route.keys || []
      });
    });
  }

  /**
   * Extract middleware functions from route stack
   * @param {Array} stack - Route stack array
   * @returns {Array} Array of middleware objects
   * @private
   */
  _extractMiddleware(stack) {
    if (!stack || !Array.isArray(stack)) {
      return [];
    }

    // Return all but the last (which is the handler)
    return stack.slice(0, -1).map(layer => ({
      name: layer.name || 'anonymous',
      handle: layer.handle,
      method: layer.method
    }));
  }

  /**
   * Extract information about the route handler
   * @param {Object} handler - Express handler layer
   * @returns {Object} Handler metadata
   * @private
   */
  _extractHandlerInfo(handler) {
    if (!handler) {
      return {
        handlerName: 'unknown',
        handlerType: 'unknown'
      };
    }

    const handlerFunction = handler.handle;
    const handlerName = handlerFunction.name || 'anonymous';
    
    // Determine handler type
    let handlerType = 'function';
    if (handlerFunction.constructor.name === 'AsyncFunction') {
      handlerType = 'async';
    }

    // Try to extract file location (if available in stack trace)
    let filePath = null;
    let functionSource = null;

    try {
      functionSource = handlerFunction.toString();
    } catch (e) {
      // Some native functions can't be converted to string
    }

    return {
      handlerName,
      handlerType,
      handlerFunction,
      functionSource,
      filePath,
      isAsync: handlerType === 'async',
      parameterCount: handlerFunction.length
    };
  }

  /**
   * Extract path parameters from route path
   * e.g., /users/:id/posts/:postId => ['id', 'postId']
   * @param {string} path - Route path
   * @returns {Array} Array of parameter names
   * @private
   */
  _extractPathParameters(path) {
    const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
    const params = [];
    let match;

    while ((match = paramRegex.exec(path)) !== null) {
      params.push(match[1]);
    }

    return params;
  }

  /**
   * Clean and normalize route path
   * @param {string} path - Raw route path
   * @returns {string} Cleaned path
   * @private
   */
  _cleanPath(path) {
    if (!path) return '/';
    
    // Remove regex artifacts and normalize
    path = path
      .replace(/\\/g, '')
      .replace(/\?\(\?=\/\|\$\)/g, '')
      .replace(/\^\//g, '/')
      .replace(/\$$/g, '')
      .replace(/\/+/g, '/');

    // Ensure it starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    return path;
  }

  /**
   * Get routes filtered by method
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @returns {Array} Filtered routes
   */
  getRoutesByMethod(method) {
    return this.routes.filter(route => 
      route.method === method.toUpperCase()
    );
  }

  /**
   * Get routes filtered by path pattern
   * @param {string} pattern - Path pattern to match
   * @returns {Array} Filtered routes
   */
  getRoutesByPath(pattern) {
    const regex = new RegExp(pattern);
    return this.routes.filter(route => regex.test(route.path));
  }

  /**
   * Get all unique paths
   * @returns {Array} Array of unique paths
   */
  getUniquePaths() {
    return [...new Set(this.routes.map(route => route.path))];
  }

  /**
   * Get statistics about discovered routes
   * @returns {Object} Route statistics
   */
  getStatistics() {
    const methodCounts = {};
    this.routes.forEach(route => {
      methodCounts[route.method] = (methodCounts[route.method] || 0) + 1;
    });

    return {
      totalRoutes: this.routes.length,
      uniquePaths: this.getUniquePaths().length,
      methodBreakdown: methodCounts,
      asyncHandlers: this.routes.filter(r => r.isAsync).length,
      routesWithMiddleware: this.routes.filter(r => r.middleware.length > 0).length,
      routesWithParameters: this.routes.filter(r => r.routeParameters.length > 0).length
    };
  }

  /**
   * Export routes in a structured format
   * @returns {Array} Structured route data
   */
  exportStructured() {
    return this.routes.map(route => ({
      method: route.method,
      path: route.path,
      handlerName: route.handlerName,
      handlerType: route.handlerType,
      middleware: route.middleware,
      parameters: route.routeParameters,
      isAsync: route.isAsync
    }));
  }
}

export default RouteReflector;
