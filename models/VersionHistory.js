import mongoose from 'mongoose';

/**
 * Version History Model
 * Tracks version changes, bumps, and changelogs
 */
const VersionHistorySchema = new mongoose.Schema({
  // Version information
  version: {
    type: String,
    required: true,
    unique: true
  },
  apiVersion: String, // e.g., 'v1', 'v2'
  
  // Semantic versioning breakdown
  major: Number,
  minor: Number,
  patch: Number,
  
  // Version bump reason
  bumpType: {
    type: String,
    enum: ['major', 'minor', 'patch'],
    required: true
  },
  bumpReason: String,
  
  // Changes in this version
  changes: {
    breakingChanges: [String],
    newEndpoints: [String],
    modifiedEndpoints: [String],
    deprecatedEndpoints: [String],
    internalChanges: [String]
  },
  
  // Git tracking
  gitCommitHash: String,
  gitBranch: String,
  gitTag: String,
  gitDiff: String, // Summary of changes
  
  // Statistics
  totalEndpoints: Number,
  endpointsAdded: Number,
  endpointsModified: Number,
  endpointsRemoved: Number,
  
  // Release metadata
  releaseDate: {
    type: Date,
    default: Date.now
  },
  releasedBy: String,
  releaseNotes: String,
  
  // Previous version reference
  previousVersion: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'version_history'
});

VersionHistorySchema.index({ version: 1 });
VersionHistorySchema.index({ releaseDate: -1 });
VersionHistorySchema.index({ gitCommitHash: 1 });

/**
 * Get the latest version
 */
VersionHistorySchema.statics.getLatest = async function() {
  return this.findOne().sort({ releaseDate: -1 }).exec();
};

/**
 * Get version changelog between two versions
 */
VersionHistorySchema.statics.getChangelog = async function(fromVersion, toVersion) {
  return this.find({
    version: { $gte: fromVersion, $lte: toVersion }
  }).sort({ releaseDate: 1 }).exec();
};

const VersionHistory = mongoose.model('VersionHistory', VersionHistorySchema);

export default VersionHistory;
