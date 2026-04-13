---
name: scripting
description: >
  Use this skill when writing or modifying Bash/Zsh scripts. Apply
  set -euo pipefail, main() structure, sed/awk/grep over loops, permissions,
  terminal styles, output capture, and decide when a simple script suffices
  vs when to build a CLI with flags.
---

# Shell Scripting

## Agent workflow

1. Every script starts with `#!/usr/bin/env bash` + `set -euo pipefail` + header comment (name, purpose, usage)
2. Use grep/sed/awk/xargs and pipelines over while-read loops for text processing
3. Wrap logic in `main()`, source shared libs (styles.sh, utils.sh) at the top
4. Simple task → simple script. Only build a CLI with flags when 3+ options exist
5. Each script does one thing. Compose atomic scripts for complex flows
6. Validate against the Gotchas section before writing shell scripts

---

## 1. Structure of a .sh File

```bash
#!/usr/bin/env bash
# ─────────────────────────────────────────────
# Name: deploy.sh
# Purpose: Build and deploy the app to staging
# Usage: ./deploy.sh [--skip-tests] [--env staging|production]
# ─────────────────────────────────────────────

set -euo pipefail

# ── Config ──────────────────────────────────
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ── Source ──────────────────────────────────
source "${SCRIPT_DIR}/lib/styles.sh"
source "${SCRIPT_DIR}/lib/utils.sh"

# ── Main ────────────────────────────────────
main() {
  parse_args "$@"
  validate_environment
  build_project
  deploy
  log_success "Deploy completed on ${TARGET_ENV}"
}

main "$@"
```

### Header rules

| Rule | Detail |
|------|--------|
| **Shebang** | Always `#!/usr/bin/env bash` (portable across systems) |
| **Header** | Name, purpose, usage — 4 lines maximum |
| **`set -euo pipefail`** | Mandatory in every script (see section 2) |
| **`readonly`** | For constants — prevents accidental modification |
| **`source`** | Explicit imports at the top |
| **`main()`** | Wrap logic in a main function — always at the end: `main "$@"` |

---

## 2. set -euo pipefail — Non-Negotiable

```bash
set -euo pipefail

# -e  → Exit immediately if a command fails (exit code != 0)
# -u  → Error if an undefined variable is used ($UNDEFINED → error)
# -o pipefail → Fail if ANY command in a pipeline fails
#               (without this, only the last command's exit code is checked)

# Example of why pipefail matters:
curl -s https://api.example.com/data | jq '.items'
# Without pipefail: if curl fails, jq receives empty input and "works" → silent failure
# With pipefail: curl fails → pipeline fails → script stops
```

### Controlled error handling

```bash
# If a command CAN fail and you want to handle it:
if ! command -v docker &>/dev/null; then
  log_error "Docker is not installed"
  exit 1
fi

# Or with || for fallback:
git describe --tags 2>/dev/null || echo "v0.0.0-dev"
```

---

## 3. Avoid Loops — Use Unix Tools

> **Rule:** If you're writing `while read` or `for` to process text,
> `grep`, `sed`, `awk`, `cut`, `sort`, `uniq`, or `xargs` probably do it better.

### grep — Filter

```bash
# ❌ Loop to search
while IFS= read -r line; do
  if [[ "$line" == *"ERROR"* ]]; then
    echo "$line"
  fi
done < app.log

# ✅ grep
grep "ERROR" app.log

# ✅ Advanced grep
grep -E "ERROR|WARN" app.log           # Multiple patterns
grep -c "ERROR" app.log                 # Count occurrences only
grep -rn "TODO" src/                    # Recursive with line number
grep -v "node_modules" <<< "$output"    # Invert (exclude)
grep -l "deprecated" src/**/*.ts        # File names only
```

### sed — Transform

```bash
# ❌ Loop to replace
while IFS= read -r line; do
  echo "${line//old/new}"
done < config.txt > config.tmp && mv config.tmp config.txt

# ✅ sed (in-place with backup on macOS)
sed -i '' 's/old/new/g' config.txt                # macOS
sed -i 's/old/new/g' config.txt                    # Linux

# ✅ Advanced sed
sed -n '10,20p' app.log                            # Lines 10 through 20
sed '/^#/d' config.txt                             # Remove comments
sed 's/version: .*/version: 2.0.0/' package.yaml  # Partial line replace
```

### awk — Process columns

```bash
# ❌ Loop to extract columns
while IFS= read -r line; do
  name=$(echo "$line" | cut -d',' -f2)
  price=$(echo "$line" | cut -d',' -f4)
  echo "$name: $price"
done < products.csv

# ✅ awk (does everything in one pass)
awk -F',' '{print $2 ": " $4}' products.csv

# ✅ Advanced awk
awk -F',' '$4 > 100 {print $2, $4}' products.csv       # Filter + extract
awk '{sum += $1} END {print sum}' numbers.txt            # Sum a column
awk 'NR > 1' data.csv                                    # Skip header
docker ps | awk 'NR > 1 {print $1}' | xargs docker stop # Container IDs
```

### xargs — Execute over results

```bash
# ❌ Loop to execute
for file in $(find . -name "*.tmp"); do
  rm "$file"
done

# ✅ find + xargs (handles spaces, more efficient)
find . -name "*.tmp" -print0 | xargs -0 rm

# ✅ More examples
git diff --name-only | xargs wc -l                        # Changed lines
grep -rl "oldFunction" src/ | xargs sed -i '' 's/oldFunction/newFunction/g'
find . -name "*.test.ts" -print0 | xargs -0 -P4 vitest   # Parallel (-P4)
```

### Pipelines — Composition

```bash
# ✅ Pipeline: each command does one thing, composed they do something powerful
# Top 10 IPs with most requests in an nginx log:
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -10

# Longest TypeScript files in the project:
find src -name "*.ts" -not -path "*/node_modules/*" \
  | xargs wc -l \
  | sort -rn \
  | head -20

# Direct dependencies not used in the code:
jq -r '.dependencies | keys[]' package.json \
  | while read -r dep; do
      grep -rq "$dep" src/ || echo "Unused: $dep"
    done
```

> **Valid exception for loops:** when each iteration requires complex
> conditional logic or side effects (API calls, interactive prompts). For text
> transformation, always prefer Unix tools.

---

## 4. File Permissions

```bash
# ✅ Make executable when creating
chmod +x script.sh

# ✅ Standard permissions
chmod 755 script.sh   # rwxr-xr-x — owner executes, group and others read+execute
chmod 700 secrets.sh  # rwx------ — owner only (scripts with credentials)
chmod 644 config.sh   # rw-r--r-- — configs that are sourced, not executed

# ✅ Verify permissions before committing
ls -la scripts/

# ❌ NEVER: chmod 777 — anyone can modify and execute
# ❌ NEVER: scripts with hardcoded credentials with open permissions

# Git: preserve execution bit
git add --chmod=+x script.sh
git update-index --chmod=+x script.sh
```

---

## 5. Terminal Styles File

Centralize colors and formatting in a reusable file:

```bash
# scripts/lib/styles.sh
# ─────────────────────────────────────────────
# Terminal styles — source this file, do not execute directly.
# Usage: source "$(dirname "$0")/lib/styles.sh"
# ─────────────────────────────────────────────

# Only apply colors if stdout is a terminal (not in CI or pipes)
if [[ -t 1 ]]; then
  readonly RED='\033[0;31m'
  readonly GREEN='\033[0;32m'
  readonly YELLOW='\033[0;33m'
  readonly BLUE='\033[0;34m'
  readonly CYAN='\033[0;36m'
  readonly BOLD='\033[1m'
  readonly DIM='\033[2m'
  readonly NC='\033[0m'  # No Color (reset)
else
  readonly RED='' GREEN='' YELLOW='' BLUE='' CYAN='' BOLD='' DIM='' NC=''
fi

# ── Logging functions ───────────────────
log_info()    { echo -e "${BLUE}ℹ${NC} $*"; }
log_success() { echo -e "${GREEN}✔${NC} $*"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $*" >&2; }
log_error()   { echo -e "${RED}✖${NC} $*" >&2; }
log_step()    { echo -e "${CYAN}→${NC} ${BOLD}$*${NC}"; }

# ── Separators ──────────────────────────
log_header() {
  echo ""
  echo -e "${BOLD}── $* ──${NC}"
}

# ── Simple spinner (for waits) ──────────
spin() {
  local pid=$1
  local chars='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  while kill -0 "$pid" 2>/dev/null; do
    for (( i=0; i<${#chars}; i++ )); do
      printf "\r${CYAN}%s${NC} %s" "${chars:$i:1}" "$2"
      sleep 0.1
    done
  done
  printf "\r"
}
```

### Usage

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib/styles.sh"

log_header "Deploying to staging"
log_step "Building project..."
pnpm build 2>&1 | while IFS= read -r line; do echo -e "  ${DIM}${line}${NC}"; done
log_success "Build completed"

log_step "Running tests..."
if pnpm test:ci; then
  log_success "Tests passed"
else
  log_error "Tests failed — aborting deploy"
  exit 1
fi
```

---

## 6. Output Capture

```bash
# ✅ Capture stdout in a variable
version=$(node -p "require('./package.json').version")
current_branch=$(git branch --show-current)
timestamp=$(date +%Y%m%d-%H%M%S)

# ✅ Capture exit code without -e killing the script
if output=$(pnpm build 2>&1); then
  log_success "Build OK"
else
  exit_code=$?
  log_error "Build failed (exit: ${exit_code})"
  echo "$output" > build-error.log
  exit "$exit_code"
fi

# ✅ Separate stdout and stderr
{
  stdout=$(command 2>stderr.tmp)
  stderr=$(cat stderr.tmp)
  rm -f stderr.tmp
}

# ✅ Redirect everything to file and terminal simultaneously
pnpm build 2>&1 | tee build.log

# ✅ Silence output (only care about exit code)
if git diff --quiet HEAD; then
  log_info "No changes"
fi

# ✅ Timeout for commands that can hang
timeout 30 curl -s https://api.example.com/health || log_error "Health check timeout"
```

---

## 7. CLIs — When Yes, When No

### When NOT to create a CLI

```bash
# If the script does ONE thing and is called without arguments or with 1-2 args:
# → Simple script. You don't need a CLI with --flags and menus.

# ✅ Simple script — sufficient
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib/styles.sh"

log_step "Cleaning build artifacts..."
rm -rf .next dist coverage .turbo
log_success "Clean completed"
```

### When TO create a CLI

- The script has **3+ options** that change behavior.
- **Multiple people** on the team use it.
- It needs **interactive mode** and **headless mode** (CI).
- It's executed with **combinations** of flags.

```bash
#!/usr/bin/env bash
# ─────────────────────────────────────────────
# CLI: deploy.sh
# Usage: ./deploy.sh --env staging --skip-tests --verbose
# ─────────────────────────────────────────────

set -euo pipefail
source "$(dirname "$0")/lib/styles.sh"

# ── Defaults ────────────────────────────────
TARGET_ENV="staging"
SKIP_TESTS=false
VERBOSE=false

# ── Parse args ──────────────────────────────
usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --env <staging|production>   Target environment (default: staging)
  --skip-tests                 Skip test execution
  --verbose                    Detailed output
  -h, --help                   Show this help

Examples:
  $(basename "$0") --env production
  $(basename "$0") --skip-tests --verbose
EOF
  exit 0
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env)
        TARGET_ENV="${2:?'--env requires a value (staging|production)'}"
        shift 2
        ;;
      --skip-tests)  SKIP_TESTS=true; shift ;;
      --verbose)     VERBOSE=true; shift ;;
      -h|--help)     usage ;;
      *)
        log_error "Unknown option: $1"
        usage
        ;;
    esac
  done
}

# ── Validation ──────────────────────────────
validate() {
  case "$TARGET_ENV" in
    staging|production) ;;
    *) log_error "Invalid environment: $TARGET_ENV"; exit 1 ;;
  esac

  if [[ "$TARGET_ENV" == "production" ]]; then
    log_warn "⚠ You are about to deploy to PRODUCTION"
    read -rp "Continue? (y/N): " confirm
    [[ "$confirm" =~ ^[yY]$ ]] || { log_info "Cancelled"; exit 0; }
  fi

  command -v pnpm &>/dev/null || { log_error "pnpm not found"; exit 1; }
}

# ── Atomic steps ────────────────────────────
run_tests() {
  if [[ "$SKIP_TESTS" == true ]]; then
    log_warn "Tests skipped (--skip-tests)"
    return
  fi
  log_step "Running tests..."
  pnpm test:ci
  log_success "Tests passed"
}

build() {
  log_step "Building for ${TARGET_ENV}..."
  NODE_ENV=production pnpm build
  log_success "Build completed"
}

deploy() {
  log_step "Deploying to ${TARGET_ENV}..."
  # ... deploy logic
  log_success "Deploy completed on ${TARGET_ENV}"
}

# ── Main ────────────────────────────────────
main() {
  parse_args "$@"
  log_header "Deploy Pipeline"
  validate
  run_tests
  build
  deploy
}

main "$@"
```

---

## 8. Script Atomicity

Each script does **one thing**. For complex flows, compose atomic scripts.

```
scripts/
├── lib/
│   ├── styles.sh          ← Colors and logging (shared)
│   └── utils.sh           ← Utility functions (shared)
├── clean.sh               ← Clean artifacts
├── lint.sh                ← Run linters
├── test.sh                ← Run tests
├── build.sh               ← Build the project
├── deploy.sh              ← Deploy CLI (composes the above)
└── setup.sh               ← Initial project setup (onboarding)
```

```bash
# deploy.sh can invoke atomic scripts:
main() {
  "${SCRIPT_DIR}/clean.sh"
  "${SCRIPT_DIR}/lint.sh"
  "${SCRIPT_DIR}/test.sh"
  "${SCRIPT_DIR}/build.sh"
  do_deploy
}
```

---

## Gotchas

- Never omit `set -euo pipefail` — without it errors pass silently and the script continues in a corrupted state.
- Don't use while-read loops for text processing — grep/sed/awk are more efficient and expressive.
- Always quote variables (`"$var"`) — without quotes you get word splitting and globbing; `rm -rf $DIR` when empty becomes `rm -rf /`.
- Never `chmod 777` — anyone can modify and execute. Use 755 for scripts, 700 for scripts with secrets.
- Never `curl | bash` without verifying what you're downloading — inspect the script first.
- Don't hardcode credentials in scripts — use environment variables or a secrets manager.
- Scripts of 200+ lines without functions are unreadable — split into atomic functions with descriptive names.
- Don't use `echo` for logging — use `log_*` functions with colors and levels (info, warn, error).
- Don't build a CLI with flags and menus for a 10-line script — KISS.
- `cat file | grep pattern` is a useless use of cat — `grep pattern file` directly.
- `ls | while read` doesn't handle spaces in names — use `find -print0 | xargs -0`.
- Use `[[ ]]` instead of `[ ]` — double brackets are safer and more powerful in bash (supports regex, no word splitting).
- Verify binaries exist with `command -v` before using them — don't trust `$PATH` has them.
