#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith('--'));
const explicitType = args.find((arg) => arg.startsWith('--type='))?.slice('--type='.length);

function usage() {
  console.error('Uso: node scripts/validate-artifact.js <arquivo> [--type=semantic-map|report|wcag-audit]');
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function detectArtifactType(filename, payload) {
  const base = path.basename(filename);
  if (base === '.skip-sam.json' || payload?.artifactType === 'semantic-map' || (Array.isArray(payload?.entities) && Array.isArray(payload?.relationships))) {
    return 'semantic-map';
  }
  if (base === '.skip-report.json' || payload?.artifactType === 'report' || payload?.navigationMap || payload?.briefing || payload?.routes) {
    return 'report';
  }
  if (base === '.skip-wcag-audit.json' || payload?.artifactType === 'wcag-audit' || payload?.wcag || payload?.findings || payload?.violations) {
    return 'wcag-audit';
  }
  return 'unknown';
}

function validateSam(payload, expectedFilename = '.skip-sam.json') {
  const errors = [];
  const warnings = [];
  const entities = payload.entities;
  const relationships = payload.relationships;
  const filename = String(payload.filename ?? expectedFilename);

  if (filename !== '.skip-sam.json') errors.push('filename deve ser `.skip-sam.json`.');
  if (payload.artifactType !== 'semantic-map') errors.push('artifactType deve ser semantic-map.');
  if (!Array.isArray(entities)) errors.push('entities deve ser array.');
  if (!Array.isArray(relationships)) errors.push('relationships deve ser array.');
  if (Array.isArray(entities) && entities.length === 0) errors.push('entities nao pode estar vazio.');
  if (Array.isArray(payload.screens) && payload.screens.length === 0) warnings.push('screens esta vazio; confirme se a SPA foi mapeada manualmente.');

  const ids = new Set();
  const duplicates = new Set();
  for (const entity of entities ?? []) {
    if (!isObject(entity)) {
      errors.push('Entidade invalida: esperado objeto.');
      continue;
    }
    if (!isNonEmptyString(entity.id)) errors.push('Entidade sem id.');
    if (!isNonEmptyString(entity.type)) errors.push(`Entidade ${entity.id ?? '?'} sem type.`);
    if (!isNonEmptyString(entity.name)) warnings.push(`Entidade ${entity.id ?? '?'} sem name.`);
    if (entity.id) {
      if (ids.has(entity.id)) duplicates.add(entity.id);
      ids.add(entity.id);
    }
  }
  for (const duplicate of duplicates) errors.push(`ID duplicado em entities: ${duplicate}.`);

  for (const relationship of relationships ?? []) {
    if (!isObject(relationship)) {
      errors.push('Relacionamento invalido: esperado objeto.');
      continue;
    }
    if (!isNonEmptyString(relationship.id)) errors.push('Relacionamento sem id.');
    if (!isNonEmptyString(relationship.type)) errors.push(`Relacionamento ${relationship.id ?? '?'} sem type.`);
    if (!isNonEmptyString(relationship.sourceId)) errors.push(`Relacionamento ${relationship.id ?? '?'} sem sourceId.`);
    if (!isNonEmptyString(relationship.targetId)) errors.push(`Relacionamento ${relationship.id ?? '?'} sem targetId.`);
    if (relationship.sourceId && !ids.has(relationship.sourceId)) errors.push(`Relacionamento ${relationship.id ?? '?'} referencia sourceId inexistente: ${relationship.sourceId}.`);
    if (relationship.targetId && !ids.has(relationship.targetId)) errors.push(`Relacionamento ${relationship.id ?? '?'} referencia targetId inexistente: ${relationship.targetId}.`);
  }

  const stats = payload.stats;
  if (isObject(stats)) {
    if (typeof stats.entities === 'number' && Array.isArray(entities) && stats.entities !== entities.length) errors.push('stats.entities diverge de entities.length.');
    if (typeof stats.relationships === 'number' && Array.isArray(relationships) && stats.relationships !== relationships.length) errors.push('stats.relationships diverge de relationships.length.');
  }
  if (payload.status === 'complete' && !(entities ?? []).some((entity) => entity.type === 'ROUTE' || entity.type === 'SCREEN')) {
    errors.push('status complete exige pelo menos uma entidade ROUTE ou SCREEN.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateReport(payload) {
  const errors = [];
  const warnings = [];
  if (payload.artifactType && payload.artifactType !== 'report') errors.push('artifactType invalido para relatorio.');
  if (!payload.navigationMap && !payload.routes && !payload.wcag && !payload.semanticMapSummary && !payload.wcagSummary) {
    errors.push('O payload nao contem navigationMap, routes nem wcag.');
  }
  const screens = payload.navigationMap?.screens;
  if (screens !== undefined && !Array.isArray(screens)) errors.push('navigationMap.screens deve ser array.');
  if (Array.isArray(screens) && screens.length === 0) warnings.push('navigationMap.screens vazio.');
  return { valid: errors.length === 0, errors, warnings };
}

function validateWcag(payload) {
  const errors = [];
  const warnings = [];
  if (payload.artifactType && payload.artifactType !== 'wcag-audit') errors.push('artifactType invalido para auditoria WCAG.');
  const violations = payload.findings ?? payload.violations ?? payload.wcag?.violations;
  if (!Array.isArray(violations)) errors.push('findings/violations deve ser array.');
  const checks = payload.checks ?? payload.wcag?.checks;
  if (checks && typeof checks.total !== 'number') warnings.push('checks.total deve ser number.');
  return { valid: errors.length === 0, errors, warnings };
}

if (!file) {
  usage();
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error(`Arquivo nao encontrado: ${file}`);
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, ''));
} catch (error) {
  console.error(`JSON invalido: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const type = explicitType ?? detectArtifactType(file, payload);
const result =
  type === 'semantic-map' ? validateSam(payload) :
  type === 'report' ? validateReport(payload) :
  type === 'wcag-audit' ? validateWcag(payload) :
  { valid: true, errors: [], warnings: [`Tipo desconhecido: ${type}. Validacao estrutural minima aplicada.`] };

console.log(`Arquivo: ${path.basename(file)}`);
console.log(`Tipo: ${type}`);
if (payload.scanId) console.log(`Scan ID: ${payload.scanId}`);
if (type === 'semantic-map') {
  console.log(`Entidades: ${Array.isArray(payload.entities) ? payload.entities.length : 0}`);
  console.log(`Relacionamentos: ${Array.isArray(payload.relationships) ? payload.relationships.length : 0}`);
}
console.log(`Validacao: ${result.valid ? 'aprovada' : 'reprovada'}`);

for (const warning of result.warnings) console.warn(`Aviso: ${warning}`);
for (const error of result.errors) console.error(`Erro: ${error}`);

process.exit(result.valid ? 0 : 1);
