import mongoose from 'mongoose';

/**
 * Schema for storing API parameter information
 * Captures details about request parameters, query params, and path params
 */
const ParameterSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  in: { 
    type: String, 
    enum: ['query', 'path', 'body', 'header'], 
    required: true 
  },
  type: { 
    type: String, 
    required: true 
  },
  required: { 
    type: Boolean, 
    default: false 
  },
  description: String,
  example: mongoose.Schema.Types.Mixed,
  schema: mongoose.Schema.Types.Mixed
}, { _id: false });

/**
 * Schema for request/response structure
 * Stores JSON schema representation of data structures
 */
const SchemaDefinitionSchema = new mongoose.Schema({
  type: String,
  properties: mongoose.Schema.Types.Mixed,
  required: [String],
  example: mongoose.Schema.Types.Mixed,
  schemaFile: String // Reference to filesystem schema file
}, { _id: false });

/**
 * Main API Documentation Model
 * Stores comprehensive documentation for each API endpoint
 * Includes versioning, git tracking, and AI-enhanced descriptions
 */
const ApiDocumentationSchema = new mongoose.Schema({
  // Core endpoint identification
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    uppercase: true
  },
  path: {
    type: String,
    required: true
  },
  
  // Versioning information
  version: {
    type: String,
    required: true,
    default: '1.0.0'
  },
  apiVersion: {
    type: String, // e.g., 'v1', 'v2'
    default: 'v1'
  },
  
  // Code-level tracking
  handlerName: String,
  controllerFile: String,
  controllerFunction: String,
  
  // Middleware chain
  middleware: [String],
  
  // Documentation content
  summary: String,
  description: String,
  tags: [String],
  
  // Parameters
  parameters: [ParameterSchema],
  
  // Request/Response schemas
  requestSchema: SchemaDefinitionSchema,
  responseSchema: SchemaDefinitionSchema,
  errorSchemas: [SchemaDefinitionSchema],
  
  // Status codes
  statusCodes: [{
    code: Number,
    description: String,
    schema: mongoose.Schema.Types.Mixed
  }],
  
  // Examples (AI-enhanced)
  examples: {
    request: mongoose.Schema.Types.Mixed,
    response: mongoose.Schema.Types.Mixed,
    errors: [mongoose.Schema.Types.Mixed]
  },
  
  // Edge cases and validation (AI-detected)
  edgeCases: [String],
  validationRules: [String],
  
  // Breaking changes tracking
  breakingChange: {
    type: Boolean,
    default: false
  },
  breakingChangeDescription: String,
  
  // Git integration
  gitCommitHash: String,
  gitBranch: String,
  gitTag: String,
  
  // Metadata
  deprecated: {
    type: Boolean,
    default: false
  },
  deprecationNote: String,
  
  // AI enhancement tracking
  aiEnhanced: {
    type: Boolean,
    default: false
  },
  aiEnhancementDate: Date,
  
  // Validation status
  validated: {
    type: Boolean,
    default: false
  },
  validationErrors: [String],
  lastValidated: Date,
  
  // Timestamps
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'api_documentation'
});

// Compound index for version queries
ApiDocumentationSchema.index({ method: 1, path: 1, version: 1 }, { unique: true });
ApiDocumentationSchema.index({ apiVersion: 1 });
ApiDocumentationSchema.index({ gitCommitHash: 1 });
ApiDocumentationSchema.index({ deprecated: 1 });

/**
 * Find the latest version of an endpoint
 */
ApiDocumentationSchema.statics.findLatestVersion = async function(method, path) {
  return this.findOne({ method, path })
    .sort({ version: -1 })
    .exec();
};

/**
 * Find all endpoints for a specific API version
 */
ApiDocumentationSchema.statics.findByApiVersion = async function(apiVersion) {
  return this.find({ apiVersion, deprecated: false })
    .sort({ path: 1, method: 1 })
    .exec();
};

/**
 * Find breaking changes between versions
 */
ApiDocumentationSchema.statics.findBreakingChanges = async function(fromVersion, toVersion) {
  return this.find({
    version: { $gte: fromVersion, $lte: toVersion },
    breakingChange: true
  }).exec();
};

const ApiDocumentation = mongoose.model('ApiDocumentation', ApiDocumentationSchema);

export default ApiDocumentation;
