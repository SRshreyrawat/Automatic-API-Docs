#!/usr/bin/env node

/**
 * Setup Verification Script
 * Checks if all dependencies and prerequisites are properly configured
 * Run with: node setup-verify.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHECKS = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function success(message) {
  CHECKS.passed++;
  log(`✓ ${message}`, GREEN);
}

function fail(message) {
  CHECKS.failed++;
  log(`✗ ${message}`, RED);
}

function warn(message) {
  CHECKS.warnings++;
  log(`⚠ ${message}`, YELLOW);
}

function info(message) {
  log(message, BLUE);
}

async function checkNodeVersion() {
  try {
    const { stdout } = await execAsync('node --version');
    const version = stdout.trim();
    const major = parseInt(version.slice(1).split('.')[0]);
    
    if (major >= 18) {
      success(`Node.js version: ${version}`);
    } else {
      fail(`Node.js version ${version} is too old. Need 18+`);
    }
  } catch (error) {
    fail('Node.js not found');
  }
}

async function checkNpm() {
  try {
    const { stdout } = await execAsync('npm --version');
    success(`npm version: ${stdout.trim()}`);
  } catch (error) {
    fail('npm not found');
  }
}

async function checkMongoDB() {
  try {
    const { stdout } = await execAsync('mongod --version');
    const version = stdout.split('\n')[0];
    success(`MongoDB installed: ${version.substring(0, 50)}`);
  } catch (error) {
    fail('MongoDB not found. Install from https://www.mongodb.com/try/download/community');
  }
}

async function checkGit() {
  try {
    const { stdout } = await execAsync('git --version');
    success(`Git installed: ${stdout.trim()}`);
  } catch (error) {
    warn('Git not found. Some features will be limited.');
  }
}

async function checkPackageJson() {
  try {
    const packagePath = path.join(__dirname, 'package.json');
    await fs.access(packagePath);
    const content = await fs.readFile(packagePath, 'utf-8');
    const pkg = JSON.parse(content);
    success(`package.json found (v${pkg.version})`);
    return pkg;
  } catch (error) {
    fail('package.json not found or invalid');
    return null;
  }
}

async function checkNodeModules() {
  try {
    const nmPath = path.join(__dirname, 'node_modules');
    await fs.access(nmPath);
    success('node_modules directory exists');
    return true;
  } catch (error) {
    fail('node_modules not found. Run: npm install');
    return false;
  }
}

async function checkDependencies(pkg) {
  if (!pkg || !pkg.dependencies) return;

  const criticalDeps = [
    'express',
    'mongoose',
    '@babel/parser',
    '@babel/traverse',
    '@google/generative-ai',
    'commander',
    'chalk',
    'semver',
    'simple-git'
  ];

  for (const dep of criticalDeps) {
    try {
      const depPath = path.join(__dirname, 'node_modules', dep);
      await fs.access(depPath);
      success(`Dependency installed: ${dep}`);
    } catch (error) {
      fail(`Missing dependency: ${dep}. Run: npm install`);
    }
  }
}

async function checkEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env');
    await fs.access(envPath);
    success('.env file exists');
    
    // Check for required env vars
    const content = await fs.readFile(envPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    const requiredVars = ['MONGODB_URI', 'GEMINI_API_KEY'];
    for (const varName of requiredVars) {
      const found = lines.some(line => line.startsWith(`${varName}=`));
      if (found) {
        const value = lines.find(line => line.startsWith(`${varName}=`)).split('=')[1];
        if (value && value !== 'your_gemini_api_key_here' && value !== 'your_api_key_here') {
          success(`Environment variable set: ${varName}`);
        } else {
          warn(`Environment variable needs value: ${varName}`);
        }
      } else {
        warn(`Environment variable missing: ${varName}`);
      }
    }
  } catch (error) {
    warn('.env file not found. Copy from .env.example');
  }
}

async function checkDirectories() {
  const requiredDirs = [
    'autodoc',
    'autodoc/reflect',
    'autodoc/ast',
    'autodoc/builder',
    'autodoc/enhancer',
    'autodoc/version',
    'autodoc/openapi',
    'cli',
    'models',
    'schemas',
    'schemas/request',
    'schemas/response',
    'scripts',
    'src',
    'src/routes',
    'src/controllers',
    'tests',
    'output'
  ];

  for (const dir of requiredDirs) {
    try {
      const dirPath = path.join(__dirname, dir);
      await fs.access(dirPath);
      success(`Directory exists: ${dir}`);
    } catch (error) {
      fail(`Directory missing: ${dir}`);
    }
  }
}

async function checkCoreFiles() {
  const requiredFiles = [
    'autodoc/reflect/RouteReflector.js',
    'autodoc/ast/ASTAnalyzer.js',
    'autodoc/builder/DocumentationBuilder.js',
    'autodoc/enhancer/GeminiEnhancer.js',
    'autodoc/version/VersionManager.js',
    'autodoc/openapi/OpenAPIGenerator.js',
    'cli/index.js',
    'models/ApiDocumentation.js',
    'models/VersionHistory.js',
    'src/app.js'
  ];

  for (const file of requiredFiles) {
    try {
      const filePath = path.join(__dirname, file);
      await fs.access(filePath);
      success(`Core file exists: ${file}`);
    } catch (error) {
      fail(`Core file missing: ${file}`);
    }
  }
}

async function checkMongoConnection() {
  try {
    const mongoose = await import('mongoose');
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/auto-doc-system';
    
    await mongoose.default.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    
    success('MongoDB connection successful');
    await mongoose.default.disconnect();
  } catch (error) {
    fail(`MongoDB connection failed: ${error.message}`);
    info('  Make sure MongoDB is running: mongod');
  }
}

async function runAllChecks() {
  log('\n╔════════════════════════════════════════════════════╗', BLUE);
  log('║     Auto API Doc System - Setup Verification      ║', BLUE);
  log('╚════════════════════════════════════════════════════╝\n', BLUE);

  info('Checking prerequisites...\n');
  
  await checkNodeVersion();
  await checkNpm();
  await checkMongoDB();
  await checkGit();
  
  info('\nChecking project structure...\n');
  
  const pkg = await checkPackageJson();
  const hasNodeModules = await checkNodeModules();
  
  if (hasNodeModules) {
    await checkDependencies(pkg);
  }
  
  await checkEnvFile();
  await checkDirectories();
  await checkCoreFiles();
  
  info('\nChecking MongoDB connection...\n');
  await checkMongoConnection();

  // Summary
  log('\n' + '═'.repeat(50), BLUE);
  log('VERIFICATION SUMMARY', BLUE);
  log('═'.repeat(50) + '\n', BLUE);
  
  success(`Passed: ${CHECKS.passed}`);
  if (CHECKS.warnings > 0) warn(`Warnings: ${CHECKS.warnings}`);
  if (CHECKS.failed > 0) fail(`Failed: ${CHECKS.failed}`);
  
  log('\n' + '═'.repeat(50) + '\n', BLUE);

  if (CHECKS.failed === 0 && CHECKS.warnings === 0) {
    log('✓ All checks passed! System is ready to use.', GREEN);
    log('\nNext steps:', BLUE);
    log('  1. Run tests: node tests/test-autodoc.js');
    log('  2. Try CLI: node cli/index.js --help');
    log('  3. Scan routes: npm run scan -- --no-ai');
    return 0;
  } else if (CHECKS.failed === 0) {
    log('⚠ System is functional but has warnings.', YELLOW);
    log('\nRecommended actions:', BLUE);
    log('  1. Review warnings above');
    log('  2. Configure .env file');
    log('  3. Test with: node tests/test-autodoc.js');
    return 0;
  } else {
    log('✗ Setup incomplete. Fix the errors above.', RED);
    log('\nCommon fixes:', BLUE);
    log('  • Run: npm install');
    log('  • Copy: cp .env.example .env');
    log('  • Start MongoDB: mongod');
    return 1;
  }
}

// Run checks
runAllChecks()
  .then(code => process.exit(code))
  .catch(error => {
    log(`\n✗ Verification failed: ${error.message}`, RED);
    process.exit(1);
  });
