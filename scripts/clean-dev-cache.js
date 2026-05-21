import fs from 'fs';
import path from 'path';

const targets = ['node_modules/.vite', 'dist'];
for (const target of targets) {
  const fullPath = path.resolve(process.cwd(), target);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`Eliminado: ${target}`);
  }
}
console.log('Cache local de desarrollo limpiado. Ejecute npm.cmd run dev nuevamente.');
