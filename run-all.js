#!/usr/bin/env node

/**
 * Master Runner - Executes complete project workflow
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

console.log('\n');
console.log(chalk.cyan('╔════════════════════════════════════════════════════════════╗'));
console.log(chalk.cyan('║                                                            ║'));
console.log(chalk.cyan('║     AUTO API DOCUMENTATION SYSTEM - FULL RUN               ║'));
console.log(chalk.cyan('║                                                            ║'));
console.log(chalk.cyan('╚════════════════════════════════════════════════════════════╝'));
console.log('\n');

function runCommand(name, command) {
  console.log('\n' + '='.repeat(60));
  console.log(chalk.yellow(`🎯 ${name}`));
  console.log('='.repeat(60) + '\n');
  
  try {
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(chalk.green(`\n✅ ${name} - SUCCESS`));
    return true;
  } catch (error) {
    console.log(chalk.red(`\n❌ ${name} - FAILED`));
    return false;
  }
}

async function main() {
  const steps = [
    { name: 'Setup Verification', command: 'node setup-verify.js' },
    { name: 'Scan Routes (No AI)', command: 'npm run scan -- --no-ai --output output/api-docs.json' },
    { name: 'Export OpenAPI', command: 'node cli/index.js export-openapi --input output/api-docs.json --output output/openapi.json --format json' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const step of steps) {
    if (runCommand(step.name, step.command)) {
      passed++;
    } else {
      failed++;
      console.log(chalk.yellow('\n⚠ Continuing with next step...\n'));
    }
  }
  
  console.log('\n');
  console.log(chalk.cyan('╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║                                                            ║'));
  console.log(chalk.cyan('║     🎉 WORKFLOW COMPLETED                                  ║'));
  console.log(chalk.cyan('║                                                            ║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════════════════╝'));
  console.log('\n');
  
  console.log(chalk.yellow('📊 Summary:'));
  console.log(chalk.green(`   ✓ Passed: ${passed}`));
  if (failed > 0) console.log(chalk.red(`   ✗ Failed: ${failed}`));
  
  console.log('\n' + chalk.yellow('🚀 Next Steps:'));
  console.log('   • View docs: type output/api-docs.json');
  console.log('   • View OpenAPI: type output/openapi.json');
  console.log('   • Start server: node src/app.js');
  console.log('   • Run with AI: npm run scan -- --save-db\n');
}

main().catch(error => {
  console.error(chalk.red('\n❌ Fatal error:'), error.message);
  process.exit(1);
});
