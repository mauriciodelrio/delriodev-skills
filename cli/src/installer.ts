import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Lang } from './catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const MANIFEST_FILE = '.copilot-skills.json';

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export interface Manifest {
  version: string;
  lang: Lang;
  installedAt: string;
  updatedAt: string;
  categoryPaths: string[];
  skills: string[]; // relative dirs containing SKILL.md
}

export async function readManifest(targetDir: string): Promise<Manifest | null> {
  const fp = path.join(targetDir, MANIFEST_FILE);
  if (!fs.existsSync(fp)) return null;
  const raw = await fsp.readFile(fp, 'utf-8');
  return JSON.parse(raw) as Manifest;
}

async function writeManifest(targetDir: string, manifest: Manifest): Promise<void> {
  await fsp.mkdir(targetDir, { recursive: true });
  await fsp.writeFile(
    path.join(targetDir, MANIFEST_FILE),
    JSON.stringify(manifest, null, 2) + '\n',
  );
}

// ---------------------------------------------------------------------------
// Resolve skills source directory (handles both dev and published layout)
// ---------------------------------------------------------------------------

export function resolveSkillsSource(lang: Lang): string {
  const published = path.resolve(__dirname, '..', 'skills', lang);
  if (fs.existsSync(published)) return published;

  const dev = path.resolve(__dirname, '..', '..', `${lang}-skills`);
  if (fs.existsSync(dev)) return dev;

  throw new Error(
    `Skills not found for "${lang}". Searched:\n  ${published}\n  ${dev}`,
  );
}

// ---------------------------------------------------------------------------
// Resolve installation target directory
// ---------------------------------------------------------------------------

export function resolveTarget(target: string, customPath?: string): string {
  const cwd = process.cwd();

  switch (target) {
    case 'github':
      return path.join(cwd, '.github', 'skills');
    case 'vscode':
      return path.join(cwd, '.vscode', 'skills');
    case 'user':
      return getUserSkillsDir();
    case 'custom':
      return path.resolve(cwd, customPath!);
    default:
      throw new Error(`Unknown target: ${target}`);
  }
}

export function getUserSkillsDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.copilot', 'skills');
}

// ---------------------------------------------------------------------------
// Collect skill directories (leaf dirs containing SKILL.md)
// ---------------------------------------------------------------------------

async function collectSkillDirs(dir: string, base: string): Promise<string[]> {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const stat = await fsp.stat(dir);
  if (!stat.isDirectory()) return results;

  const entries = await fsp.readdir(dir, { withFileTypes: true });

  if (entries.some((e) => !e.isDirectory() && e.name === 'SKILL.md')) {
    results.push(path.relative(base, dir));
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      results.push(...(await collectSkillDirs(path.join(dir, entry.name), base)));
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Install skills — copy selected skill dirs to target + write manifest
// ---------------------------------------------------------------------------

export async function installSkills(
  sourceDir: string,
  skillPaths: string[],
  targetDir: string,
  lang: Lang,
): Promise<number> {
  const existing = await readManifest(targetDir);

  let fileCount = 0;
  const allSkillDirs: string[] = [];

  for (const skillPath of skillPaths) {
    const src = path.join(sourceDir, skillPath);
    const dest = path.join(targetDir, skillPath);

    if (!fs.existsSync(src)) continue;

    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.cp(src, dest, { recursive: true });

    fileCount += await countSkillFiles(dest);
    allSkillDirs.push(...(await collectSkillDirs(dest, targetDir)));
  }

  // Merge with existing manifest so successive installs accumulate
  const mergedPaths = [...new Set([...(existing?.categoryPaths ?? []), ...skillPaths])];
  const mergedSkills = [...new Set([...(existing?.skills ?? []), ...allSkillDirs])].sort();

  const now = new Date().toISOString();
  await writeManifest(targetDir, {
    version: '0.1.0',
    lang,
    installedAt: existing?.installedAt ?? now,
    updatedAt: now,
    categoryPaths: mergedPaths,
    skills: mergedSkills,
  });

  return fileCount;
}

// ---------------------------------------------------------------------------
// Update skills — re-copy from source using manifest data
// ---------------------------------------------------------------------------

export async function updateSkills(targetDir: string): Promise<number> {
  const manifest = await readManifest(targetDir);
  if (!manifest) throw new Error('No manifest found');

  const sourceDir = resolveSkillsSource(manifest.lang);

  // 1. Determine what skills exist in current source
  const sourceSkillDirs: string[] = [];
  for (const skillPath of manifest.categoryPaths) {
    const src = path.join(sourceDir, skillPath);
    if (!fs.existsSync(src)) continue;
    sourceSkillDirs.push(
      ...(await collectSkillDirs(src, sourceDir)),
    );
  }

  // 2. Remove orphaned skills (in old manifest but absent from source)
  const sourceSkillSet = new Set(sourceSkillDirs);
  for (const oldSkill of manifest.skills) {
    if (!sourceSkillSet.has(oldSkill)) {
      const orphanPath = path.join(targetDir, oldSkill);
      if (fs.existsSync(orphanPath)) {
        await fsp.rm(orphanPath, { recursive: true });
      }
    }
  }

  // Clean up empty parent directories left by orphan removal (deepest first)
  const orphanParents = manifest.skills
    .filter((s) => !sourceSkillSet.has(s))
    .map((s) => path.dirname(s))
    .filter((p) => p !== '.');

  const uniqueParents = [...new Set(orphanParents)].sort(
    (a, b) => b.split(path.sep).length - a.split(path.sep).length,
  );

  for (const parent of uniqueParents) {
    await removeIfEmpty(path.join(targetDir, parent));
  }

  // 3. Copy updated skills from source
  let fileCount = 0;
  for (const skillPath of manifest.categoryPaths) {
    const src = path.join(sourceDir, skillPath);
    const dest = path.join(targetDir, skillPath);

    if (!fs.existsSync(src)) continue;

    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.cp(src, dest, { recursive: true });

    fileCount += await countSkillFiles(dest);
  }

  // 4. Write updated manifest with current source skills
  await writeManifest(targetDir, {
    ...manifest,
    updatedAt: new Date().toISOString(),
    skills: sourceSkillDirs.sort(),
  });

  return fileCount;
}

// ---------------------------------------------------------------------------
// Clean skills — remove installed skill dirs + manifest
// ---------------------------------------------------------------------------

export async function cleanSkills(targetDir: string): Promise<number> {
  const manifest = await readManifest(targetDir);
  if (!manifest) throw new Error('No manifest found');

  let removed = 0;

  for (const skillDir of manifest.skills) {
    const fullPath = path.join(targetDir, skillDir);
    if (fs.existsSync(fullPath)) {
      await fsp.rm(fullPath, { recursive: true });
      removed++;
    }
  }

  // Clean up empty parent directories (deepest first)
  const parents = [
    ...new Set([
      ...manifest.skills.map((s) => path.dirname(s)),
      ...manifest.categoryPaths,
      ...manifest.categoryPaths.map((cp) => path.dirname(cp)),
    ]),
  ].sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);

  for (const parent of parents) {
    if (parent === '.') continue;
    await removeIfEmpty(path.join(targetDir, parent));
  }

  // Remove manifest file
  const manifestPath = path.join(targetDir, MANIFEST_FILE);
  if (fs.existsSync(manifestPath)) {
    await fsp.unlink(manifestPath);
  }

  return removed;
}

async function removeIfEmpty(dir: string): Promise<void> {
  try {
    const entries = await fsp.readdir(dir);
    if (entries.length === 0) {
      await fsp.rmdir(dir);
    }
  } catch {
    // Directory doesn't exist or not readable — ignore
  }
}

// ---------------------------------------------------------------------------
// Count SKILL.md files — per directory tree or per category paths
// ---------------------------------------------------------------------------

export async function countCategoryFiles(
  sourceDir: string,
  paths: string[],
): Promise<number> {
  let total = 0;
  for (const p of paths) {
    const dir = path.join(sourceDir, p);
    if (fs.existsSync(dir)) {
      total += await countSkillFiles(dir);
    }
  }
  return total;
}

async function countSkillFiles(dir: string): Promise<number> {
  const stat = await fsp.stat(dir);
  if (!stat.isDirectory()) {
    return path.basename(dir) === 'SKILL.md' ? 1 : 0;
  }

  let count = 0;
  const entries = await fsp.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await countSkillFiles(fullPath);
    } else if (entry.name === 'SKILL.md') {
      count++;
    }
  }

  return count;
}
