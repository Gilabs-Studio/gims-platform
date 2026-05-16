#!/usr/bin/env node
/**
 * Pi ↔ 9Router Sanitizing Proxy
 * 
 * Strips non-standard 'reasoning', 'reasoning_content', 'reasoning_details' fields
 * from messages before forwarding to 9Router (or any OpenAI-compatible API).
 * 
 * Usage:
 *   node pi-9router-proxy.js [PORT] [TARGET_URL]
 * 
 * Defaults:
 *   PORT = 20129
 *   TARGET_URL = http://localhost:20128 (9Router)
 * 
 * Then configure Pi to use:
 *   NINEROUTER_URL=http://localhost:20129
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PROXY_PORT = parseInt(process.argv[2], 10) || 20129;
const TARGET_URL = process.argv[3] || process.env.TARGET_URL || 'http://localhost:20128';

const targetUrl = url.parse(TARGET_URL);
const targetProtocol = targetUrl.protocol === 'https:' ? https : http;

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return messages;
  
  return messages.map(msg => {
    if (typeof msg !== 'object' || msg === null) return msg;
    
    // Strip non-standard reasoning fields that break strict OpenAI validation
    const {
      reasoning,           // Internal Pi field
      reasoning_content,   // DeepSeek/others extension
      reasoning_details,   // Tool thought signatures
      ...cleanMessage
    } = msg;
    
    return cleanMessage;
  });
}

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

const server = http.createServer((req, res) => {
  const chunks = [];
  
  req.on('data', chunk => chunks.push(chunk));
  
  req.on('end', () => {
    let body = Buffer.concat(chunks);
    let modified = false;
    
    // Only process POST requests with JSON body
    if (req.method === 'POST' && req.headers['content-type']?.includes('application/json')) {
      try {
        const data = JSON.parse(body.toString());
        
        // Sanitize messages if present
        if (data.messages && Array.isArray(data.messages)) {
          const originalCount = data.messages.length;
          data.messages = sanitizeMessages(data.messages);
          
          // Check if we stripped anything
          const stripped = body.toString().match(/"reasoning"|"reasoning_content"|"reasoning_details"/);
          if (stripped) {
            modified = true;
            log(`Stripped reasoning fields from ${originalCount} messages`);
          }
        }
        
        body = Buffer.from(JSON.stringify(data));
      } catch (e) {
        log(`Warning: Failed to parse JSON body: ${e.message}`);
      }
    }
    
    // Prepare request options for target
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        'content-length': body.length,
        host: targetUrl.host,
      },
    };
    
    // Remove hop-by-hop headers
    delete options.headers['connection'];
    delete options.headers['keep-alive'];
    delete options.headers['upgrade'];
    delete options.headers['proxy-connection'];
    
    // Forward to target
    const proxyReq = targetProtocol.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
      
      const status = proxyRes.statusCode;
      const indicator = modified ? '(sanitized)' : '';
      log(`${req.method} ${req.url} → ${status} ${indicator}`);
    });
    
    proxyReq.on('error', (err) => {
      log(`Error forwarding to target: ${err.message}`);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: {
          message: `Proxy error: ${err.message}`,
          type: 'proxy_error',
        }
      }));
    });
    
    proxyReq.write(body);
    proxyReq.end();
  });
  
  req.on('error', (err) => {
    log(`Request error: ${err.message}`);
  });
});

server.listen(PROXY_PORT, () => {
  log('='.repeat(60));
  log('Pi ↔ 9Router Sanitizing Proxy');
  log('='.repeat(60));
  log(`Proxy listening on: http://localhost:${PROXY_PORT}`);
  log(`Forwarding to: ${TARGET_URL}`);
  log('');
  log('Configure Pi with:');
  log(`  export NINEROUTER_URL=http://localhost:${PROXY_PORT}`);
  log('');
  log('This proxy strips these non-standard fields from messages:');
  log('  - reasoning');
  log('  - reasoning_content');
  log('  - reasoning_details');
  log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGINT', () => {
  log('\nShutting down proxy...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
