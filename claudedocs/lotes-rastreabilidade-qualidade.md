# Sistema de Lotes e Rastreabilidade de Qualidade — Especificação

**Projeto:** Bee2Waste
**Módulo:** Lotes & Qualidade
**Estado:** Pré-implementação — aprovado para análise
**Data:** 2026-02-21

---

## 1. Visão Geral

O sistema de **Lotes** é o mecanismo de rastreabilidade que liga toda a cadeia de valor do resíduo:

```
Fornecedor (entrada) → Zona de Armazenamento → Tratamento → Produto Final
         ↓                      ↓                   ↓              ↓
    Grau de Entrada         Lote Ativo          Folha de       Grau do Produto
    (Raw Quality)        [multi-zona]         Classificação   (Transformed Quality)
                                                               ↓
                                                      Taxa de Rentabilidade
                                                               ↓
                                                      Score do Fornecedor
```

Um **Lote** é a unidade de rastreabilidade que agrupa N entradas do mesmo tipo, armazenadas em uma ou mais zonas, processadas em conjunto, e cujo resultado mensurável permite classificar a qualidade do resíduo recebido e avaliar o desempenho de cada fornecedor.

---

## 2. Modelo de Dados Conceptual

### 2.1 Hierarquia Espacial do Parque

```
Parque
  └── Área (ex: "Armazém Norte", "Pátio Sul")
        └── Zona (ex: "Zona A1", "Zona A2", "Zona B1")
              └── Lote Ativo (0 ou 1 por zona)
```

- **Área**: agrupamento lógico de zonas (ex: zona de papel, zona de metais)
- **Zona**: unidade física de armazenamento, tem sempre no máximo **1 lote ativo**
- **Lote**: pode ocupar **múltiplas zonas** (quando a capacidade de uma zona não é suficiente)

### 2.2 Estrutura do Lote

| Campo | Descrição |
|---|---|
| `lote_number` | Número sequencial gerado automaticamente (ex: L-2025-001) |
| `name` | Nome descritivo definido pelo gestor (ex: "Papel/Cartão Março") |
| `ler_codes[]` | Lista de códigos LER aceites neste lote (definidos na criação) |
| `status` | `open` → `in_treatment` → `closed` |
| `zones[]` | Zonas associadas (1 a N) |
| `entries[]` | Entradas agregadas neste lote |
| `raw_grade` | Grau de qualidade da matéria-prima (calculado automaticamente) |
| `transformed_grade` | Grau de qualidade do produto final (após tratamento) |
| `yield_rate` | Taxa de rentabilidade (%) = peso_saída / peso_entradas × 100 |
| `lot_quality_index` | Índice composto automático (ver secção 4) |
| `classification_sheet_id` | Folha de classificação que processou o lote |
| `opened_at` / `closed_at` | Datas de abertura e encerramento |

---

## 3. Estados do Lote e Ciclo de Vida

```
[ABERTO]
  - Aceita novas entradas
  - Zonas associadas: disponíveis para receção
  - Raw grade vai sendo atualizado com cada entrada
     ↓
  (gestor ou automático: "Iniciar Tratamento")
     ↓
[EM TRATAMENTO]
  - Não aceita novas entradas
  - Zonas bloqueadas para receção
  - Folha de classificação criada/associada
  - Peso final registado → Transformed grade calculado
     ↓
  (conclusão do tratamento)
     ↓
[FECHADO]
  - Imutável
  - Todos os indicadores calculados e fixos
  - Zonas libertadas (automaticamente ao fechar, ou manualmente)
```

**Libertação de zona:** pode ocorrer ao fechar o lote (automático) ou manualmente pelo gestor antes do encerramento (ex: produto saiu mas lote ainda em processamento administrativo).

---

## 4. Sistema de Qualidade

### 4.1 Escala de Qualidade — Recomendação

Com base nas normas do setor (EN 643 para papel/cartão, CEN/TS 15359 para SRF, práticas ISRI), e adaptado para operação multi-LER, recomenda-se uma **escala de 1 a 5** com denominações operacionais:

| Grau | Denominação | Critério orientativo |
|---|---|---|
| **5 — Premium** | Excelente | Contaminação <2%, pureza muito elevada |
| **4 — Bom** | Boa qualidade | Contaminação 2–8% |
| **3 — Aceitável** | Qualidade média | Contaminação 8–15% |
| **2 — Baixo** | Qualidade baixa | Contaminação 15–25% |
| **1 — Rejeitável** | Abaixo do mínimo | Contaminação >25% |

> Os limiares de contaminação são configuráveis por código LER, pois cada tipo de resíduo tem tolerâncias diferentes.

### 4.2 Grau de Entrada (Raw Grade)

- Calculado automaticamente à medida que entradas são associadas ao lote
- Baseado em: resultado da inspeção de cada entrada + divergências registadas
- Fórmula: média ponderada pelo peso de cada entrada

```
raw_grade = Σ(grau_entrada_i × peso_líquido_i) / Σ(peso_líquido_i)
```

### 4.3 Taxa de Rentabilidade (Yield Rate)

```
yield_rate = (peso_produto_final / peso_total_entradas) × 100
```

Exemplo: Lote com 20t de papel → produto final 17.4t → Yield = 87%

### 4.4 Grau do Produto Final (Transformed Grade)

- Registado no encerramento do lote / folha de classificação
- Pode ser inserido manualmente pelo classificador, ou inferido dos dados de saída
- Segue a mesma escala 1–5

### 4.5 Índice de Qualidade do Lote (LQI — Lot Quality Index)

Índice composto calculado automaticamente ao fechar o lote:

```
LQI = (raw_grade × 0.30) + (yield_rate_normalizado × 0.40) + (transformed_grade × 0.30)
```

Onde `yield_rate_normalizado` = min(yield_rate / 100 × 5, 5)

**Resultado:** LQI de 1.0 a 5.0 → convertido para letra:
- 4.5–5.0 → **A (Excelente)**
- 3.5–4.5 → **B (Bom)**
- 2.5–3.5 → **C (Aceitável)**
- 1.5–2.5 → **D (Baixo)**
- <1.5 → **E (Crítico)**

---

## 5. Gestão de Lotes pelo Gestor de Parque

### 5.1 Configuração de Zonas

O gestor de parque pode, nas definições do parque:
- Criar e editar **zonas** dentro de cada área
- Definir capacidade máxima por zona (m³ ou kg)
- Ativar/desativar zonas
- Bloquear e libertar zonas manualmente

### 5.2 Criação de Lotes

**Manual:**
- Gestor acede a "Lotes" → "Novo Lote"
- Define: nome, códigos LER aceites, zonas associadas, capacidade máxima

**Automático** (regras configuráveis):
- Ao registar uma entrada, se não existir lote aberto compatível (mesmo LER na área de destino) → sistema cria lote automaticamente
- Se lote existente atingiu capacidade máxima e existe zona livre → sistema cria novo lote e associa a zona livre

### 5.3 Associação de Entradas a Lotes

- No passo "Alocação de Armazenamento" da wizard de entrada, o sistema apresenta:
  - Lotes abertos compatíveis com o LER da entrada
  - Zonas disponíveis
  - Capacidade restante de cada lote/zona
- Operador seleciona ou confirma a sugestão automática

---

## 6. Ciclo de Produção e Alertas de Fornecedores

### 6.1 Inferência do Ciclo de Produção

O sistema analisa o histórico de entradas por fornecedor e calcula:

```
intervalo_médio = média dos dias entre entradas consecutivas do mesmo cliente
desvio_padrão = variabilidade do ciclo
próxima_previsão = data_última_entrada + intervalo_médio
```

### 6.2 Alertas Proativos

| Alerta | Trigger | Destinatário |
|---|---|---|
| "Fornecedor próximo do ciclo" | `hoje >= próxima_previsão - 3 dias` | Gestor Comercial |
| "Fornecedor em atraso" | `hoje > próxima_previsão + 5 dias` | Gestor Comercial |
| "Qualidade do lote abaixo do esperado" | `raw_grade < threshold configurado` | Gestor de Parque |
| "Lote próximo da capacidade máxima" | `ocupação > 80%` | Operador / Gestor |
| "Zona bloqueada há X dias" | `zona bloqueada > N dias` | Gestor de Parque |

---

## 7. Score e Ranking de Fornecedores

### 7.1 Cálculo do Score

Para cada fornecedor, calculado automaticamente a partir dos lotes fechados:

```
score_fornecedor = média ponderada dos LQI dos lotes onde participou
                   (peso = contribuição em kg do fornecedor para o lote)
```

### 7.2 Perfil de Fornecedor — Indicadores

| Indicador | Descrição |
|---|---|
| Score Global (1–5) | LQI médio ponderado |
| Tendência | Comparação últimos 3 vs. 3 anteriores meses |
| Yield médio | Taxa de rentabilidade média dos seus lotes |
| Contaminação média | % média das suas entregas |
| Regularidade | Coeficiente de variação do ciclo de entrega |
| Total entregue (kg/mês) | Volume médio mensal |

### 7.3 Dashboard de Ranking

```
┌─────────────────────────────────────────────────────────────────┐
│ RANKING DE FORNECEDORES — Parque de Setúbal                     │
├──────────────────┬───────┬──────────┬──────────┬───────────────┤
│ Fornecedor       │ Score │ Yield    │ Contam.  │ Próx. Entrega │
├──────────────────┼───────┼──────────┼──────────┼───────────────┤
│ ★ Empresa A      │ 4.8 A │ 94%      │ 1.8%     │ ~3 dias       │
│   Empresa B      │ 4.1 B │ 87%      │ 6.2%     │ ~12 dias      │
│   Empresa C      │ 3.2 C │ 78%      │ 14.1%    │ Irregular     │
│ ↓ Empresa D      │ 2.1 D │ 68%      │ 22.4%    │ ~8 dias       │
└──────────────────┴───────┴──────────┴──────────┴───────────────┘
★ Alta prioridade  ↓ Tendência negativa
```

---

## 8. Rastreabilidade Inversa

A partir de qualquer ponto da cadeia é possível navegar em ambas as direções:

**Saída → Lote → Entradas → Fornecedores**
```
Saída S-2025-042 (produto com problema de qualidade)
  └── Lote L-2025-015 (LQI: 2.8 C)
        ├── Entrada E-2025-031 — Empresa A — 8.2t — Grau 4
        ├── Entrada E-2025-038 — Empresa C — 6.1t — Grau 2  ← origem provável
        └── Entrada E-2025-041 — Empresa A — 4.8t — Grau 4
```

**Fornecedor → Histórico de Lotes → Tendência de Qualidade**
```
Empresa C
  ├── Lote L-2025-003 — LQI: 3.4 C — Contaminação: 12%
  ├── Lote L-2025-009 — LQI: 2.9 C — Contaminação: 16%
  └── Lote L-2025-015 — LQI: 2.1 D — Contaminação: 22%  ← tendência negativa
```

---

## 9. Casos de Uso — Resumo

| ID | Caso de Uso | Ator | Prioridade |
|---|---|---|---|
| UC-01 | Criar lote manualmente | Gestor Parque | Alta |
| UC-02 | Associar entrada a lote (manual/automático) | Operador | Alta |
| UC-03 | Visualizar estado e ocupação dos lotes ativos | Operador / Gestor | Alta |
| UC-04 | Iniciar tratamento de um lote | Gestor / Classificador | Alta |
| UC-05 | Fechar lote e calcular qualidade final | Sistema (automático) | Alta |
| UC-06 | Libertar zona manualmente | Gestor Parque | Média |
| UC-07 | Consultar score e histórico de fornecedor | Gestor Comercial | Alta |
| UC-08 | Ver ranking de fornecedores | Gestor Comercial / Direção | Alta |
| UC-09 | Receber alerta de ciclo de fornecedor | Gestor Comercial | Média |
| UC-10 | Rastreabilidade inversa (saída → fornecedor) | Gestor Qualidade | Alta |
| UC-11 | Configurar zonas do parque | Gestor Parque | Alta |
| UC-12 | Configurar thresholds de alerta | Gestor Parque | Média |

---

## 10. Impacto nas Funcionalidades Existentes

| Módulo | Impacto |
|---|---|
| **Entradas** | Novo passo na wizard: seleção/confirmação do lote destino |
| **Stocks** | Visualização por lote (além de por área/LER) |
| **Classificação** | Folha de classificação associada a um lote |
| **Saídas** | Saída rastreada ao lote de origem |
| **Clientes** | Novo separador: Score de Qualidade + Ciclo de Produção |
| **Definições** | Nova secção: Gestão de Zonas e Lotes |
| **Dashboard** | Painel de alertas + ranking de fornecedores |

---

## 11. Proposta de Implementação (Fases)

### Fase A — Fundação (prerequisito)
- Modelo de dados: `zones`, `lots`, `lot_zones`, `lot_entries`
- Gestão de zonas nas definições do parque
- Criação manual de lotes

### Fase B — Integração com Entradas
- Associação de entrada a lote na wizard
- Criação automática de lote
- Raw grade calculado automaticamente

### Fase C — Qualidade e Encerramento
- Encerramento de lote com transformed grade
- Cálculo automático de LQI
- Libertação de zonas

### Fase D — Inteligência de Fornecedores
- Score de fornecedor
- Inferência do ciclo de produção
- Alertas proativos
- Dashboard de ranking

### Fase E — Rastreabilidade
- Navegação bidirecional lote ↔ entradas ↔ saídas
- Relatórios de rastreabilidade

---

## 12. Valor para o Negócio

### Para o Operador do Parque (Ambigroup e similares)

- **Visibilidade total da cadeia**: saber exatamente o que está em cada zona, de quem veio, e o que vai produzir
- **Decisões baseadas em dados**: escolher fornecedores com base em qualidade comprovada, não em perceção
- **Otimização da receção**: priorizar fornecedores com maior yield → menos custo de tratamento por tonelada valorizada
- **Rastreabilidade legal e de qualidade**: responder a reclamações de compradores identificando a origem em segundos
- **Planeamento de recolhas**: antecipar quando fornecedores de qualidade vão ter produto pronto
- **Redução de desperdício**: identificar e abordar fornecedores com alta contaminação antes que prejudiquem lotes

### Para os Fornecedores (entidades que entregam resíduos)

- **Certificação de qualidade**: receber feedback concreto sobre a qualidade do que entregam
- **Prioridade de recolha**: fornecedores com score alto são contactados primeiro
- **Melhoria contínua**: ver a evolução do seu score ao longo do tempo

### Para os Compradores (entidades que compram o produto final)

- **Garantia de origem**: rastrear o produto final até aos fornecedores originais
- **Consistência de qualidade**: lotes com LQI alto = produto mais consistente
- **Relatórios de conformidade**: documentação completa da cadeia de custódia

### Vantagem Competitiva da Plataforma

| Funcionalidade | Impacto Comercial |
|---|---|
| Score automático de fornecedores | Diferenciador único — decisões de receção baseadas em dados |
| Alertas de ciclo de produção | Reduz custo de prospeção — sabe-se quando ligar |
| Rastreabilidade completa | Conformidade com regulamentos futuros de responsabilidade estendida |
| LQI automático | Sem trabalho manual — o sistema faz os cálculos |
| Ranking de fornecedores | Base para negociação de preços e condições |
