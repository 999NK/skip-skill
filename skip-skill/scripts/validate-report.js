#!/usr/bin/env node
/**
 * Validador de schema do payload Skip AI.
 * Uso: node validate-report.js <arquivo.json>
 * Sai com código 0 se válido, 1 se houver erros.
 */
import fs from 'fs';
import path from 'path';

const VALID_KINDS = new Set(['navigation', 'click', 'submit', 'fill']);
const VALID_INTENTS = new Set([
  'login', 'logout', 'save', 'back', 'cancel', 'delete',
  'search', 'submit', 'navigate', 'fill', 'click',
]);
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);

const errors = [];
const warnings = [];

function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateAction(action, screenId) {
  const ctx = `tela "${screenId}", ação "${action.id ?? '?'}"`;
  if (!isNonEmptyString(action.id)) fail(`${ctx}: id ausente.`);
  if (!isNonEmptyString(action.label)) fail(`${ctx}: label ausente.`);
  if (!VALID_KINDS.has(action.kind)) fail(`${ctx}: kind inválido "${action.kind}". Válidos: ${[...VALID_KINDS].join(', ')}.`);
  if (!VALID_INTENTS.has(action.intent)) fail(`${ctx}: intent inválido "${action.intent}".`);
  if (!isNonEmptyString(action.selector)) fail(`${ctx}: selector ausente.`);
  if (!VALID_CONFIDENCE.has(action.confidence)) fail(`${ctx}: confidence inválido "${action.confidence}".`);
  if (action.kind === 'navigation' && !isNonEmptyString(action.targetRoute)) {
    fail(`${ctx}: kind="navigation" exige targetRoute.`);
  }
  if (action.kind === 'fill') {
    if (!isNonEmptyString(action.inputType)) fail(`${ctx}: kind="fill" exige inputType.`);
    if (!isNonEmptyString(action.inputName)) warn(`${ctx}: kind="fill" sem inputName (reduz confiabilidade do seletor).`);
  }
  if (action.confidence === 'low' && !action.warning) {
    warn(`${ctx}: confidence="low" sem warning explícito.`);
  }
}

function validateScreen(screen) {
  if (!isNonEmptyString(screen.id)) fail(`Tela: id ausente.`);
  if (!isNonEmptyString(screen.route)) fail(`Tela "${screen.id}": route ausente.`);
  if (!isNonEmptyString(screen.title)) fail(`Tela "${screen.id}": title ausente.`);
  if (!isNonEmptyString(screen.filePath)) fail(`Tela "${screen.id}": filePath ausente.`);
  if (!Array.isArray(screen.actions)) {
    fail(`Tela "${screen.id}": actions deve ser array.`);
  } else {
    for (const a of screen.actions) validateAction(a, screen.id);
  }
  if (screen.globalActions && Array.isArray(screen.globalActions)) {
    for (const g of screen.globalActions) {
      if (!isNonEmptyString(g.label)) fail(`Tela "${screen.id}" globalAction: label ausente.`);
      if (!isNonEmptyString(g.targetRoute)) fail(`Tela "${screen.id}" globalAction: targetRoute ausente.`);
    }
  }
}

function validateReport(report) {
  // Campos raiz obrigatórios
  if (!isNonEmptyString(report.projectName)) fail('projectName ausente.');
  if (!isNonEmptyString(report.briefing)) fail('briefing ausente (é obrigatório para a IA ler).');
  if (!isNonEmptyString(report.framework)) warn('framework ausente (recomendado).');

  if (!report.navigationMap || typeof report.navigationMap !== 'object') {
    fail('navigationMap ausente — é o coração do payload.');
    return;
  }

  const { screens, navigationGraph } = report.navigationMap;

  if (!Array.isArray(screens)) {
    fail('navigationMap.screens deve ser array.');
  } else {
    if (screens.length === 0) fail('navigationMap.screens vazio — nenhuma tela mapeada.');
    for (const s of screens) validateScreen(s);

    // checa duplicidade de rotas
    const routes = new Set();
    for (const s of screens) {
      if (routes.has(s.route)) warn(`Rota duplicada: "${s.route}".`);
      routes.add(s.route);
    }
  }

  if (Array.isArray(navigationGraph)) {
    for (const e of navigationGraph) {
      if (!isNonEmptyString(e.from)) fail(`navigationGraph: aresta sem "from".`);
      if (!isNonEmptyString(e.to)) fail(`navigationGraph: aresta sem "to".`);
      if (!isNonEmptyString(e.label)) fail(`navigationGraph: aresta ${e.from}->${e.to} sem "label".`);
    }
  }

  // Bloco wcag (opcional, mas se presente é validado)
  if (report.wcag) {
    const w = report.wcag;
    if (typeof w.score !== 'number' || w.score < 0 || w.score > 100) {
      fail('wcag.score deve ser número 0-100.');
    }
    if (!Array.isArray(w.violations)) {
      warn('wcag.violations não é array.');
    } else {
      for (const v of w.violations) {
        const sev = v.severity;
        const VALID_SEV = new Set(['critical', 'serious', 'moderate', 'minor', 'unknown']);
        if (sev && !VALID_SEV.has(sev)) {
          warn(`wcag violação "${v.id ?? '?'}": severity inválido "${sev}".`);
        }
        if (!isNonEmptyString(v.fix)) {
          warn(`wcag violação "${v.id ?? '?'}": fix vazio (regra do spec: toda violação deve ter sugestão).`);
        }
        if (v.source && (typeof v.source.line !== 'number' || v.source.line < 1)) {
          warn(`wcag violação "${v.id ?? '?'}": source.line inválido.`);
        }
      }
    }
    if (w.checks && typeof w.checks === 'object') {
      const c = w.checks;
      if (typeof c.total !== 'number') warn('wcag.checks.total deve ser número.');
      if (typeof c.passed !== 'number') warn('wcag.checks.passed deve ser número.');
    }
  }
}

// ---- CLI ----
const fileArg = process.argv[2];
if (!fileArg) {
  console.error('Uso: node validate-report.js <arquivo.json>');
  process.exit(1);
}

const filePath = path.resolve(fileArg);
if (!fs.existsSync(filePath)) {
  console.error(`Arquivo não encontrado: ${filePath}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
} catch (e) {
  console.error(`JSON inválido em ${filePath}:\n${e.message}`);
  process.exit(1);
}

validateReport(report);

// Verificação de tamanho (limite do Skip Cloud: 5MB)
const sizeBytes = Buffer.byteLength(JSON.stringify(report));
if (sizeBytes > 5 * 1024 * 1024) {
  fail(`Payload muito grande: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB (limite 5 MB).`);
}

// ---- Saída ----
if (warnings.length > 0) {
  console.warn('\n⚠ Avisos:');
  for (const w of warnings) console.warn(`  - ${w}`);
}

if (errors.length > 0) {
  console.error('\n✖ Erros de validação:');
  for (const e of errors) console.error(`  - ${e}`);
  console.error(`\n${errors.length} erro(s), ${warnings.length} aviso(s). Corrija antes de enviar.\n`);
  process.exit(1);
}

const screenCount = report.navigationMap?.screens?.length ?? 0;
const actionCount = report.navigationMap?.screens?.reduce((acc, s) => acc + (s.actions?.length ?? 0), 0) ?? 0;
console.log(`\n✔ Payload válido! ${screenCount} tela(s), ${actionCount} ação(ões), ${(sizeBytes / 1024).toFixed(1)} KB.`);
if (warnings.length > 0) console.log(`${warnings.length} aviso(s) — funcional, mas revise.`);
console.log('');
process.exit(0);
