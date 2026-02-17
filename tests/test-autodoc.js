import ASTAnalyzer from '../autodoc/ast/ASTAnalyzer.js';
import RouteReflector from '../autodoc/reflect/RouteReflector.js';
import DocumentationBuilder from '../autodoc/builder/DocumentationBuilder.js';
import express from 'express';

/**
 * Test Suite for Auto Documentation System
 * Run with: node tests/test-autodoc.js
 */

console.log('🧪 Running Auto Documentation System Tests\n');

let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passedTests++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  Error: ${error.message}`);
    failedTests++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertContains(array, item, message) {
  if (!array.includes(item)) {
    throw new Error(`${message}: ${item} not found in array`);
  }
}

function assertExists(value, message) {
  if (!value) {
    throw new Error(`${message}: value does not exist`);
  }
}

// Test 1: AST Analyzer - Extract req.body fields
test('AST Analyzer: Extract req.body fields', () => {
  const code = `
    export const createUser = (req, res) => {
      const { name, email } = req.body;
      res.json({ success: true });
    };
  `;
  
  const analyzer = new ASTAnalyzer();
  const analysis = analyzer.analyzeCode(code);
  
  assertExists(analysis.functions[0], 'Function should be found');
  assertContains(analysis.functions[0].requestUsage.body, 'name', 'Should extract name');
  assertContains(analysis.functions[0].requestUsage.body, 'email', 'Should extract email');
});

// Test 2: AST Analyzer - Extract response structure
test('AST Analyzer: Extract response structure', () => {
  const code = `
    export const getUser = (req, res) => {
      res.status(200).json({ success: true, data: { id: 1 } });
    };
  `;
  
  const analyzer = new ASTAnalyzer();
  const analysis = analyzer.analyzeCode(code);
  
  assertContains(analysis.functions[0].responseUsage.statusCodes, 200, 'Should extract status code');
  assertExists(analysis.functions[0].responseUsage.structures[0], 'Should extract response structure');
});

// Test 3: AST Analyzer - Extract query parameters
test('AST Analyzer: Extract query parameters', () => {
  const code = `
    export const listUsers = (req, res) => {
      const { page, limit } = req.query;
      res.json({ page, limit });
    };
  `;
  
  const analyzer = new ASTAnalyzer();
  const analysis = analyzer.analyzeCode(code);
  
  assertContains(analysis.functions[0].requestUsage.query, 'page', 'Should extract page query param');
  assertContains(analysis.functions[0].requestUsage.query, 'limit', 'Should extract limit query param');
});

// Test 4: AST Analyzer - Detect async functions
test('AST Analyzer: Detect async functions', () => {
  const code = `
    export const createUser = async (req, res) => {
      await someOperation();
      res.json({ success: true });
    };
  `;
  
  const analyzer = new ASTAnalyzer();
  const analysis = analyzer.analyzeCode(code);
  
  assertEquals(analysis.functions[0].isAsync, true, 'Should detect async function');
});

// Test 5: Route Reflector - Extract path parameters
test('Route Reflector: Extract path parameters', () => {
  const reflector = new RouteReflector();
  const params = reflector._extractPathParameters('/users/:id/posts/:postId');
  
  assertContains(params, 'id', 'Should extract id parameter');
  assertContains(params, 'postId', 'Should extract postId parameter');
});

// Test 6: Route Reflector - Clean paths
test('Route Reflector: Clean paths', () => {
  const reflector = new RouteReflector();
  const cleaned = reflector._cleanPath('/api//users///');
  
  assertEquals(cleaned, '/api/users', 'Should clean path');
});

// Test 7: Route Reflector - Extract routes from Express app
test('Route Reflector: Extract routes from Express app', () => {
  const app = express();
  const router = express.Router();
  
  router.get('/users', (req, res) => res.json({}));
  router.post('/users', (req, res) => res.json({}));
  router.get('/users/:id', (req, res) => res.json({}));
  
  app.use('/api', router);
  
  const reflector = new RouteReflector();
  const routes = reflector.extractRoutes(app);
  
  assertEquals(routes.length >= 3, true, 'Should find at least 3 routes');
});

// Test 8: Documentation Builder - Route to schema name
test('Documentation Builder: Convert route to schema name', () => {
  const builder = new DocumentationBuilder();
  const schemaName = builder._routeToSchemaName('POST', '/api/users/:id');
  
  assertEquals(schemaName, 'users.id.post', 'Should convert route to schema name');
});

// Test 9: AST Analyzer - Extract thrown errors
test('AST Analyzer: Extract thrown errors', () => {
  const code = `
    export const validateUser = (req, res) => {
      if (!req.body.email) {
        throw new Error('Email is required');
      }
      res.json({ success: true });
    };
  `;
  
  const analyzer = new ASTAnalyzer();
  const analysis = analyzer.analyzeCode(code);
  
  assertEquals(analysis.functions[0].errors.thrown.length > 0, true, 'Should detect thrown error');
});

// Test 10: AST Analyzer - Extract function parameters
test('AST Analyzer: Extract function parameters', () => {
  const code = `
    export const handler = (req, res, next) => {
      res.json({ success: true });
    };
  `;
  
  const analyzer = new ASTAnalyzer();
  const analysis = analyzer.analyzeCode(code);
  
  assertEquals(analysis.functions[0].parameters.length, 3, 'Should extract 3 parameters');
  assertEquals(analysis.functions[0].parameters[0].name, 'req', 'First param should be req');
  assertEquals(analysis.functions[0].parameters[1].name, 'res', 'Second param should be res');
  assertEquals(analysis.functions[0].parameters[2].name, 'next', 'Third param should be next');
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Test Results:`);
console.log(`  Passed: ${passedTests}`);
console.log(`  Failed: ${failedTests}`);
console.log(`  Total:  ${passedTests + failedTests}`);
console.log('='.repeat(50));

if (failedTests === 0) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log(`\n✗ ${failedTests} test(s) failed`);
  process.exit(1);
}
