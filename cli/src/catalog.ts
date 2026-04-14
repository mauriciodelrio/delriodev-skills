export type Lang = 'en' | 'es';

// ---------------------------------------------------------------------------
// Categories — each maps to one or more directories in the skills source
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  label: Record<Lang, string>;
  paths: string[]; // relative to skills root (en-skills/ or es-skills/)
}

export const CATEGORIES: Category[] = [
  {
    id: 'frontend',
    label: { en: 'Frontend', es: 'Frontend' },
    paths: ['software/frontend'],
  },
  {
    id: 'backend',
    label: { en: 'Backend', es: 'Backend' },
    paths: ['software/backend'],
  },
  {
    id: 'architecture',
    label: { en: 'Architecture', es: 'Arquitectura' },
    paths: ['software/architecture'],
  },
  {
    id: 'general',
    label: { en: 'General Software', es: 'Software General' },
    paths: [
      'software/git-usage',
      'software/clean-code-principles',
      'software/basic-workflows',
      'software/scripting',
      'software/docker',
      'software/typescript-patterns',
      'software/deploy-pipelines',
    ],
  },
  {
    id: 'agent-workflow',
    label: { en: 'Agent Workflow', es: 'Flujo del Agente' },
    paths: ['agent-workflow'],
  },
  {
    id: 'grc',
    label: { en: 'GRC (Compliance)', es: 'GRC (Cumplimiento)' },
    paths: ['governance-risk-and-compliance'],
  },
];

// ---------------------------------------------------------------------------
// Preset Groups — common category combinations
// ---------------------------------------------------------------------------

export interface PresetGroup {
  id: string;
  label: Record<Lang, string>;
  hint: Record<Lang, string>;
  categoryIds: string[];
}

export const GROUPS: PresetGroup[] = [
  {
    id: 'frontend-dev',
    label: { en: 'Frontend Developer', es: 'Desarrollador Frontend' },
    hint: { en: 'Frontend + General skills', es: 'Frontend + skills generales' },
    categoryIds: ['frontend', 'general'],
  },
  {
    id: 'backend-dev',
    label: { en: 'Backend Developer', es: 'Desarrollador Backend' },
    hint: { en: 'Backend + General skills', es: 'Backend + skills generales' },
    categoryIds: ['backend', 'general'],
  },
  {
    id: 'fullstack',
    label: { en: 'Full Stack', es: 'Full Stack' },
    hint: {
      en: 'Frontend + Backend + Architecture + General',
      es: 'Frontend + Backend + Arquitectura + General',
    },
    categoryIds: ['frontend', 'backend', 'architecture', 'general'],
  },
  {
    id: 'devops',
    label: { en: 'DevOps / Platform', es: 'DevOps / Plataforma' },
    hint: {
      en: 'Architecture + General (Docker, Deploy, Scripting…)',
      es: 'Arquitectura + General (Docker, Deploy, Scripting…)',
    },
    categoryIds: ['architecture', 'general'],
  },
  {
    id: 'agent',
    label: { en: 'Agent Workflow', es: 'Flujo del Agente' },
    hint: { en: 'AI agent work protocol', es: 'Protocolo de trabajo del agente IA' },
    categoryIds: ['agent-workflow'],
  },
  {
    id: 'compliance',
    label: { en: 'Compliance Only', es: 'Solo Cumplimiento' },
    hint: { en: 'GDPR, HIPAA, SOC 2, PCI DSS…', es: 'GDPR, HIPAA, SOC 2, PCI DSS…' },
    categoryIds: ['grc'],
  },
];

// ---------------------------------------------------------------------------
// i18n — UI translations
// ---------------------------------------------------------------------------

type TranslationKey =
  | 'selectMode'
  | 'allSkills'
  | 'byCategory'
  | 'byCategoryHint'
  | 'presetGroup'
  | 'presetGroupHint'
  | 'selectCategories'
  | 'selectGroup'
  | 'selectTarget'
  | 'targetGithubHint'
  | 'targetVSCodeHint'
  | 'targetUser'
  | 'targetUserHint'
  | 'targetCustom'
  | 'enterPath'
  | 'pathRequired'
  | 'summary'
  | 'total'
  | 'destination'
  | 'confirmInstall'
  | 'installing'
  | 'filesInstalled'
  | 'done'
  | 'cancelled'
  | 'goBack'
  | 'selectAction'
  | 'actionInstall'
  | 'actionInstallHint'
  | 'actionUpdate'
  | 'actionUpdateHint'
  | 'actionClean'
  | 'actionCleanHint'
  | 'selectInstalledTarget'
  | 'noManifestFound'
  | 'affectedSkills'
  | 'confirmUpdate'
  | 'confirmClean'
  | 'updating'
  | 'cleaning'
  | 'skillsUpdated'
  | 'skillsCleaned'
  | 'updateDone'
  | 'cleanDone';

const TRANSLATIONS: Record<Lang, Record<TranslationKey, string>> = {
  en: {
    selectMode: 'What would you like to install?',
    allSkills: 'All skills',
    byCategory: 'Select by category',
    byCategoryHint: 'Pick one or more categories',
    presetGroup: 'Preset group',
    presetGroupHint: 'Common combinations',
    selectCategories: 'Select categories to install',
    selectGroup: 'Choose a skill group',
    selectTarget: 'Where should skills be installed?',
    targetGithubHint: 'Recommended for GitHub Copilot',
    targetVSCodeHint: 'VS Code workspace skills',
    targetUser: 'VS Code global (user level)',
    targetUserHint: 'Available in all your projects',
    targetCustom: 'Custom path',
    enterPath: 'Enter the installation path',
    pathRequired: 'Path is required',
    summary: 'Installation Summary',
    total: 'Total',
    destination: 'Destination',
    confirmInstall: 'Proceed with installation?',
    installing: 'Installing skills…',
    filesInstalled: 'skill files installed',
    done: 'Done! Skills installed at',
    cancelled: 'Installation cancelled.',
    goBack: 'Go back',
    selectAction: 'What would you like to do?',
    actionInstall: 'Install skills',
    actionInstallHint: 'Add new skills to your project',
    actionUpdate: 'Update skills',
    actionUpdateHint: 'Overwrite with the latest version',
    actionClean: 'Remove skills',
    actionCleanHint: 'Remove skills installed by this tool',
    selectInstalledTarget: 'Where are the skills installed?',
    noManifestFound: 'No skills from this library were found at that location.',
    affectedSkills: 'Skills that will be affected:',
    confirmUpdate: 'Confirm update of these skills?',
    confirmClean: 'Confirm removal of these skills?',
    updating: 'Updating skills…',
    cleaning: 'Removing skills…',
    skillsUpdated: 'skill files updated',
    skillsCleaned: 'skills removed',
    updateDone: 'Done! Skills updated at',
    cleanDone: 'Done! Skills removed from',
  },
  es: {
    selectMode: '¿Qué quieres instalar?',
    allSkills: 'Todas las skills',
    byCategory: 'Seleccionar por categoría',
    byCategoryHint: 'Elige una o más categorías',
    presetGroup: 'Grupo preconfigurado',
    presetGroupHint: 'Combinaciones comunes',
    selectCategories: 'Selecciona las categorías a instalar',
    selectGroup: 'Elige un grupo de skills',
    selectTarget: '¿Dónde instalar las skills?',
    targetGithubHint: 'Recomendado para GitHub Copilot',
    targetVSCodeHint: 'Skills del workspace VS Code',
    targetUser: 'VS Code global (nivel usuario)',
    targetUserHint: 'Disponible en todos tus proyectos',
    targetCustom: 'Ruta personalizada',
    enterPath: 'Ingresa la ruta de instalación',
    pathRequired: 'La ruta es obligatoria',
    summary: 'Resumen de Instalación',
    total: 'Total',
    destination: 'Destino',
    confirmInstall: '¿Proceder con la instalación?',
    installing: 'Instalando skills…',
    filesInstalled: 'archivos de skills instalados',
    done: '¡Listo! Skills instaladas en',
    cancelled: 'Instalación cancelada.',
    goBack: 'Volver atrás',
    selectAction: '¿Qué deseas hacer?',
    actionInstall: 'Instalar skills',
    actionInstallHint: 'Agregar nuevas skills a tu proyecto',
    actionUpdate: 'Actualizar skills',
    actionUpdateHint: 'Sobreescribir con la última versión',
    actionClean: 'Eliminar skills',
    actionCleanHint: 'Eliminar skills instaladas por esta herramienta',
    selectInstalledTarget: '¿Dónde están instaladas las skills?',
    noManifestFound: 'No se encontraron skills de esta librería en esa ubicación.',
    affectedSkills: 'Skills que se verán afectadas:',
    confirmUpdate: '¿Confirmas la actualización de estas skills?',
    confirmClean: '¿Confirmas la eliminación de estas skills?',
    updating: 'Actualizando skills…',
    cleaning: 'Eliminando skills…',
    skillsUpdated: 'archivos de skills actualizados',
    skillsCleaned: 'skills eliminadas',
    updateDone: '¡Listo! Skills actualizadas en',
    cleanDone: '¡Listo! Skills eliminadas de',
  },
};

export function t(lang: Lang, key: TranslationKey): string {
  return TRANSLATIONS[lang][key];
}
