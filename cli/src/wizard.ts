import * as p from '@clack/prompts';
import pc from 'picocolors';

import { CATEGORIES, GROUPS, type Lang, t } from './catalog.js';
import {
  resolveSkillsSource,
  resolveTarget,
  installSkills,
  readManifest,
  updateSkills,
  cleanSkills,
  countCategoryFiles,
} from './installer.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACK = '__back__';
const VERSION = '0.1.0';

function backOption(l: Lang) {
  return { value: BACK, label: pc.dim(`← ${t(l, 'goBack')}`) } as const;
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

function showBanner(): void {
  const line = pc.dim('─'.repeat(50));
  console.log();
  console.log(`  ${line}`);
  console.log(`   ${pc.bold(pc.cyan('delrio.dev'))} ${pc.dim('·')} ${pc.bold('copilot-skills')}  ${pc.dim(`v${VERSION}`)}`);
  console.log();
  console.log(`   ${pc.dim('Open-source Copilot skill library')}`);
  console.log(`   ${pc.dim('Biblioteca abierta de skills para Copilot')}`);
  console.log(`  ${line}`);
  console.log();
}

// ---------------------------------------------------------------------------
// Shared: target selection for update / clean
// ---------------------------------------------------------------------------

async function selectTargetDir(l: Lang): Promise<string | typeof BACK | null> {
  const target = await p.select({
    message: t(l, 'selectInstalledTarget'),
    options: [
      { value: 'github', label: '.github/skills/', hint: t(l, 'targetGithubHint') },
      { value: 'vscode', label: '.vscode/skills/', hint: t(l, 'targetVSCodeHint') },
      { value: 'user', label: t(l, 'targetUser'), hint: t(l, 'targetUserHint') },
      { value: 'custom', label: t(l, 'targetCustom') },
      backOption(l),
    ],
  });

  if (p.isCancel(target)) return null;
  if (target === BACK) return BACK;

  if (target === 'custom') {
    const customPath = await p.text({
      message: t(l, 'enterPath'),
      placeholder: './my-skills/',
      validate: (v) => (!v?.trim() ? t(l, 'pathRequired') : undefined),
    });
    if (p.isCancel(customPath)) return BACK;
    return resolveTarget('custom', customPath as string);
  }

  return resolveTarget(target as string);
}

// ---------------------------------------------------------------------------
// Interactive Wizard (step machine with back navigation)
// ---------------------------------------------------------------------------

export async function runWizard(): Promise<void> {
  console.clear();
  showBanner();

  // ── Shared state ───────────────────────────────────────────────────────
  let step = 0;
  let l: Lang = 'en';
  let action = 'install';
  let mode = 'all';
  let selectedCategoryIds: string[] = [];
  let targetDir = '';
  let categoryCounts = new Map<string, number>();
  let totalFiles = 0;

  while (step < 100) {
    switch (step) {
      // ── Step 0: Language ─────────────────────────────────────────────
      case 0: {
        const lang = await p.select({
          message: 'Choose language / Elige idioma',
          options: [
            { value: 'en', label: '🇬🇧  English', hint: 'Skills content in English' },
            { value: 'es', label: '🇪🇸  Español', hint: 'Contenido de skills en español' },
          ],
        });

        if (p.isCancel(lang)) return cancel();
        l = lang as Lang;

        // Compute file counts dynamically from the skill source
        const source = resolveSkillsSource(l);
        categoryCounts = new Map<string, number>();
        totalFiles = 0;
        for (const cat of CATEGORIES) {
          const count = await countCategoryFiles(source, cat.paths);
          categoryCounts.set(cat.id, count);
          totalFiles += count;
        }

        step = 1;
        break;
      }

      // ── Step 1: Action ───────────────────────────────────────────────
      case 1: {
        const result = await p.select({
          message: t(l, 'selectAction'),
          options: [
            { value: 'install', label: `📦  ${t(l, 'actionInstall')}`, hint: t(l, 'actionInstallHint') },
            { value: 'update', label: `🔄  ${t(l, 'actionUpdate')}`, hint: t(l, 'actionUpdateHint') },
            { value: 'clean', label: `🧹  ${t(l, 'actionClean')}`, hint: t(l, 'actionCleanHint') },
            backOption(l),
          ],
        });

        if (p.isCancel(result)) return cancel(l);
        if (result === BACK) { step = 0; break; }

        action = result as string;
        if (action === 'install') step = 2;
        else if (action === 'update') step = 10;
        else step = 20;
        break;
      }

      // ═════════════════════════════════════════════════════════════════
      // INSTALL FLOW (steps 2–6)
      // ═════════════════════════════════════════════════════════════════

      // ── Step 2: Mode ─────────────────────────────────────────────────
      case 2: {
        const result = await p.select({
          message: t(l, 'selectMode'),
          options: [
            { value: 'all', label: t(l, 'allSkills'), hint: `${totalFiles} files` },
            { value: 'category', label: t(l, 'byCategory'), hint: t(l, 'byCategoryHint') },
            { value: 'group', label: t(l, 'presetGroup'), hint: t(l, 'presetGroupHint') },
            backOption(l),
          ],
        });

        if (p.isCancel(result)) return cancel(l);
        if (result === BACK) { step = 1; break; }

        mode = result as string;
        if (mode === 'all') {
          selectedCategoryIds = CATEGORIES.map((c) => c.id);
          step = 4;
        } else {
          step = 3;
        }
        break;
      }

      // ── Step 3: Category / Group Selection ───────────────────────────
      case 3: {
        if (mode === 'category') {
          const cats = await p.multiselect({
            message: t(l, 'selectCategories'),
            options: [
              ...CATEGORIES.map((c) => ({
                value: c.id,
                label: c.label[l],
                hint: `${categoryCounts.get(c.id) ?? 0} files`,
              })),
              backOption(l),
            ],
            required: true,
          });

          if (p.isCancel(cats)) return cancel(l);
          if ((cats as string[]).includes(BACK)) { step = 2; break; }
          selectedCategoryIds = (cats as string[]).filter((id) => id !== BACK);
        } else {
          const groupId = await p.select({
            message: t(l, 'selectGroup'),
            options: [
              ...GROUPS.map((g) => ({
                value: g.id,
                label: g.label[l],
                hint: g.hint[l],
              })),
              backOption(l),
            ],
          });

          if (p.isCancel(groupId)) return cancel(l);
          if (groupId === BACK) { step = 2; break; }
          const group = GROUPS.find((g) => g.id === groupId)!;
          selectedCategoryIds = group.categoryIds;
        }

        step = 4;
        break;
      }

      // ── Step 4: Install Target ───────────────────────────────────────
      case 4: {
        const target = await p.select({
          message: t(l, 'selectTarget'),
          options: [
            { value: 'github', label: '.github/skills/', hint: t(l, 'targetGithubHint') },
            { value: 'vscode', label: '.vscode/skills/', hint: t(l, 'targetVSCodeHint') },
            { value: 'user', label: t(l, 'targetUser'), hint: t(l, 'targetUserHint') },
            { value: 'custom', label: t(l, 'targetCustom') },
            backOption(l),
          ],
        });

        if (p.isCancel(target)) return cancel(l);
        if (target === BACK) { step = mode === 'all' ? 2 : 3; break; }

        if (target === 'custom') {
          const customPath = await p.text({
            message: t(l, 'enterPath'),
            placeholder: './my-skills/',
            validate: (v) => (!v?.trim() ? t(l, 'pathRequired') : undefined),
          });
          if (p.isCancel(customPath)) break; // re-show target
          targetDir = resolveTarget('custom', customPath as string);
        } else {
          targetDir = resolveTarget(target as string);
        }

        step = 5;
        break;
      }

      // ── Step 5: Install Summary + Confirm ────────────────────────────
      case 5: {
        const selectedCategories = CATEGORIES.filter((c) =>
          selectedCategoryIds.includes(c.id),
        );
        const summaryTotal = selectedCategories.reduce(
          (sum, c) => sum + (categoryCounts.get(c.id) ?? 0),
          0,
        );
        const summaryLines = selectedCategories.map(
          (c) =>
            `  ${pc.cyan('•')} ${c.label[l]} ${pc.dim(`(${categoryCounts.get(c.id) ?? 0} files)`)}`,
        );

        p.note(
          summaryLines.join('\n') +
            '\n' +
            `\n  ${pc.bold(t(l, 'total'))}: ${summaryTotal} files` +
            `\n  ${pc.bold(t(l, 'destination'))}: ${targetDir}`,
          t(l, 'summary'),
        );

        const ok = await p.confirm({ message: t(l, 'confirmInstall') });
        if (p.isCancel(ok)) return cancel(l);
        if (!ok) { step = 4; break; }
        step = 6;
        break;
      }

      // ── Step 6: Execute Install ──────────────────────────────────────
      case 6: {
        const selectedCategories = CATEGORIES.filter((c) =>
          selectedCategoryIds.includes(c.id),
        );
        const selectedPaths = selectedCategories.flatMap((c) => c.paths);

        const s = p.spinner();
        s.start(t(l, 'installing'));

        const sourceDir = resolveSkillsSource(l);
        const count = await installSkills(sourceDir, selectedPaths, targetDir, l);

        s.stop(pc.green(`✓ ${count} ${t(l, 'filesInstalled')}`));
        p.outro(`${t(l, 'done')} ${pc.dim(targetDir)}`);
        step = 100;
        break;
      }

      // ═════════════════════════════════════════════════════════════════
      // UPDATE FLOW (steps 10–12)
      // ═════════════════════════════════════════════════════════════════

      // ── Step 10: Select target to update ─────────────────────────────
      case 10: {
        const dir = await selectTargetDir(l);
        if (dir === null) return cancel(l);
        if (dir === BACK) { step = 1; break; }

        targetDir = dir;
        step = 11;
        break;
      }

      // ── Step 11: Show manifest + confirm update ──────────────────────
      case 11: {
        const manifest = await readManifest(targetDir);

        if (!manifest) {
          p.log.warning(t(l, 'noManifestFound'));
          step = 10;
          break;
        }

        const skillLines = manifest.skills.map(
          (s) => `  ${pc.cyan('•')} ${s}`,
        );

        p.note(
          `${t(l, 'affectedSkills')} ${pc.bold(String(manifest.skills.length))}\n\n` +
            skillLines.join('\n') +
            `\n\n  ${pc.bold(t(l, 'destination'))}: ${targetDir}`,
          `🔄 ${t(l, 'actionUpdate')}`,
        );

        const ok = await p.confirm({ message: t(l, 'confirmUpdate') });
        if (p.isCancel(ok)) return cancel(l);
        if (!ok) { step = 10; break; }
        step = 12;
        break;
      }

      // ── Step 12: Execute update ──────────────────────────────────────
      case 12: {
        const s = p.spinner();
        s.start(t(l, 'updating'));

        const count = await updateSkills(targetDir);

        s.stop(pc.green(`✓ ${count} ${t(l, 'skillsUpdated')}`));
        p.outro(`${t(l, 'updateDone')} ${pc.dim(targetDir)}`);
        step = 100;
        break;
      }

      // ═════════════════════════════════════════════════════════════════
      // CLEAN FLOW (steps 20–22)
      // ═════════════════════════════════════════════════════════════════

      // ── Step 20: Select target to clean ──────────────────────────────
      case 20: {
        const dir = await selectTargetDir(l);
        if (dir === null) return cancel(l);
        if (dir === BACK) { step = 1; break; }

        targetDir = dir;
        step = 21;
        break;
      }

      // ── Step 21: Show manifest + confirm clean ───────────────────────
      case 21: {
        const manifest = await readManifest(targetDir);

        if (!manifest) {
          p.log.warning(t(l, 'noManifestFound'));
          step = 20;
          break;
        }

        const skillLines = manifest.skills.map(
          (s) => `  ${pc.red('•')} ${s}`,
        );

        p.note(
          `${t(l, 'affectedSkills')} ${pc.bold(String(manifest.skills.length))}\n\n` +
            skillLines.join('\n') +
            `\n\n  ${pc.bold(t(l, 'destination'))}: ${targetDir}`,
          `🧹 ${t(l, 'actionClean')}`,
        );

        const ok = await p.confirm({ message: t(l, 'confirmClean') });
        if (p.isCancel(ok)) return cancel(l);
        if (!ok) { step = 20; break; }
        step = 22;
        break;
      }

      // ── Step 22: Execute clean ───────────────────────────────────────
      case 22: {
        const s = p.spinner();
        s.start(t(l, 'cleaning'));

        const count = await cleanSkills(targetDir);

        s.stop(pc.green(`✓ ${count} ${t(l, 'skillsCleaned')}`));
        p.outro(`${t(l, 'cleanDone')} ${pc.dim(targetDir)}`);
        step = 100;
        break;
      }

      default:
        step = 100;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cancel(lang?: Lang): void {
  p.cancel(lang ? t(lang, 'cancelled') : 'Cancelled.');
  process.exit(0);
}
