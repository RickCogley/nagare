#!/usr/bin/env deno run --allow-read --allow-write

/**
 * Documentation enhancement script for Nagare
 *
 * This script runs after `deno doc` to enhance the generated documentation with:
 * - Custom CSS for better styling
 * - Additional navigation
 * - Quick links to important sections
 */

import { ensureDir } from "https://deno.land/std@0.208.0/fs/ensure_dir.ts";
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";

const DOCS_DIR = "./docs";

const CUSTOM_HEADER = `
<div class="quick-links">
  <h3>Quick Navigation</h3>
  <ul>
    <li><a href="#quick-start">🚀 Quick Start</a></li>
    <li><a href="#architecture-overview">🏗️ Architecture</a></li>
    <li><a href="#intelligent-file-handlers">🤖 File Handlers</a></li>
    <li><a href="#conventional-commits">📝 Commit Conventions</a></li>
    <li><a href="#troubleshooting-guide">🔧 Troubleshooting</a></li>
    <li><a href="#common-configuration-patterns">⚙️ Configuration Patterns</a></li>
  </ul>
</div>
`;

const NAGARE_CUSTOM_CSS = `/* Nagare Documentation Custom Styles */

/* Fix transparent navbar */
#topnav {
  background-color: rgb(249 250 251);
  border-bottom: 1px solid rgb(229 231 235);
}

/* Dark mode navbar */
.dark #topnav {
  background-color: rgb(31 41 55);
  border-bottom: 1px solid rgb(55 65 81);
}

/* Ensure navbar stays on top when scrolling */
#topnav {
  position: sticky;
  top: 0;
  z-index: 50;
}

/* Remove extra border after "Advanced Usage" heading */
#advanced-usage + div + div.border-b {
  display: none;
}

/* Better spacing for document navigation */
.documentNavigation ul {
  margin-left: 1rem;
}

.documentNavigation > ul > li {
  margin-top: 0.5rem;
}

/* Make example headers more prominent */
.example-header {
  font-size: 1.1rem;
  font-weight: 600;
  color: #4a5568;
}

.dark .example-header {
  color: #e2e8f0;
}`;

async function enhanceDocs() {
  console.log("🎨 Enhancing Nagare documentation...");

  // Ensure docs directory exists
  await ensureDir(DOCS_DIR);

  // 1. Add custom CSS
  const cssPath = join(DOCS_DIR, "nagare-custom.css");
  await Deno.writeTextFile(cssPath, NAGARE_CUSTOM_CSS);
  console.log("✅ Created custom CSS");

  // 2. Enhance index.html
  const indexPath = join(DOCS_DIR, "index.html");
  try {
    let indexContent = await Deno.readTextFile(indexPath);

    // Add custom CSS link
    if (!indexContent.includes("nagare-custom.css")) {
      indexContent = indexContent.replace(
        "</head>",
        '  <link rel="stylesheet" href="nagare-custom.css">\n</head>',
      );
    }

    // Add custom header after main content starts
    if (!indexContent.includes("quick-links")) {
      indexContent = indexContent.replace(
        "<main><section>",
        `<main><section>${CUSTOM_HEADER}`,
      );
    }

    // Remove extra borders after certain headings
    indexContent = indexContent.replace(
      /<h2 id="advanced-usage">\s*Advanced Usage<\/h2>\s*<\/div><\/div>\s*<\/div>\s*<div class="border-b[^"]*"><\/div>/g,
      '<h2 id="advanced-usage">Advanced Usage</h2></div></div></div>',
    );

    await Deno.writeTextFile(indexPath, indexContent);
    console.log("✅ Enhanced index.html");
  } catch (error) {
    console.error("❌ Failed to enhance index.html:", error);
  }

  // 3. Create a custom landing content file
  const landingContent = `
<div class="feature-grid">
  <div class="feature-card">
    <h3>🚀 Automated Releases</h3>
    <p>Version calculation based on conventional commits with zero configuration needed.</p>
  </div>
  <div class="feature-card">
    <h3>🤖 Intelligent File Handlers</h3>
    <p>Automatically detects and updates deno.json, package.json, README.md, and more.</p>
  </div>
  <div class="feature-card">
    <h3>📝 Changelog Generation</h3>
    <p>Creates beautiful changelogs following the Keep a Changelog format.</p>
  </div>
  <div class="feature-card">
    <h3>🔄 Safe Rollbacks</h3>
    <p>Easily rollback releases with automatic git tag and file restoration.</p>
  </div>
</div>
`;

  const landingPath = join(DOCS_DIR, "landing-content.html");
  await Deno.writeTextFile(landingPath, landingContent);
  console.log("✅ Created landing content");

  console.log("\n✨ Documentation enhancement complete!");
  console.log(`📁 Enhanced docs available in: ${DOCS_DIR}`);
}

// Run the enhancement
if (import.meta.main) {
  await enhanceDocs();
}
