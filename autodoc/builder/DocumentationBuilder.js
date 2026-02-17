import fs from 'fs/promises';
import path from 'path';
import RouteReflector from '../reflect/RouteReflector.js';
import ASTAnalyzer from '../ast/ASTAnalyzer.js';

/**
 * Documentation Builder
 * Combines route reflection and AST analysis to build comprehensive API documentation
 * Links filesystem schemas and generates structured documentation objects
 */
class DocumentationBuilder {
  constructor(options = {}) {
    this.reflector = new RouteReflector();
    this.analyzer = new ASTAnalyzer();
    this.schemaDir = options.schemaDir || './schemas';
    this.controllerDir = options.controllerDir || './src/controllers';
  }

  /**
   * Build documentation for entire Express app
   * @param {express.Application} app - Express application
   * @param {Object} options - Build options
   * @returns {Array} Array of documentation objects
   */
  async buildDocumentation(app, options = {}) {
    console.log('🔍 Starting documentation build...');
    
    // Step 1: Reflect routes
    console.log('  → Reflecting routes...');
    const routes = this.reflector.extractRoutes(app);
    console.log(`  ✓ Found ${routes.length} routes`);

    // Step 2: Analyze each route
    console.log('  → Analyzing route handlers...');
    const documentation = [];

    for (const route of routes) {
      try {
        const doc = await this._buildRouteDocumentation(route, options);
        documentation.push(doc);
      } catch (error) {
        console.error(`  ✗ Error analyzing ${route.method} ${route.path}:`, error.message);
        // Create minimal doc even on error
        documentation.push(this._createMinimalDoc(route, error));
      }
    }

    console.log(`  ✓ Documentation built for ${documentation.length} endpoints`);
    return documentation;
  }

  /**
   * Build documentation for a single route
   * @param {Object} route - Route object from reflector
   * @param {Object} options - Build options
   * @returns {Object} Documentation object
   * @private
   */
  async _buildRouteDocumentation(route, options = {}) {
    const doc = {
      method: route.method,
      path: route.path,
      handlerName: route.handlerName,
      handlerType: route.handlerType,
      middleware: route.middleware,
      parameters: [],
      requestSchema: null,
      responseSchema: null,
      statusCodes: [],
      examples: {},
      metadata: {
        isAsync: route.isAsync,
        parameterCount: route.parameterCount
      }
    };

    // Add path parameters
    if (route.routeParameters && route.routeParameters.length > 0) {
      route.routeParameters.forEach(param => {
        doc.parameters.push({
          name: param,
          in: 'path',
          type: 'string',
          required: true,
          description: `Path parameter: ${param}`
        });
      });
    }

    // Analyze handler code if source is available
    if (route.functionSource) {
      const astAnalysis = this.analyzer.analyzeCode(
        route.functionSource,
        route.handlerName
      );

      if (astAnalysis.functions.length > 0) {
        const functionAnalysis = astAnalysis.functions[0];
        
        // Extract request body parameters
        this._extractRequestParameters(functionAnalysis, doc);
        
        // Extract response structure
        this._extractResponseStructure(functionAnalysis, doc);
        
        // Extract status codes
        if (functionAnalysis.responseUsage.statusCodes.length > 0) {
          doc.statusCodes = [...new Set(functionAnalysis.responseUsage.statusCodes)];
        }
      }
    }

    // Try to load schemas from filesystem
    await this._loadSchemas(doc);

    return doc;
  }

  /**
   * Extract request parameters from AST analysis
   * @param {Object} analysis - AST analysis result
   * @param {Object} doc - Documentation object to populate
   * @private
   */
  _extractRequestParameters(analysis, doc) {
    // Extract from req.body usage
    if (analysis.requestUsage.body.length > 0) {
      const bodyFields = analysis.requestUsage.body.filter(f => f !== '__ALL__');
      bodyFields.forEach(field => {
        doc.parameters.push({
          name: field,
          in: 'body',
          type: 'unknown',
          required: false,
          description: `Body parameter: ${field}`
        });
      });

      // If only __ALL__ detected, mark that entire body is used
      if (bodyFields.length === 0 && analysis.requestUsage.body.includes('__ALL__')) {
        doc.requestSchema = {
          type: 'object',
          description: 'Request body (structure not auto-detected)'
        };
      }
    }

    // Extract from req.query usage
    if (analysis.requestUsage.query.length > 0) {
      const queryFields = analysis.requestUsage.query.filter(f => f !== '__ALL__');
      queryFields.forEach(field => {
        doc.parameters.push({
          name: field,
          in: 'query',
          type: 'string',
          required: false,
          description: `Query parameter: ${field}`
        });
      });
    }

    // Extract from req.params usage
    if (analysis.requestUsage.params.length > 0) {
      const paramFields = analysis.requestUsage.params.filter(f => f !== '__ALL__');
      paramFields.forEach(field => {
        // Only add if not already in path parameters
        const existing = doc.parameters.find(p => p.name === field && p.in === 'path');
        if (!existing) {
          doc.parameters.push({
            name: field,
            in: 'path',
            type: 'string',
            required: true,
            description: `Path parameter: ${field}`
          });
        }
      });
    }

    // Extract from req.headers usage
    if (analysis.requestUsage.headers.length > 0) {
      const headerFields = analysis.requestUsage.headers.filter(f => f !== '__ALL__');
      headerFields.forEach(field => {
        doc.parameters.push({
          name: field,
          in: 'header',
          type: 'string',
          required: false,
          description: `Header: ${field}`
        });
      });
    }
  }

  /**
   * Extract response structure from AST analysis
   * @param {Object} analysis - AST analysis result
   * @param {Object} doc - Documentation object to populate
   * @private
   */
  _extractResponseStructure(analysis, doc) {
    if (analysis.responseUsage.structures.length > 0) {
      // Use the first response structure as the primary example
      const primaryStructure = analysis.responseUsage.structures[0];
      
      doc.responseSchema = {
        type: 'object',
        properties: this._convertToSchemaProperties(primaryStructure),
        example: primaryStructure
      };

      doc.examples.response = primaryStructure;
    }

    // Also capture from return values
    if (analysis.returnValues.length > 0 && !doc.responseSchema) {
      const returnValue = analysis.returnValues[0];
      doc.responseSchema = {
        type: typeof returnValue === 'object' ? 'object' : typeof returnValue,
        example: returnValue
      };
    }
  }

  /**
   * Convert object structure to JSON schema properties
   * @param {Object} obj - Object structure
   * @returns {Object} Schema properties
   * @private
   */
  _convertToSchemaProperties(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return {};
    }

    const properties = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'status') continue; // Skip status code field

      if (typeof value === 'string' && value.startsWith('var:')) {
        properties[key] = { type: 'unknown', description: `Variable: ${value.substring(4)}` };
      } else if (value === 'template_string') {
        properties[key] = { type: 'string', description: 'Template string' };
      } else if (value === 'complex_expression') {
        properties[key] = { type: 'unknown', description: 'Complex expression' };
      } else if (Array.isArray(value)) {
        properties[key] = { type: 'array', items: {} };
      } else if (typeof value === 'object') {
        properties[key] = { 
          type: 'object', 
          properties: this._convertToSchemaProperties(value) 
        };
      } else {
        properties[key] = { type: typeof value, example: value };
      }
    }

    return properties;
  }

  /**
   * Load schemas from filesystem
   * @param {Object} doc - Documentation object
   * @private
   */
  async _loadSchemas(doc) {
    try {
      // Generate schema file names from route
      const routeName = this._routeToSchemaName(doc.method, doc.path);
      
      // Try to load request schema
      const requestSchemaPath = path.join(this.schemaDir, 'request', `${routeName}.json`);
      try {
        const requestSchema = await fs.readFile(requestSchemaPath, 'utf-8');
        doc.requestSchema = JSON.parse(requestSchema);
        doc.requestSchema.schemaFile = requestSchemaPath;
      } catch (e) {
        // Schema file doesn't exist, that's ok
      }

      // Try to load response schema
      const responseSchemaPath = path.join(this.schemaDir, 'response', `${routeName}.json`);
      try {
        const responseSchema = await fs.readFile(responseSchemaPath, 'utf-8');
        const parsedSchema = JSON.parse(responseSchema);
        
        // Merge with auto-detected schema
        if (doc.responseSchema) {
          doc.responseSchema = { ...doc.responseSchema, ...parsedSchema };
        } else {
          doc.responseSchema = parsedSchema;
        }
        doc.responseSchema.schemaFile = responseSchemaPath;
      } catch (e) {
        // Schema file doesn't exist, that's ok
      }

    } catch (error) {
      console.error(`Error loading schemas for ${doc.method} ${doc.path}:`, error.message);
    }
  }

  /**
   * Convert route to schema file name
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   * @returns {string} Schema file name
   * @private
   */
  _routeToSchemaName(method, path) {
    // Convert /api/users/:id to users.get.id
    const cleanPath = path
      .replace(/^\/api\//, '')
      .replace(/^\//, '')
      .replace(/\//g, '.')
      .replace(/:(\w+)/g, '$1')
      .replace(/\.$/, '');
    
    return `${cleanPath}.${method.toLowerCase()}`;
  }

  /**
   * Create minimal documentation on error
   * @param {Object} route - Route object
   * @param {Error} error - Error that occurred
   * @returns {Object} Minimal documentation object
   * @private
   */
  _createMinimalDoc(route, error) {
    return {
      method: route.method,
      path: route.path,
      handlerName: route.handlerName,
      handlerType: route.handlerType,
      middleware: route.middleware,
      parameters: route.routeParameters.map(param => ({
        name: param,
        in: 'path',
        type: 'string',
        required: true
      })),
      requestSchema: null,
      responseSchema: null,
      statusCodes: [],
      examples: {},
      metadata: {
        error: error.message,
        partial: true
      }
    };
  }

  /**
   * Get build statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return this.reflector.getStatistics();
  }
}

export default DocumentationBuilder;
