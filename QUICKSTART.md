# Quick Start Guide

Get the Auto API Documentation System running in 5 minutes!

## Prerequisites Check

```bash
# Check Node.js version (need 18+)
node --version

# Check if MongoDB is installed
mongod --version

# Check if Git is installed
git --version
```

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file
# On Windows: notepad .env
# On Mac/Linux: nano .env or vim .env
```

**Required settings in .env:**
```env
MONGODB_URI=mongodb://localhost:27017/auto-doc-system
GEMINI_API_KEY=your_gemini_api_key_here
```

**Get Gemini API Key:**
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy and paste into .env

### 3. Start MongoDB

**Windows:**
```bash
# If MongoDB is a service
net start MongoDB

# Or start manually
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "C:\data\db"
```

**Mac/Linux:**
```bash
# Start MongoDB service
sudo systemctl start mongod

# Or run manually
mongod --dbpath /path/to/data
```

### 4. Initialize Git (if needed)

```bash
git init
git add .
git commit -m "Initial commit"
```

## First Run

### Test the System

```bash
# Run tests
node tests/test-autodoc.js
```

### Scan the Example App

```bash
# Scan without AI (faster)
npm run scan -- --no-ai --save-db

# Or with AI enhancement (slower, requires API key)
npm run scan -- --save-db
```

### Build Full Documentation

```bash
# Build docs
npm run build-docs
```

**Check the output:**
```bash
# View generated docs
cat output/api-docs.json

# Or on Windows
type output\api-docs.json
```

### Validate Documentation

```bash
npm run validate
```

### Export OpenAPI

```bash
npm run export-openapi
```

**View OpenAPI spec:**
```bash
cat output/openapi.json
```

## Verify Everything Works

Run this complete workflow:

```bash
# 1. Scan
npm run scan -- --no-ai --save-db

# 2. Build
npm run build-docs -- --no-ai

# 3. Validate
npm run validate

# 4. Export
npm run export-openapi

# 5. Check version bump (dry run)
npm run version-bump -- --dry-run
```

If all commands complete successfully, you're ready to go! ✅

## Common Issues

### Issue: MongoDB connection error

**Solution:**
- Make sure MongoDB is running
- Check MONGODB_URI in .env
- Try: `mongod --dbpath ./data` to start MongoDB manually

### Issue: Gemini API error

**Solution:**
- Check GEMINI_API_KEY in .env
- Use `--no-ai` flag to skip AI enhancement
- Verify API key at https://makersuite.google.com/app/apikey

### Issue: Module not found

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Permission denied (scripts)

**Solution:**
```bash
# On Mac/Linux, make scripts executable
chmod +x scripts/*.sh

# On Windows, use Git Bash or WSL to run .sh scripts
```

## Next Steps

1. **Customize the example app** - Edit `src/routes/` and `src/controllers/`
2. **Add your schemas** - Create JSON files in `schemas/request/` and `schemas/response/`
3. **Integrate with your API** - Point CLI to your Express app: `--app /path/to/your/app.js`
4. **Setup CI/CD** - Add `bash scripts/ci-validate.sh` to your pipeline
5. **Explore AI features** - Try with `--ai` flag and review generated descriptions

## Resources

- Full documentation: [README.md](README.md)
- Example app: `src/app.js`
- CLI help: `node cli/index.js --help`
- Test suite: `tests/test-autodoc.js`

## Getting Help

Check the main README.md for:
- Detailed command usage
- Architecture overview
- Configuration options
- Best practices
- Example workflows

---

**You're all set! Happy documenting! 🚀**
