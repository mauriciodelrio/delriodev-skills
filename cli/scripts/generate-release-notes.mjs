#!/usr/bin/env node

/**
 * generate-release-notes.mjs
 *
 * Generates release notes based on merged PRs since the last tag.
 * Optionally uses AI (GitHub Models or OpenAI) to produce a high-level summary.
 *
 * Usage:
 *   node scripts/generate-release-notes.mjs <version>
 *
 * Environment variables:
 *   GITHUB_TOKEN / GH_TOKEN     – GitHub token (for `gh` CLI + GitHub Models)
 *   GH_MODELS_TOKEN             – Separate token for GitHub Models (optional, overrides GITHUB_TOKEN)
 *   OPENAI_API_KEY              – OpenAI API key (alternative to GitHub Models)
 *   AI_PROVIDER                 – "github" (default) | "openai"
 *   AI_MODEL                    – Override model name
 *   REPO_URL                    – Override repository URL
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_DIR = join(__dirname, "..");
const CHANGELOG_PATH = join(CLI_DIR, "CHANGELOG.md");
const RELEASE_NOTES_PATH = join(CLI_DIR, ".release-notes.md");
const REPO_URL =
  process.env.REPO_URL || "https://github.com/mauriciodelrio/delriodev-skills";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function exec(cmd) {
  return execSync(cmd, { encoding: "utf-8", cwd: CLI_DIR }).trim();
}

function log(msg) {
  console.log(`  [release-notes] ${msg}`);
}

function warn(msg) {
  console.warn(`  [release-notes] ⚠ ${msg}`);
}

// ─── 1. Parse version ─────────────────────────────────────────────────────────

const version = process.argv[2];
if (!version) {
  console.error("Usage: node scripts/generate-release-notes.mjs <version>");
  process.exit(1);
}

log(`Generating release notes for v${version}…`);

// ─── 2. Find the previous tag ─────────────────────────────────────────────────

let previousTag = null;
try {
  const tags = exec("git tag --sort=-v:refname")
    .split("\n")
    .filter(Boolean);
  if (tags.length > 0) {
    previousTag = tags[0];
    log(`Previous tag: ${previousTag}`);
  }
} catch {
  log("No previous tags found — will include all merged PRs.");
}

// ─── 3. Fetch merged PRs since previous tag ──────────────────────────────────

let prs = [];
try {
  // Get the ISO date of the previous tag (or epoch if none)
  let sinceDate = "2000-01-01";
  if (previousTag) {
    sinceDate = exec(`git log -1 --format=%aI ${previousTag}`).split("T")[0];
  }

  const prsJson = exec(
    `gh pr list --state merged --base main ` +
      `--search "is:merged merged:>=${sinceDate}" ` +
      `--json number,title,body,url,mergedAt ` +
      `--limit 100`,
  );

  const allPrs = JSON.parse(prsJson);

  // Precise filter: only PRs merged strictly AFTER the previous tag date-time
  if (previousTag) {
    const tagDate = new Date(
      exec(`git log -1 --format=%aI ${previousTag}`),
    );
    prs = allPrs.filter((pr) => new Date(pr.mergedAt) > tagDate);
  } else {
    prs = allPrs;
  }

  // Exclude automated release PRs
  prs = prs.filter(
    (pr) =>
      !pr.title.toLowerCase().startsWith("chore: release") &&
      !pr.title.toLowerCase().startsWith("chore(release)"),
  );

  log(`Found ${prs.length} merged PR(s) since ${previousTag || "the beginning"}`);
} catch (err) {
  warn(`Could not fetch PRs via \`gh\` CLI: ${err.message}`);
  warn("Make sure `gh` is installed and authenticated.");
}

// ─── 4. AI summary (optional) ────────────────────────────────────────────────

async function generateAISummary(prs) {
  const provider = process.env.AI_PROVIDER || "github";

  let baseUrl, model, token;

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    baseUrl = "https://api.openai.com/v1";
    model = process.env.AI_MODEL || "gpt-4o-mini";
    token = process.env.OPENAI_API_KEY;
  } else {
    // Default: GitHub Models
    token =
      process.env.GH_MODELS_TOKEN ||
      process.env.GH_TOKEN ||
      process.env.GITHUB_TOKEN;
    if (!token) {
      warn(
        "No AI token found (set GH_MODELS_TOKEN, GITHUB_TOKEN, or OPENAI_API_KEY). Skipping AI summary.",
      );
      return null;
    }
    baseUrl = "https://models.github.ai/inference";
    model = process.env.AI_MODEL || "openai/gpt-4o-mini";
  }

  const prDescriptions = prs
    .map((pr) => {
      const body = pr.body ? pr.body.substring(0, 500) : "(no description)";
      return `- PR #${pr.number}: ${pr.title}\n  ${body}`;
    })
    .join("\n\n");

  const systemPrompt = `You are a technical writer creating release notes for "delriodev-skills", an npm CLI that installs GitHub Copilot custom skills for software development, security, and compliance. Write concise, user-focused release overviews.`;

  const userPrompt = `Given the following merged Pull Requests for version ${version}, write a concise release overview in 2-4 sentences. Use natural English prose, not bullet points. Focus on what matters to users: new features, improvements, and fixes.

PRs:
${prDescriptions}

Write ONLY the overview paragraph.`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      warn(`AI API returned ${response.status}: ${errText.substring(0, 200)}`);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    warn(`AI summary request failed: ${err.message}`);
    return null;
  }
}

// ─── 5. Build and write release notes ────────────────────────────────────────

async function main() {
  const date = new Date().toISOString().split("T")[0];
  const compareUrl = previousTag
    ? `${REPO_URL}/compare/${previousTag}...v${version}`
    : `${REPO_URL}/releases/tag/v${version}`;

  // Attempt AI summary
  let aiSummary = null;
  if (prs.length > 0) {
    aiSummary = await generateAISummary(prs);
    if (aiSummary) {
      log("AI summary generated successfully.");
    }
  }

  // ── Format Markdown ──

  const lines = [];
  lines.push(`## [${version}](${compareUrl}) (${date})`);
  lines.push("");

  if (aiSummary) {
    lines.push(aiSummary);
    lines.push("");
  }

  if (prs.length > 0) {
    lines.push("### Pull Requests");
    lines.push("");
    for (const pr of prs.sort((a, b) => a.number - b.number)) {
      lines.push(`- [#${pr.number}](${pr.url}) ${pr.title}`);
    }
  } else {
    lines.push("_No pull requests found for this release._");
  }

  lines.push("");
  const releaseNotesBlock = lines.join("\n");

  // ── Write .release-notes.md (GitHub Release body) ──

  writeFileSync(RELEASE_NOTES_PATH, releaseNotesBlock, "utf-8");
  log(`Wrote .release-notes.md`);

  // ── Prepend to CHANGELOG.md ──

  const header = "# Changelog\n\n";
  let existing = "";
  if (existsSync(CHANGELOG_PATH)) {
    existing = readFileSync(CHANGELOG_PATH, "utf-8").replace(
      /^# Changelog\n+/,
      "",
    );
  }

  writeFileSync(CHANGELOG_PATH, `${header}${releaseNotesBlock}\n${existing}`, "utf-8");
  log(`Updated CHANGELOG.md`);
  log("Done ✔");
}

main().catch((err) => {
  console.error("[release-notes] Fatal:", err);
  process.exit(1);
});
