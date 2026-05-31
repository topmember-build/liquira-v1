const path = require('path');
const moduleAlias = require('module-alias');

const distRoot = path.resolve(process.cwd(), 'dist');
moduleAlias.addAlias('@', distRoot);
moduleAlias.addAlias('@/*', path.join(distRoot, '*'));
