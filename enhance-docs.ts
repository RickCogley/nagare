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
const CUSTOM_CSS = `
/* Custom Nagare Documentation Styles */

/* Enhanced header styling */
#topnav {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem 2rem;
}

#topnav .breadcrumbs {
  color: white;
  font-weight: 600;
}

/* Better typography */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.6;
}

/* Enhanced code blocks */
pre[class*="language-"] {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin: 1.5rem 0;
}

/* Better example styling */
.example-caption {
  font-weight: 600;
  color: #667eea;
  margin-bottom: 0.5rem;
}

/* Architecture diagram styling */
pre:has(.architecture-diagram) {
  background: #f7f7f7;
  border: 2px solid #e1e1e1;
  font-size: 0.9rem;
}

/* Quick links section */
.quick-links {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 2rem 0;
}

.quick-links h3 {
  color: #667eea;
  margin-top: 0;
}

.quick-links ul {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
}

.quick-links a {
  color: #4a5568;
  text-decoration: none;
  padding: 0.5rem;
  border-radius: 4px;
  display: block;
  transition: all 0.2s;
}

.quick-links a:hover {
  background: #667eea;
  color: white;
}

/* Feature cards */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.feature-card {
  background: white;
  border: 1px solid #e1e1e1;
  border-radius: 8px;
  padding: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Improved table styling */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 1.5rem 0;
}

table th {
  background: #667eea;
  color: white;
  padding: 0.75rem;
  text-align: left;
}

table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e1e1e1;
}

/* Better symbol navigation */
.topSymbols {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1rem;
}

.topSymbols h3 {
  color: #667eea;
  margin-top: 0;
}

/* Responsive improvements */
@media (max-width: 768px) {
  .quick-links ul {
    grid-template-columns: 1fr;
  }
  
  .feature-grid {
    grid-template-columns: 1fr;
  }
}
`;

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

async function enhanceDocs() {
  console.log("🎨 Enhancing Nagare documentation...");

  // Ensure docs directory exists
  await ensureDir(DOCS_DIR);

  // 1. Add custom CSS
  const cssPath = join(DOCS_DIR, "nagare-custom.css");
  await Deno.writeTextFile(cssPath, CUSTOM_CSS);
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
