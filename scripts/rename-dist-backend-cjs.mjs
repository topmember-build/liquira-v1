import { promises as fs } from 'fs';
import path from 'path';

const baseDir = path.resolve('dist', 'backend');
const packageJsonPath = path.join(baseDir, 'package.json');
const distPackageJsonPath = path.resolve('dist', 'package.json');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (entry.isFile() && path.extname(entry.name) === '.cjs') {
      const newPath = fullPath.slice(0, -4) + '.js';
      await fs.rename(fullPath, newPath);
    }
  }
}

async function createPackageJson(filePath, type = 'commonjs') {
  const body = JSON.stringify({ type }, null, 2);
  await fs.writeFile(filePath, body + '\n', 'utf8');
}

async function main() {
  await walk(baseDir);
  await createPackageJson(packageJsonPath, 'commonjs');
  await createPackageJson(distPackageJsonPath, 'commonjs');

  const serverPackageJsonPath = path.join('dist', 'server', 'package.json');
  if (await fs.stat(path.dirname(serverPackageJsonPath)).then(() => true).catch(() => false)) {
    await createPackageJson(serverPackageJsonPath, 'module');
  }
}

main().catch((error) => {
  console.error('Failed to finalize backend dist output:', error);
  process.exit(1);
});
