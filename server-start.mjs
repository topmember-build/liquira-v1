import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Require the compiled CommonJS backend bundle
require('./dist/backend/index.js');
