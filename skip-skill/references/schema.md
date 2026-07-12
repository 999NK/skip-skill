# Schema do payload Skip AI

Este é o formato do relatório de entrada que o agente monta. Siga-o rigorosamente — o validador (`scripts/validate-report.js`) checa a estrutura antes de gerar/enviar artefatos.

Para envio SAM, `.skip-sam.json` deve ser validado com `scripts/validate-artifact.js --type=semantic-map`. Com o scanner local `@skip-ai/scanner@0.9.0` (`E:/downloads/hacka/packages/scanner-cli/skip-ai-scanner-0.9.0.tgz`), SPA estática/Express com `index.html` deve gerar `SCREEN`, `ROUTE` e entidades interativas automaticamente. Use o fallback manual apenas se essa validação ainda falhar.

## Estrutura raiz

```jsonc
{
  "projectName": "string",          // nome do projeto (basename do repo, ou do app frontend)
  "framework": "string",            // nextjs | vite-react | remix | angular | unknown
  "language": "string",             // TypeScript | JavaScript
  "filesScanned": 42,               // nº de arquivos lidos (estimativa honesta)
  "navigationMap": { ... },         // OBRIGATÓRIO — coração do payload
  "briefing": "string",             // OBRIGATÓRIO — resumo em linguagem natural
  "routes": [ ... ],                // opcional, mantém compatibilidade
  "components": [ ... ],            // opcional
  "events": [ ... ],                // opcional
  "apiCalls": [ ... ]               // opcional
}
```

## navigationMap

```jsonc
{
  "screens": [ ScreenMap ],
  "navigationGraph": [ NavEdge ]
}
```

### ScreenMap (uma entrada por tela/rota)

```jsonc
{
  "id": "string",              // slug da rota: "login", "users-profile", "root"
  "title": "string",           // título humano: de <h1>, <title>, ou nome do componente
  "route": "string",           // rota lógica: "/login", "/users/:id", "/"
  "filePath": "string",        // caminho relativo do arquivo: "apps/web/src/pages/Login.tsx"
  "description": "string|null",// descrição curta (de <h1> ou heurística)
  "actions": [ NavigationAction ],
  "globalActions": [ GlobalAction ]
}
```

### NavigationAction (cada botão/link/input da tela)

```jsonc
{
  "id": "string",              // identificador único na tela: "act-login-submit-1"
  "label": "string",           // rótulo humano visível: "Entrar", "E-mail"
  "kind": "navigation|click|submit|fill",
  "intent": "login|logout|save|back|cancel|delete|search|submit|navigate|fill|click",
  "targetRoute": "string|null",// só para kind="navigation": "/dashboard"
  "selector": "string",        // seletor CSS p/ o widget localizar no DOM
  "anchorId": "string|null",   // valor do data-skip-anchor (id do elemento ou slug)
  "inputType": "string|null",  // só para kind="fill": email|password|text|number...
  "inputName": "string|null",  // só para kind="fill": name do campo
  "confidence": "high|medium|low",
  "warning": "string|null"     // mensagem quando confidence="low"
}
```

### GlobalAction (navegação global que atinge a tela)

```jsonc
{
  "label": "string",           // "Configurações"
  "targetRoute": "string",     // "/settings"
  "source": "string"           // componente de origem: "Sidebar", "Navbar"
}
```

### NavEdge (aresta do grafo de navegação)

```jsonc
{
  "from": "string",            // rota de origem: "/login"
  "to": "string",              // rota de destino: "/dashboard"
  "label": "string"            // rótulo da aresta: "Entrar"
}
```

## Regras de `selector` e `anchorId`

A confiança do widget em clicar no elemento depende de quão estável é o seletor. Priorize nesta ordem:

1. **`id` estável no elemento** → `selector: "#btn-entrar"`, `anchorId: "btn-entrar"`, `confidence: "high"`
2. **`data-skip-anchor` explícito** → `selector: "[data-skip-anchor='x']"`, `anchorId: "x"`, `confidence: "high"`
3. **`name` estável (inputs)** → `selector: "input[name='email']"`, `confidence: "medium"`
4. **Texto/aria-label estável** → `selector: "button:has-text('Entrar')"`, `confidence: "medium"`
5. **Nada estável** → `selector: "button"`, `confidence: "low"`, `warning: "Adicione data-skip-anchor ou id para confiabilidade total."`

## Regras de `intent`

Inferir do `label` (heurística PT/EN):

| Padrão no label (lowercase) | intent |
|---|---|
| entrar, logar, login, sign in, acessar | `login` |
| sair, logout, sign out | `logout` |
| voltar, back, return | `back` |
| cancel | `cancel` |
| salvar, save | `save` |
| deletar, excluir, remover, delete, remove | `delete` |
| buscar, pesquisar, search, find | `search` |
| enviar, submit | `submit` |
| (fill actions) | `fill` |
| (navigation actions) | `navigate` |
| (qualquer outro botão) | `click` |

## briefing

Uma string multi-linha. Uma linha por tela, no formato:

```
Tela <title> (<route>): <ação1>; <ação2>; ...; menu <label> navega para <route>.
```

Exemplo:
```
Tela Login (/login): input 'Email' (email, name=email); input 'Senha' (password, name=password); botão 'Entrar' (login); menu 'Configurações' navega para /settings.
Tela Painel (/dashboard): link 'Configurações' navega para /settings.
```

## wcag (auditoria de acessibilidade)

```jsonc
{
  "score": 78,                    // 0-100
  "level": "AA",                  // A | AA | AAA
  "violations": [{
    "fingerprint": "abc123def456",// hash estável (ruleId + filePath + selector)
    "id": "img-alt-login",
    "ruleId": "img-alt-missing",
    "rule": "1.1.1 Non-text Content",
    "level": "A",
    "severity": "critical",      // critical | serious | moderate | minor | unknown
    "title": "Imagem sem texto alternativo",
    "description": "...",
    "screen": "/login",          // tela da ocorrência primária
    "filePath": "apps/web/src/pages/Login.tsx",
    "selector": "img",
    "fix": "Adicione alt='...'...",
    "wcagUrl": "https://...",
    "source": {                  // localização no código (1-based)
      "filePath": "...",
      "line": 12,
      "column": 5
    },
    "affectedScreens": ["/login"],  // telas afetadas (deduplicação)
    "occurrenceCount": 1            // quantas ocorrências consolidadas
  }],
  "summary": { "critical": 2, "serious": 5, "moderate": 3, "minor": 0, "unknown": 1 },
  "checks": { "total": 34, "passed": 20, "failed": 13, "needsReview": 1 },
  "auditedAt": "2026-07-11T...",
  "rulesVersion": "1.1.0"
}
```

### Severidade `unknown`
Use `unknown` quando não dá pra confirmar a falha (ex.: contraste sem cálculo real). Violações `unknown` **não** penalizam o score e **não** contam como falha confirmada — vão em `checks.needsReview`.

### Deduplicação
O mesmo problema no mesmo arquivo+seletor, reaproveitado em várias telas, deve virar **1 violação** com `occurrenceCount` e `affectedScreens` múltiplas — não N violações repetidas.

## Exemplo completo (mínimo viável)

Veja `examples.md` para payloads reais de Next.js, React Router e monorepo.
