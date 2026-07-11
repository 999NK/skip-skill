# Skip AI — Skill `/skip`

Skill para agentes de IA (ZCode, Claude Code, Cursor) que mapeia o projeto do usuário para a plataforma **Skip AI Accessibility Layer**.

## Como funciona

Em vez de o scanner "adivinhar" a estrutura do projeto (o que falha em monorepos, projetos não-padronizados, etc.), **o agente lê o projeto, entende a estrutura real, e mapeia as telas**. O scanner (`npx @skip-ai/scanner`) atua apenas como transportador: envia o mapa montado pelo agente para o Skip Cloud.

```
Usuário: "/skip, mapeia meu app"
   │
   ▼
Agente (com esta skill):
   1. Lê package.json, árvore de pastas → entende a estrutura
   2. Identifica o frontend, o sistema de rotas, as telas
   3. Lê cada tela e extrai botões/links/inputs navegáveis
   4. Monta o navigationMap (JSON) seguindo o schema
   5. Valida o payload (scripts/validate-report.js)
   6. Envia: npx @skip-ai/scanner send --file=.skip-report.json --token=... --url=...
```

## Instalação

### Opção A — como skill do ZCode
```bash
# Clone pra dentro do diretório de skills do usuário
git clone https://github.com/skip-ai/skip-skill ~/.agents/skills/skip
```

### Opção B — como skill de projeto (só num repo específico)
```bash
git clone https://github.com/skip-ai/skip-skill .agents/skills/skip
```

## Uso

No seu agente (ZCode, Cursor, Claude Code):
```
/skip mapeia meu projeto
```
ou simplesmente:
```
mapeia meu app pra acessibilidade por voz
```

### Comando de setup (primeira vez)

Na primeira vez, o agente pede o **comando de setup**. Você copia no dashboard do Skip Cloud — ele já vem no formato do próprio `npx`, com `--token` e `--url` preenchidos:

```
npx @skip-ai/scanner --token=15a786de-... --url=https://ai-accessibility-layer-db-fe7de--preview.goskip.app
```

O agente extrai o token e a URL desse comando e salva em `.skip.json` no projeto, pra não pedir de novo.

## Arquivos

```
skip-skill/
├── SKILL.md                  # Instruções que o agente lê (o "cérebro")
├── references/
│   ├── schema.md             # Schema do payload navigationMap
│   └── examples.md           # Exemplos reais (Next.js, React Router, monorepo)
├── scripts/
│   └── validate-report.js    # Validador de payload
└── README.md
```

## Requisitos
- Node.js 18+ (pra rodar o validador e o `npx`)
- Conta no Skip Cloud (com um projeto criado e token)
- Um agente que suporte skills (ZCode, Claude Code, Cursor)

## Licença
MIT
