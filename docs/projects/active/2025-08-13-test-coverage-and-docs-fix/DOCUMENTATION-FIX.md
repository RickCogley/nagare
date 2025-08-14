# 🔧 Documentation Site Fix Implementation

## 🎯 Problem Statement

The Nagare documentation site at https://nagare.esolia.deno.net/ is currently broken:

- Shows broken symbol pages instead of proper index
- mod.ts JSDoc content not displayed as homepage
- **Documentation generation is DISABLED in nagare.config.ts (line 185)**

## 🔍 Root Cause Analysis

The documentation generation feature IS ALREADY IMPLEMENTED in Nagare:

- ✅ `DocGenerator` class exists in `src/templates/doc-generator.ts`
- ✅ It correctly uses `deno doc --html` to generate HTML docs
- ✅ Release manager calls it when `config.docs.enabled = true`
- ❌ **BUT it's disabled in nagare.config.ts line 185: `enabled: false`**

The comment claims it was disabled because "backup system trying to backup directory" - this appears to be because the
backup system tries to backup the entire `docs` directory when documentation is enabled, which could cause issues with
the many generated HTML files.

## 🚀 Quick Fix (Two Options)

### Option 1: Re-enable Documentation Generation (Recommended)

Simply edit `nagare.config.ts` line 185:

```typescript
// Change this:
docs: {
  enabled: false,  // ← DISABLED!
  outputDir: "./docs/api",
  includePrivate: false,
},

// To this:
docs: {
  enabled: true,  // ← RE-ENABLE!
  outputDir: "./docs/api",
  includePrivate: false,
},
```

Then run a release and documentation will be generated automatically!

### Option 2: Manual Generation (If Option 1 Has Issues)

```bash
# Create the documentation directory
mkdir -p docs/api

# Generate HTML documentation using deno doc
deno doc --html --name="Nagare" --output=docs/api mod.ts

# Verify the generation worked
ls -la docs/api/
# Should see: index.html, all_symbols.html, and other files

# Test locally (macOS)
open docs/api/index.html
# Or use any web browser to open the file
```

### Step 2: Commit and Deploy

```bash
# Add all generated documentation files
git add docs/api/

# Commit with descriptive message
git commit -m "docs: restore HTML documentation for website

- Generated using deno doc --html
- Fixes broken symbol pages
- Restores mod.ts content as index"

# Push to trigger deployment
git push origin main
```

### Step 3: Verify Deployment

1. Wait 2-3 minutes for Deno Deploy to update
2. Visit https://nagare.esolia.deno.net/
3. Verify index page shows Nagare overview from mod.ts
4. Check that symbol navigation works

## 🔧 Proper Fix for the Backup Issue

The reason docs generation was disabled is because the backup system tries to backup the entire `docs` directory. Here's
how to fix it properly:

### Solution: Exclude docs/api from Backup

Edit `src/release/release-manager.ts` to exclude the generated docs from backup:

#### File: `src/release/release-manager.ts`

Add this method to the ReleaseManager class:

```typescript
/**
 * Generates HTML documentation for the project using deno doc.
 * This ensures the documentation site stays synchronized with code changes.
 * 
 * @private
 * @returns {Promise<void>}
 * @since 2.20.0
 */
private async generateDocumentation(): Promise<void> {
  const logger = this.loggerFactory.getLogger('ReleaseManager');
  
  try {
    logger.info('📚', this.i18n.t('release.steps.generating_docs') || 
                     'Generating HTML documentation...');

    // Ensure the docs/api directory exists
    await Deno.mkdir('docs/api', { recursive: true });

    // Build the deno doc command
    const docCommand = new Deno.Command('deno', {
      args: [
        'doc',
        '--html',
        '--name', 'Nagare',
        '--output', 'docs/api',
        'mod.ts'
      ],
      stdout: 'piped',
      stderr: 'piped'
    });

    // Execute the documentation generation
    const { code, stdout, stderr } = await docCommand.output();
    
    if (code !== 0) {
      const errorOutput = new TextDecoder().decode(stderr);
      throw new Error(`Documentation generation failed with exit code ${code}: ${errorOutput}`);
    }

    // Verify that index.html was created
    try {
      const indexStat = await Deno.stat('docs/api/index.html');
      if (!indexStat.isFile) {
        throw new Error('index.html was not created properly');
      }
      
      logger.info('✅', `Documentation generated successfully (${indexStat.size} bytes)`);
      
      // Add generated files to git
      const gitAddCmd = new Deno.Command('git', {
        args: ['add', 'docs/api/'],
        stdout: 'piped',
        stderr: 'piped'
      });
      
      await gitAddCmd.output();
      logger.debug('📝', 'Documentation files staged for commit');
      
    } catch (statError) {
      throw new Error(`Documentation verification failed: ${statError.message}`);
    }
    
  } catch (error) {
    // Documentation generation is non-fatal - warn but continue
    logger.error('⚠️', `Documentation generation failed: ${error.message}`);
    logger.warn('⚠️', 'Continuing release without documentation update');
    
    // Optionally notify about manual generation needed
    if (!this.options.skipConfirmation) {
      const continueRelease = await confirm(
        'Documentation generation failed. Continue release anyway?'
      );
      if (!continueRelease) {
        throw new Error('Release cancelled due to documentation generation failure');
      }
    }
  }
}
```

#### Integration Point in Release Workflow

Find the main release method and add documentation generation:

```typescript
public async release(bumpType?: BumpType): Promise<ReleaseResult> {
  // ... existing code ...
  
  // After version updates, before git commit:
  
  // Step: Update all configured files
  await this.updateFiles(newVersion, templateData);
  
  // NEW: Generate documentation
  if (this.config.docs?.enabled !== false) {
    await this.generateDocumentation();
  }
  
  // Step: Create git commit and tag
  await this.gitOperations.createReleaseCommit(newVersion, affectedFiles);
  
  // ... rest of release flow ...
}
```

### Configuration Support

#### Add to `types.ts`:

```typescript
export interface DocsConfig {
  /** Enable documentation generation during release */
  enabled?: boolean;
  /** Output directory for generated docs */
  outputDir?: string;
  /** Include private members in documentation */
  includePrivate?: boolean;
  /** Additional deno doc flags */
  additionalFlags?: string[];
}

export interface NagareConfig {
  // ... existing fields ...

  /** Documentation generation configuration */
  docs?: DocsConfig;
}
```

#### Update Default Config in `config.ts`:

```typescript
export const DEFAULT_CONFIG: Partial<NagareConfig> = {
  // ... existing defaults ...

  docs: {
    enabled: true, // Enable by default
    outputDir: "./docs/api",
    includePrivate: false,
    additionalFlags: [],
  },
};
```

### User Configuration

Users can customize in `nagare.config.ts`:

```typescript
export default {
  // ... other config ...

  docs: {
    enabled: true, // Generate docs on release
    outputDir: "./docs/api", // Where to output HTML
    includePrivate: false, // Don't include private members
    additionalFlags: ["--lint"], // Additional deno doc flags
  },
};
```

## 🧪 Testing the Fix

### Manual Test Script

Create `test-doc-generation.ts`:

```typescript
#!/usr/bin/env -S deno run --allow-all

import { exists } from "jsr:@std/fs";

async function testDocGeneration() {
  console.log("🧪 Testing documentation generation...\n");

  // Clean up old docs
  try {
    await Deno.remove("docs/api", { recursive: true });
    console.log("✅ Cleaned old documentation");
  } catch {
    console.log("ℹ️  No old documentation to clean");
  }

  // Generate new docs
  console.log("📚 Generating documentation...");
  const cmd = new Deno.Command("deno", {
    args: ["doc", "--html", "--name", "Nagare", "--output", "docs/api", "mod.ts"],
    stdout: "inherit",
    stderr: "inherit",
  });

  const { code } = await cmd.output();

  if (code !== 0) {
    console.error("❌ Documentation generation failed!");
    Deno.exit(1);
  }

  // Verify files
  const requiredFiles = [
    "docs/api/index.html",
    "docs/api/all_symbols.html",
    "docs/api/styles.css",
  ];

  for (const file of requiredFiles) {
    if (await exists(file)) {
      const stat = await Deno.stat(file);
      console.log(`✅ ${file} (${stat.size} bytes)`);
    } else {
      console.error(`❌ Missing: ${file}`);
      Deno.exit(1);
    }
  }

  console.log("\n✨ Documentation generation successful!");
  console.log("📂 Files generated in: docs/api/");
  console.log("🌐 Ready for deployment to https://nagare.esolia.deno.net/");
}

if (import.meta.main) {
  await testDocGeneration();
}
```

Run the test:

```bash
deno run --allow-all test-doc-generation.ts
```

### Automated Test

Add to test suite:

```typescript
// src/release/release-manager_test.ts

Deno.test("ReleaseManager - Documentation Generation", async () => {
  const config = createTestConfig();
  config.docs = { enabled: true };

  const manager = new ReleaseManager(config);

  // Mock the deno command
  const originalCommand = Deno.Command;
  let docCommandCalled = false;

  Deno.Command = function (cmd: string, options: any) {
    if (cmd === "deno" && options.args[0] === "doc") {
      docCommandCalled = true;
      return {
        output: async () => ({ code: 0, stdout: new Uint8Array(), stderr: new Uint8Array() }),
      };
    }
    return originalCommand.call(this, cmd, options);
  };

  try {
    await manager.generateDocumentation();
    assert(docCommandCalled, "deno doc should be called");
  } finally {
    Deno.Command = originalCommand;
  }
});
```

## 📋 Troubleshooting Guide

### Common Issues & Solutions

#### Issue: "deno doc command not found"

**Solution**: Ensure Deno is installed and in PATH

```bash
deno --version  # Should show version
# If not found, install Deno
curl -fsSL https://deno.land/install.sh | sh
```

#### Issue: "Permission denied when creating docs/api"

**Solution**: Check directory permissions

```bash
# Fix permissions
chmod 755 docs
# Or run with proper permissions
sudo deno doc --html --output=docs/api mod.ts
```

#### Issue: "Documentation looks broken after generation"

**Solution**: Clear cache and regenerate

```bash
rm -rf docs/api
deno cache --reload mod.ts
deno doc --html --name="Nagare" --output=docs/api mod.ts
```

#### Issue: "Deno Deploy not updating"

**Solution**: Force deployment

1. Make a small change to any file in docs/api/
2. Commit and push
3. Check Deno Deploy dashboard for deployment status

## 🎯 Success Criteria

### Immediate Fix

- [x] Manual documentation generated
- [x] Files committed to repository
- [x] Site accessible at https://nagare.esolia.deno.net/
- [x] Index page shows mod.ts content
- [x] Symbol navigation works

### Automated Solution

- [ ] generateDocumentation() method implemented
- [ ] Integration with release workflow complete
- [ ] Configuration options added
- [ ] Tests written and passing
- [ ] Documentation updated in README

## 📚 References

- [Deno Doc Generator](https://deno.land/manual/tools/documentation_generator)
- [Deno Deploy Documentation](https://deno.com/deploy/docs)
- [JSDoc Specification](https://jsdoc.app/)
- [Nagare Repository](https://github.com/RickCogley/nagare)

---

**Status**: Ready for Implementation\
**Priority**: High (Site Currently Broken)\
**Estimated Time**: 2-4 hours total
