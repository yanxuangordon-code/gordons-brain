const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Key is stored in Render's environment variables - never hardcoded!
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT || 3000;

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch { res.writeHead(400); res.end('{}'); return; }
      const payload = JSON.stringify(parsed);
      const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      const groqReq = https.request(options, groqRes => {
        let data = '';
        groqRes.on('data', chunk => data += chunk);
        groqRes.on('end', () => {
          res.writeHead(groqRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });
      groqReq.on('error', err => { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); });
      groqReq.write(payload);
      groqReq.end();
    });
    return;
  }

  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, 'public', filePath);
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(content);
  });
});

server.listen(PORT, () => { console.log(`✅ Server running on port ${PORT}`); });
