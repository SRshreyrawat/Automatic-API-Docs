import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import fs from 'fs/promises';
import path from 'path';

/**
 * AST Code Analyzer
 * Parses controller/handler code using Babel AST to extract:
 * - Function parameters and their usage
 * - req.body, req.query, req.params access patterns
 * - res.json, res.send response structures
 * - Status codes
 * - Error handling and thrown errors
 * - Return values
 */
class ASTAnalyzer {
  constructor() {
    this.parserOptions = {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'asyncGenerators',
        'dynamicImport'
      ]
    };
  }

  /**
   * Analyze a controller file
   * @param {string} filePath - Path to controller file
   * @returns {Object} Analysis results
   */
  async analyzeFile(filePath) {
    try {
      const code = await fs.readFile(filePath, 'utf-8');
      return this.analyzeCode(code, filePath);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Analyze code string
   * @param {string} code - Source code
   * @param {string} fileName - File name for reference
   * @returns {Object} Analysis results
   */
  analyzeCode(code, fileName = 'unknown') {
    try {
      const ast = parse(code, this.parserOptions);
      
      const analysis = {
        fileName,
        functions: [],
        exports: [],
        imports: [],
        errors: []
      };

      // Traverse AST and extract information
      traverse.default(ast, {
        // Capture function declarations
        FunctionDeclaration: (path) => {
          const functionAnalysis = this._analyzeFunctionNode(path.node, code);
          analysis.functions.push(functionAnalysis);
        },

        // Capture arrow functions and function expressions
        VariableDeclarator: (path) => {
          if (t.isArrowFunctionExpression(path.node.init) || 
              t.isFunctionExpression(path.node.init)) {
            const functionAnalysis = this._analyzeFunctionNode(
              path.node.init, 
              code, 
              path.node.id.name
            );
            analysis.functions.push(functionAnalysis);
          }
        },

        // Capture class methods
        ClassMethod: (path) => {
          const functionAnalysis = this._analyzeFunctionNode(path.node, code);
          analysis.functions.push(functionAnalysis);
        },

        // Capture exports
        ExportNamedDeclaration: (path) => {
          if (path.node.declaration) {
            analysis.exports.push(this._extractExportInfo(path.node));
          }
        },

        ExportDefaultDeclaration: (path) => {
          analysis.exports.push({
            type: 'default',
            name: this._getExportName(path.node.declaration)
          });
        },

        // Capture imports
        ImportDeclaration: (path) => {
          analysis.imports.push({
            source: path.node.source.value,
            specifiers: path.node.specifiers.map(spec => ({
              name: spec.local.name,
              imported: spec.imported ? spec.imported.name : 'default'
            }))
          });
        }
      });

      return analysis;
    } catch (error) {
      console.error(`Error parsing code:`, error.message);
      return {
        fileName,
        functions: [],
        exports: [],
        imports: [],
        errors: [error.message]
      };
    }
  }

  /**
   * Analyze a specific function by name from code
   * @param {string} code - Source code
   * @param {string} functionName - Function name to analyze
   * @returns {Object|null} Function analysis or null if not found
   */
  analyzeFunctionByName(code, functionName) {
    const analysis = this.analyzeCode(code);
    return analysis.functions.find(f => f.name === functionName) || null;
  }

  /**
   * Analyze function node in detail
   * @param {Object} node - AST function node
   * @param {string} code - Source code for context
   * @param {string} customName - Custom function name (for arrow functions)
   * @returns {Object} Detailed function analysis
   * @private
   */
  _analyzeFunctionNode(node, code, customName = null) {
    const analysis = {
      name: customName || (node.id ? node.id.name : 'anonymous'),
      isAsync: node.async || false,
      isArrow: t.isArrowFunctionExpression(node),
      isClass: t.isClassMethod(node),
      parameters: [],
      requestUsage: {
        body: [],
        query: [],
        params: [],
        headers: []
      },
      responseUsage: {
        statusCodes: [],
        jsonCalls: [],
        sendCalls: [],
        structures: []
      },
      errors: {
        thrown: [],
        statusCodes: []
      },
      returnValues: [],
      middlewareChecks: []
    };

    // Extract parameters
    analysis.parameters = this._extractParameters(node.params);

    // Traverse function body to extract usage patterns
    traverse.default(node, {
      // Detect req.body usage
      MemberExpression: (path) => {
        this._analyzeMemberExpression(path, analysis);
      },

      // Detect response calls (res.json, res.status, etc.)
      CallExpression: (path) => {
        this._analyzeCallExpression(path, analysis);
      },

      // Detect thrown errors
      ThrowStatement: (path) => {
        this._analyzeThrowStatement(path, analysis);
      },

      // Detect return statements
      ReturnStatement: (path) => {
        this._analyzeReturnStatement(path, analysis);
      }
    }, node);

    return analysis;
  }

  /**
   * Extract parameter information from function params
   * @param {Array} params - AST parameter nodes
   * @returns {Array} Parameter information
   * @private
   */
  _extractParameters(params) {
    return params.map(param => {
      if (t.isIdentifier(param)) {
        return { name: param.name, type: 'identifier' };
      } else if (t.isObjectPattern(param)) {
        // Destructured parameters
        return {
          name: 'destructured',
          type: 'object',
          properties: param.properties.map(prop => {
            if (t.isObjectProperty(prop)) {
              return prop.key.name;
            } else if (t.isRestElement(prop)) {
              return `...${prop.argument.name}`;
            }
            return 'unknown';
          })
        };
      } else if (t.isArrayPattern(param)) {
        return {
          name: 'destructured',
          type: 'array',
          elements: param.elements.length
        };
      } else if (t.isRestElement(param)) {
        return {
          name: param.argument.name,
          type: 'rest'
        };
      }
      return { name: 'unknown', type: 'unknown' };
    });
  }

  /**
   * Analyze member expressions (req.body, req.query, etc.)
   * @param {Object} path - AST path
   * @param {Object} analysis - Analysis object to populate
   * @private
   */
  _analyzeMemberExpression(path, analysis) {
    const node = path.node;
    
    // Check for req.body.field
    if (t.isMemberExpression(node.object) &&
        t.isIdentifier(node.object.object) &&
        (node.object.object.name === 'req' || node.object.object.name === 'request')) {
      
      const reqProperty = node.object.property.name;
      const field = node.property.name || node.property.value;

      if (reqProperty === 'body' && field) {
        analysis.requestUsage.body.push(field);
      } else if (reqProperty === 'query' && field) {
        analysis.requestUsage.query.push(field);
      } else if (reqProperty === 'params' && field) {
        analysis.requestUsage.params.push(field);
      } else if (reqProperty === 'headers' && field) {
        analysis.requestUsage.headers.push(field);
      }
    }

    // Check for direct req.body, req.query
    if (t.isIdentifier(node.object) &&
        (node.object.name === 'req' || node.object.name === 'request')) {
      const property = node.property.name;
      
      if (property === 'body') {
        analysis.requestUsage.body.push('__ALL__');
      } else if (property === 'query') {
        analysis.requestUsage.query.push('__ALL__');
      } else if (property === 'params') {
        analysis.requestUsage.params.push('__ALL__');
      }
    }
  }

  /**
   * Analyze call expressions (res.json, res.status, etc.)
   * @param {Object} path - AST path
   * @param {Object} analysis - Analysis object to populate
   * @private
   */
  _analyzeCallExpression(path, analysis) {
    const node = path.node;

    if (!t.isMemberExpression(node.callee)) {
      return;
    }

    const object = node.callee.object;
    const method = node.callee.property.name;

    // Check for res.json()
    if (t.isIdentifier(object) && 
        (object.name === 'res' || object.name === 'response') &&
        method === 'json') {
      const argument = node.arguments[0];
      if (argument) {
        const structure = this._extractObjectStructure(argument);
        analysis.responseUsage.jsonCalls.push(structure);
        analysis.responseUsage.structures.push(structure);
      }
    }

    // Check for res.status()
    if (t.isIdentifier(object) && 
        (object.name === 'res' || object.name === 'response') &&
        method === 'status') {
      const statusCode = this._extractLiteralValue(node.arguments[0]);
      if (statusCode) {
        analysis.responseUsage.statusCodes.push(statusCode);
      }
    }

    // Check for res.send()
    if (t.isIdentifier(object) && 
        (object.name === 'res' || object.name === 'response') &&
        method === 'send') {
      const argument = node.arguments[0];
      if (argument) {
        const structure = this._extractObjectStructure(argument);
        analysis.responseUsage.sendCalls.push(structure);
      }
    }

    // Check for res.status().json() chain
    if (t.isCallExpression(object) &&
        t.isMemberExpression(object.callee) &&
        object.callee.property.name === 'status' &&
        method === 'json') {
      const statusCode = this._extractLiteralValue(object.arguments[0]);
      if (statusCode) {
        analysis.responseUsage.statusCodes.push(statusCode);
      }
      const structure = this._extractObjectStructure(node.arguments[0]);
      analysis.responseUsage.structures.push({ status: statusCode, ...structure });
    }
  }

  /**
   * Analyze throw statements
   * @param {Object} path - AST path
   * @param {Object} analysis - Analysis object to populate
   * @private
   */
  _analyzeThrowStatement(path, analysis) {
    const argument = path.node.argument;
    
    if (t.isNewExpression(argument) && argument.callee.name === 'Error') {
      const message = this._extractLiteralValue(argument.arguments[0]);
      analysis.errors.thrown.push({
        type: 'Error',
        message: message || 'unknown'
      });
    } else if (t.isIdentifier(argument)) {
      analysis.errors.thrown.push({
        type: argument.name,
        message: 'unknown'
      });
    }
  }

  /**
   * Analyze return statements
   * @param {Object} path - AST path
   * @param {Object} analysis - Analysis object to populate
   * @private
   */
  _analyzeReturnStatement(path, analysis) {
    const argument = path.node.argument;
    if (argument) {
      const structure = this._extractObjectStructure(argument);
      analysis.returnValues.push(structure);
    }
  }

  /**
   * Extract object structure from AST node
   * @param {Object} node - AST node
   * @returns {Object} Object structure
   * @private
   */
  _extractObjectStructure(node) {
    if (t.isObjectExpression(node)) {
      const obj = {};
      node.properties.forEach(prop => {
        if (t.isObjectProperty(prop) || t.isObjectMethod(prop)) {
          const key = prop.key.name || prop.key.value;
          const value = this._extractLiteralValue(prop.value);
          obj[key] = value !== null ? value : 'unknown';
        } else if (t.isSpreadElement(prop)) {
          obj['...spread'] = 'object';
        }
      });
      return obj;
    } else if (t.isArrayExpression(node)) {
      return node.elements.map(el => this._extractObjectStructure(el));
    } else {
      return this._extractLiteralValue(node);
    }
  }

  /**
   * Extract literal value from AST node
   * @param {Object} node - AST node
   * @returns {*} Literal value or null
   * @private
   */
  _extractLiteralValue(node) {
    if (!node) return null;
    
    if (t.isStringLiteral(node) || t.isNumericLiteral(node) || t.isBooleanLiteral(node)) {
      return node.value;
    } else if (t.isTemplateLiteral(node)) {
      return 'template_string';
    } else if (t.isIdentifier(node)) {
      return `var:${node.name}`;
    } else if (t.isNullLiteral(node)) {
      return null;
    }
    
    return 'complex_expression';
  }

  /**
   * Extract export information
   * @param {Object} node - Export declaration node
   * @returns {Object} Export info
   * @private
   */
  _extractExportInfo(node) {
    if (t.isFunctionDeclaration(node.declaration)) {
      return {
        type: 'function',
        name: node.declaration.id.name
      };
    } else if (t.isVariableDeclaration(node.declaration)) {
      return {
        type: 'variable',
        name: node.declaration.declarations[0].id.name
      };
    } else if (t.isClassDeclaration(node.declaration)) {
      return {
        type: 'class',
        name: node.declaration.id.name
      };
    }
    return { type: 'unknown', name: 'unknown' };
  }

  /**
   * Get export name from declaration
   * @param {Object} declaration - Declaration node
   * @returns {string} Export name
   * @private
   */
  _getExportName(declaration) {
    if (t.isIdentifier(declaration)) {
      return declaration.name;
    } else if (t.isFunctionDeclaration(declaration) || 
               t.isClassDeclaration(declaration)) {
      return declaration.id ? declaration.id.name : 'anonymous';
    }
    return 'unknown';
  }
}

export default ASTAnalyzer;
