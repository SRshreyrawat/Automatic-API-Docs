# Auto API Documentation System

> Production-grade automated API documentation and versioning system with deep code analysis, AST parsing, AI enhancement, and Git-based version control.
 
## 🎯 Overview

This is a comprehensive Node.js + Express + MongoDB system that automatically:

- **Discovers** Express routes using reflection
- **Analyzes** controller code using AST parsing (Babel)
- **Extracts** parameters, request/response structures, status codes
- **Enhances** documentation using AI (Google Gemini)
- **Versions** APIs using Git branches and semantic versioning
- **Validates** documentation against implementation
- **Exports** OpenAPI 3.0 specifications

**No third-party documentation generators** - everything is built from scratch for maximum control and customization.

## 🏗 Architecture

### Core Components

```
autodoc/
├── reflect/        - Express route reflection engine
├── ast/            - AST code analyzer (Babel parser)
├── builder/        - Documentation builder (combines reflection + AST)
├── enhancer/       - AI enhancement layer (Gemini API)
├── version/        - Git versioning + semantic versioning
├── validator/      - Documentation validation
└── openapi/        - OpenAPI 3.0 generator
```

### Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **AST Parsing**: @babel/parser, @babel/traverse
- **AI Enhancement**: Google Gemini API
- **Version Control**: simple-git, semver
- **CLI**: Commander.js, Chalk, Ora
- **Validation**: Custom shell scripts (bash)

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- MongoDB (running locally or remote)
- Git
- Google Gemini API key (for AI enhancement)

### Setup Steps

1. **Clone/Navigate to the project**
   ```bash
   cd auto-doc-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   ```env
   MONGODB_URI=mongodb://localhost:27017/auto-doc-system
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

4. **Start MongoDB**
   ```bash
   # Windows (if MongoDB is installed as service)
   net start MongoDB

   # Or run manually
   mongod --dbpath /path/to/data
   ```

5. **Initialize Git repository (if not already)**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

## 🚀 Usage

### CLI Commands

The system provides a powerful CLI interface:

```bash
# 1. Scan Express app and discover routes
npm run scan

# 2. Build complete documentation with AI enhancement
npm run build-docs

# 3. Validate documentation against implementation
npm run validate

# 4. Bump version automatically based on changes
npm run version-bump

# 5. Export OpenAPI specification
npm run export-openapi
```

### Detailed Command Usage

#### 1. Scan Routes

```bash
# Basic scan
node cli/index.js scan

# Scan with options
node cli/index.js scan \
  --app ./src/app.js \
  --output ./output/scan-results.json \
  --save-db \
  --no-ai
```

**Options:**
- `--app <path>`: Path to Express app file (default: `./src/app.js`)
- `--output <path>`: Output file path (default: `./output/scan-results.json`)
- `--save-db`: Save results to MongoDB
- `--no-ai`: Disable AI enhancement

#### 2. Build Documentation

```bash
# Build with AI enhancement
node cli/index.js build-docs

# Build without AI
node cli/index.js build-docs --no-ai

# Specify custom app path
node cli/index.js build-docs --app ./src/app.js
```

**What it does:**
- Scans all routes using reflection
- Analyzes controller code with AST
- Extracts parameters, request/response structures
- Enhances with AI-generated descriptions and examples
- Saves to MongoDB with version tracking
- Exports JSON documentation

#### 3. Validate Documentation

```bash
node cli/index.js validate
```

**What it does:**
- Loads stored documentation from MongoDB
- Scans current implementation
- Compares and detects:
  - Missing endpoints
  - Undocumented endpoints
  - Parameter mismatches
- Returns exit code 0 if valid, 1 if issues found

#### 4. Version Bump

```bash
# Automatic version bump (analyzes changes)
node cli/index.js version-bump

# Force specific bump type
node cli/index.js version-bump --type major
node cli/index.js version-bump --type minor
node cli/index.js version-bump --type patch

# Dry run (see what would happen)
node cli/index.js version-bump --dry-run
```

**Automatic Detection:**
- **Major** (breaking changes):
  - Removed endpoints
  - New required parameters
  - Response schema changes
  - Explicitly marked breaking changes
- **Minor** (new features):
  - New endpoints
  - New optional parameters
- **Patch** (fixes):
  - Internal changes
  - Middleware updates
  - Documentation improvements

#### 5. Export OpenAPI

```bash
# Export latest version
node cli/index.js export-openapi

# Export specific version
node cli/index.js export-openapi --version 1.2.0

# Export as YAML
node cli/index.js export-openapi --format yaml --output ./output/openapi.yaml
```

### Shell Script Validation

```bash
# Run validation script (for CI/CD)
bash scripts/validate-docs.sh

# CI validation
bash scripts/ci-validate.sh
```

## 📖 How It Works

### 1. Route Reflection

The `RouteReflector` walks through the Express router stack:

```javascript
import RouteReflector from './autodoc/reflect/RouteReflector.js';

const reflector = new RouteReflector();
const routes = reflector.extractRoutes(app);

// Result:
// [
//   {
//     method: 'GET',
//     path: '/api/users/:id',
//     handlerName: 'getUserById',
//     middleware: ['authenticate'],
//     routeParameters: ['id']
//   }
// ]
```

**Features:**
- Handles nested routers
- Extracts middleware chains
- Identifies async handlers
- Supports dynamic routes

### 2. AST Code Analysis

The `ASTAnalyzer` parses controller code to extract detailed information:

```javascript
import ASTAnalyzer from './autodoc/ast/ASTAnalyzer.js';

const analyzer = new ASTAnalyzer();
const analysis = await analyzer.analyzeFile('./src/controllers/userController.js');

// Extracts:
// - Function parameters
// - req.body, req.query, req.params usage
// - res.json() response structures
// - Status codes
// - Thrown errors
```

**Detects:**
- Destructured parameters
- Request field access (`req.body.email`)
- Response structures (`res.json({ success: true, data: user })`)
- Status codes (`res.status(201)`)
- Error handling (`throw new Error()`)

### 3. Documentation Building

The `DocumentationBuilder` combines reflection and AST analysis:

```javascript
import DocumentationBuilder from './autodoc/builder/DocumentationBuilder.js';

const builder = new DocumentationBuilder({
  schemaDir: './schemas',
  controllerDir: './src/controllers'
});

const docs = await builder.buildDocumentation(app);
```

**Process:**
1. Reflect routes
2. Analyze handler code
3. Extract parameters and structures
4. Load schemas from filesystem
5. Build comprehensive documentation objects

### 4. AI Enhancement

The `GeminiEnhancer` uses Google Gemini to improve documentation:

```javascript
import GeminiEnhancer from './autodoc/enhancer/GeminiEnhancer.js';

const enhancer = new GeminiEnhancer();
const enhanced = await enhancer.enhanceEndpoint(doc);

// Generates:
// - Human-readable descriptions
// - Request examples
// - Response examples
// - Edge cases
// - Validation rules
```

**AI Prompt Templates:**
- Description generation
- Example generation
- Edge case detection
- Validation rule suggestions

**Retry Logic:**
- Automatic retry on API failures
- Exponential backoff
- Graceful degradation

### 5. Git Versioning

The `GitVersionManager` integrates with Git:

```javascript
import { GitVersionManager } from './autodoc/version/VersionManager.js';

const gitManager = new GitVersionManager();
const commitHash = await gitManager.getCurrentCommitHash();
const branch = await gitManager.getCurrentBranch();
```

**Features:**
- Track commit hashes
- Read git branches
- Manage tags
- Generate changelogs from commits

### 6. Semantic Versioning

The `SemanticVersionManager` automates version bumping:

```javascript
import { SemanticVersionManager } from './autodoc/version/VersionManager.js';

const versionManager = new SemanticVersionManager();
const analysis = versionManager.analyzeChanges(oldDocs, newDocs);

// analysis.bumpType: 'major' | 'minor' | 'patch'
// analysis.changes: { breakingChanges: [...], newEndpoints: [...], ... }
```

**Change Detection:**
- Compares documentation snapshots
- Identifies breaking changes
- Detects new endpoints
- Tracks parameter changes

### 7. OpenAPI Export

The `OpenAPIGenerator` creates OpenAPI 3.0 specs:

```javascript
import OpenAPIGenerator from './autodoc/openapi/OpenAPIGenerator.js';

const generator = new OpenAPIGenerator();
const spec = generator.generateSpec(docs);
await generator.exportToFile(spec, './output/openapi.json', 'json');
```

**No Third-Party Tools:**
- Custom OpenAPI builder
- Converts MongoDB docs to OpenAPI format
- Generates paths, schemas, parameters, responses
- Supports both JSON and YAML output

## 🗂 Project Structure

```
auto-doc-system/
├── autodoc/                      # Core documentation engine
│   ├── reflect/
│   │   └── RouteReflector.js     # Express route reflection
│   ├── ast/
│   │   └── ASTAnalyzer.js        # AST code analyzer
│   ├── builder/
│   │   └── DocumentationBuilder.js  # Documentation builder
│   ├── enhancer/
│   │   └── GeminiEnhancer.js     # AI enhancement
│   ├── version/
│   │   └── VersionManager.js     # Git + SemVer
│   └── openapi/
│       └── OpenAPIGenerator.js   # OpenAPI exporter
│
├── cli/
│   └── index.js                  # CLI tool
│
├── models/
│   ├── ApiDocumentation.js       # Documentation model
│   ├── VersionHistory.js         # Version history model
│   └── index.js                  # Database connection
│
├── schemas/
│   ├── request/                  # Request schemas
│   │   └── users.post.json
│   └── response/                 # Response schemas
│       ├── users.post.json
│       └── error.standard.json
│
├── scripts/
│   ├── validate-docs.sh          # Validation script
│   └── ci-validate.sh            # CI integration script
│
├── src/                          # Example Express application
│   ├── app.js                    # Express app
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── productRoutes.js
│   │   └── authRoutes.js
│   └── controllers/
│       ├── userController.js
│       ├── productController.js
│       ├── authController.js
│       └── authMiddleware.js
│
├── output/                       # Generated documentation
│   ├── api-docs.json
│   ├── current-docs.json
│   ├── openapi.json
│   └── validation-report.txt
│
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## 🧪 Testing Strategy

### Unit Testing

Test individual components:

```javascript
// Example: Test AST Analyzer
import ASTAnalyzer from './autodoc/ast/ASTAnalyzer.js';

test('should extract req.body fields', () => {
  const code = `
    export const createUser = (req, res) => {
      const { name, email } = req.body;
      res.json({ success: true });
    };
  `;
  
  const analyzer = new ASTAnalyzer();
  const analysis = analyzer.analyzeCode(code);
  
  expect(analysis.functions[0].requestUsage.body).toContain('name');
  expect(analysis.functions[0].requestUsage.body).toContain('email');
});
```

### Integration Testing

Test full pipeline:

```bash
# 1. Scan routes
npm run scan -- --no-ai --output ./test/scan.json

# 2. Validate output
node test/validate-scan.js

# 3. Build docs
npm run build-docs -- --no-ai

# 4. Validate docs
npm run validate
```

### CI/CD Integration

Add to your CI pipeline (e.g., GitHub Actions):

```yaml
name: API Documentation Validation

on: [push, pull_request]

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Start MongoDB
        uses: supercharge/mongodb-github-action@1.8.0
      
      - name: Validate documentation
        run: bash scripts/ci-validate.sh
```

## 🔧 Configuration

### Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/auto-doc-system
MONGODB_TEST_URI=mongodb://localhost:27017/auto-doc-system-test

# Gemini AI
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-pro

# Server
PORT=3000
NODE_ENV=development

# Git
GIT_BRANCH=main
API_VERSION_PREFIX=v

# Features
ENABLE_AI_ENHANCEMENT=true
AUTO_VERSION_BUMP=true
VALIDATE_ON_BUILD=true

# Paths
SCHEMA_DIR=./schemas
OUTPUT_DIR=./output
```

### MongoDB Schema

**ApiDocumentation:**
```javascript
{
  method: 'GET',
  path: '/api/users/:id',
  version: '1.0.0',
  apiVersion: 'v1',
  handlerName: 'getUserById',
  description: 'Retrieve user by ID',
  parameters: [...],
  requestSchema: {...},
  responseSchema: {...},
  statusCodes: [200, 404, 500],
  examples: { request: {...}, response: {...} },
  edgeCases: [...],
  breakingChange: false,
  gitCommitHash: 'abc123',
  gitBranch: 'main',
  aiEnhanced: true,
  validated: true,
  lastUpdated: Date
}
```

**VersionHistory:**
```javascript
{
  version: '1.2.0',
  apiVersion: 'v1',
  major: 1,
  minor: 2,
  patch: 0,
  bumpType: 'minor',
  bumpReason: 'New features: 3 new endpoint(s)',
  changes: {
    breakingChanges: [],
    newEndpoints: ['GET /api/products', ...],
    modifiedEndpoints: [],
    deprecatedEndpoints: []
  },
  gitCommitHash: 'abc123',
  totalEndpoints: 25,
  releaseDate: Date
}
```

## 📊 Output Examples

### Scan Results (`output/scan-results.json`)

```json
[
  {
    "method": "GET",
    "path": "/api/users/:id",
    "handlerName": "getUserById",
    "handlerType": "async",
    "middleware": ["authenticate"],
    "parameters": [
      {
        "name": "id",
        "in": "path",
        "type": "string",
        "required": true
      }
    ],
    "responseSchema": {
      "type": "object",
      "properties": {
        "success": { "type": "boolean" },
        "data": { "type": "object" }
      }
    },
    "statusCodes": [200, 404, 500]
  }
]
```

### OpenAPI Output (`output/openapi.json`)

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "API Documentation",
    "version": "1.0.0"
  },
  "paths": {
    "/api/users/{id}": {
      "get": {
        "summary": "Get user by ID",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/User" }
              }
            }
          }
        }
      }
    }
  }
}
```

## 🚨 Error Handling

The system handles various error scenarios:

1. **Missing Controllers**: Creates minimal documentation with error metadata
2. **Invalid AST**: Falls back to reflection-only data
3. **AI API Failures**: Retry logic with exponential backoff, graceful degradation
4. **Git Not Available**: Continues without git metadata
5. **MongoDB Connection**: Clear error messages, connection retry
6. **Schema Mismatch**: Reports differences in validation

## 🎓 Best Practices

1. **Run validation in CI/CD** to catch documentation drift
2. **Use AI enhancement selectively** (it can be slow for large APIs)
3. **Keep schemas in version control** for better tracking
4. **Review AI-generated content** before committing
5. **Use `--dry-run`** with version-bump to preview changes
6. **Tag releases** after version bumps for better Git history
7. **Maintain schema files** for critical endpoints

## 📝 Example Workflow

```bash
# 1. Develop new feature
git checkout -b feature/new-endpoint

# 2. Add route and controller
# (edit src/routes/userRoutes.js and src/controllers/userController.js)

# 3. Scan and build docs
npm run build-docs

# 4. Review generated documentation
cat output/api-docs.json

# 5. Validate
npm run validate

# 6. Check version bump
npm run version-bump -- --dry-run

# 7. Commit changes
git add .
git commit -m "feat: add new user endpoint"

# 8. Actually bump version
npm run version-bump

# 9. Export OpenAPI
npm run export-openapi

# 10. Deploy
git push origin feature/new-endpoint
```

## 🤝 Contributing

This is a production-style reference implementation. Key areas for extension:

- Add more AST analysis patterns
- Support additional frameworks (Fastify, Koa, etc.)
- Enhance AI prompts for better descriptions
- Add GraphQL schema support
- Implement webhook notifications on version bumps
- Add visual documentation UI

## 📜 License

MIT

## 👤 Author

MERN Stack Architect & DevOps Engineer

---

**Built with automation-first mindset for scalable API documentation.**
#   A u t o m a t i c - A P I - D o c s 
 
 
