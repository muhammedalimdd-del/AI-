import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const version = pkg.version || '1.0.0';

const appConfigPath = path.join(rootDir, 'electron', 'app-config.json');
const releasesDir = path.join(rootDir, 'releases');
const unpackedDir = path.join(releasesDir, 'win-unpacked');
const downloadsDir = path.join(rootDir, 'downloads');
const setupDest = path.join(downloadsDir, 'AI-Video-Maker-Setup.exe');
const latestYmlDest = path.join(downloadsDir, 'latest.yml');

const primaryUrl = (
  process.env.DESKTOP_SERVER_URL ||
  process.env.APP_URL ||
  'https://ais-pre-eval4556daji7ihjgwnfzr-589743996180.asia-northeast1.run.app'
).replace(/\/+$/, '');

const fallbackUrls = [
  primaryUrl,
  'https://ais-pre-eval4556daji7ihjgwnfzr-589743996180.asia-northeast1.run.app',
  'https://ais-dev-eval4556daji7ihjgwnfzr-589743996180.asia-northeast1.run.app',
  'http://localhost:3000'
].filter((u, idx, arr) => u && arr.indexOf(u) === idx);

fs.mkdirSync(path.dirname(appConfigPath), { recursive: true });
fs.writeFileSync(
  appConfigPath,
  JSON.stringify({ primaryUrl, fallbackUrls }, null, 2),
  'utf-8'
);

console.log('[desktop:build] Step 1/4: Building production web bundle (dist/)...');
execSync('npm run build', { stdio: 'inherit', cwd: rootDir });

console.log('[desktop:build] Step 2/4: Packaging Windows x64 application via electron-builder...');
fs.rmSync(releasesDir, { recursive: true, force: true });
execSync('npx electron-builder --win dir --x64 --config electron-builder.yml', {
  stdio: 'inherit',
  cwd: rootDir
});

if (!fs.existsSync(path.join(unpackedDir, 'AI Video Maker.exe'))) {
  throw new Error(`Expected Windows binary missing in ${unpackedDir}`);
}

console.log('[desktop:build] Step 3/4: Compiling AI-Video-Maker-Setup.exe Windows installer via NSIS...');
fs.mkdirSync(downloadsDir, { recursive: true });
execSync(
  `makensis -V2 -DAPP_VERSION="${version}" -DUNPACKED_DIR="${unpackedDir}" -DBUILD_DIR="${path.join(rootDir, 'build')}" -DOUT_FILE="${setupDest}" "${path.join(rootDir, 'electron', 'installer.nsi')}"`,
  { stdio: 'inherit', cwd: rootDir }
);

if (!fs.existsSync(setupDest)) {
  throw new Error(`Expected Windows installer was not produced at ${setupDest}`);
}

console.log('[desktop:build] Step 4/4: Generating electron-updater metadata (downloads/latest.yml)...');
const fileBuffer = fs.readFileSync(setupDest);
const sha512 = crypto.createHash('sha512').update(fileBuffer).digest('base64');
const stat = fs.statSync(setupDest);
const releaseDate = new Date().toISOString();

const latestYml = [
  `version: ${version}`,
  'files:',
  '  - url: AI-Video-Maker-Setup.exe',
  `    sha512: ${sha512}`,
  `    size: ${stat.size}`,
  'path: AI-Video-Maker-Setup.exe',
  `sha512: ${sha512}`,
  `releaseDate: '${releaseDate}'`,
  ''
].join('\n');

fs.writeFileSync(latestYmlDest, latestYml, 'utf-8');

console.log(
  `[desktop:build] Success! Generated ${setupDest} (${(stat.size / (1024 * 1024)).toFixed(2)} MB) and ${latestYmlDest}`
);
