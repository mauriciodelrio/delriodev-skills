---
name: scripting
description: >
  Reglas para shell scripting profesional (Bash/Zsh). Cubre estructura de archivos
  .sh, atomicidad de scripts, uso de sed/awk/grep sobre ciclos explícitos, permisos,
  estilos de terminal (colores/formato), captura de outputs, creación de CLIs cuando
  sea necesario, y reglas para scripts simples vs herramientas complejas. Preferir
  pipelines nativos de Unix sobre loops imperativos.
---

# 🐚 Shell Scripting — Reglas

## Principio Rector

> **Un script es software — trátalo como tal.** Debe ser legible, atómico,
> y fallar ruidosamente. Pero no todo necesita ser un CLI con flags y menús.
> Si un pipeline de 3 comandos resuelve el problema, no escribas 50 líneas.

---

## 1. Estructura de un Archivo .sh

```bash
#!/usr/bin/env bash
# ─────────────────────────────────────────────
# Nombre: deploy.sh
# Propósito: Construir y deployar la app a staging
# Uso: ./deploy.sh [--skip-tests] [--env staging|production]
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
  log_success "Deploy completado en ${TARGET_ENV}"
}

main "$@"
```

### Reglas del encabezado

| Regla | Detalle |
|-------|---------|
| **Shebang** | Siempre `#!/usr/bin/env bash` (portable entre sistemas) |
| **Encabezado** | Nombre, propósito, uso — máximo 4 líneas |
| **`set -euo pipefail`** | Obligatorio en todo script (ver sección 2) |
| **`readonly`** | Para constantes — previene modificación accidental |
| **`source`** | Imports explícitos al inicio |
| **`main()`** | Envolver lógica en función main — siempre al final: `main "$@"` |

---

## 2. set -euo pipefail — No Negociable

```bash
set -euo pipefail

# -e  → Salir inmediatamente si un comando falla (exit code != 0)
# -u  → Error si se usa una variable no definida ($UNDEFINED → error)
# -o pipefail → Falla si CUALQUIER comando en un pipeline falla
#               (sin esto, solo se revisa el exit code del último)

# Ejemplo de por qué importa pipefail:
curl -s https://api.example.com/data | jq '.items'
# Sin pipefail: si curl falla, jq recibe input vacío y "funciona" → silencioso
# Con pipefail: curl falla → pipeline falla → script se detiene
```

### Manejo de errores controlado

```bash
# Si un comando PUEDE fallar y quieres manejarlo:
if ! command -v docker &>/dev/null; then
  log_error "Docker no está instalado"
  exit 1
fi

# O con || para fallback:
git describe --tags 2>/dev/null || echo "v0.0.0-dev"
```

---

## 3. Evitar Ciclos — Usar Herramientas Unix

> **Regla:** Si estás escribiendo `while read` o `for` para procesar texto,
> probablemente `grep`, `sed`, `awk`, `cut`, `sort`, `uniq`, o `xargs` lo hacen mejor.

### grep — Filtrar

```bash
# ❌ Loop para buscar
while IFS= read -r line; do
  if [[ "$line" == *"ERROR"* ]]; then
    echo "$line"
  fi
done < app.log

# ✅ grep
grep "ERROR" app.log

# ✅ grep avanzado
grep -E "ERROR|WARN" app.log           # Múltiples patrones
grep -c "ERROR" app.log                 # Solo contar ocurrencias
grep -rn "TODO" src/                    # Recursivo con número de línea
grep -v "node_modules" <<< "$output"    # Invertir (excluir)
grep -l "deprecated" src/**/*.ts        # Solo nombres de archivo
```

### sed — Transformar

```bash
# ❌ Loop para reemplazar
while IFS= read -r line; do
  echo "${line//old/new}"
done < config.txt > config.tmp && mv config.tmp config.txt

# ✅ sed (in-place con backup en macOS)
sed -i '' 's/old/new/g' config.txt                # macOS
sed -i 's/old/new/g' config.txt                    # Linux

# ✅ sed avanzado
sed -n '10,20p' app.log                            # Líneas 10 a 20
sed '/^#/d' config.txt                             # Eliminar comentarios
sed 's/version: .*/version: 2.0.0/' package.yaml  # Reemplazar línea parcial
```

### awk — Procesar columnas

```bash
# ❌ Loop para extraer columnas
while IFS= read -r line; do
  name=$(echo "$line" | cut -d',' -f2)
  price=$(echo "$line" | cut -d',' -f4)
  echo "$name: $price"
done < products.csv

# ✅ awk (hace todo en una pasada)
awk -F',' '{print $2 ": " $4}' products.csv

# ✅ awk avanzado
awk -F',' '$4 > 100 {print $2, $4}' products.csv       # Filtrar + extraer
awk '{sum += $1} END {print sum}' numbers.txt            # Sumar columna
awk 'NR > 1' data.csv                                    # Saltar header
docker ps | awk 'NR > 1 {print $1}' | xargs docker stop # IDs de containers
```

### xargs — Ejecutar sobre resultados

```bash
# ❌ Loop para ejecutar
for file in $(find . -name "*.tmp"); do
  rm "$file"
done

# ✅ find + xargs (maneja espacios, más eficiente)
find . -name "*.tmp" -print0 | xargs -0 rm

# ✅ Más ejemplos
git diff --name-only | xargs wc -l                        # Líneas cambiadas
grep -rl "oldFunction" src/ | xargs sed -i '' 's/oldFunction/newFunction/g'
find . -name "*.test.ts" -print0 | xargs -0 -P4 vitest   # Paralelo (-P4)
```

### Pipelines — Composición

```bash
# ✅ Pipeline: cada comando hace una cosa, compuestos hacen algo poderoso
# Top 10 IPs con más requests en un log de nginx:
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -10

# Archivos TypeScript más largos del proyecto:
find src -name "*.ts" -not -path "*/node_modules/*" \
  | xargs wc -l \
  | sort -rn \
  | head -20

# Dependencias directas no usadas en el código:
jq -r '.dependencies | keys[]' package.json \
  | while read -r dep; do
      grep -rq "$dep" src/ || echo "Unused: $dep"
    done
```

> **Excepción válida para loops:** cuando cada iteración requiere lógica condicional
> compleja o side effects (API calls, prompts interactivos). Para transformación
> de texto, siempre preferir herramientas Unix.

---

## 4. Permisos de Archivos

```bash
# ✅ Hacer ejecutable al crear
chmod +x script.sh

# ✅ Permisos estándar
chmod 755 script.sh   # rwxr-xr-x — owner ejecuta, grupo y otros leen+ejecutan
chmod 700 secrets.sh  # rwx------ — solo el owner (scripts con credenciales)
chmod 644 config.sh   # rw-r--r-- — configs que se sourcean, no se ejecutan

# ✅ Verificar permisos antes de comprometer
ls -la scripts/

# ❌ NUNCA: chmod 777 — cualquiera puede modificar y ejecutar
# ❌ NUNCA: scripts con credenciales hardcodeadas con permisos abiertos

# Git: preservar bit de ejecución
git add --chmod=+x script.sh
git update-index --chmod=+x script.sh
```

---

## 5. Archivo de Estilos de Terminal

Centralizar colores y formato en un archivo reutilizable:

```bash
# scripts/lib/styles.sh
# ─────────────────────────────────────────────
# Estilos de terminal — source este archivo, no ejecutar directamente.
# Uso: source "$(dirname "$0")/lib/styles.sh"
# ─────────────────────────────────────────────

# Solo aplicar colores si stdout es una terminal (no en CI o pipes)
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

# ── Funciones de logging ────────────────────
log_info()    { echo -e "${BLUE}ℹ${NC} $*"; }
log_success() { echo -e "${GREEN}✔${NC} $*"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $*" >&2; }
log_error()   { echo -e "${RED}✖${NC} $*" >&2; }
log_step()    { echo -e "${CYAN}→${NC} ${BOLD}$*${NC}"; }

# ── Separadores ─────────────────────────────
log_header() {
  echo ""
  echo -e "${BOLD}── $* ──${NC}"
}

# ── Spinner simple (para waits) ─────────────
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

### Uso

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib/styles.sh"

log_header "Deploying to staging"
log_step "Building project..."
pnpm build 2>&1 | while IFS= read -r line; do echo -e "  ${DIM}${line}${NC}"; done
log_success "Build completado"

log_step "Running tests..."
if pnpm test:ci; then
  log_success "Tests pasaron"
else
  log_error "Tests fallaron — abortando deploy"
  exit 1
fi
```

---

## 6. Captura de Outputs

```bash
# ✅ Capturar stdout en variable
version=$(node -p "require('./package.json').version")
current_branch=$(git branch --show-current)
timestamp=$(date +%Y%m%d-%H%M%S)

# ✅ Capturar exit code sin que -e mate el script
if output=$(pnpm build 2>&1); then
  log_success "Build OK"
else
  exit_code=$?
  log_error "Build falló (exit: ${exit_code})"
  echo "$output" > build-error.log
  exit "$exit_code"
fi

# ✅ Separar stdout y stderr
{
  stdout=$(command 2>stderr.tmp)
  stderr=$(cat stderr.tmp)
  rm -f stderr.tmp
}

# ✅ Redirigir todo a archivo y terminal simultáneamente
pnpm build 2>&1 | tee build.log

# ✅ Silenciar output (solo interesa el exit code)
if git diff --quiet HEAD; then
  log_info "No hay cambios"
fi

# ✅ Timeout para comandos que pueden colgar
timeout 30 curl -s https://api.example.com/health || log_error "Health check timeout"
```

---

## 7. CLIs — Cuándo Sí, Cuándo No

### Cuándo NO crear un CLI

```bash
# Si el script hace UNA cosa y se llama sin argumentos o con 1-2 args:
# → Script simple. No necesitas un CLI con --flags y menús.

# ✅ Script simple — suficiente
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/lib/styles.sh"

log_step "Cleaning build artifacts..."
rm -rf .next dist coverage .turbo
log_success "Clean completado"
```

### Cuándo SÍ crear un CLI

- El script tiene **3+ opciones** que cambian comportamiento.
- Lo usan **múltiples personas** del equipo.
- Necesita **modo interactivo** y **modo headless** (CI).
- Se ejecuta con **combinaciones** de flags.

```bash
#!/usr/bin/env bash
# ─────────────────────────────────────────────
# CLI: deploy.sh
# Uso: ./deploy.sh --env staging --skip-tests --verbose
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
Uso: $(basename "$0") [opciones]

Opciones:
  --env <staging|production>   Entorno destino (default: staging)
  --skip-tests                 Saltar ejecución de tests
  --verbose                    Output detallado
  -h, --help                   Mostrar esta ayuda

Ejemplos:
  $(basename "$0") --env production
  $(basename "$0") --skip-tests --verbose
EOF
  exit 0
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env)
        TARGET_ENV="${2:?'--env requiere un valor (staging|production)'}"
        shift 2
        ;;
      --skip-tests)  SKIP_TESTS=true; shift ;;
      --verbose)     VERBOSE=true; shift ;;
      -h|--help)     usage ;;
      *)
        log_error "Opción desconocida: $1"
        usage
        ;;
    esac
  done
}

# ── Validación ──────────────────────────────
validate() {
  case "$TARGET_ENV" in
    staging|production) ;;
    *) log_error "Entorno inválido: $TARGET_ENV"; exit 1 ;;
  esac

  if [[ "$TARGET_ENV" == "production" ]]; then
    log_warn "⚠ Vas a deployar a PRODUCCIÓN"
    read -rp "¿Continuar? (y/N): " confirm
    [[ "$confirm" =~ ^[yY]$ ]] || { log_info "Cancelado"; exit 0; }
  fi

  command -v pnpm &>/dev/null || { log_error "pnpm no encontrado"; exit 1; }
}

# ── Steps atómicos ──────────────────────────
run_tests() {
  if [[ "$SKIP_TESTS" == true ]]; then
    log_warn "Tests saltados (--skip-tests)"
    return
  fi
  log_step "Ejecutando tests..."
  pnpm test:ci
  log_success "Tests pasaron"
}

build() {
  log_step "Building para ${TARGET_ENV}..."
  NODE_ENV=production pnpm build
  log_success "Build completado"
}

deploy() {
  log_step "Deploying a ${TARGET_ENV}..."
  # ... lógica de deploy
  log_success "Deploy completado en ${TARGET_ENV}"
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

## 8. Atomicidad de Scripts

Cada script hace **una cosa**. Para flujos complejos, componer scripts atómicos.

```
scripts/
├── lib/
│   ├── styles.sh          ← Colores y logging (shared)
│   └── utils.sh           ← Funciones de utilidad (shared)
├── clean.sh               ← Limpiar artifacts
├── lint.sh                ← Ejecutar linters
├── test.sh                ← Ejecutar tests
├── build.sh               ← Build del proyecto
├── deploy.sh              ← CLI de deploy (compone los anteriores)
└── setup.sh               ← Setup inicial del proyecto (onboarding)
```

```bash
# deploy.sh puede invocar scripts atómicos:
main() {
  "${SCRIPT_DIR}/clean.sh"
  "${SCRIPT_DIR}/lint.sh"
  "${SCRIPT_DIR}/test.sh"
  "${SCRIPT_DIR}/build.sh"
  do_deploy
}
```

---

## 9. Variables y Quoting

```bash
# ✅ SIEMPRE quotear variables (protege contra word splitting y globbing)
echo "$variable"            # ✅
rm -rf "${BUILD_DIR:?}"     # ✅ :? previene rm -rf / si variable vacía

# ❌ Variables sin quotes
echo $variable              # Word splitting si tiene espacios
rm -rf $BUILD_DIR           # Si está vacía → rm -rf / (catastrófico)

# ✅ Arrays para argumentos complejos
build_args=(--mode production --output dist)
if [[ "$VERBOSE" == true ]]; then
  build_args+=(--verbose)
fi
pnpm build "${build_args[@]}"

# ✅ Heredocs para textos largos
cat <<EOF > config.json
{
  "env": "${TARGET_ENV}",
  "version": "${VERSION}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# ✅ Condiciones con [[ ]] (no [ ])
[[ -f "$file" ]]       # Existe y es archivo
[[ -d "$dir" ]]        # Existe y es directorio
[[ -z "$var" ]]        # String vacío
[[ -n "$var" ]]        # String no vacío
[[ "$a" == "$b" ]]     # Comparación de strings (soporta glob con ==)
(( count > 10 ))       # Comparación numérica
```

---

## 10. Traps y Cleanup

```bash
# ✅ Limpiar recursos temporales al salir (éxito o error)
TEMP_DIR=""

cleanup() {
  if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
    rm -rf "$TEMP_DIR"
  fi
}

trap cleanup EXIT  # Se ejecuta siempre al salir del script

main() {
  TEMP_DIR=$(mktemp -d)
  # ... usar $TEMP_DIR con confianza, cleanup pase lo que pase
}
```

---

## Anti-patrones

```bash
# ❌ Sin set -euo pipefail — errores silenciosos
# ❌ while read loop para procesar texto → usar grep/sed/awk
# ❌ Variables sin quotear → word splitting, rm -rf desastroso
# ❌ chmod 777 — jamás
# ❌ curl | bash sin verificar qué descarga
# ❌ Credenciales hardcodeadas en scripts
# ❌ Scripts de 200+ líneas sin funciones → dividir en funciones atómicas
# ❌ echo para logging (sin colores, sin niveles) → usar log_* functions
# ❌ CLI complejo para un script de 10 líneas → KISS
# ❌ cat file | grep pattern → grep pattern file (useless use of cat)
# ❌ ls | while read → find con -print0 | xargs -0 (maneja espacios)
# ❌ [ ] en vez de [[ ]] → [[ ]] es más seguro y potente en bash
# ❌ Confiar en que $PATH tiene los binarios → verificar con command -v
```
