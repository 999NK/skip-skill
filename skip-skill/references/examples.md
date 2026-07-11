# Exemplos de payloads Skip AI

Exemplos reais e completos que o agente pode usar como referência ao montar o mapa de navegação.

---

## Exemplo 1: React Router + Vite (projeto simples)

Estrutura detectada:
```
meu-app/
  src/
    App.tsx              → define <Route path="/login" ...>
    pages/
      Home.tsx
      Login.tsx
      Settings.tsx
    components/
      Sidebar.tsx
```

Payload resultante:

```json
{
  "projectName": "meu-app",
  "framework": "vite-react",
  "language": "TypeScript",
  "filesScanned": 4,
  "navigationMap": {
    "screens": [
      {
        "id": "root",
        "title": "Home",
        "route": "/",
        "filePath": "src/pages/Home.tsx",
        "description": "Página inicial",
        "actions": [
          {
            "id": "act-root-nav-1",
            "label": "Entrar",
            "kind": "navigation",
            "intent": "navigate",
            "targetRoute": "/login",
            "selector": "a:has-text('Entrar')",
            "anchorId": null,
            "inputType": null,
            "inputName": null,
            "confidence": "medium",
            "warning": null
          }
        ],
        "globalActions": [
          { "label": "Configurações", "targetRoute": "/settings", "source": "Sidebar" }
        ]
      },
      {
        "id": "login",
        "title": "Login",
        "route": "/login",
        "filePath": "src/pages/Login.tsx",
        "description": "Tela de login",
        "actions": [
          {
            "id": "act-login-fill-1",
            "label": "Email",
            "kind": "fill",
            "intent": "fill",
            "targetRoute": null,
            "selector": "input[name='email']",
            "anchorId": null,
            "inputType": "email",
            "inputName": "email",
            "confidence": "medium",
            "warning": null
          },
          {
            "id": "act-login-fill-2",
            "label": "Senha",
            "kind": "fill",
            "intent": "fill",
            "targetRoute": null,
            "selector": "input[name='password']",
            "anchorId": null,
            "inputType": "password",
            "inputName": "password",
            "confidence": "medium",
            "warning": null
          },
          {
            "id": "act-login-submit-3",
            "label": "Entrar",
            "kind": "submit",
            "intent": "login",
            "targetRoute": null,
            "selector": "#btn-entrar",
            "anchorId": "btn-entrar",
            "inputType": null,
            "inputName": null,
            "confidence": "high",
            "warning": null
          }
        ],
        "globalActions": [
          { "label": "Configurações", "targetRoute": "/settings", "source": "Sidebar" }
        ]
      }
    ],
    "navigationGraph": [
      { "from": "/", "to": "/login", "label": "Entrar" },
      { "from": "/login", "to": "/dashboard", "label": "Entrar" },
      { "from": "/", "to": "/settings", "label": "Configurações" },
      { "from": "/login", "to": "/settings", "label": "Configurações" }
    ]
  },
  "briefing": "Projeto com 2 tela(s): 'Home' (/), 'Login' (/login).\n\nTela Home (/): link 'Entrar' navega para /login; menu 'Configurações' navega para /settings.\nTela Login (/login): input 'Email' (email, name=email); input 'Senha' (password, name=password); botão 'Entrar' (login); menu 'Configurações' navega para /settings."
}
```

---

## Exemplo 2: Monorepo pnpm (frontend em apps/web)

Estrutura detectada:
```
adegaerp/
  package.json            → { workspaces: ["apps/*"] }
  pnpm-workspace.yaml
  apps/
    web/                  ← FRONTEND (identificado por ter 'react' e 'vite')
      src/
        pages/
        components/
    api/                  ← backend, ignorado
```

O agente deve:
1. Ler `package.json` da raiz, ver `workspaces` ou `pnpm-workspace.yaml` → **é monorepo**
2. Listar `apps/`, ler cada `apps/*/package.json`
3. `apps/api` tem `express`/`fastify` → é backend, **ignorar**
4. `apps/web` tem `react` + `vite` → **é o frontend**, mapear daqui
5. O `filePath` das telas passa a incluir o caminho do subdiretório: `apps/web/src/pages/Login.tsx`

O payload é idêntico ao Exemplo 1, exceto:
- `"projectName": "adegaerp"` (ou "adegaerp-web")
- `"filePath"` das telas: `"apps/web/src/pages/Login.tsx"`
- `"framework": "vite-react"`

---

## Exemplo 3: Next.js App Router

Estrutura detectada:
```
meu-app/
  src/
    app/
      page.tsx              → rota "/"
      layout.tsx            → layout (NÃO é tela)
      login/
        page.tsx            → rota "/login"
      settings/
        page.tsx            → rota "/settings"
      users/
        [id]/
          page.tsx          → rota "/users/:id"
```

Regras específicas do Next App Router:
- Apenas arquivos `page.tsx` viram telas (não `layout.tsx`, `loading.tsx`, `error.tsx`)
- Route groups `(dashboard)` são removidos da rota: `(dashboard)/settings/page.tsx` → `/settings`
- Dynamic segments `[id]` viram `:id`: `/users/:id`
- Catch-all `[...slug]` vira `:slug*`
