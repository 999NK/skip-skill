# Cálculo de score de acessibilidade

O score Skip AI é um número **0–100** que indica o nível de acessibilidade do projeto, calculado a partir das violações WCAG detectadas.

## Fórmula

```
score = max(0, 100 - Σ(peso(severidade) para cada violação))
```

## Pesos por severidade

| Severidade | Peso | Por quê |
|---|---|---|
| `critical` | -12 | bloqueia usuário de TA completamente |
| `serious` | -6 | dificulta muito o uso |
| `moderate` | -3 | afeta experiência, contornável |
| `minor` | -1 | problema menor confirmado |
| `unknown` | 0 | indeterminado (ex.: contraste sem cálculo real) — **não penaliza**, vai em `checks.needsReview` |

**Nunca use `minor` como fallback** quando não souber a severidade. Use `unknown`. Regra do spec: "Quando a severidade não puder ser determinada, use `unknown`."

## Interpretação

| Score | Faixa | Cor | Significado |
|---|---|---|---|
| 90–100 | Excelente | 🟢 verde | Praticamente conforme |
| 70–89 | Bom | 🟡 amarelo | Alguns ajustes menores |
| 50–69 | Razoável | 🟣 magenta | Vários problemas a corrigir |
| 0–49 | Crítico | 🔴 vermelho | Acessibilidade seriamente comprometida |

## Nível WCAG alcançável

Além do score numérico, determinamos o **nível WCAG** que o projeto alcança:

| Condição | Nível |
|---|---|
| Zero violações | `AAA` |
| Violações apenas de nível AAA (nenhuma A ou AA) | `AA` |
| Qualquer violação de nível A ou AA | `A` |

**Observação importante:** o nível retornado é um **indicador**, não uma certificação oficial WCAG. Certificação real exige auditoria humana em runtime (DOM renderizado, contraste computado, navegação por teclado). O score Skip é uma fotografia estática que sinaliza onde agir.

## Exemplo

Um projeto com:
- 2 critical (img sem alt × 2): -24
- 3 serious (button/input sem nome): -18
- 1 moderate (tabindex positivo): -3

Score = `100 - 24 - 18 - 3 = 55` (faixa "Razoável", cor magenta).
Nível = `A` (há violações de nível A).

## Roadmap de evolução do score

- v1 (atual): soma linear de pesos.
- v2: ponderar por número de telas (score por tela, não global) e por usuários afetados.
- v3: score ponderado por severidade real medida em runtime (contraste computado, foco visível, ordem de tabulação).
