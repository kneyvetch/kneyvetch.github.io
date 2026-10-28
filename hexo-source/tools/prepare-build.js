const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(projectRoot, '..');
const sourceRoot = path.join(projectRoot, 'source');

for (const asset of ['images', 'js', 'lib']) {
  const from = path.join(repoRoot, asset);
  const to = path.join(sourceRoot, asset);
  if (!fs.existsSync(from)) {
    throw new Error(`Required original asset directory is missing: ${from}`);
  }
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
}

const installedTheme = path.join(projectRoot, 'node_modules', 'hexo-theme-next');
const themeRoot = path.join(projectRoot, 'themes', 'next');
if (!fs.existsSync(installedTheme)) {
  throw new Error('hexo-theme-next was not installed. Run npm install first.');
}
fs.rmSync(themeRoot, { recursive: true, force: true });
fs.mkdirSync(themeRoot, { recursive: true });
fs.cpSync(installedTheme, themeRoot, { recursive: true });
// Keep the theme's complete default configuration. Hexo 5 automatically merges the
// project's _config.next.yml into themes/next/_config.yml.

const themeData = path.join(themeRoot, 'source', '_data');
fs.mkdirSync(themeData, { recursive: true });
fs.copyFileSync(path.join(sourceRoot, '_data', 'styles.styl'), path.join(themeData, 'styles.styl'));

console.log('Prepared original assets and NexT theme configuration.');
