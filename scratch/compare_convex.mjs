import fs from 'fs';
import path from 'path';

const rootConvex = 'c:/Users/Mr Ness/Documents/Ai/school ai/convex';
const frontendConvex = 'c:/Users/Mr Ness/Documents/Ai/school ai/frontend/convex';

function compareDirs(dirA, dirB) {
  const filesA = fs.readdirSync(dirA).filter(f => f !== '_generated' && f !== 'node_modules');
  const filesB = fs.readdirSync(dirB).filter(f => f !== '_generated' && f !== 'node_modules');

  console.log(`Files in root convex:`, filesA.length);
  console.log(`Files in frontend/convex:`, filesB.length);

  const onlyInA = filesA.filter(f => !filesB.includes(f));
  const onlyInB = filesB.filter(f => !filesA.includes(f));

  if (onlyInA.length > 0) console.log(`Only in root:`, onlyInA);
  if (onlyInB.length > 0) console.log(`Only in frontend:`, onlyInB);

  const common = filesA.filter(f => filesB.includes(f));
  let diffCount = 0;
  for (const file of common) {
    const statA = fs.statSync(path.join(dirA, file));
    const statB = fs.statSync(path.join(dirB, file));
    if (statA.isDirectory() || statB.isDirectory()) continue;
    const contentA = fs.readFileSync(path.join(dirA, file), 'utf8');
    const contentB = fs.readFileSync(path.join(dirB, file), 'utf8');
    if (contentA !== contentB) {
      console.log(`File differs: ${file}`);
      diffCount++;
    }
  }
  if (diffCount === 0) {
    console.log(`All common files are identical.`);
  }
}

compareDirs(rootConvex, frontendConvex);
