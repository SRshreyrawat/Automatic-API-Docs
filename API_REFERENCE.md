# API Reference

Complete reference for all modules and functions in the Auto API Documentation System.

## Table of Contents

1. [RouteReflector](#routereflector)
2. [ASTAnalyzer](#astanalyzer)
3. [DocumentationBuilder](#documentationbuilder)
4. [GeminiEnhancer](#geminienhancer)
5. [VersionManager](#versionmanager)
6. [OpenAPIGenerator](#openapigenerator)
7. [CLI Commands](#cli-commands)
8. [Database Models](#database-models)

---

## RouteReflector

**Path:** `autodoc/reflect/RouteReflector.js`

### Class: `RouteReflector`

Walks Express router stack to discover routes.

#### Methods

##### `extractRoutes(app)`

Extract all routes from Express application.

**Parameters:**
- `app` (express.Application) - Express app instance

**Returns:** `Array<RouteObject>`

**Example:**
```javascript
import RouteReflector from './autodoc/reflect/RouteReflector.js';

const reflector = new RouteReflector();
const routes = reflector.extractRoutes(app);
```

##### `getRoutesByMethod(method)`

Filter routes by HTTP method.

**Parameters:**
- `method` (string) - HTTP method (GET, POST, etc.)

**Returns:** `Array<RouteObject>`

##### `getRoutesByPath(pattern)`

Filter routes by path pattern.

**Parameters:**
- `pattern` (string) - Regex pattern

**Returns:** `Array<RouteObject>`

##### `getStatistics()`

Get statistics about discovered routes.

**Returns:** `Object`
```javascript
{
  totalRoutes: number,
  uniquePaths: number,
  methodBreakdown: { GET: number, POST: number, ... },
  asyncHandlers: number,
  routesWithMiddleware: number,
  routesWithParameters: number
}
```

### Types

#### `RouteObject`

```javascript
{
  method: string,              // HTTP method
  path: string,                // Route path
  handlerName: string,         // Handler function name
  handlerType: string,         // 'async' | 'function'
  middleware: Array<string>,   // Middleware names
  routeParameters: Array<string>, // Path parameters
  isAsync: boolean,
  parameterCount: number
}
```

---

## ASTAnalyzer

**Path:** `autodoc/ast/ASTAnalyzer.js`

### Class: `ASTAnalyzer`

Parses JavaScript code using Babel AST to extract API patterns.

#### Methods

##### `analyzeFile(filePath)`

Analyze a JavaScript file.

**Parameters:**
- `filePath` (string) - Path to file

**Returns:** `Promise<FileAnalysis>`

**Example:**
```javascript
import ASTAnalyzer from './autodoc/ast/ASTAnalyzer.js';

const analyzer = new ASTAnalyzer();
const analysis = await analyzer.analyzeFile('./src/controllers/userController.js');
```

##### `analyzeCode(code, fileName)`

Analyze code string.

**Parameters:**
- `code` (string) - JavaScript source code
- `fileName` (string) - File name for reference

**Returns:** `FileAnalysis`

##### `analyzeFunctionByName(code, functionName)`

Analyze specific function from code.

**Parameters:**
- `code` (string) - Source code
- `functionName` (string) - Function name

**Returns:** `FunctionAnalysis | null`

### Types

#### `FileAnalysis`

```javascript
{
  fileName: string,
  functions: Array<FunctionAnalysis>,
  exports: Array<ExportInfo>,
  imports: Array<ImportInfo>,
  errors: Array<string>
}
```

#### `FunctionAnalysis`

```javascript
{
  name: string,
  isAsync: boolean,
  isArrow: boolean,
  parameters: Array<Parameter>,
  requestUsage: {
    body: Array<string>,      // req.body.field
    query: Array<string>,     // req.query.field
    params: Array<string>,    // req.params.field
    headers: Array<string>    // req.headers.field
  },
  responseUsage: {
    statusCodes: Array<number>,
    jsonCalls: Array<Object>,
    sendCalls: Array<Object>,
    structures: Array<Object>
  },
  errors: {
    thrown: Array<{ type: string, message: string }>,
    statusCodes: Array<number>
  },
  returnValues: Array<any>
}
```

---

## DocumentationBuilder

**Path:** `autodoc/builder/DocumentationBuilder.js`

### Class: `DocumentationBuilder`

Combines route reflection and AST analysis to build documentation.

#### Constructor

```javascript
new DocumentationBuilder(options)
```

**Options:**
```javascript
{
  schemaDir: string,      // Default: './schemas'
  controllerDir: string   // Default: './src/controllers'
}
```

#### Methods

##### `buildDocumentation(app, options)`

Build documentation for entire Express app.

**Parameters:**
- `app` (express.Application) - Express app
- `options` (Object) - Build options

**Returns:** `Promise<Array<Documentation>>`

**Example:**
```javascript
import DocumentationBuilder from './autodoc/builder/DocumentationBuilder.js';

const builder = new DocumentationBuilder({
  schemaDir: './schemas',
  controllerDir: './src/controllers'
});

const docs = await builder.buildDocumentation(app);
```

##### `getStatistics()`

Get builder statistics.

**Returns:** `Object` - Same as RouteReflector.getStatistics()

### Types

#### `Documentation`

```javascript
{
  method: string,
  path: string,
  handlerName: string,
  handlerType: string,
  middleware: Array<string>,
  parameters: Array<Parameter>,
  requestSchema: Schema | null,
  responseSchema: Schema | null,
  statusCodes: Array<number>,
  examples: {
    request: Object,
    response: Object
  },
  metadata: Object
}
```

#### `Parameter`

```javascript
{
  name: string,
  in: 'query' | 'path' | 'body' | 'header',
  type: string,
  required: boolean,
  description: string,
  example: any,
  schema: Object
}
```

---

## GeminiEnhancer

**Path:** `autodoc/enhancer/GeminiEnhancer.js`

### Class: `GeminiEnhancer`

AI-powered documentation enhancement using Google Gemini.

#### Constructor

```javascript
new GeminiEnhancer(apiKey)
```

**Parameters:**
- `apiKey` (string) - Gemini API key (optional, reads from env)

#### Properties

- `enabled` (boolean) - Whether AI is available
- `maxRetries` (number) - Max retry attempts (default: 3)
- `retryDelay` (number) - Retry delay in ms (default: 1000)

#### Methods

##### `enhanceEndpoint(doc)`

Enhance single endpoint documentation.

**Parameters:**
- `doc` (Documentation) - Documentation object

**Returns:** `Promise<Documentation>` - Enhanced documentation

**Example:**
```javascript
import GeminiEnhancer from './autodoc/enhancer/GeminiEnhancer.js';

const enhancer = new GeminiEnhancer();
const enhanced = await enhancer.enhanceEndpoint(doc);
```

##### `enhanceBatch(docs, options)`

Enhance multiple endpoints in batch.

**Parameters:**
- `docs` (Array<Documentation>) - Documentation array
- `options` (Object)
  - `concurrency` (number) - Concurrent requests (default: 3)
  - `skipExisting` (boolean) - Skip already enhanced (default: false)

**Returns:** `Promise<Array<Documentation>>`

**Example:**
```javascript
const enhanced = await enhancer.enhanceBatch(docs, { concurrency: 5 });
```

### Enhancement Results

Enhanced documentation includes:
- `description` - AI-generated description
- `examples.request` - AI-generated request example
- `examples.response` - AI-generated response example
- `edgeCases` - Array of detected edge cases
- `validationRules` - Array of suggested validation rules
- `aiEnhanced` - Boolean flag
- `aiEnhancementDate` - Timestamp

---

## VersionManager

**Path:** `autodoc/version/VersionManager.js`

### Class: `GitVersionManager`

Git integration for version tracking.

#### Methods

##### `getCurrentCommitHash()`

Get current git commit hash.

**Returns:** `Promise<string | null>`

##### `getCurrentBranch()`

Get current git branch name.

**Returns:** `Promise<string>`

##### `getTags()`

Get all git tags.

**Returns:** `Promise<Array<string>>`

##### `getLatestTag()`

Get latest version tag.

**Returns:** `Promise<string | null>`

##### `createTag(tagName, message)`

Create annotated git tag.

**Parameters:**
- `tagName` (string) - Tag name
- `message` (string) - Tag message

**Returns:** `Promise<void>`

##### `isClean()`

Check if repository is clean.

**Returns:** `Promise<boolean>`

### Class: `SemanticVersionManager`

Semantic versioning automation.

#### Methods

##### `analyzeChanges(oldDocs, newDocs)`

Analyze changes between documentation versions.

**Parameters:**
- `oldDocs` (Array<Documentation>) - Previous docs
- `newDocs` (Array<Documentation>) - Current docs

**Returns:** `ChangeAnalysis`

**Example:**
```javascript
import { SemanticVersionManager } from './autodoc/version/VersionManager.js';

const versionManager = new SemanticVersionManager();
const analysis = versionManager.analyzeChanges(oldDocs, newDocs);
// analysis.bumpType: 'major' | 'minor' | 'patch'
```

##### `bumpVersion(currentVersion, bumpType)`

Calculate new version number.

**Parameters:**
- `currentVersion` (string) - Current version (e.g., '1.2.3')
- `bumpType` ('major' | 'minor' | 'patch')

**Returns:** `string` - New version

##### `getCurrentVersion()`

Get current version from database or git.

**Returns:** `Promise<string>`

##### `createVersionHistory(versionData)`

Create version history record in database.

**Parameters:**
- `versionData` (Object) - Version information

**Returns:** `Promise<VersionHistory>`

### Types

#### `ChangeAnalysis`

```javascript
{
  bumpType: 'major' | 'minor' | 'patch',
  bumpReason: string,
  changes: {
    breakingChanges: Array<string>,
    newEndpoints: Array<string>,
    modifiedEndpoints: Array<string>,
    deprecatedEndpoints: Array<string>,
    internalChanges: Array<string>
  }
}
```

---

## OpenAPIGenerator

**Path:** `autodoc/openapi/OpenAPIGenerator.js`

### Class: `OpenAPIGenerator`

Generate OpenAPI 3.0 specifications from documentation.

#### Constructor

```javascript
new OpenAPIGenerator(options)
```

**Options:**
```javascript
{
  version: string,    // OpenAPI version (default: '3.0.3')
  info: Object,       // API info
  servers: Array      // Server configurations
}
```

#### Methods

##### `generateSpec(docs, options)`

Generate OpenAPI specification.

**Parameters:**
- `docs` (Array<Documentation>) - Documentation array
- `options` (Object) - Generation options

**Returns:** `Object` - OpenAPI spec

**Example:**
```javascript
import OpenAPIGenerator from './autodoc/openapi/OpenAPIGenerator.js';

const generator = new OpenAPIGenerator({
  info: {
    title: 'My API',
    version: '1.0.0'
  }
});

const spec = generator.generateSpec(docs);
```

##### `exportToFile(spec, outputPath, format)`

Export specification to file.

**Parameters:**
- `spec` (Object) - OpenAPI specification
- `outputPath` (string) - Output file path
- `format` ('json' | 'yaml') - Output format

**Returns:** `Promise<void>`

---

## CLI Commands

### scan

Scan Express app and discover routes.

```bash
node cli/index.js scan [options]
```

**Options:**
- `-a, --app <path>` - Path to Express app file
- `-o, --output <path>` - Output file path
- `--no-ai` - Disable AI enhancement
- `--save-db` - Save to MongoDB

### build-docs

Build complete documentation with AI enhancement.

```bash
node cli/index.js build-docs [options]
```

**Options:**
- `-a, --app <path>` - Path to Express app file
- `-o, --output <path>` - Output directory
- `--no-ai` - Disable AI enhancement

### validate

Validate documentation against implementation.

```bash
node cli/index.js validate [options]
```

**Options:**
- `-a, --app <path>` - Path to Express app file

**Exit Codes:**
- `0` - Validation passed
- `1` - Validation failed

### version-bump

Automatically bump version based on changes.

```bash
node cli/index.js version-bump [options]
```

**Options:**
- `-t, --type <type>` - Force bump type (major|minor|patch)
- `--dry-run` - Show what would happen

### export-openapi

Export OpenAPI specification.

```bash
node cli/index.js export-openapi [options]
```

**Options:**
- `-v, --version <version>` - API version to export
- `-o, --output <path>` - Output file path
- `-f, --format <format>` - Output format (json|yaml)

---

## Database Models

### ApiDocumentation

**Collection:** `api_documentation`

#### Schema

```javascript
{
  method: String (required),
  path: String (required),
  version: String (required),
  apiVersion: String,
  handlerName: String,
  controllerFile: String,
  middleware: [String],
  summary: String,
  description: String,
  tags: [String],
  parameters: [ParameterSchema],
  requestSchema: SchemaDefinition,
  responseSchema: SchemaDefinition,
  statusCodes: [{ code: Number, description: String }],
  examples: Object,
  edgeCases: [String],
  breakingChange: Boolean,
  gitCommitHash: String,
  gitBranch: String,
  deprecated: Boolean,
  aiEnhanced: Boolean,
  validated: Boolean,
  lastUpdated: Date,
  createdAt: Date
}
```

#### Static Methods

##### `findLatestVersion(method, path)`

Find latest version of endpoint.

**Returns:** `Promise<ApiDocumentation | null>`

##### `findByApiVersion(apiVersion)`

Find all endpoints for API version.

**Returns:** `Promise<Array<ApiDocumentation>>`

##### `findBreakingChanges(fromVersion, toVersion)`

Find breaking changes between versions.

**Returns:** `Promise<Array<ApiDocumentation>>`

### VersionHistory

**Collection:** `version_history`

#### Schema

```javascript
{
  version: String (required, unique),
  apiVersion: String,
  major: Number,
  minor: Number,
  patch: Number,
  bumpType: String,
  bumpReason: String,
  changes: Object,
  gitCommitHash: String,
  gitBranch: String,
  totalEndpoints: Number,
  endpointsAdded: Number,
  endpointsModified: Number,
  endpointsRemoved: Number,
  releaseDate: Date,
  previousVersion: String
}
```

#### Static Methods

##### `getLatest()`

Get latest version.

**Returns:** `Promise<VersionHistory | null>`

##### `getChangelog(fromVersion, toVersion)`

Get changelog between versions.

**Returns:** `Promise<Array<VersionHistory>>`

---

## Utility Functions

### Database Connection

```javascript
import dbConnection from './models/index.js';

// Connect
await dbConnection.connect();

// Get status
const status = dbConnection.getStatus();

// Disconnect
await dbConnection.disconnect();
```

---

## Configuration

### Environment Variables

All configuration via `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/auto-doc-system
GEMINI_API_KEY=your_api_key
PORT=3000
ENABLE_AI_ENHANCEMENT=true
AUTO_VERSION_BUMP=true
SCHEMA_DIR=./schemas
OUTPUT_DIR=./output
```

---

## Error Handling

All async functions throw errors that should be caught:

```javascript
try {
  const docs = await builder.buildDocumentation(app);
} catch (error) {
  console.error('Build failed:', error.message);
  // Handle error
}
```

Common error types:
- File not found
- Parse errors
- MongoDB connection errors
- API rate limits
- Invalid input

---

## Best Practices

1. **Always await async functions**
2. **Handle errors appropriately**
3. **Close database connections**
4. **Validate input before processing**
5. **Use type checking where possible**
6. **Review AI-generated content**
7. **Keep schemas up to date**

---

For more information, see:
- [README.md](README.md) - Complete documentation
- [QUICKSTART.md](QUICKSTART.md) - Getting started
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
