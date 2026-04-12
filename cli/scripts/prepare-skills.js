// Copies skills from repo root into cli/skills/ for npm publishing.
// Run: node scripts/prepare-skills.js

import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = resolve(__dirname, '..');
const repoRoot = resolve(cliRoot, '..');
const skillsDir = resolve(cliRoot, 'skills');

// Clean previous build
if (existsSync(skillsDir)) {
  rmSync(skillsDir, { recursive: true });
}

mkdirSync(skillsDir, { recursive: true });

// Copy both languages
cpSync(resolve(repoRoot, 'en-skills'), resolve(skillsDir, 'en'), {
  recursive: true,
});
cpSync(resolve(repoRoot, 'es-skills'), resolve(skillsDir, 'es'), {
  recursive: true,
});

console.log('✅ Skills prepared in cli/skills/ (en + es)');
