#!/usr/bin/env node
/**
 * Rewrites relative SKILL.md links in all SKILL.md files so they work
 * in a FLAT installed structure where every skill is a direct child of
 * the skills root directory:
 *
 *   skills/<name>/SKILL.md   (all siblings, no nesting)
 *
 * The rule is simple: any markdown link whose href ends with /SKILL.md
 * (or is exactly ../SKILL.md) gets rewritten to  ../<target-dir>/SKILL.md
 * where <target-dir> is the directory that directly contains the referenced
 * SKILL.md in the source tree.
 *
 * Usage:  node cli/scripts/rewrite-skill-links.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve, basename, relative } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = resolve(import.meta.dirname, '..', '..');

// ── helpers ──────────────────────────────────────────────────────────
function walkSkillFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkSkillFiles(full));
    } else if (entry.name === 'SKILL.md') {
      results.push(full);
    }
  }
  return results;
}

// ── main ─────────────────────────────────────────────────────────────
// Regex: markdown link whose href is a relative path ending in /SKILL.md
// Also matches  ../SKILL.md  (parent reference)
const LINK_RE = /\]\((\.[^)]*SKILL\.md)\)/g;

let totalFiles = 0;
let totalRewrites = 0;

for (const langDir of ['es-skills', 'en-skills']) {
  const base = join(ROOT, langDir);
  const files = walkSkillFiles(base);

  for (const file of files) {
    const original = readFileSync(file, 'utf8');
    let changed = false;

    const rewritten = original.replace(LINK_RE, (match, href) => {
      const fileDir = dirname(file);    // absolute dir of current SKILL.md
      const target = resolve(fileDir, href); // absolute path of referenced SKILL.md
      const targetDir = basename(dirname(target)); // e.g. "gdpr", "frontend"

      // In flat structure all skills are siblings, so the reference is always:
      const flat = `../${targetDir}/SKILL.md`;

      if (href === flat) return match; // already correct

      changed = true;
      totalRewrites++;
      const rel = relative(ROOT, file);
      console.log(`  ${rel}:  ${href}  →  ${flat}`);
      return `](${flat})`;
    });

    if (changed) {
      totalFiles++;
      if (!DRY_RUN) {
        writeFileSync(file, rewritten, 'utf8');
      }
    }
  }
}

console.log(
  `\n${DRY_RUN ? '[DRY RUN] ' : ''}Rewrote ${totalRewrites} links in ${totalFiles} files.`,
);
