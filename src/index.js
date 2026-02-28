const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'output');

function parseArgs(argv) {
  const defaults = {
    company: 'company-a',
    profile: 'src/data/profile-with-certs.json',
    template: 'src/templates/profile.template.html',
    outputHtml: 'output/profile.html',
    outputPdf: 'output/profile.pdf',
    pdf: false,
  };

  const args = { ...defaults };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--pdf') {
      args.pdf = true;
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      throw new Error(`Fehlender Wert für ${arg}`);
    }

    switch (arg) {
      case '--company':
        args.company = next;
        i += 1;
        break;
      case '--profile':
        args.profile = next;
        i += 1;
        break;
      case '--template':
        args.template = next;
        i += 1;
        break;
      case '--output-html':
        args.outputHtml = next;
        i += 1;
        break;
      case '--output-pdf':
        args.outputPdf = next;
        i += 1;
        break;
      default:
        throw new Error(`Unbekanntes Argument: ${arg}`);
    }
  }

  return args;
}

function resolveFromRoot(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(rootDir, relativePath);
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function getValueByPath(context, keyPath) {
  if (!keyPath || keyPath === 'this') {
    return context.this;
  }

  const parts = keyPath.split('.');
  let current = context;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return '';
    }
    current = current[part];
  }

  return current == null ? '' : current;
}

function renderTemplate(template, context) {
  const ifPattern = /{{#if\s+([^}]+)}}([\s\S]*?){{\/if}}/g;
  let rendered = template.replace(ifPattern, (_, expression, block) => {
    const expr = expression.trim();
    const match = expr.match(/^\(hasItems\s+([^)]+)\)$/);
    if (!match) {
      return '';
    }

    const value = getValueByPath(context, match[1].trim());
    return Array.isArray(value) && value.length > 0 ? renderTemplate(block, context) : '';
  });

  const eachPattern = /{{#each\s+([^}]+)}}([\s\S]*?){{\/each}}/g;
  rendered = rendered.replace(eachPattern, (_, collectionPath, block) => {
    const items = getValueByPath(context, collectionPath.trim());
    if (!Array.isArray(items) || items.length === 0) {
      return '';
    }

    return items
      .map((item) => {
        const itemContext = {
          ...context,
          ...(typeof item === 'object' && item !== null ? item : {}),
          this: item,
        };

        let nested = renderTemplate(block, itemContext);
        nested = nested.replace(/{{join\s+([^}\s]+)\s+"([^"]*)"}}/g, (_, pathKey, sep) => {
          const arr = getValueByPath(itemContext, pathKey.trim());
          return Array.isArray(arr) ? arr.join(sep) : '';
        });
        return nested;
      })
      .join('');
  });

  rendered = rendered.replace(/{{join\s+([^}\s]+)\s+"([^"]*)"}}/g, (_, pathKey, sep) => {
    const arr = getValueByPath(context, pathKey.trim());
    return Array.isArray(arr) ? arr.join(sep) : '';
  });

  rendered = rendered.replace(/{{\s*([^}]+)\s*}}/g, (_, keyPath) => {
    const value = getValueByPath(context, keyPath.trim());
    return String(value);
  });

  return rendered;
}

async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function writeCssBundle(branding) {
  const baseCssPath = resolveFromRoot('src/styles/base.css');
  const companyCssPath = resolveFromRoot(branding.cssFile);

  const [baseCss, companyCss] = await Promise.all([
    fs.readFile(baseCssPath, 'utf8'),
    fs.readFile(companyCssPath, 'utf8'),
  ]);

  const logoPath = resolveFromRoot(branding.logoPath).replace(/\\/g, '/');
  const variables = `:root {\n  --primary-color: ${branding.primaryColor || '#0055A4'};\n  --logo-url: url("file://${logoPath}");\n}\n`;

  return `${variables}\n${baseCss}\n${companyCss}`;
}

async function generatePdfWithChromium(htmlPath, pdfPath) {
  const candidates = ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'];
  const fileUrl = `file://${htmlPath}`;

  for (const cmd of candidates) {
    try {
      await execFileAsync(cmd, [
        '--headless',
        '--disable-gpu',
        `--print-to-pdf=${pdfPath}`,
        '--no-margins',
        fileUrl,
      ]);
      return;
    } catch (error) {
      // Try next browser binary
    }
  }

  throw new Error('Kein Chromium/Chrome Binary gefunden. Bitte Browser installieren oder --pdf weglassen.');
}

async function main() {
  const args = parseArgs(process.argv);
  const profilePath = resolveFromRoot(args.profile);
  const companyConfigPath = resolveFromRoot(`src/config/${args.company}.json`);
  const templatePath = resolveFromRoot(args.template);

  const outputHtmlPath = resolveFromRoot(args.outputHtml);
  const outputPdfPath = resolveFromRoot(args.outputPdf);
  const outputCssPath = path.join(path.dirname(outputHtmlPath), 'profile.css');

  const [profile, branding, template] = await Promise.all([
    readJson(profilePath),
    readJson(companyConfigPath),
    fs.readFile(templatePath, 'utf8'),
  ]);

  const context = {
    project: profile.project || {},
    personal: profile.personal || {},
    projectExperiences: normalizeArray(profile.projectExperiences),
    qualifications: normalizeArray(profile.qualifications),
    certifications: normalizeArray(profile.certifications),
    other: normalizeArray(profile.other),
    branding,
    generatedAt: new Date().toLocaleString('de-DE'),
  };

  const html = renderTemplate(template, context);
  const css = await writeCssBundle(branding);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.dirname(outputHtmlPath), { recursive: true });

  await fs.writeFile(outputHtmlPath, html, 'utf8');
  await fs.writeFile(outputCssPath, css, 'utf8');

  console.log(`HTML erstellt: ${path.relative(rootDir, outputHtmlPath)}`);

  if (args.pdf) {
    await generatePdfWithChromium(outputHtmlPath, outputPdfPath);
    console.log(`PDF erstellt: ${path.relative(rootDir, outputPdfPath)}`);
  } else {
    console.log('PDF-Export übersprungen (verwende --pdf).');
  }
}

main().catch((error) => {
  console.error(`Fehler beim Generieren des Profils: ${error.message}`);
  process.exitCode = 1;
});
