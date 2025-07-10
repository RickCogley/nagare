// docs-server.ts - Static file server for documentation on Deno Deploy
/**
 * @fileoverview Serves generated documentation as a static site on Deno Deploy
 * @description Handles routing for HTML docs, API reference, and assets
 */

import { serveDir } from "@std/http/file-server";

/**
 * Configuration for the documentation server
 */
const DOCS_CONFIG = {
  /** Base directory for documentation files */
  docsDir: "./docs",
  /** Default file to serve for directory requests */
  indexFile: "index.html",
  /** Enable directory listings */
  enableDirListing: true,
  /** CORS headers for API access */
  enableCORS: true,
  /** Custom error pages */
  errorPages: {
    404: "./docs/404.html",
    500: "./docs/500.html",
  },
  /** Path to redirect mapping file */
  redirectMapPath: "./docs/api/redirects.json",
} as const;

/**
 * Custom 404 page content
 */
const DEFAULT_404_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found - Nagare Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            text-align: center;
            background: #f8fafc;
        }
        .container {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        h1 { color: #1e293b; margin-bottom: 1rem; }
        p { color: #64748b; margin-bottom: 2rem; }
        .nav-links {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        .nav-link {
            background: #3b82f6;
            color: white;
            text-decoration: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            transition: background 0.2s;
        }
        .nav-link:hover { background: #2563eb; }
        .code {
            background: #f1f5f9;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 Page Not Found</h1>
        <p>The documentation page you're looking for doesn't exist.</p>
        
        <div class="nav-links">
            <a href="/" class="nav-link">🏠 Home</a>
            <a href="/api/" class="nav-link">📖 API Reference</a>
            <a href="/api/FAQ.html" class="nav-link">❓ FAQ</a>
            <a href="https://jsr.io/@rick/nagare" class="nav-link">📦 JSR Package</a>
            <a href="https://github.com/rick/nagare" class="nav-link">🐙 GitHub</a>
        </div>
        
        <p style="margin-top: 2rem; font-size: 0.9em;">
            Try the <span class="code">deno doc</span> generated documentation or 
            check the <a href="https://github.com/rick/nagare">GitHub repository</a>.
        </p>
    </div>
</body>
</html>
`;

/**
 * Creates security headers for documentation site
 */
function createSecurityHeaders(): Headers {
  const headers = new Headers();

  // Security headers
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy for documentation
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "script-src 'self'",
      "connect-src 'self' https://jsr.io https://api.github.com",
    ].join("; "),
  );

  // CORS headers if enabled
  if (DOCS_CONFIG.enableCORS) {
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
  }

  return headers;
}

/**
 * Serves a custom 404 page
 */
function serve404(): Response {
  const headers = createSecurityHeaders();
  headers.set("Content-Type", "text/html; charset=utf-8");

  return new Response(DEFAULT_404_PAGE, {
    status: 404,
    headers,
  });
}

/**
 * Loads redirect mappings from the generated redirects.json file
 */
let redirectMap: Record<string, string> | null = null;

async function loadRedirectMap(): Promise<Record<string, string>> {
  if (redirectMap !== null) return redirectMap;

  try {
    const redirectData = await Deno.readTextFile(DOCS_CONFIG.redirectMapPath);
    const parsedMap = JSON.parse(redirectData) as Record<string, string>;
    redirectMap = parsedMap;
    return parsedMap;
  } catch {
    // If no redirect map exists, return empty object
    const emptyMap: Record<string, string> = {};
    redirectMap = emptyMap;
    return emptyMap;
  }
}

/**
 * Handles routing for documentation requests
 */
async function handleDocsRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  let pathname = url.pathname;

  // Handle CORS preflight
  if (request.method === "OPTIONS" && DOCS_CONFIG.enableCORS) {
    return new Response(null, {
      status: 204,
      headers: createSecurityHeaders(),
    });
  }

  // Route special pages
  if (pathname === "/health") {
    const headers = createSecurityHeaders();
    headers.set("Content-Type", "application/json");

    return new Response(
      JSON.stringify({
        status: "healthy",
        service: "nagare-docs",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      }),
      { headers },
    );
  }

  // Check redirect map for legacy ~ URLs
  const redirects = await loadRedirectMap();
  if (redirects[pathname]) {
    const headers = createSecurityHeaders();
    headers.set("Location", redirects[pathname]);
    return new Response(null, {
      status: 301,
      headers,
    });
  }

  // URL rewriting for Deno Deploy compatibility
  // Replace URL-encoded tilde (%7E) with actual tilde
  // This handles cases where browsers encode the ~ character
  if (pathname.includes("%7E")) {
    pathname = pathname.replace(/%7E/g, "~");
  }

  // Create a modified request with the cleaned pathname
  const modifiedUrl = new URL(request.url);
  modifiedUrl.pathname = pathname;
  const modifiedRequest = new Request(modifiedUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  try {
    // Serve files from docs directory
    const response = await serveDir(modifiedRequest, {
      fsRoot: DOCS_CONFIG.docsDir,
      showDirListing: DOCS_CONFIG.enableDirListing,
      showIndex: true,
      enableCors: DOCS_CONFIG.enableCORS,
    });

    // If we get a 404 and the path contains /~/, try alternative approaches
    if (response.status === 404 && pathname.includes("/~/")) {
      // Try URL-encoding the tilde
      const encodedPath = pathname.replace(/\/~\//g, "/%7E/");
      const encodedUrl = new URL(request.url);
      encodedUrl.pathname = encodedPath;
      const encodedRequest = new Request(encodedUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      const encodedResponse = await serveDir(encodedRequest, {
        fsRoot: DOCS_CONFIG.docsDir,
        showDirListing: DOCS_CONFIG.enableDirListing,
        showIndex: true,
        enableCors: DOCS_CONFIG.enableCORS,
      });

      if (encodedResponse.status === 200) {
        return encodedResponse;
      }
    }

    // Add security headers to successful responses
    if (response.status === 200) {
      const securityHeaders = createSecurityHeaders();
      const newHeaders = new Headers(response.headers);

      for (const [key, value] of securityHeaders.entries()) {
        newHeaders.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    // Handle 404s with custom page
    if (response.status === 404) {
      return serve404();
    }

    return response;
  } catch (error) {
    console.error("Error serving documentation:", error);

    const headers = createSecurityHeaders();
    headers.set("Content-Type", "text/html; charset=utf-8");

    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Server Error - Nagare Docs</title></head>
        <body>
          <h1>Server Error</h1>
          <p>An error occurred while serving the documentation.</p>
          <p><a href="/">Return to Home</a></p>
        </body>
      </html>
    `,
      {
        status: 500,
        headers,
      },
    );
  }
}

/**
 * Main request handler for Deno Deploy
 */
async function handler(request: Request): Promise<Response> {
  const startTime = performance.now();

  try {
    const response = await handleDocsRequest(request);

    // Log request for monitoring
    const duration = performance.now() - startTime;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      status: response.status,
      duration: Math.round(duration * 100) / 100,
      userAgent: request.headers.get("user-agent") || "unknown",
    }));

    return response;
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Start the server
if (import.meta.main) {
  console.log("🚀 Starting Nagare documentation server...");
  console.log(`📁 Serving docs from: ${DOCS_CONFIG.docsDir}`);
  console.log(`🔒 Security headers enabled`);
  console.log(`🌐 CORS enabled: ${DOCS_CONFIG.enableCORS}`);

  Deno.serve({ port: 8000 }, handler);
}
