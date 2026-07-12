#!/usr/bin/env node
import fs from 'fs';
import crypto from 'crypto';

const [inputFile = '.skip-report.json', outputFile = '.skip-sam.json'] = process.argv.slice(2);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, ''));
}

function slugify(value) {
  return String(value || 'item')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function stableId(...parts) {
  const base = parts.filter(Boolean).join(':');
  const hash = crypto.createHash('sha1').update(base).digest('hex').slice(0, 10);
  return `${slugify(parts[0] || 'id')}-${hash}`;
}

function entity(type, name, extra = {}) {
  return {
    id: extra.id || stableId(type, name, extra.slug, extra.selector),
    type,
    name: String(name || type),
    slug: extra.slug || slugify(name || type),
    semanticLabels: extra.semanticLabels || [String(name || type)],
    description: extra.description || null,
    accessibilityHint: extra.accessibilityHint || String(name || type),
    source: extra.source || null,
    metadata: extra.metadata || {},
  };
}

function relationship(type, sourceId, targetId, evidenceValue) {
  return {
    id: stableId('rel', type, sourceId, targetId, evidenceValue),
    type,
    sourceId,
    targetId,
    confidence: 0.9,
    evidence: [{ type: 'manual-skill-map', value: evidenceValue || type }],
    metadata: {},
  };
}

const report = readJson(inputFile);
const screens = report.navigationMap?.screens ?? [];
if (!Array.isArray(screens) || screens.length === 0) {
  console.error('navigationMap.screens vazio; nao ha como gerar SAM manual.');
  process.exit(1);
}

const scanId = report.scanId || `manual_${Date.now().toString(36)}`;
const entities = [];
const relationships = [];
const routeIds = new Map();
const screenIds = new Map();

for (const screen of screens) {
  const route = screen.route || '/';
  if (!routeIds.has(route)) {
    const routeEntity = entity('ROUTE', route, {
      id: stableId('route', route),
      slug: slugify(route === '/' ? 'root' : route),
      semanticLabels: [route, `ir para ${route}`],
      description: `Rota ${route}`,
      accessibilityHint: `Navegue para ${route}`,
      source: screen.filePath ? { filePath: screen.filePath, line: 1, column: 1 } : null,
    });
    routeIds.set(route, routeEntity.id);
    entities.push(routeEntity);
  }

  const screenEntity = entity('SCREEN', screen.title || route, {
    id: stableId('screen', route),
    slug: slugify(route === '/' ? 'root' : route),
    semanticLabels: [screen.title || route, route],
    description: screen.description || `Tela ${screen.title || route}`,
    accessibilityHint: `Tela ${screen.title || route}`,
    source: screen.filePath ? { filePath: screen.filePath, line: 1, column: 1 } : null,
    metadata: { route, filePath: screen.filePath || null },
  });
  screenIds.set(route, screenEntity.id);
  entities.push(screenEntity);
  relationships.push(relationship('IMPLEMENTS', screenEntity.id, routeIds.get(route), route));

  for (const action of screen.actions ?? []) {
    const type =
      action.kind === 'fill' ? 'INPUT' :
      action.kind === 'navigation' ? 'LINK' :
      action.kind === 'submit' ? 'BUTTON' :
      'ACTION';
    const actionEntity = entity(type, action.label, {
      id: stableId(type.toLowerCase(), route, action.id || action.label, action.selector),
      slug: slugify(`${route}-${action.label}-${action.kind}`),
      semanticLabels: [action.label, `${action.kind} ${action.label}`],
      description: `Acao ${action.kind} em ${screen.title || route}`,
      accessibilityHint: action.warning || action.label,
      source: screen.filePath ? { filePath: screen.filePath, line: 1, column: 1 } : null,
      metadata: {
        kind: action.kind,
        intent: action.intent,
        selector: action.selector,
        anchorId: action.anchorId ?? null,
        targetRoute: action.targetRoute ?? null,
        inputType: action.inputType ?? null,
        inputName: action.inputName ?? null,
        confidence: action.confidence ?? 'medium',
      },
    });
    entities.push(actionEntity);
    relationships.push(relationship('CONTAINS', screenEntity.id, actionEntity.id, action.label));
    if (action.kind === 'navigation' && action.targetRoute) {
      if (!routeIds.has(action.targetRoute)) {
        const targetRoute = entity('ROUTE', action.targetRoute, {
          id: stableId('route', action.targetRoute),
          slug: slugify(action.targetRoute),
          semanticLabels: [action.targetRoute, `ir para ${action.targetRoute}`],
          description: `Rota ${action.targetRoute}`,
          accessibilityHint: `Navegue para ${action.targetRoute}`,
        });
        routeIds.set(action.targetRoute, targetRoute.id);
        entities.push(targetRoute);
      }
      relationships.push(relationship('NAVIGATES_TO', actionEntity.id, routeIds.get(action.targetRoute), action.label));
    }
  }

  for (const globalAction of screen.globalActions ?? []) {
    const globalEntity = entity('LINK', globalAction.label, {
      id: stableId('global-link', route, globalAction.source, globalAction.label, globalAction.targetRoute),
      slug: slugify(`${route}-${globalAction.label}-global-navigation`),
      semanticLabels: [globalAction.label, `navegar para ${globalAction.targetRoute}`],
      description: `Navegacao global ${globalAction.label}`,
      accessibilityHint: globalAction.label,
      source: screen.filePath ? { filePath: screen.filePath, line: 1, column: 1 } : null,
      metadata: { targetRoute: globalAction.targetRoute, source: globalAction.source || 'global' },
    });
    entities.push(globalEntity);
    relationships.push(relationship('CONTAINS', screenEntity.id, globalEntity.id, globalAction.label));
    if (globalAction.targetRoute) {
      if (!routeIds.has(globalAction.targetRoute)) {
        const targetRoute = entity('ROUTE', globalAction.targetRoute, {
          id: stableId('route', globalAction.targetRoute),
          slug: slugify(globalAction.targetRoute),
          semanticLabels: [globalAction.targetRoute, `ir para ${globalAction.targetRoute}`],
          description: `Rota ${globalAction.targetRoute}`,
          accessibilityHint: `Navegue para ${globalAction.targetRoute}`,
        });
        routeIds.set(globalAction.targetRoute, targetRoute.id);
        entities.push(targetRoute);
      }
      relationships.push(relationship('NAVIGATES_TO', globalEntity.id, routeIds.get(globalAction.targetRoute), globalAction.label));
    }
  }
}

for (const flow of report.guidedFlows ?? []) {
  const flowEntity = entity('FLOW', flow.name, {
    id: stableId('flow', flow.name),
    slug: slugify(flow.name),
    semanticLabels: [flow.name],
    description: flow.description || `Fluxo guiado ${flow.name}`,
    accessibilityHint: `Fluxo ${flow.name}`,
    metadata: { steps: flow.steps ?? [] },
  });
  entities.push(flowEntity);
}

const sam = {
  schemaVersion: '1.0.0',
  artifactType: 'semantic-map',
  filename: '.skip-sam.json',
  scanId,
  generatedAt: new Date().toISOString(),
  sourceManifestSha256: report.sourceManifestSha256 || 'manual-skill-map',
  generator: { scannerVersion: 'manual-fallback', skillVersion: 'local', strategy: 'manual-static-spa' },
  project: {
    name: report.projectName || 'unknown',
    framework: report.framework || 'static-html-express',
    language: report.language || 'JavaScript',
  },
  status: 'partial',
  stats: {
    entities: entities.length,
    relationships: relationships.length,
    routes: [...routeIds.keys()].length,
    screens: screens.length,
    components: 0,
    forms: entities.filter((item) => item.type === 'FORM').length,
    inputs: entities.filter((item) => item.type === 'INPUT').length,
    buttons: entities.filter((item) => item.type === 'BUTTON').length,
    links: entities.filter((item) => item.type === 'LINK').length,
    flows: (report.guidedFlows ?? []).length,
  },
  coverage: {
    analyzedSourceFiles: new Set(screens.map((screen) => screen.filePath).filter(Boolean)).size,
    discoveredRoutes: [...routeIds.keys()].length,
    mappedRoutes: screens.length,
    discoveredInteractiveElements: screens.reduce((total, screen) => total + (screen.actions?.length ?? 0), 0),
    mappedInteractiveElements: screens.reduce((total, screen) => total + (screen.actions?.length ?? 0), 0),
    percentage: 100,
  },
  entities,
  relationships,
  screens,
  sharedComponents: [],
  warnings: ['SAM gerado pela skill como fallback manual para SPA estatica/Express quando o scanner automatico nao detecta entities.'],
  missingData: [],
};

fs.writeFileSync(outputFile, `${JSON.stringify(sam, null, 2)}\n`);
console.log(`SAM gerado: ${outputFile} (${entities.length} entidades, ${relationships.length} relacionamentos)`);
