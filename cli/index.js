#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import dbConnection from '../models/index.js';
import ApiDocumentation from '../models/ApiDocumentation.js';
import DocumentationBuilder from '../autodoc/builder/DocumentationBuilder.js';
import GeminiEnhancer from '../autodoc/enhancer/GeminiEnhancer.js';
import { SemanticVersionManager } from '../autodoc/version/VersionManager.js';
import OpenAPIGenerator from '../autodoc/openapi/OpenAPIGenerator.js';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const program = new Command();

/**
 * CLI Tool for Auto API Documentation System
 * Orchestrates the complete documentation pipeline
 */

program
  .name('autodoc')
  .description('Auto API Documentation Engine - CLI Tool')
  .version('1.0.0');

/**
 * Command: scan
 * Scans Express app and discovers all routes
 */
program
  .command('scan')
  .description('Scan Express application and discover routes')
  .option('-a, --app <path>', 'Path to Express app file', './src/app.js')
  .option('-o, --output <path>', 'Output file for results', './output/scan-results.json')
  .option('--no-ai', 'Disable AI enhancement')
  .option('--save-db', 'Save to MongoDB')
  .action(async (options) => {
    const spinner = ora('Initializing scan...').start();

    try {
      // Load Express app
      spinner.text = 'Loading Express application...';
      const appPath = path.resolve(options.app);
      const appUrl = new URL(`file:///${appPath.replace(/\\/g, '/')}`);
      const appModule = await import(appUrl.href);
      const app = appModule.default || appModule.app;

      if (!app) {
        throw new Error('Could not find Express app export');
      }

      // Build documentation
      spinner.text = 'Building documentation...';
      const builder = new DocumentationBuilder({
        schemaDir: process.env.SCHEMA_DIR || './schemas',
        controllerDir: './src/controllers'
      });

      let documentation = await builder.buildDocumentation(app);

      // AI Enhancement (if enabled)
      if (options.ai) {
        spinner.text = 'Enhancing with AI...';
        const enhancer = new GeminiEnhancer();
        if (enhancer.enabled) {
          documentation = await enhancer.enhanceBatch(documentation, { concurrency: 3 });
        }
      }

      // Save to database
      if (options.saveDb) {
        spinner.text = 'Connecting to MongoDB...';
        await dbConnection.connect();

        spinner.text = 'Saving to database...';
        for (const doc of documentation) {
          await ApiDocumentation.findOneAndUpdate(
            { method: doc.method, path: doc.path },
            doc,
            { upsert: true, new: true }
          );
        }
      }

      // Export to file
      spinner.text = 'Writing output file...';
      const outputDir = path.dirname(options.output);
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(options.output, JSON.stringify(documentation, null, 2));

      spinner.succeed(chalk.green(`Scan complete! Found ${documentation.length} endpoints`));
      
      console.log(chalk.blue('\n📊 Statistics:'));
      const stats = builder.getStatistics();
      console.log(`  Total Routes: ${stats.totalRoutes}`);
      console.log(`  Unique Paths: ${stats.uniquePaths}`);
      console.log(`  Async Handlers: ${stats.asyncHandlers}`);
      console.log(`  Routes with Middleware: ${stats.routesWithMiddleware}`);
      console.log(`\n  Output: ${options.output}`);

      if (options.saveDb) {
        await dbConnection.disconnect();
      }

      process.exit(0);
    } catch (error) {
      spinner.fail(chalk.red('Scan failed'));
      console.error(chalk.red('\n❌ Error:'), error.message);
      console.error(error.stack);
      process.exit(1);
    }
  });

/**
 * Command: build-docs
 * Build complete documentation with AI enhancement
 */
program
  .command('build-docs')
  .description('Build complete API documentation with AI enhancement')
  .option('-a, --app <path>', 'Path to Express app file', './src/app.js')
  .option('-o, --output <path>', 'Output directory', './output')
  .option('--no-ai', 'Disable AI enhancement')
  .action(async (options) => {
    const spinner = ora('Building documentation...').start();

    try {
      // Connect to DB
      spinner.text = 'Connecting to MongoDB...';
      await dbConnection.connect();

      // Load Express app
      spinner.text = 'Loading Express application...';
      const appModule = await import(path.resolve(options.app));
      const app = appModule.default || appModule.app;

      // Build documentation
      spinner.text = 'Scanning routes and analyzing code...';
      const builder = new DocumentationBuilder();
      let documentation = await builder.buildDocumentation(app);

      // AI Enhancement
      if (options.ai) {
        spinner.text = 'Enhancing with AI (this may take a while)...';
        const enhancer = new GeminiEnhancer();
        if (enhancer.enabled) {
          documentation = await enhancer.enhanceBatch(documentation);
        }
      }

      // Get version info
      spinner.text = 'Getting version information...';
      const versionManager = new SemanticVersionManager();
      const currentVersion = await versionManager.getCurrentVersion();
      const gitCommit = await versionManager.gitManager.getCurrentCommitHash();
      const gitBranch = await versionManager.gitManager.getCurrentBranch();

      // Save to database
      spinner.text = 'Saving to database...';
      for (const doc of documentation) {
        await ApiDocumentation.findOneAndUpdate(
          { method: doc.method, path: doc.path, version: currentVersion },
          {
            ...doc,
            version: currentVersion,
            gitCommitHash: gitCommit,
            gitBranch: gitBranch,
            lastUpdated: new Date()
          },
          { upsert: true, new: true }
        );
      }

      // Export files
      spinner.text = 'Exporting documentation files...';
      await fs.mkdir(options.output, { recursive: true });
      
      await fs.writeFile(
        path.join(options.output, 'api-docs.json'),
        JSON.stringify(documentation, null, 2)
      );

      await fs.writeFile(
        path.join(options.output, 'current-docs.json'),
        JSON.stringify(documentation, null, 2)
      );

      spinner.succeed(chalk.green('Documentation built successfully!'));
      
      console.log(chalk.blue('\n📚 Documentation Summary:'));
      console.log(`  Endpoints: ${documentation.length}`);
      console.log(`  Version: ${currentVersion}`);
      console.log(`  Git Commit: ${gitCommit?.substring(0, 7) || 'N/A'}`);
      console.log(`  Git Branch: ${gitBranch}`);
      console.log(`  AI Enhanced: ${documentation.filter(d => d.aiEnhanced).length}/${documentation.length}`);
      console.log(`\n  Output: ${options.output}`);

      await dbConnection.disconnect();
      process.exit(0);
    } catch (error) {
      spinner.fail(chalk.red('Build failed'));
      console.error(chalk.red('\n❌ Error:'), error.message);
      console.error(error.stack);
      process.exit(1);
    }
  });

/**
 * Command: validate
 * Validate documentation against implementation
 */
program
  .command('validate')
  .description('Validate documentation against current implementation')
  .option('-a, --app <path>', 'Path to Express app file', './src/app.js')
  .action(async (options) => {
    const spinner = ora('Validating documentation...').start();

    try {
      // Connect to DB
      spinner.text = 'Connecting to MongoDB...';
      await dbConnection.connect();

      // Get stored documentation
      spinner.text = 'Loading stored documentation...';
      const storedDocs = await ApiDocumentation.find({ deprecated: false });

      // Scan current implementation
      spinner.text = 'Scanning current implementation...';
      const appModule = await import(path.resolve(options.app));
      const app = appModule.default || appModule.app;
      
      const builder = new DocumentationBuilder();
      const currentDocs = await builder.buildDocumentation(app);

      // Compare
      spinner.text = 'Comparing documentation...';
      const issues = [];

      const storedMap = new Map(
        storedDocs.map(doc => [`${doc.method}:${doc.path}`, doc])
      );
      const currentMap = new Map(
        currentDocs.map(doc => [`${doc.method}:${doc.path}`, doc])
      );

      // Check for missing endpoints
      for (const [key] of storedMap) {
        if (!currentMap.has(key)) {
          issues.push({
            type: 'missing',
            message: `Endpoint documented but not found in implementation: ${key}`
          });
        }
      }

      // Check for undocumented endpoints
      for (const [key] of currentMap) {
        if (!storedMap.has(key)) {
          issues.push({
            type: 'undocumented',
            message: `Endpoint exists but not documented: ${key}`
          });
        }
      }

      // Check for parameter mismatches
      for (const [key, currentDoc] of currentMap) {
        const storedDoc = storedMap.get(key);
        if (storedDoc) {
          const storedParams = storedDoc.parameters?.length || 0;
          const currentParams = currentDoc.parameters?.length || 0;
          
          if (storedParams !== currentParams) {
            issues.push({
              type: 'mismatch',
              message: `Parameter count mismatch for ${key}: documented=${storedParams}, actual=${currentParams}`
            });
          }
        }
      }

      if (issues.length === 0) {
        spinner.succeed(chalk.green('✓ Validation passed! Documentation is in sync.'));
      } else {
        spinner.warn(chalk.yellow(`⚠ Validation found ${issues.length} issue(s):`));
        
        console.log('');
        issues.forEach((issue, index) => {
          const icon = issue.type === 'missing' ? '✗' : 
                      issue.type === 'undocumented' ? 'ℹ' : '⚠';
          const color = issue.type === 'missing' ? chalk.red :
                       issue.type === 'undocumented' ? chalk.blue : chalk.yellow;
          console.log(color(`  ${icon} ${issue.message}`));
        });
      }

      await dbConnection.disconnect();
      process.exit(issues.length === 0 ? 0 : 1);
    } catch (error) {
      spinner.fail(chalk.red('Validation failed'));
      console.error(chalk.red('\n❌ Error:'), error.message);
      process.exit(1);
    }
  });

/**
 * Command: version-bump
 * Automatically bump version based on changes
 */
program
  .command('version-bump')
  .description('Automatically bump version based on API changes')
  .option('-t, --type <type>', 'Force bump type (major|minor|patch)')
  .option('--dry-run', 'Show what would happen without making changes')
  .action(async (options) => {
    const spinner = ora('Analyzing changes...').start();

    try {
      await dbConnection.connect();

      const versionManager = new SemanticVersionManager();
      
      // Get current version
      const currentVersion = await versionManager.getCurrentVersion();
      spinner.info(`Current version: ${currentVersion}`);

      // Get previous and current docs
      spinner.text = 'Loading documentation versions...';
      const currentDocs = await ApiDocumentation.find({ version: currentVersion });
      const allVersions = await ApiDocumentation.distinct('version');
      
      let previousVersion = null;
      if (allVersions.length > 1) {
        allVersions.sort((a, b) => {
          const av = a.replace(/^v/, '');
          const bv = b.replace(/^v/, '');
          return av.localeCompare(bv, undefined, { numeric: true });
        });
        const currentIndex = allVersions.indexOf(currentVersion);
        if (currentIndex > 0) {
          previousVersion = allVersions[currentIndex - 1];
        }
      }

      const previousDocs = previousVersion 
        ? await ApiDocumentation.find({ version: previousVersion })
        : [];

      // Analyze changes
      spinner.text = 'Analyzing changes...';
      const analysis = versionManager.analyzeChanges(previousDocs, currentDocs);

      // Override if type is forced
      if (options.type) {
        analysis.bumpType = options.type;
        analysis.bumpReason = `Forced ${options.type} bump`;
      }

      // Calculate new version
      const newVersion = versionManager.bumpVersion(currentVersion, analysis.bumpType);

      spinner.succeed('Analysis complete!');

      console.log(chalk.blue('\n📊 Change Analysis:'));
      console.log(`  Bump Type: ${chalk.bold(analysis.bumpType.toUpperCase())}`);
      console.log(`  Reason: ${analysis.bumpReason}`);
      console.log(`\n  Breaking Changes: ${analysis.changes.breakingChanges.length}`);
      console.log(`  New Endpoints: ${analysis.changes.newEndpoints.length}`);
      console.log(`  Modified Endpoints: ${analysis.changes.modifiedEndpoints.length}`);
      console.log(`  Deprecated Endpoints: ${analysis.changes.deprecatedEndpoints.length}`);
      console.log(chalk.green(`\n  ${currentVersion} → ${newVersion}`));

      if (options.dryRun) {
        console.log(chalk.yellow('\n⚠ Dry run - no changes made'));
        await dbConnection.disconnect();
        process.exit(0);
      }

      // Create version history
      spinner.start('Creating version history...');
      await versionManager.createVersionHistory({
        version: newVersion,
        previousVersion: currentVersion,
        bumpType: analysis.bumpType,
        bumpReason: analysis.bumpReason,
        changes: analysis.changes,
        totalEndpoints: currentDocs.length
      });

      spinner.succeed(chalk.green(`Version bumped to ${newVersion}!`));

      await dbConnection.disconnect();
      process.exit(0);
    } catch (error) {
      spinner.fail(chalk.red('Version bump failed'));
      console.error(chalk.red('\n❌ Error:'), error.message);
      process.exit(1);
    }
  });

/**
 * Command: export-openapi
 * Export OpenAPI specification
 */
program
  .command('export-openapi')
  .description('Export OpenAPI 3.0 specification')
  .option('-v, --version <version>', 'API version to export')
  .option('-o, --output <path>', 'Output file path', './output/openapi.json')
  .option('-f, --format <format>', 'Output format (json|yaml)', 'json')
  .action(async (options) => {
    const spinner = ora('Exporting OpenAPI specification...').start();

    try {
      await dbConnection.connect();

      // Get documentation
      spinner.text = 'Loading documentation...';
      const query = options.version 
        ? { version: options.version, deprecated: false }
        : { deprecated: false };
      
      const docs = await ApiDocumentation.find(query).sort({ path: 1, method: 1 });

      if (docs.length === 0) {
        throw new Error('No documentation found');
      }

      // Convert to plain objects
      const plainDocs = docs.map(doc => doc.toObject());

      // Generate OpenAPI spec
      spinner.text = 'Generating OpenAPI specification...';
      const generator = new OpenAPIGenerator({
        info: {
          title: 'API Documentation',
          description: 'Auto-generated API documentation',
          version: options.version || '1.0.0'
        },
        servers: [
          {
            url: process.env.API_BASE_URL || 'http://localhost:3000',
            description: 'API Server'
          }
        ]
      });

      const spec = generator.generateSpec(plainDocs, {
        apiVersion: options.version
      });

      // Export to file
      spinner.text = 'Writing output file...';
      await generator.exportToFile(spec, options.output, options.format);

      spinner.succeed(chalk.green('OpenAPI specification exported!'));
      
      console.log(chalk.blue('\n📄 OpenAPI Specification:'));
      console.log(`  Endpoints: ${Object.keys(spec.paths).length}`);
      console.log(`  Schemas: ${Object.keys(spec.components.schemas).length}`);
      console.log(`  Tags: ${spec.tags.length}`);
      console.log(`  Format: ${options.format}`);
      console.log(`\n  Output: ${options.output}`);

      await dbConnection.disconnect();
      process.exit(0);
    } catch (error) {
      spinner.fail(chalk.red('Export failed'));
      console.error(chalk.red('\n❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
