import fs from 'fs/promises';
import path from 'path';

/**
 * OpenAPI Specification Generator
 * Generates OpenAPI 3.0 compatible documentation from MongoDB stored docs
 * No third-party generators - built from scratch
 */
class OpenAPIGenerator {
  constructor(options = {}) {
    this.version = options.version || '3.0.3';
    this.info = options.info || {};
    this.servers = options.servers || [];
  }

  /**
   * Generate OpenAPI specification from documentation array
   * @param {Array} docs - Array of API documentation objects
   * @param {Object} options - Generation options
   * @returns {Object} OpenAPI specification
   */
  generateSpec(docs, options = {}) {
    console.log(`📝 Generating OpenAPI ${this.version} specification...`);

    const spec = {
      openapi: this.version,
      info: this._generateInfo(options),
      servers: this._generateServers(options),
      paths: {},
      components: {
        schemas: {},
        parameters: {},
        responses: {},
        securitySchemes: {}
      },
      tags: []
    };

    // Group documents by path
    const pathGroups = this._groupByPath(docs);

    // Generate paths
    for (const [pathKey, pathDocs] of Object.entries(pathGroups)) {
      spec.paths[pathKey] = this._generatePathItem(pathDocs);
    }

    // Extract and generate component schemas
    this._extractSchemas(docs, spec.components.schemas);

    // Generate tags
    spec.tags = this._generateTags(docs);

    console.log(`  ✓ Generated spec with ${Object.keys(spec.paths).length} paths`);
    return spec;
  }

  /**
   * Export OpenAPI spec to file
   * @param {Object} spec - OpenAPI specification
   * @param {string} outputPath - Output file path
   * @param {string} format - 'json' or 'yaml'
   */
  async exportToFile(spec, outputPath, format = 'json') {
    try {
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      if (format === 'json') {
        await fs.writeFile(outputPath, JSON.stringify(spec, null, 2), 'utf-8');
      } else if (format === 'yaml') {
        // Simple YAML conversion (for production, use a proper YAML library)
        const yaml = this._convertToYAML(spec);
        await fs.writeFile(outputPath, yaml, 'utf-8');
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      console.log(`  ✓ Exported to ${outputPath}`);
    } catch (error) {
      console.error(`Error exporting to file:`, error.message);
      throw error;
    }
  }

  /**
   * Generate info section
   * @param {Object} options - Options
   * @returns {Object} Info object
   * @private
   */
  _generateInfo(options) {
    return {
      title: options.title || this.info.title || 'API Documentation',
      description: options.description || this.info.description || 'Auto-generated API documentation',
      version: options.apiVersion || this.info.version || '1.0.0',
      contact: this.info.contact || {},
      license: this.info.license || {
        name: 'MIT'
      }
    };
  }

  /**
   * Generate servers section
   * @param {Object} options - Options
   * @returns {Array} Servers array
   * @private
   */
  _generateServers(options) {
    if (options.servers && options.servers.length > 0) {
      return options.servers;
    }

    if (this.servers.length > 0) {
      return this.servers;
    }

    return [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ];
  }

  /**
   * Group documents by path
   * @param {Array} docs - Documentation array
   * @returns {Object} Grouped documents
   * @private
   */
  _groupByPath(docs) {
    const groups = {};
    
    docs.forEach(doc => {
      if (!groups[doc.path]) {
        groups[doc.path] = [];
      }
      groups[doc.path].push(doc);
    });

    return groups;
  }

  /**
   * Generate path item for a specific path
   * @param {Array} pathDocs - Documents for this path
   * @returns {Object} Path item object
   * @private
   */
  _generatePathItem(pathDocs) {
    const pathItem = {};

    pathDocs.forEach(doc => {
      const method = doc.method.toLowerCase();
      pathItem[method] = this._generateOperation(doc);
    });

    return pathItem;
  }

  /**
   * Generate operation object
   * @param {Object} doc - Documentation object
   * @returns {Object} Operation object
   * @private
   */
  _generateOperation(doc) {
    const operation = {
      summary: doc.summary || `${doc.method} ${doc.path}`,
      description: doc.description || '',
      operationId: this._generateOperationId(doc),
      tags: doc.tags || [],
      parameters: this._generateParameters(doc.parameters),
      responses: this._generateResponses(doc)
    };

    // Add request body for methods that typically have one
    if (['POST', 'PUT', 'PATCH'].includes(doc.method)) {
      const requestBody = this._generateRequestBody(doc);
      if (requestBody) {
        operation.requestBody = requestBody;
      }
    }

    // Add deprecated flag
    if (doc.deprecated) {
      operation.deprecated = true;
    }

    return operation;
  }

  /**
   * Generate operation ID
   * @param {Object} doc - Documentation object
   * @returns {string} Operation ID
   * @private
   */
  _generateOperationId(doc) {
    // Convert path to camelCase operation ID
    const pathParts = doc.path
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/:(\w+)/g, 'By$1')
      .split('/')
      .map((part, index) => {
        if (index === 0) return part.toLowerCase();
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      });

    return doc.method.toLowerCase() + pathParts.join('');
  }

  /**
   * Generate parameters array
   * @param {Array} parameters - Parameters from doc
   * @returns {Array} OpenAPI parameters
   * @private
   */
  _generateParameters(parameters) {
    if (!parameters || parameters.length === 0) {
      return [];
    }

    return parameters
      .filter(param => param.in !== 'body') // Body params go in requestBody
      .map(param => ({
        name: param.name,
        in: param.in,
        description: param.description || '',
        required: param.required || false,
        schema: param.schema || {
          type: param.type || 'string'
        },
        example: param.example
      }));
  }

  /**
   * Generate request body
   * @param {Object} doc - Documentation object
   * @returns {Object|null} Request body object
   * @private
   */
  _generateRequestBody(doc) {
    if (!doc.requestSchema && !doc.parameters.some(p => p.in === 'body')) {
      return null;
    }

    const schema = doc.requestSchema || this._buildSchemaFromParams(
      doc.parameters.filter(p => p.in === 'body')
    );

    return {
      description: 'Request payload',
      required: true,
      content: {
        'application/json': {
          schema: schema,
          example: doc.examples?.request || {}
        }
      }
    };
  }

  /**
   * Build schema from body parameters
   * @param {Array} bodyParams - Body parameters
   * @returns {Object} Schema object
   * @private
   */
  _buildSchemaFromParams(bodyParams) {
    const properties = {};
    const required = [];

    bodyParams.forEach(param => {
      properties[param.name] = {
        type: param.type || 'string',
        description: param.description || ''
      };

      if (param.required) {
        required.push(param.name);
      }
    });

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    };
  }

  /**
   * Generate responses object
   * @param {Object} doc - Documentation object
   * @returns {Object} Responses object
   * @private
   */
  _generateResponses(doc) {
    const responses = {};

    // Add success response
    const successCode = doc.statusCodes.includes(200) ? 200 :
                       doc.statusCodes.includes(201) ? 201 :
                       doc.statusCodes.includes(204) ? 204 : 200;

    responses[successCode] = this._generateResponse(
      'Successful operation',
      doc.responseSchema,
      doc.examples?.response
    );

    // Add error responses
    const errorCodes = doc.statusCodes.filter(code => code >= 400);
    errorCodes.forEach(code => {
      responses[code] = this._generateErrorResponse(code);
    });

    // Add default error response if none specified
    if (errorCodes.length === 0) {
      responses['400'] = this._generateErrorResponse(400);
      responses['500'] = this._generateErrorResponse(500);
    }

    return responses;
  }

  /**
   * Generate response object
   * @param {string} description - Response description
   * @param {Object} schema - Response schema
   * @param {Object} example - Response example
   * @returns {Object} Response object
   * @private
   */
  _generateResponse(description, schema, example) {
    const response = {
      description
    };

    if (schema || example) {
      response.content = {
        'application/json': {
          schema: schema || { type: 'object' }
        }
      };

      if (example) {
        response.content['application/json'].example = example;
      }
    }

    return response;
  }

  /**
   * Generate error response
   * @param {number} code - Status code
   * @returns {Object} Error response object
   * @private
   */
  _generateErrorResponse(code) {
    const descriptions = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error'
    };

    return {
      description: descriptions[code] || 'Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
              statusCode: { type: 'number' }
            }
          }
        }
      }
    };
  }

  /**
   * Extract and generate component schemas
   * @param {Array} docs - Documentation array
   * @param {Object} schemas - Schemas object to populate
   * @private
   */
  _extractSchemas(docs, schemas) {
    docs.forEach(doc => {
      // Extract request schemas
      if (doc.requestSchema) {
        const schemaName = this._generateSchemaName(doc, 'Request');
        schemas[schemaName] = doc.requestSchema;
      }

      // Extract response schemas
      if (doc.responseSchema) {
        const schemaName = this._generateSchemaName(doc, 'Response');
        schemas[schemaName] = doc.responseSchema;
      }
    });
  }

  /**
   * Generate schema name
   * @param {Object} doc - Documentation object
   * @param {string} suffix - Schema suffix
   * @returns {string} Schema name
   * @private
   */
  _generateSchemaName(doc, suffix) {
    const baseName = doc.path
      .replace(/^\//, '')
      .replace(/\//g, '_')
      .replace(/:/g, '')
      .replace(/_+/g, '_');
    
    return `${baseName}_${doc.method}_${suffix}`;
  }

  /**
   * Generate tags
   * @param {Array} docs - Documentation array
   * @returns {Array} Tags array
   * @private
   */
  _generateTags(docs) {
    const tagSet = new Set();

    docs.forEach(doc => {
      if (doc.tags && doc.tags.length > 0) {
        doc.tags.forEach(tag => tagSet.add(tag));
      } else {
        // Generate tag from path
        const pathParts = doc.path.split('/').filter(p => p && !p.startsWith(':'));
        if (pathParts.length > 0) {
          tagSet.add(pathParts[0]);
        }
      }
    });

    return Array.from(tagSet).map(tag => ({
      name: tag,
      description: `${tag} operations`
    }));
  }

  /**
   * Simple YAML converter (basic implementation)
   * @param {Object} obj - Object to convert
   * @param {number} indent - Indentation level
   * @returns {string} YAML string
   * @private
   */
  _convertToYAML(obj, indent = 0) {
    const spaces = ' '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach(item => {
          if (typeof item === 'object') {
            yaml += `${spaces}- \n${this._convertToYAML(item, indent + 2)}`;
          } else {
            yaml += `${spaces}- ${item}\n`;
          }
        });
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n${this._convertToYAML(value, indent + 2)}`;
      } else if (typeof value === 'string') {
        yaml += `${spaces}${key}: "${value}"\n`;
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }
}

export default OpenAPIGenerator;
