const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 5050);

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

async function serveFile(res, filePath) {
  const content = await fs.readFile(filePath);
  res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
  res.end(content);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(new Error('Ungültiges JSON im Request-Body'));
      }
    });
    req.on('error', reject);
  });
}

async function runGenerate({ company, profile, pdf }) {
  const outputDir = path.join(rootDir, 'output');
  const profilePath = path.join(outputDir, 'ui-profile.json');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(profilePath, JSON.stringify(profile, null, 2), 'utf8');

  const args = ['src/index.js', '--company', company, '--profile', profilePath];
  if (pdf) args.push('--pdf');

  await execFileAsync('node', args, { cwd: rootDir });

  return {
    outputHtml: 'output/profile.html',
    outputPdf: pdf ? 'output/profile.pdf' : '',
    openUrl: `http://localhost:${port}/output/profile.html`,
    profile,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (req.method === 'GET' && url.pathname === '/') {
      await serveFile(res, path.join(rootDir, 'src/ui/index.html'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/ui.css') {
      await serveFile(res, path.join(rootDir, 'src/ui/ui.css'));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/ui.js') {
      await serveFile(res, path.join(rootDir, 'src/ui/ui.js'));
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/output/')) {
      const target = path.join(rootDir, url.pathname.replace(/^\//, ''));
      await serveFile(res, target);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/generate') {
      const body = await parseBody(req);
      const company = body.company || 'company-a';
      const profile = body.profile || {};
      const pdf = Boolean(body.pdf);
      const result = await runGenerate({ company, profile, pdf });
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, { error: 'Not Found' });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`Profil-Editor läuft auf: http://localhost:${port}`);
});
