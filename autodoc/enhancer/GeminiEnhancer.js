import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Gemini AI Enhancement Service
 * Uses Google Gemini API to enhance API documentation with:
 * - Human-readable descriptions
 * - Request/response examples
 * - Edge case detection
 * - Validation rules suggestions
 */
class GeminiEnhancer {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    
    if (!this.apiKey) {
      console.warn('⚠️  Gemini API key not found. AI enhancement will be disabled.');
      this.enabled = false;
      return;
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-pro' 
    });
    this.enabled = true;
    this.maxRetries = 3;
    this.retryDelay = 1000; // ms
  }

  /**
   * Enhance a single endpoint documentation
   * @param {Object} doc - Documentation object
   * @returns {Object} Enhanced documentation
   */
  async enhanceEndpoint(doc) {
    if (!this.enabled) {
      console.log(`⊘ AI enhancement disabled for ${doc.method} ${doc.path}`);
      return doc;
    }

    console.log(`🤖 Enhancing ${doc.method} ${doc.path}...`);

    try {
      const enhanced = { ...doc };

      // Generate description
      if (!doc.description || doc.description.trim() === '') {
        enhanced.description = await this._generateDescription(doc);
      }

      // Generate request example
      if (doc.parameters.length > 0 && !doc.examples.request) {
        enhanced.examples.request = await this._generateRequestExample(doc);
      }

      // Generate response example (if we don't have one)
      if (!doc.examples.response || Object.keys(doc.examples.response).length === 0) {
        enhanced.examples.response = await this._generateResponseExample(doc);
      }

      // Detect edge cases
      enhanced.edgeCases = await this._detectEdgeCases(doc);

      // Generate validation rules
      enhanced.validationRules = await this._generateValidationRules(doc);

      // Mark as AI-enhanced
      enhanced.aiEnhanced = true;
      enhanced.aiEnhancementDate = new Date();

      console.log(`  ✓ Enhanced ${doc.method} ${doc.path}`);
      return enhanced;

    } catch (error) {
      console.error(`  ✗ Error enhancing ${doc.method} ${doc.path}:`, error.message);
      return { 
        ...doc, 
        aiEnhanced: false,
        aiEnhancementError: error.message 
      };
    }
  }

  /**
   * Enhance multiple endpoints in batch
   * @param {Array} docs - Array of documentation objects
   * @param {Object} options - Options
   * @returns {Array} Enhanced documentation array
   */
  async enhanceBatch(docs, options = {}) {
    const { concurrency = 3, skipExisting = false } = options;
    
    console.log(`🤖 Enhancing ${docs.length} endpoints (concurrency: ${concurrency})...`);
    
    const results = [];
    
    // Process in batches to avoid rate limiting
    for (let i = 0; i < docs.length; i += concurrency) {
      const batch = docs.slice(i, i + concurrency);
      
      const batchResults = await Promise.allSettled(
        batch.map(doc => {
          if (skipExisting && doc.aiEnhanced) {
            return Promise.resolve(doc);
          }
          return this.enhanceEndpoint(doc);
        })
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`  ✗ Failed to enhance endpoint ${i + index}:`, result.reason);
          results.push(batch[index]); // Keep original on failure
        }
      });

      // Small delay between batches
      if (i + concurrency < docs.length) {
        await this._delay(500);
      }
    }

    console.log(`  ✓ Enhanced ${results.filter(r => r.aiEnhanced).length}/${docs.length} endpoints`);
    return results;
  }

  /**
   * Generate endpoint description using AI
   * @param {Object} doc - Documentation object
   * @returns {string} Generated description
   * @private
   */
  async _generateDescription(doc) {
    const prompt = this._buildDescriptionPrompt(doc);
    const response = await this._callGeminiWithRetry(prompt);
    return response.trim();
  }

  /**
   * Generate request example using AI
   * @param {Object} doc - Documentation object
   * @returns {Object} Request example
   * @private
   */
  async _generateRequestExample(doc) {
    const prompt = this._buildRequestExamplePrompt(doc);
    const response = await this._callGeminiWithRetry(prompt);
    
    try {
      // Try to parse as JSON
      return JSON.parse(this._extractJSON(response));
    } catch (e) {
      console.warn(`  ⚠️  Failed to parse request example as JSON: ${e.message}`);
      return { _raw: response };
    }
  }

  /**
   * Generate response example using AI
   * @param {Object} doc - Documentation object
   * @returns {Object} Response example
   * @private
   */
  async _generateResponseExample(doc) {
    const prompt = this._buildResponseExamplePrompt(doc);
    const response = await this._callGeminiWithRetry(prompt);
    
    try {
      return JSON.parse(this._extractJSON(response));
    } catch (e) {
      console.warn(`  ⚠️  Failed to parse response example as JSON: ${e.message}`);
      return { _raw: response };
    }
  }

  /**
   * Detect edge cases using AI
   * @param {Object} doc - Documentation object
   * @returns {Array} Edge cases
   * @private
   */
  async _detectEdgeCases(doc) {
    const prompt = this._buildEdgeCasesPrompt(doc);
    const response = await this._callGeminiWithRetry(prompt);
    
    // Parse response into array
    return response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.match(/^[-*\d.]/))
      .map(line => line.replace(/^[-*\d.]\s*/, ''));
  }

  /**
   * Generate validation rules using AI
   * @param {Object} doc - Documentation object
   * @returns {Array} Validation rules
   * @private
   */
  async _generateValidationRules(doc) {
    const prompt = this._buildValidationPrompt(doc);
    const response = await this._callGeminiWithRetry(prompt);
    
    return response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.match(/^[-*\d.]/))
      .map(line => line.replace(/^[-*\d.]\s*/, ''));
  }

  /**
   * Build description generation prompt
   * @param {Object} doc - Documentation object
   * @returns {string} Prompt
   * @private
   */
  _buildDescriptionPrompt(doc) {
    return `You are an API documentation expert. Generate a clear, concise description for this API endpoint.

Endpoint: ${doc.method} ${doc.path}
Handler: ${doc.handlerName}
Parameters: ${JSON.stringify(doc.parameters, null, 2)}
Middleware: ${doc.middleware.join(', ') || 'none'}

Provide a single paragraph description (2-3 sentences) that explains:
1. What this endpoint does
2. Its primary purpose
3. Any important notes

Description:`;
  }

  /**
   * Build request example prompt
   * @param {Object} doc - Documentation object
   * @returns {string} Prompt
   * @private
   */
  _buildRequestExamplePrompt(doc) {
    const bodyParams = doc.parameters.filter(p => p.in === 'body');
    const queryParams = doc.parameters.filter(p => p.in === 'query');
    const pathParams = doc.parameters.filter(p => p.in === 'path');

    return `Generate a realistic example request for this API endpoint.

Endpoint: ${doc.method} ${doc.path}
Path Parameters: ${JSON.stringify(pathParams, null, 2)}
Query Parameters: ${JSON.stringify(queryParams, null, 2)}
Body Parameters: ${JSON.stringify(bodyParams, null, 2)}

Generate a complete example showing:
- Sample values for path parameters
- Sample query string
- Sample request body (if applicable)

Respond with ONLY a valid JSON object. No explanations.

Example:`;
  }

  /**
   * Build response example prompt
   * @param {Object} doc - Documentation object
   * @returns {string} Prompt
   * @private
   */
  _buildResponseExamplePrompt(doc) {
    return `Generate a realistic example response for this API endpoint.

Endpoint: ${doc.method} ${doc.path}
Expected Status Codes: ${doc.statusCodes.join(', ') || '200'}
Response Schema: ${JSON.stringify(doc.responseSchema, null, 2)}

Generate a complete success response example with realistic data.
Respond with ONLY a valid JSON object. No explanations.

Example:`;
  }

  /**
   * Build edge cases prompt
   * @param {Object} doc - Documentation object
   * @returns {string} Prompt
   * @private
   */
  _buildEdgeCasesPrompt(doc) {
    return `List potential edge cases and error scenarios for this API endpoint.

Endpoint: ${doc.method} ${doc.path}
Parameters: ${JSON.stringify(doc.parameters, null, 2)}

List 3-5 important edge cases to consider:
- Invalid inputs
- Missing required fields
- Authentication/authorization issues
- Business logic edge cases

Format as a bullet list:`;
  }

  /**
   * Build validation prompt
   * @param {Object} doc - Documentation object
   * @returns {string} Prompt
   * @private
   */
  _buildValidationPrompt(doc) {
    const requiredParams = doc.parameters.filter(p => p.required);
    
    return `List validation rules for this API endpoint.

Endpoint: ${doc.method} ${doc.path}
Required Parameters: ${JSON.stringify(requiredParams, null, 2)}
All Parameters: ${JSON.stringify(doc.parameters, null, 2)}

List 3-5 important validation rules:
- Required field checks
- Format validations
- Value range checks
- Business rule validations

Format as a bullet list:`;
  }

  /**
   * Call Gemini API with retry logic
   * @param {string} prompt - Prompt text
   * @returns {string} Response text
   * @private
   */
  async _callGeminiWithRetry(prompt) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (error) {
        lastError = error;
        console.warn(`  ⚠️  Attempt ${attempt}/${this.maxRetries} failed: ${error.message}`);
        
        if (attempt < this.maxRetries) {
          await this._delay(this.retryDelay * attempt);
        }
      }
    }

    throw new Error(`Gemini API failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Extract JSON from response text
   * @param {string} text - Response text
   * @returns {string} JSON string
   * @private
   */
  _extractJSON(text) {
    // Try to find JSON in markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Try to find JSON object directly
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    return text;
  }

  /**
   * Delay helper
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default GeminiEnhancer;
