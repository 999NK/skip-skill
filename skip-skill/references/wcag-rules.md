# Regras de auditoria WCAG

Este documento descreve cada regra que o agente aplica ao auditar um projeto. **Leia este arquivo antes de começar a auditoria** (Passo "Auditar WCAG" do fluxo na SKILL.md). Cada regra tem: o que detectar, severidade, como corrigir e o link da WCAG.

O agente aplica estas regras lendo os arquivos **localmente** — nunca envia o conteúdo dos arquivos ao Skip Cloud. Só as violações estruturadas são enviadas.

## Severidades

| Severidade | Significado | Peso no score |
|---|---|---|
| `critical` | Bloqueia usuários de tecnologia assistiva (ex.: leitor de tela não consegue usar) | -12 |
| `serious` | Dificulta muito o uso; usuário consegue mas com grande esforço | -6 |
| `moderate` | Afeta a experiência; usuário consegue contornar | -3 |
| `minor` | Problema menor ou heurístico (ex.: possível baixo contraste) | -1 |

## Regras

### 1. `img-alt-missing` — Imagem sem texto alternativo (1.1.1 Non-text Content)
- **Nível:** A · **Severidade:** critical
- **Detectar:** qualquer `<img>` sem atributo `alt`.
- **Correção:** adicione `alt="descrição"` (ou `alt=""` se for puramente decorativa).
- **WCAG:** https://www.w3.org/WAI/WCAG22/quickref/#non-text-content

### 2. `button-no-name` — Botão sem nome acessível (4.1.2 Name, Role, Value)
- **Nível:** A · **Severidade:** serious
- **Detectar:** `<button>` sem texto visível E sem `aria-label`/`aria-labelledby`.
- **Correção:** adicione texto visível, ou `aria-label="..."`, ou `aria-labelledby="..."`.
- **WCAG:** https://www.w3.org/WAI/WCAG22/quickref/#name-role-value

### 3. `input-no-label` — Campo sem label associada (1.3.1 / 3.3.2)
- **Nível:** A · **Severidade:** serious
- **Detectar:** `<input>`, `<textarea>` ou `<select>` sem qualquer uma destas formas de label:
  - `<label for="id">` (HTML clássico)
  - `<label htmlFor="id">` (React/JSX)
  - `<label>` envolvente: `<label>Email <input/></label>`
  - `aria-label="..."` ou `aria-labelledby="..."`
  - Inputs `type="hidden"` são ignorados.
- **NÃO é violação:** input com `htmlFor` do React, ou envolto em `<label>`.
- **Correção:** associe `<label htmlFor="idDoCampo">` (React), `<label for="idDoCampo">` (HTML), `<label>` envolvente, ou `aria-label`.
- **WCAG:** https://www.w3.org/WAI/WCAG22/quickref/#labels-or-instructions

### 4. `link-href-empty` — Link sem destino (2.4.4 Link Purpose)
- **Nível:** A · **Severidade:** moderate
- **Detectar:** `<a href="#">`, `<a href="">`, `<a>` sem `href`, `<Link>` sem `href` E sem `to`.
- **NÃO é violação:** `<Link to="/x">` (React Router), `<Link href="/x">` (Next.js) — ambos têm destino válido.
- **Correção:** use um `href`/`to` válido apontando pra rota correta, ou transforme em `<button>` se for uma ação.
- **WCAG:** https://www.w3.org/WAI/WCAG22/quickref/#link-purpose-in-context

### 5. `tabindex-positive` — tabindex positivo (2.4.3 Focus Order)
- **Nível:** A · **Severidade:** moderate
- **Detectar:** qualquer elemento com `tabindex` > 0 (ex.: `tabindex="3"`).
- **Correção:** remova o tabindex positivo; use a ordem natural do DOM. Use `tabindex="0"` se precisar tornar focável.
- **WCAG:** https://www.w3.org/WAI/WCAG22/quickref/#focus-order

### 6. `heading-order` — Ordem de headings (1.3.1 Info and Relationships)
- **Nível:** A · **Severidade:** moderate
- **Detectar:** pular níveis de heading (ex.: `h1` seguido direto de `h3`, sem `h2`).
- **Correção:** não pule níveis. Após `h1` use `h2`, após `h2` use `h3`, etc.
- **WCAG:** https://www.w3.org/WAI/WCAG22/quickref/#info-and-relationships

### 7. `aria-invalid-role` — role inválida (4.1.2 Name, Role, Value)
- **Nível:** A · **Severidade:** serious
- **Detectar:** `role="valor"` com valor que não está na lista de roles ARIA válidas (ex.: `role="botão"` em vez de `role="button"`).
- **Correção:** use um valor de role válido da especificação ARIA, ou remova o atributo.
- **WCAG:** https://www.w3.org/WAI/WCAG22/quickref/#name-role-value

### 8. `lang-missing` — Documento sem idioma (3.1.1 Language of Page)
- **Nível:** A · **Severidade:** serious
- **Detectar:** `<html>` sem atributo `lang`.
- **Correção:** adicione `lang="pt-BR"` (ou o idioma correto) na tag `<html>`.
- **WCAG:** https://www.w3.org/WAI/WCAG22/quickref/#language-of-page

### 9. `skip-link-missing` — Sem link de pular conteúdo (2.4.1 Bypass Blocks)
- **Nível:** A · **Severidade:** moderate
- **Detectar:** página com `<main>` ou `id="main"` mas sem link `href="#main"`/`href="#content"`.
- **Correção:** adicione `<a href="#main" class="skip-link">Pular para o conteúdo</a>` como primeiro elemento focável.
- **WCAG:** https://www.w3.org/WAI/WCAG22/quickref/#bypass-blocks

### 10. `low-contrast-hint` — Possível baixo contraste (1.4.3 Contrast Minimum)
- **Nível:** AA · **Severidade:** `unknown` (needs-review)
- **Detectar:** classes que sugerem baixo contraste (heurística): `text-gray-200/300`, `text-slate-200/300`, `opacity-30/40`, etc.
- **Importante:** esta regra NÃO confirma falha — é heurística sem cálculo de contraste real (que só é possível em runtime com cores computadas). Por isso a severidade é `unknown` (needs-review), **não** `minor`. Não conta contra o score.
- **Correção:** verifique a razão de contraste (mínimo 4.5:1 para texto normal) com uma ferramenta de runtime. Evite tons muito claros em fundos brancos.
- **WCAG:** https://www.w3.org/WAI/WCAG22/quickref/#contrast-minimum

### 11. `form-no-instruction` — Formulário sem instrução (3.3.2 Labels or Instructions)
- **Nível:** A · **Severidade:** moderate
- **Detectar:** página com `<form>` mas sem texto de instrução, `required`/`obrigatório`, ou `aria-describedby`.
- **Correção:** adicione uma instrução curta antes do formulário, ou `aria-describedby` nos campos.
- **WCAG:** https://www.w3.org/WAI/WCAG22/quickref/#labels-or-instructions

## Como aplicar (para o agente)

Para cada tela mapeada:
1. Leia o conteúdo do arquivo da tela (que você já leu no passo de mapeamento).
2. Aplique cada uma das 11 regras acima.
3. Para cada violação, registre:
   - `id` (slug único na tela, ex.: `img-alt-login`)
   - `rule` (ex.: "1.1.1 Non-text Content")
   - `level`, `severity`, `impact`
   - `title` (título humano)
   - `description` (o que ocorreu nesta tela específica)
   - `screen` (rota)
   - `filePath` (caminho do arquivo)
   - `selector` (seletor CSS do elemento, conforme as regras de `selector`/`anchorId` do schema)
   - `fix` (sugestão de correção)
   - `wcagUrl`

Não invente violações. Se uma regra não se aplica (ex.: não há imagens), não há violação daquela regra. Seja preciso e honesto — falsos positivos minam a confiança no score.
