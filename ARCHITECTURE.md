# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI Interface                            │
│  (scan | build-docs | validate | version-bump | export-openapi)│
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─────────────────────────────────────────────────────┐
             │                                                     │
             v                                                     v
┌────────────────────────┐                          ┌────────────────────────┐
│   Route Reflection     │                          │   AST Code Analysis    │
│                        │                          │                        │
│  • Express router walk │                          │  • Babel parser        │
│  • Path extraction     │                          │  • req.body detection  │
│  • Method discovery    │                          │  • res.json extraction │
│  • Middleware chains   │                          │  • Status codes        │
│  • Nested routers      │                          │  • Error handling      │
└────────┬───────────────┘                          └────────┬───────────────┘
         │                                                   │
         └─────────────────────┬─────────────────────────────┘
                               │
                               v
                  ┌────────────────────────┐
                  │ Documentation Builder  │
                  │                        │
                  │  • Combine reflection  │
                  │    + AST analysis      │
                  │  • Load schemas        │
                  │  • Build doc objects   │
                  └────────┬───────────────┘
                           │
                           v
                  ┌────────────────────────┐
                  │   AI Enhancement       │
                  │   (Gemini API)         │
                  │                        │
                  │  • Generate desc.      │
                  │  • Create examples     │
                  │  • Detect edge cases   │
                  │  • Validation rules    │
                  └────────┬───────────────┘
                           │
                           v
                  ┌────────────────────────┐
                  │   MongoDB Storage      │
                  │                        │
                  │  • ApiDocumentation    │
                  │  • VersionHistory      │
                  │  • Query & compare     │
                  └────────┬───────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              v            v            v
    ┌─────────────┐ ┌──────────┐ ┌──────────────┐
    │ Git Version │ │Validator │ │OpenAPI Export│
    │             │ │          │ │              │
    │ • Commits   │ │• Compare │ │• Paths       │
    │ • Branches  │ │• Diff    │ │• Schemas     │
    │ • Tags      │ │• Report  │ │• Responses   │
    │ • SemVer    │ │          │ │              │
    └─────────────┘ └──────────┘ └──────────────┘
```

## Data Flow

### 1. Scan & Build Flow

```
Express App
    ↓
[Route Reflection]
    ↓
Route Metadata (paths, methods, handlers)
    ↓
[AST Analysis]
    ↓
Code Analysis (params, responses, status codes)
    ↓
[Documentation Builder]
    ↓
Combined Documentation Objects
    ↓
[Schema Loader]
    ↓
Documentation + File Schemas
    ↓
[AI Enhancement] (optional)
    ↓
Enhanced Documentation
    ↓
[MongoDB Storage]
    ↓
Stored Documentation
```

### 2. Validation Flow

```
[Load Stored Docs from MongoDB]
    ↓
Stored Documentation (baseline)
    ↓
[Scan Current Implementation]
    ↓
Current Documentation (new)
    ↓
[Comparator]
    ↓
Comparison Results
    ├── Missing Endpoints
    ├── New Endpoints
    ├── Modified Endpoints
    └── Parameter Mismatches
    ↓
[Report Generator]
    ↓
Validation Report + Exit Code
```

### 3. Version Bump Flow

```
[Load Previous Version Docs]
    ↓
Previous Documentation
    ↓
[Load Current Version Docs]
    ↓
Current Documentation
    ↓
[Change Analyzer]
    ↓
Detected Changes
    ├── Breaking Changes → MAJOR
    ├── New Endpoints → MINOR
    └── Internal Changes → PATCH
    ↓
[SemVer Calculator]
    ↓
New Version Number
    ↓
[Git Integration]
    ↓
Commit Hash + Branch
    ↓
[Version History Record]
    ↓
Stored in MongoDB
```

### 4. OpenAPI Export Flow

```
[Load Documentation from MongoDB]
    ↓
Documentation Objects
    ↓
[OpenAPI Generator]
    ├── Generate Info
    ├── Generate Paths
    ├── Generate Schemas
    ├── Generate Parameters
    └── Generate Responses
    ↓
OpenAPI 3.0 Specification
    ↓
[File Exporter]
    ↓
openapi.json / openapi.yaml
```

## Component Interactions

### RouteReflector ↔ Express

```javascript
RouteReflector
    ├─→ app._router.stack (read)
    ├─→ layer.route (iterate)
    ├─→ layer.handle (inspect)
    └─→ Returns: Route[]
```

### ASTAnalyzer ↔ Babel

```javascript
ASTAnalyzer
    ├─→ @babel/parser (parse code)
    ├─→ @babel/traverse (walk AST)
    ├─→ @babel/types (check node types)
    └─→ Returns: CodeAnalysis
```

### DocumentationBuilder ↔ Components

```javascript
DocumentationBuilder
    ├─→ RouteReflector.extractRoutes()
    ├─→ ASTAnalyzer.analyzeCode()
    ├─→ FileSystem.readSchemas()
    └─→ Returns: Documentation[]
```

### GeminiEnhancer ↔ Google AI

```javascript
GeminiEnhancer
    ├─→ GoogleGenerativeAI (initialize)
    ├─→ model.generateContent() (for each doc)
    ├─→ Retry logic (on failure)
    └─→ Returns: Enhanced Documentation[]
```

## Database Schema Relationships

```
ApiDocumentation
    ├── method (String)
    ├── path (String)
    ├── version (String) ──┐
    ├── gitCommitHash (String)
    ├── parameters (Array)
    ├── requestSchema (Object)
    ├── responseSchema (Object)
    └── statusCodes (Array)

VersionHistory              │
    ├── version (String) ───┘ (relates to ApiDocumentation.version)
    ├── bumpType (String)
    ├── changes (Object)
    ├── gitCommitHash (String)
    └── previousVersion (String)
```

## File System Structure

```
schemas/
    ├── request/
    │   └── {route}.{method}.json ──┐
    └── response/                   │
        └── {route}.{method}.json ──┘
                                     │
                                     ├─→ Loaded by DocumentationBuilder
                                     └─→ Merged with auto-detected schemas

output/
    ├── api-docs.json ──────────────→ Complete documentation
    ├── current-docs.json ──────────→ Baseline for validation
    ├── openapi.json ───────────────→ OpenAPI export
    └── validation-report.txt ──────→ Validation results
```

## CLI Command Flow

### `scan` Command

```
CLI scan
    ↓
Load Express App
    ↓
RouteReflector.extractRoutes()
    ↓
DocumentationBuilder.buildDocumentation()
    ↓
GeminiEnhancer.enhanceBatch() [optional]
    ↓
Save to MongoDB [optional]
    ↓
Export to JSON
    ↓
Print Statistics
    ↓
Exit
```

### `build-docs` Command

```
CLI build-docs
    ↓
Connect to MongoDB
    ↓
Load Express App
    ↓
Build Documentation (reflection + AST + AI)
    ↓
Get Version Info (Git)
    ↓
Save to MongoDB (with version)
    ↓
Export Files
    ↓
Print Summary
    ↓
Exit
```

### `validate` Command

```
CLI validate
    ↓
Connect to MongoDB
    ↓
Load Stored Docs
    ↓
Scan Current Implementation
    ↓
Compare
    ↓
Generate Issues List
    ↓
Print Results
    ↓
Exit (code 0 or 1)
```

### `version-bump` Command

```
CLI version-bump
    ↓
Connect to MongoDB
    ↓
Get Current Version
    ↓
Load Previous & Current Docs
    ↓
Analyze Changes
    ↓
Calculate New Version
    ↓
Create Version History
    ↓
Print Analysis
    ↓
Exit
```

### `export-openapi` Command

```
CLI export-openapi
    ↓
Connect to MongoDB
    ↓
Load Documentation (by version)
    ↓
OpenAPIGenerator.generateSpec()
    ↓
Export to File (JSON/YAML)
    ↓
Print Summary
    ↓
Exit
```

## Error Handling Strategy

```
Component Level:
    ├── Try-Catch blocks
    ├── Graceful degradation
    └── Partial results on error

System Level:
    ├── Validation before processing
    ├── Clear error messages
    └── Non-zero exit codes

User Level:
    ├── Helpful error output
    ├── Suggestions for fixes
    └── Debug information
```

## Scalability Considerations

### Performance

- **Batch Processing**: AI enhancement in concurrent batches
- **Caching**: Route reflection results can be cached
- **Streaming**: Large docs exported in chunks
- **Indexing**: MongoDB indexes on method+path+version

### Extensibility

- **Plugin Architecture**: Easy to add new analyzers
- **Custom Parsers**: Support for more languages
- **Multiple AI Providers**: Swap Gemini for OpenAI, Claude, etc.
- **Output Formats**: Add Postman, Insomnia, etc.

## Security Considerations

- **API Key Storage**: Environment variables only
- **MongoDB Connection**: Support for auth credentials
- **Git Operations**: Read-only operations
- **File Access**: Restricted to project directory
- **AI Prompts**: No sensitive data in prompts

## Testing Strategy

```
Unit Tests
    ├── ASTAnalyzer (code parsing)
    ├── RouteReflector (route extraction)
    ├── DocumentationBuilder (combining)
    └── Utility functions

Integration Tests
    ├── Full scan pipeline
    ├── MongoDB operations
    └── CLI commands

End-to-End Tests
    ├── Complete workflow
    ├── CI/CD validation
    └── Real API examples
```
