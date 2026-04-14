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
// Flat-install helpers
// ---------------------------------------------------------------------------

/**
 * Recursively find all directories that directly contain a SKILL.md file.
 */
async function findSkillDirs(dir: string): Promise<string[]> {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const stat = await fsp.stat(dir);
  if (!stat.isDirectory()) return results;

  const entries = await fsp.readdir(dir, { withFileTypes: true });

  if (entries.some((e) => !e.isDirectory() && e.name === 'SKILL.md')) {
    results.push(dir);
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      results.push(...(await findSkillDirs(path.join(dir, entry.name))));
    }
  }

  return results;
}

/**
 * Copy a skill directory to the target, but exclude sub-directories that
 * contain their own SKILL.md (those are separate skills).
 */
async function copySkillFlat(srcDir: string, destDir: string): Promise<void> {
  await fsp.mkdir(destDir, { recursive: true });

  const entries = await fsp.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      // Only copy sub-dirs that are NOT skills themselves (e.g. scripts/, assets/)
      if (!fs.existsSync(path.join(srcPath, 'SKILL.md'))) {
        await fsp.cp(srcPath, destPath, { recursive: true });
      }
    } else {
      await fsp.copyFile(srcPath, destPath);
    }
  }
}

/**
 * For a given category path (e.g. 'software/frontend'), collect all skill
 * directories that should be installed — including ancestor orchestrators.
 */
async function resolveSkillsForPath(
  sourceDir: string,
  skillPath: string,
): Promise<string[]> {
  const results: string[] = [];

  // 1. Check ancestor directories for orchestrator SKILL.md
  const parts = skillPath.split('/');
  for (let i = 0; i < parts.length; i++) {
    const ancestorDir = path.join(sourceDir, ...parts.slice(0, i + 1));
    if (fs.existsSync(path.join(ancestorDir, 'SKILL.md'))) {
      results.push(ancestorDir);
    }
  }

  // 2. Find all skill dirs within the path itself
  const src = path.join(sourceDir, skillPath);
  if (fs.existsSync(src)) {
    for (const d of await findSkillDirs(src)) {
      if (!results.includes(d)) results.push(d);
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

  // Clean previous installation to handle nested→flat migration
  if (existing) {
    for (const skill of existing.skills) {
      const fullPath = path.join(targetDir, skill);
      if (fs.existsSync(fullPath)) {
        await fsp.rm(fullPath, { recursive: true });
      }
    }
    // Remove empty legacy parent dirs from nested installs
    const legacyParents = existing.skills
      .filter((s) => s.includes('/'))
      .map((s) => path.dirname(s))
      .filter((p) => p !== '.');
    for (const parent of [...new Set(legacyParents)].sort(
      (a, b) => b.split(path.sep).length - a.split(path.sep).length,
    )) {
      await removeIfEmpty(path.join(targetDir, parent));
    }
  }

  const installedNames = new Set<string>();

  for (const skillPath of skillPaths) {
    const skillDirs = await resolveSkillsForPath(sourceDir, skillPath);

    for (const skillDir of skillDirs) {
      const name = path.basename(skillDir);
      if (installedNames.has(name)) continue;
      installedNames.add(name);

      await copySkillFlat(skillDir, path.join(targetDir, name));
    }
  }

  // Merge with existing manifest so successive installs accumulate
  const mergedPaths = [...new Set([...(existing?.categoryPaths ?? []), ...skillPaths])];
  const mergedSkills = [
    ...new Set([...(existing?.skills ?? []), ...installedNames]),
  ].sort();

  const now = new Date().toISOString();
  await writeManifest(targetDir, {
    version: '0.1.0',
    lang,
    installedAt: existing?.installedAt ?? now,
    updatedAt: now,
    categoryPaths: mergedPaths,
    skills: mergedSkills,
  });

  return await countCategoryFiles(sourceDir, skillPaths);
}
// ---------------------------------------------------------------------------

export async function updateSkills(targetDir: string): Promise<number> {
  const manifest = await readManifest(targetDir);
  if (!manifest) throw new Error('No manifest found');

  const sourceDir = resolveSkillsSource(manifest.lang);

  // 1. Determine what skills exist in current source
  const sourceSkillNames = new Set<string>();
  for (const skillPath of manifest.categoryPaths) {
    const skillDirs = await resolveSkillsForPath(sourceDir, skillPath);
    for (const d of skillDirs) sourceSkillNames.add(path.basename(d));
  }

  // 2. Remove orphaned skills (in old manifest but absent from source)
  for (const oldSkill of manifest.skills) {
    // Handle both flat names ('frontend') and legacy paths ('software/frontend')
    const oldName = path.basename(oldSkill);
    if (!sourceSkillNames.has(oldName)) {
      const orphanPath = path.join(targetDir, oldSkill);
      if (fs.existsSync(orphanPath)) {
        await fsp.rm(orphanPath, { recursive: true });
      }
    }
  }

  // Clean up empty parent directories left by legacy nested installs
  const legacyParents = manifest.skills
    .filter((s) => s.includes('/'))
    .map((s) => path.dirname(s))
    .filter((p) => p !== '.');

  for (const parent of [...new Set(legacyParents)].sort(
    (a, b) => b.split(path.sep).length - a.split(path.sep).length,
  )) {
    await removeIfEmpty(path.join(targetDir, parent));
  }

  // 3. Copy updated skills from source (flat)
  const installedNames = new Set<string>();
  for (const skillPath of manifest.categoryPaths) {
    const skillDirs = await resolveSkillsForPath(sourceDir, skillPath);
    for (const skillDir of skillDirs) {
      const name = path.basename(skillDir);
      if (installedNames.has(name)) continue;
      installedNames.add(name);

      await copySkillFlat(skillDir, path.join(targetDir, name));
    }
  }

  // 4. Write updated manifest with current source skills
  await writeManifest(targetDir, {
    ...manifest,
    updatedAt: new Date().toISOString(),
    skills: [...installedNames].sort(),
  });

  return await countCategoryFiles(sourceDir, manifest.categoryPaths);
}

// ---------------------------------------------------------------------------
// Clean skills — remove installed skill dirs + manifest
// ---------------------------------------------------------------------------

export async function cleanSkills(targetDir: string): Promise<number> {
  const manifest = await readManifest(targetDir);
  if (!manifest) throw new Error('No manifest found');

  let removed = 0;

  for (const skill of manifest.skills) {
    const fullPath = path.join(targetDir, skill);
    if (fs.existsSync(fullPath)) {
      await fsp.rm(fullPath, { recursive: true });
      removed++;
    }
  }

  // Handle legacy nested paths that may contain '/'
  const legacyParents = manifest.skills
    .filter((s) => s.includes('/'))
    .map((s) => path.dirname(s))
    .filter((p) => p !== '.');

  for (const parent of [...new Set(legacyParents)].sort(
    (a, b) => b.split(path.sep).length - a.split(path.sep).length,
  )) {
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
