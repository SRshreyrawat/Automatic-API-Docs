import simpleGit from 'simple-git';
import semver from 'semver';
import VersionHistory from '../../models/VersionHistory.js';

/**
 * Git Version Manager
 * Integrates with Git to track API versions using branches and tags
 * Handles commit hash tracking and git operations
 */
class GitVersionManager {
  constructor(repoPath = process.cwd()) {
    this.git = simpleGit(repoPath);
    this.repoPath = repoPath;
  }

  /**
   * Get current git commit hash
   * @returns {string} Commit hash
   */
  async getCurrentCommitHash() {
    try {
      const log = await this.git.log(['-1']);
      return log.latest?.hash || null;
    } catch (error) {
      console.error('Error getting commit hash:', error.message);
      return null;
    }
  }

  /**
   * Get current branch name
   * @returns {string} Branch name
   */
  async getCurrentBranch() {
    try {
      const branch = await this.git.branchLocal();
      return branch.current;
    } catch (error) {
      console.error('Error getting current branch:', error.message);
      return 'unknown';
    }
  }

  /**
   * Get all tags
   * @returns {Array} Array of tag names
   */
  async getTags() {
    try {
      const tags = await this.git.tags();
      return tags.all || [];
    } catch (error) {
      console.error('Error getting tags:', error.message);
      return [];
    }
  }

  /**
   * Get latest tag
   * @returns {string|null} Latest tag name
   */
  async getLatestTag() {
    try {
      const tags = await this.getTags();
      if (tags.length === 0) return null;
      
      // Filter version tags and sort
      const versionTags = tags
        .filter(tag => tag.match(/^v?\d+\.\d+\.\d+$/))
        .sort((a, b) => semver.rcompare(a.replace(/^v/, ''), b.replace(/^v/, '')));
      
      return versionTags[0] || null;
    } catch (error) {
      console.error('Error getting latest tag:', error.message);
      return null;
    }
  }

  /**
   * Create a new tag
   * @param {string} tagName - Tag name
   * @param {string} message - Tag message
   */
  async createTag(tagName, message = '') {
    try {
      await this.git.addAnnotatedTag(tagName, message);
      console.log(`✓ Created tag: ${tagName}`);
    } catch (error) {
      console.error('Error creating tag:', error.message);
      throw error;
    }
  }

  /**
   * Get git diff between commits
   * @param {string} fromCommit - From commit hash
   * @param {string} toCommit - To commit hash
   * @returns {string} Diff summary
   */
  async getDiffSummary(fromCommit, toCommit = 'HEAD') {
    try {
      const diff = await this.git.diff([fromCommit, toCommit]);
      return diff;
    } catch (error) {
      console.error('Error getting diff:', error.message);
      return '';
    }
  }

  /**
   * Get commit messages between commits
   * @param {string} fromCommit - From commit hash
   * @param {string} toCommit - To commit hash
   * @returns {Array} Array of commit messages
   */
  async getCommitMessages(fromCommit, toCommit = 'HEAD') {
    try {
      const log = await this.git.log({ from: fromCommit, to: toCommit });
      return log.all.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        date: commit.date,
        author: commit.author_name
      }));
    } catch (error) {
      console.error('Error getting commit messages:', error.message);
      return [];
    }
  }

  /**
   * Check if git repo is clean
   * @returns {boolean} True if clean
   */
  async isClean() {
    try {
      const status = await this.git.status();
      return status.isClean();
    } catch (error) {
      console.error('Error checking git status:', error.message);
      return false;
    }
  }

  /**
   * Get repository status
   * @returns {Object} Status object
   */
  async getStatus() {
    try {
      return await this.git.status();
    } catch (error) {
      console.error('Error getting status:', error.message);
      return null;
    }
  }
}

/**
 * Semantic Version Manager
 * Handles automatic version bumping based on API changes
 * Detects breaking changes, new endpoints, and patches
 */
class SemanticVersionManager {
  constructor() {
    this.gitManager = new GitVersionManager();
  }

  /**
   * Determine version bump type based on changes
   * @param {Array} oldDocs - Previous documentation
   * @param {Array} newDocs - New documentation
   * @returns {Object} Bump analysis
   */
  analyzeChanges(oldDocs, newDocs) {
    const analysis = {
      bumpType: 'patch', // default
      bumpReason: '',
      changes: {
        breakingChanges: [],
        newEndpoints: [],
        modifiedEndpoints: [],
        deprecatedEndpoints: [],
        internalChanges: []
      }
    };

    // Create maps for easier comparison
    const oldMap = new Map(
      oldDocs.map(doc => [`${doc.method}:${doc.path}`, doc])
    );
    const newMap = new Map(
      newDocs.map(doc => [`${doc.method}:${doc.path}`, doc])
    );

    // Check for new endpoints
    for (const [key, newDoc] of newMap) {
      if (!oldMap.has(key)) {
        analysis.changes.newEndpoints.push(`${newDoc.method} ${newDoc.path}`);
      }
    }

    // Check for removed/deprecated endpoints (breaking change)
    for (const [key, oldDoc] of oldMap) {
      if (!newMap.has(key)) {
        analysis.changes.deprecatedEndpoints.push(`${oldDoc.method} ${oldDoc.path}`);
        analysis.changes.breakingChanges.push(
          `Removed endpoint: ${oldDoc.method} ${oldDoc.path}`
        );
      }
    }

    // Check for modified endpoints
    for (const [key, newDoc] of newMap) {
      const oldDoc = oldMap.get(key);
      if (oldDoc) {
        const modifications = this._detectModifications(oldDoc, newDoc);
        if (modifications.hasBreakingChanges) {
          analysis.changes.breakingChanges.push(...modifications.breakingChanges);
        }
        if (modifications.hasChanges) {
          analysis.changes.modifiedEndpoints.push(`${newDoc.method} ${newDoc.path}`);
        }
        if (modifications.hasInternalChanges) {
          analysis.changes.internalChanges.push(`${newDoc.method} ${newDoc.path}`);
        }
      }
    }

    // Determine bump type
    if (analysis.changes.breakingChanges.length > 0) {
      analysis.bumpType = 'major';
      analysis.bumpReason = `Breaking changes detected: ${analysis.changes.breakingChanges.length} breaking change(s)`;
    } else if (analysis.changes.newEndpoints.length > 0) {
      analysis.bumpType = 'minor';
      analysis.bumpReason = `New features: ${analysis.changes.newEndpoints.length} new endpoint(s)`;
    } else if (analysis.changes.modifiedEndpoints.length > 0 || 
               analysis.changes.internalChanges.length > 0) {
      analysis.bumpType = 'patch';
      analysis.bumpReason = 'Internal changes and improvements';
    }

    return analysis;
  }

  /**
   * Detect modifications between old and new endpoint documentation
   * @param {Object} oldDoc - Old documentation
   * @param {Object} newDoc - New documentation
   * @returns {Object} Modification analysis
   * @private
   */
  _detectModifications(oldDoc, newDoc) {
    const result = {
      hasChanges: false,
      hasBreakingChanges: false,
      hasInternalChanges: false,
      breakingChanges: []
    };

    // Check for required parameter changes (breaking)
    const oldRequiredParams = new Set(
      oldDoc.parameters.filter(p => p.required).map(p => p.name)
    );
    const newRequiredParams = new Set(
      newDoc.parameters.filter(p => p.required).map(p => p.name)
    );

    // New required parameters = breaking change
    for (const param of newRequiredParams) {
      if (!oldRequiredParams.has(param)) {
        result.hasBreakingChanges = true;
        result.breakingChanges.push(
          `${newDoc.method} ${newDoc.path}: New required parameter '${param}'`
        );
      }
    }

    // Check for response structure changes (breaking)
    if (this._hasResponseSchemaChanged(oldDoc.responseSchema, newDoc.responseSchema)) {
      result.hasBreakingChanges = true;
      result.breakingChanges.push(
        `${newDoc.method} ${newDoc.path}: Response schema changed`
      );
    }

    // Check for status code changes (potentially breaking)
    const oldCodes = new Set(oldDoc.statusCodes || []);
    const newCodes = new Set(newDoc.statusCodes || []);
    const removedCodes = [...oldCodes].filter(code => !newCodes.has(code));
    
    if (removedCodes.length > 0) {
      result.hasBreakingChanges = true;
      result.breakingChanges.push(
        `${newDoc.method} ${newDoc.path}: Removed status codes: ${removedCodes.join(', ')}`
      );
    }

    // Check if explicitly marked as breaking
    if (newDoc.breakingChange) {
      result.hasBreakingChanges = true;
      result.breakingChanges.push(
        `${newDoc.method} ${newDoc.path}: ${newDoc.breakingChangeDescription || 'Marked as breaking change'}`
      );
    }

    // Check for non-breaking changes
    const oldParamCount = oldDoc.parameters.length;
    const newParamCount = newDoc.parameters.length;
    
    if (newParamCount !== oldParamCount && !result.hasBreakingChanges) {
      result.hasChanges = true;
    }

    // Check for middleware changes (internal)
    if (JSON.stringify(oldDoc.middleware) !== JSON.stringify(newDoc.middleware)) {
      result.hasInternalChanges = true;
    }

    return result;
  }

  /**
   * Check if response schema has breaking changes
   * @param {Object} oldSchema - Old schema
   * @param {Object} newSchema - New schema
   * @returns {boolean} True if changed
   * @private
   */
  _hasResponseSchemaChanged(oldSchema, newSchema) {
    if (!oldSchema && !newSchema) return false;
    if (!oldSchema || !newSchema) return true;

    // Simple comparison - in production, this would be more sophisticated
    const oldProps = oldSchema.properties ? Object.keys(oldSchema.properties) : [];
    const newProps = newSchema.properties ? Object.keys(newSchema.properties) : [];

    // Removed properties = breaking change
    for (const prop of oldProps) {
      if (!newProps.includes(prop)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Bump version based on type
   * @param {string} currentVersion - Current version
   * @param {string} bumpType - 'major', 'minor', or 'patch'
   * @returns {string} New version
   */
  bumpVersion(currentVersion, bumpType) {
    const cleanVersion = currentVersion.replace(/^v/, '');
    const newVersion = semver.inc(cleanVersion, bumpType);
    return newVersion;
  }

  /**
   * Get current version from database or git
   * @returns {string} Current version
   */
  async getCurrentVersion() {
    try {
      // Try to get from database
      const latestVersionDoc = await VersionHistory.getLatest();
      if (latestVersionDoc) {
        return latestVersionDoc.version;
      }

      // Fall back to git tags
      const latestTag = await this.gitManager.getLatestTag();
      if (latestTag) {
        return latestTag.replace(/^v/, '');
      }

      // Default to 1.0.0
      return '1.0.0';
    } catch (error) {
      console.error('Error getting current version:', error.message);
      return '1.0.0';
    }
  }

  /**
   * Create version history record
   * @param {Object} versionData - Version data
   * @returns {Object} Created version history
   */
  async createVersionHistory(versionData) {
    try {
      const gitCommit = await this.gitManager.getCurrentCommitHash();
      const gitBranch = await this.gitManager.getCurrentBranch();

      const versionParts = semver.parse(versionData.version);

      const versionHistory = new VersionHistory({
        version: versionData.version,
        apiVersion: versionData.apiVersion || `v${versionParts.major}`,
        major: versionParts.major,
        minor: versionParts.minor,
        patch: versionParts.patch,
        bumpType: versionData.bumpType,
        bumpReason: versionData.bumpReason,
        changes: versionData.changes,
        gitCommitHash: gitCommit,
        gitBranch: gitBranch,
        gitTag: versionData.gitTag || null,
        totalEndpoints: versionData.totalEndpoints || 0,
        endpointsAdded: versionData.changes.newEndpoints?.length || 0,
        endpointsModified: versionData.changes.modifiedEndpoints?.length || 0,
        endpointsRemoved: versionData.changes.deprecatedEndpoints?.length || 0,
        previousVersion: versionData.previousVersion,
        releaseNotes: versionData.releaseNotes || ''
      });

      return await versionHistory.save();
    } catch (error) {
      console.error('Error creating version history:', error.message);
      throw error;
    }
  }

  /**
   * Generate changelog between versions
   * @param {string} fromVersion - From version
   * @param {string} toVersion - To version
   * @returns {Object} Changelog
   */
  async generateChangelog(fromVersion, toVersion) {
    try {
      const versions = await VersionHistory.getChangelog(fromVersion, toVersion);
      
      return {
        fromVersion,
        toVersion,
        versions: versions.map(v => ({
          version: v.version,
          date: v.releaseDate,
          type: v.bumpType,
          reason: v.bumpReason,
          changes: v.changes
        }))
      };
    } catch (error) {
      console.error('Error generating changelog:', error.message);
      return null;
    }
  }
}

export { GitVersionManager, SemanticVersionManager };
