---
name: skip
description: Mapeia o projeto do usuário para a plataforma Skip AI Accessibility Layer — entende a estrutura real do projeto (monorepo, framework, rotas), identifica todas as telas/botões/inputs navegáveis, audita WCAG (11 regras, score 0-100, correções sugeridas) e envia o mapa de navegação + relatório de acessibilidade para o Skip Cloud. Use SEMPRE que o usuário quiser configurar acessibilidade por voz, mapear telas pro Skip, auditar WCAG/acessibilidade, ou mencionar Skip/Skip AI/"navegação por voz"/"mapear projeto"/"configurar widget de acessibilidade"/"auditoria de acessibilidade". Mesmo que não diga explicitamente "skip", se a intenção for mapear o app pra acessibilidade ou voz, ou medir/auditar acessibilidade, ative esta skill.
---

# Skip AI — Mapeamento de Navegação

Você vai mapear o projeto do usuário para a plataforma **Skip AI Accessibility Layer**. O objetivo é produzir um **mapa de navegação** que a IA da Skip usa para permitir navegação por voz ("quero ir pra configurações" → a IA sabe que é `/settings`).

## Princípio fundamental

**Você está dentro do projeto. Você entende a estrutura. NÃO chute.** Cada projeto é único: monorepo ou não, Next.js ou Vite ou Remix, rotas em `app/` ou `pages/` ou `src/routes`. Seu trabalho é **descobrir** a estrutura real lendo os arquivos, e mapear as telas conforme ela existe — não forçar o projeto num molde pré-finido.

O `npx @skip-ai/scanner` NÃO faz extração por regex cega. Ele é apenas o **transportador**: você monta o mapa e ele envia pro Skip Cloud.

## Contrato obrigatório do SAM

É obrigatório executar o scanner com `--generate-sam` para gerar um novo `.skip-sam.json` a partir do projeto atual.

É obrigatório executar `--validate-sam` depois da geração.

Quando o envio estiver habilitado, execute também `--send`.

O arquivo `.skip-sam.json` deve ser gerado no scan atual. Não reutilize um arquivo antigo.

O nome `.skip-sam.json` não deve ser alterado.

Um briefing, uma lista de rotas ou um navigationMap não substituem `.skip-sam.json`.

Não aplique o validador de `.skip-report.json` ao `.skip-sam.json`.

Não declare o scan como concluído enquanto `.skip-sam.json` não tiver sido gerado, validado, enviado e confirmado pela API.

Use um comando equivalente a:

```bash
npx @skip-ai/scanner scan . \
  --generate-sam \
  --validate-sam \
  --send \
  --url=<API_URL>
```

## Fluxo (siga nesta ordem)

### Passo 1 — Coletar credenciais (o comando de setup)

Antes de mapear, você precisa do **token** e da **URL do Skip Cloud**. O usuário obtém os dois juntos num **comando de setup** que o dashboard gera pronto pra colar — no formato do próprio `npx`, com `--token` e `--url` já preenchidos:

```
npx @skip-ai/scanner --token=15a786de-... --url=https://ai-accessibility-layer-db-fe7de--preview.goskip.app
```

1. Verifique se existe um arquivo `.skip.json` na raiz do projeto. Se existir e tiver `token` e `url`, use direto — pule pro passo 2.
2. Se não existir, peça ao usuário o **comando de setup**:
   - "Abra o dashboard do Skip Cloud no navegador, vá no seu projeto e clique em 'Copiar comando de setup'. Cole aqui."
3. Extraia `--token` e `--url` do comando que o usuário colou com regex simples:
   - token: capture o valor após `--token=`
   - url: capture o valor após `--url=`
   - Se faltar um dos dois, avise e peça pra recopiar.
4. Salve em `.skip.json` na raiz do projeto:
   ```json
   { "token": "15a786de-...", "url": "https://ai-accessibility-layer-db-fe7de--preview.goskip.app" }
   ```
   Pergunte: "Quer que eu salve essas credenciais em `.skip.json` pra não pedir de novo?" Se sim, crie o arquivo E adicione `.skip.json` ao `.gitignore` (contém segredo).
5. Se o usuário não souber onde pegar o comando, explique: "Acesse o dashboard do Skip, crie/selecione um projeto e clique em 'Copiar comando de setup'."

### Passo 2 — Entender a estrutura do projeto

**Leia, não chute.** Esta é a parte que elimina os erros.

1. Leia `package.json` na raiz. Identifique:
   - É monorepo? (procura `workspaces`, ou existem `apps/`, `packages/`, `pnpm-workspace.yaml`)
   - Framework: `next`, `vite`, `@remix-run`, `@angular`, etc.
   - Linguagem: TypeScript (existe `tsconfig.json`) ou JavaScript

2. Se for monorepo, liste os subdiretórios de `apps/` ou `packages/`. Para cada, leia o `package.json` local e identifique qual é o **frontend** (o que tem `react`/`vue`/`next`/`vite`). Pode haver mais de um frontend — mapeie todos se o usuário quiser, ou pergunte qual.

3. Identifique o sistema de rotas do frontend escolhido:
   - **Next.js App Router**: arquivos `page.tsx` em `app/` ou `src/app/`
   - **Next.js Pages Router**: arquivos em `pages/` ou `src/pages/`
   - **React Router / TanStack Router**: procure o arquivo de definição de rotas (geralmente `routes.tsx`, `App.tsx`, ou `router.tsx`) — leia os `<Route path=...>` ou a definição de `createBrowserRouter`
   - **Remix**: arquivos `route.tsx` em `app/routes/`
   - **Outro**: pergunte ao usuário onde ficam as páginas

4. Confirme com o usuário sua leitura ANTES de mapear: "Detectei um monorepo pnpm com o frontend em `apps/web`, usando Vite + React Router (rotas definidas em `src/App.tsx`). Vou mapear a partir daí. Confere?" — isso evita mapear o lugar errado.

### Passo 3 — Mapear as telas e ações

Para **cada tela** (cada rota), leia o arquivo correspondente e extraia:

**Ações de navegação** (o que leva a outra tela):
- `<Link to="/x">`, `<Link href="/x">` (React Router / Next) → `{ kind: "navigation", targetRoute: "/x", label: "texto do link" }`
- `<a href="/x">` interno (começa com `/`, não `/api/`) → `{ kind: "navigation", targetRoute: "/x" }`
- `navigate("/x")`, `router.push("/x")`, `redirect("/x")` → `{ kind: "navigation", targetRoute: "/x" }`

**Ações de clique/submit** (botões na tela):
- `<button type="submit">` ou `<form action="/x">` → `{ kind: "submit", intent: "..." }`
- `<button onClick={...}>` → `{ kind: "click", intent: "..." }`

**Ações de preenchimento** (inputs do form):
- `<input>`, `<textarea>`, `<select>` → `{ kind: "fill", inputType, inputName, label }`

**Para cada ação**, determine:
- `label`: texto visível > `aria-label` > `title` > `placeholder` > `name` > "Botão sem rótulo"
- `selector` e `anchorId`: o seletor CSS que o widget usará pra clicar. Prioridade: `id` (se existir) → `data-skip-anchor` → `aria-label` → texto visível. Se não houver nada estável, marque `confidence: "low"` e gere um `warning`.
- `intent`: inferir do label (login, save, back, cancel, delete, search, submit, navigate, fill, click, logout)
- `confidence`: `high` (tem id/anchor), `medium` (tem label/name), `low` (nada estável)

**Navegação global** (menu/sidebar/navbar que aparece em todas as telas): leia os componentes compartilhados (Sidebar, Navbar, Layout, Header). Cada link deles vira uma `globalAction` atribuída a **todas** as telas.

### Passo 4 — Montar o payload

Monte um JSON seguindo o schema em `references/schema.md` (leia esse arquivo antes de montar). Os campos principais:

```jsonc
{
  "navigationMap": {
    "screens": [
      {
        "id": "login",
        "title": "Login",
        "route": "/login",
        "filePath": "apps/web/src/pages/Login.tsx",
        "description": "Tela de login",
        "actions": [ ...ações desta tela... ],
        "globalActions": [ ...navegação global que chega aqui... ]
      }
    ],
    "navigationGraph": [ { "from": "/", "to": "/login", "label": "Entrar" } ]
  },
  "briefing": "Tela Login (/login): input 'Email', botão 'Entrar'...",
  "projectName": "adegaerp",
  "framework": "vite-react",
  "language": "TypeScript"
}
```

### Passo 4.5 — Auditar WCAG e calcular score

Enquanto você tem os arquivos das telas em memória (do passo 3), aplique as **11 regras WCAG** descritas em `references/wcag-rules.md` (LEIA antes). Para cada violação encontrada, registre um objeto no bloco `wcag.violations`:

```jsonc
{
  "id": "img-alt-login",
  "rule": "1.1.1 Non-text Content",
  "level": "A",
  "severity": "critical",
  "title": "Imagem sem texto alternativo",
  "description": "A imagem <img src='/logo.png'> em /login não possui alt.",
  "screen": "/login",
  "filePath": "apps/web/src/pages/Login.tsx",
  "selector": "img",
  "fix": "Adicione alt='...' descrevendo a imagem, ou alt='' se decorativa.",
  "wcagUrl": "https://www.w3.org/WAI/WCAG22/quickref/#non-text-content"
}
```

Depois calcule o **score** (0–100) seguindo `references/scoring.md`: começa em 100, desconta por severidade (`critical -12, serious -6, moderate -3, minor -1, unknown -0`), floor em 0. Determine o **nível** (A/AA/AAA). Preencha:

```jsonc
"wcag": {
  "score": 78,
  "level": "AA",
  "violations": [ ... ],
  "summary": { "critical": 2, "serious": 5, "moderate": 3, "minor": 0, "unknown": 1 },
  "checks": { "total": 34, "passed": 20, "failed": 13, "needsReview": 1 },
  "auditedAt": "ISO timestamp",
  "rulesVersion": "1.1.0"
}
```

**Regras críticas para evitar falsos positivos (leia `references/wcag-rules.md`):**
- **NÃO** acuse input como "sem label" se tiver `<label htmlFor="id">` (React), `<label for="id">` (HTML), `<label>` envolvente (`<label>Email <input/></label>`), ou `aria-label`/`aria-labelledby`.
- **NÃO** acuse `<Link to="/x">` (React Router) nem `<Link href="/x">` (Next.js) como "link sem href" — ambos são navegação válida.
- **Ignore** tags dentro de comentários JSX `{/* <Link to>... */}` — não são código real.
- **`lang` no `<html>`**: cheque UMA vez globalmente (na rota `/` ou layout), não repita por tela de SPA.
- **Contraste**: se você só vê a classe CSS (`text-gray-300`) sem poder calcular a razão real, marque como **`severity: "unknown"`** (needs-review), **nunca** `minor`. O `unknown` não penaliza o score.
- **Cada violação** deve ter `source: { filePath, line, column }` (1-based) — conte linhas até o `<` da tag.
- **Deduplique**: o mesmo problema no mesmo arquivo+seletor, reaproveitado em N telas, vira **1 violação** com `occurrenceCount: N` e `affectedScreens: [...]`, não N violações repetidas.
- **Checks aprovados**: conte também os elementos que PASSARAM (ex.: 5 imgs, 4 com alt = 4 passed, 1 failed). Preencha `checks: { total, passed, failed, needsReview }`.

**Importante:** não invente violações. Aplique só as regras. Se uma regra não se aplica, não há violação. Seja preciso — falsos positivos minam a confiança no score.

Também gere os **fluxos guiados** (`guidedFlows`): para cada tela com `fill` + `submit`, crie um fluxo (ex.: "Login do usuário" com steps: fill Email → fill Senha → submit Entrar). E o **histórico** (`history`): leia `.skip-history.json` se existir, adicione a entrada atual.

**Antes de enviar, valide os artefatos** rodando o validador correto por tipo, especialmente `node scripts/validate-artifact.js .skip-sam.json --type=semantic-map`. Não aplique `validate-report.js` ao `.skip-sam.json`.

### Passo 5 — Enviar pro Skip Cloud

Rode o scanner real com `--generate-sam`, `--validate-sam` e, quando houver envio, `--send`, usando o `SKIP_TOKEN` env var e a `--url` obtidos no passo 1:

```bash
# Forma com env var (recomendada — não deixa token no histórico do shell):
SKIP_TOKEN=15a786de-... npx @skip-ai/scanner scan . --generate-sam --validate-sam --send --url=https://ai-accessibility-layer-db-fe7de--preview.goskip.app

# Ou com flag (equivalente):
npx @skip-ai/scanner scan . --generate-sam --validate-sam --send --token=15a786de-... --url=https://ai-accessibility-layer-db-fe7de--preview.goskip.app
```

O scanner máscara o token nos logs (`2ef0...79fb`). Ele deve gerar `.skip-sam.json`, validar o SAM, gerar os demais artefatos obrigatórios, enviar o bundle e confirmar a API. Se ele retornar erro HTTP 401 → token inválido; 405/404 → a API do Skip Cloud ainda não está configurada (avise o usuário); 413 → payload grande demais.

Após o envio bem-sucedido, confira que `.skip-sam.json` foi criado no scan atual, entrou no manifesto e foi confirmado pela API.

### Passo 6 — Reportar ao usuário

Mostre um resumo amigável:
- **Score WCAG**: "Score de acessibilidade: **78/100 (AA)** — 11 violações (2 critical, 5 serious, 4 moderate)."
- **Top violações**: liste as critical e serious primeiro, com a tela e a correção sugerida. Ex.: "🔴 `/login`: imagem sem alt → adicione `alt='...'`."
- "Mapeei **N telas**, **X botões/links**, **Y inputs**, **Z caminhos de navegação**, **F fluxos guiados**."
- Liste os fluxos guiados detectados (ex.: "Login do usuário", "Salvar em Configurações").
- Se houver ações com `confidence: "low"`, alerte: "Alguns elementos não têm id/aria-label estável. Pra confiabilidade total do widget, adicione `data-skip-anchor='...'` neles." Liste quais.
- Diga o próximo passo: "Acesse o dashboard em `{url}/dashboard` pra ver o grafo, o relatório WCAG completo e a evolução do score, ou cole o widget no seu site."

## Quando NÃO mapear algo

- Não inclua endpoints `/api/*` como telas (são chamadas de API, não navegação).
- Não inclua componentes internos reutilizáveis (ex.: `<Button>` genérico) como telas — só rotas/páginas reais.
- Não inclua rotas dinâmicas sem poder resolvê-las (ex.: rota gerada em runtime por dados do banco) — marque como limitação no briefing.

## Referências

- **`references/schema.md`** — schema completo do payload (LEIA antes de montar o passo 4)
- **`references/wcag-rules.md`** — as 11 regras WCAG (LEIA antes do passo 4.5)
- **`references/scoring.md`** — como o score é calculado
- **`references/examples.md`** — exemplos de payloads reais (Next.js, React Router, monorepo)
- **`scripts/validate-artifact.js`** — validador por tipo de artefato; use para `.skip-sam.json`

## Limitações honestas

- Botões com navegação condicional em runtime (`if (cond) navigate("/x")`) podem não ser detectados pela leitura estática. Nesses casos, sugira ao usuário adicionar `data-skip-action="navigate:/x"` no elemento.
- A detecção de rotas depende do sistema declarado. Se o projeto usa roteamento muito dinâmico (ex.: rotas vindas de um CMS), o mapa pode ficar incompleto — seja transparente sobre isso com o usuário.
