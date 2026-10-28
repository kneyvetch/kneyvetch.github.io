const fs = require('fs');
const path = require('path');

const publicRoot = path.resolve(__dirname, '..', 'public');
fs.mkdirSync(publicRoot, { recursive: true });
fs.writeFileSync(path.join(publicRoot, '.nojekyll'), '');
console.log('Added .nojekyll to the generated site.');
