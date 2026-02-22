# ESPECIFICAÇÃO DE DASHBOARD

**Bee2Waste — Indicadores, KPIs e Inteligência de Mercado**

Documento de referência para desenvolvimento do dashboard principal

Versão 1.0 | Fevereiro 2026

Bee2Solutions | Confidencial

---

## 1. Visão Geral do Dashboard

### 1.1 Objetivo

O dashboard principal do Bee2Waste é a vista central que permite ao gestor de parque, ao diretor de operações e ao gestor comercial tomar decisões informadas sobre toda a cadeia de valor do resíduo. O dashboard deve responder a quatro perguntas fundamentais em tempo real:

- **Quanto vale o que tenho em parque?** — Valor total do stock, por tipo de resíduo, com cotação de mercado atualizada.
- **Qual a qualidade do que estou a receber?** — Score e tendência de fornecedores, qualidade média das entradas.
- **Quando devo tratar e vender?** — Sazonalidade de mercado, timing ideal para tratamento e venda.
- **Onde estão os problemas e as oportunidades?** — Alertas proativos, lotes a necessitar de ação, fornecedores em atraso.

### 1.2 Perfis de Utilizador

| Perfil | Foco Principal | Widgets Prioritários |
|--------|---------------|---------------------|
| Gestor de Parque | Operação diária, zonas, lotes ativos | Mapa de Zonas, Lotes Ativos, Alertas Operacionais |
| Gestor Comercial | Fornecedores, recolhas, vendas | Ranking Fornecedores, Ciclo Produção, Sazonalidade |
| Diretor de Operações | KPIs financeiros, margem, tendências | Valor em Parque, Margem por Lote, Sazonalidade |
| Gestor de Qualidade | Qualidade, rastreabilidade, conformidade | LQI Médio, Rastreabilidade, Contaminação |

### 1.3 Estrutura de Navegação

O dashboard deve ser organizado em separadores (tabs) para que cada perfil aceda rapidamente à informação relevante. Estrutura proposta:

- **Vista Geral** — Resumo executivo com os KPIs principais e alertas (vista por defeito)
- **Stock e Valorização** — Valor em parque, por tipo de resíduo, com cotações de mercado
- **Sazonalidade e Mercado** — Gráficos de preço ao longo do ano, recomendações de timing
- **Fornecedores** — Ranking, score, ciclo de produção, tendências
- **Lotes e Qualidade** — Lotes ativos, em tratamento, fechados, LQI
- **Alertas** — Centro de notificações com todos os alertas proativos

---

## 2. Tab: Vista Geral

A vista geral é o primeiro ecrã que o utilizador vê ao abrir o dashboard. Deve dar uma fotografia instantânea do estado do parque e destacar o que precisa de atenção imediata.

### 2.1 Barra de KPIs Principais (Top Bar)

Uma barra horizontal no topo com 5 cartões de métricas-chave. Cada cartão mostra o valor atual, a variação percentual vs. período anterior, e um indicador visual de tendência (seta para cima/baixo, cor verde/vermelha).

| KPI | Fórmula / Origem | Formato | Comparação |
|-----|-----------------|---------|------------|
| Valor Total em Parque | Soma de (stock_kg por LER × cotacao_mercado por LER) | € XX.XXX | vs. mês anterior (%) |
| Margem Média dos Lotes | (valor_mercado_produto - custo_operacao) / custo_operacao × 100 | XX% | vs. mês anterior (pp) |
| LQI Médio | Média dos LQI dos lotes fechados no período | X.X (A-E) | vs. trimestre anterior |
| Yield Médio | Média da taxa de rentabilidade dos lotes fechados | XX% | vs. mês anterior (pp) |
| Alertas Ativos | Contagem de alertas não lidos/não resolvidos | N | Com badge de urgência |

### 2.2 Painel de Alertas Urgentes

Imediatamente abaixo da barra de KPIs, um painel colapsável com os alertas que requerem ação. Cada alerta deve incluir: tipo, descrição, entidade afetada, data/hora, e botão de ação rápida.

| Tipo de Alerta | Trigger | Severidade | Ação Rápida |
|----------------|---------|-----------|-------------|
| Fornecedor em atraso | hoje > previsao + 5 dias | Alta | Abrir ficha fornecedor |
| Lote a 80%+ capacidade | ocupacao_lote > 80% | Média | Ver lote / Iniciar tratamento |
| Qualidade abaixo do esperado | raw_grade < threshold | Alta | Ver lote / Ver entrada |
| Zona bloqueada > N dias | dias_bloqueio > config | Baixa | Libertar zona |
| Fornecedor próximo do ciclo | hoje >= previsao - 3 dias | Info | Planear recolha |
| Pico de mercado a aproximar-se | data_atual + 60 dias dentro de janela_pico | Oportunidade | Ver sazonalidade |

### 2.3 Mini-Gráficos (Sparklines)

Na vista geral, incluir 3 mini-gráficos horizontais (sparklines) que mostram tendências dos últimos 12 meses sem necessidade de navegar para outro separador:

- **Entradas (t/mês)** — Volume mensal de resíduos recebidos, com linha de tendência.
- **Valor em Parque (EUR/mês)** — Evolução do valor do stock ao longo do tempo.
- **LQI Médio (mês)** — Evolução da qualidade média dos lotes fechados.

---

## 3. Tab: Stock e Valorização

### 3.1 Tabela de Stock Valorizado

Tabela principal que mostra, para cada tipo de resíduo em parque, o stock atual, a cotação de mercado, o valor estimado e a tendência de preço. Esta é a implementação do conceito apresentado no slide 5 da apresentação comercial.

| Coluna | Tipo de Dados | Origem | Notas |
|--------|--------------|--------|-------|
| Tipo de Resíduo | Texto (código LER + descrição) | Tabela LER + stock | Agrupável por família LER |
| Stock Atual (t) | Numérico, 1 decimal | Soma peso_liquido entradas ativas - saidas | Tempo real |
| Cotação de Mercado (EUR/t) | Numérico, 0 decimais | API/tabela de cotações | Atualizável manualmente ou por feed |
| Valor Estimado (EUR) | Numérico = stock × cotacao | Calculado | Destacar com cor do total |
| Tendência Preço (%) | Percentual com seta | cotacao_atual vs. cotacao_mes_anterior | Verde (subida), Vermelho (descida), Amarelo (estável) |
| Var. Mensal Stock (t) | Numérico com sinal | stock_atual - stock_mes_anterior | Mostra se o stock está a acumular ou a escoar |

### 3.2 Cartão de Total em Parque

Cartão destacado no topo (ou no fundo da tabela) com:

- **Peso total em parque:** soma de todo o stock em toneladas
- **Valor total estimado:** soma dos valores estimados, em EUR, com destaque visual (tamanho de fonte grande, cor da marca)
- **Variação vs. mês anterior:** em percentagem e em valor absoluto

### 3.3 Gestão de Cotações de Mercado

O sistema deve suportar a configuração de cotações de mercado de duas formas:

- **Manual:** o gestor introduz ou atualiza a cotação por tipo de resíduo (EUR/tonelada), com data de referência. O sistema mantém histórico.
- **Feed externo (futuro):** integração com APIs de mercado de commodities recicladas (ex: Recycling Markets, Letsrecycle price indices). Implementar como módulo pluggable com interface definida.

Modelo de dados para cotações:

```sql
market_prices
  id: UUID
  ler_code: VARCHAR(8)          -- codigo LER (ex: 20 01 01)
  product_type: VARCHAR(100)    -- tipo de produto transformado
  price_per_ton: DECIMAL(10,2)  -- EUR/tonelada
  currency: VARCHAR(3)          -- EUR
  effective_date: DATE           -- data de referencia
  source: VARCHAR(50)           -- manual | api_letsrecycle | ...
  created_by: UUID              -- utilizador que registou
  created_at: TIMESTAMP
```

---

## 4. Tab: Sazonalidade e Mercado

### 4.1 Gráfico de Sazonalidade (12 meses)

Este é o widget mais diferenciador do Bee2Waste. Deve apresentar um gráfico de linhas com o preço médio do produto transformado ao longo dos 12 meses do ano, para cada tipo de resíduo selecionado. Este é o equivalente funcional do slide 7 da apresentação comercial.

Especificações do gráfico:

- **Eixo X:** Meses (Jan-Dez). Mostrar dados históricos (média dos últimos 2-3 anos) e dados do ano corrente sobrepostos.
- **Eixo Y:** EUR / tonelada.
- **Linhas:** Uma linha por tipo de resíduo selecionado (até 5 em simultâneo). Cores consistentes com a identidade visual (vermelho, verde, azul escuro, âmbar, teal).
- **Zona de pico:** Sombrear com cor suave (verde translúcido) os meses onde o preço está acima da média + 10%. Tooltip com: nome do período de pico, variação percentual vs. média anual.
- **Linha do presente:** Linha vertical a tracejado no mês corrente, com label indicando onde estamos no ciclo.
- **Filtros:** Seletor de tipos de resíduo (multi-select), período de referência (últimos 1/2/3 anos), parque.

### 4.2 Painel de Recomendações de Timing

À direita do gráfico (ou abaixo em mobile), um painel com recomendações geradas automaticamente pelo sistema. Cada recomendação é um cartão com:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| Tipo de Resíduo | Nome e código LER | Papel/Cartão (20 01 01) |
| Janela de Pico | Meses de preço mais alto | Setembro - Novembro |
| Variação no Pico | % acima da média anual | +15% vs. média anual |
| Stock Atual | Toneladas em parque deste tipo | 45.2 t |
| Recomendação | Texto gerado pelo sistema | Iniciar tratamento em Julho para ter produto pronto em Setembro |
| Ação | Botão de ação | Planear tratamento / Ver lotes abertos |

### 4.3 Lógica de Geração de Recomendações

O motor de recomendações deve calcular, para cada tipo de resíduo com stock em parque:

```
proximo_pico = mes com maior cotacao_media nos proximos 6 meses
tempo_tratamento_medio = media(closed_at - started_treatment_at) para lotes do mesmo LER
data_ideal_inicio_tratamento = proximo_pico - tempo_tratamento_medio

se data_ideal_inicio_tratamento <= hoje + 30 dias:
    gerar alerta: 'Iniciar tratamento de [tipo] para aproveitar pico de [mes]'
    severidade: Oportunidade
```

### 4.4 Histórico de Margem por Período

Gráfico de barras empilhadas mostrando, por mês, a margem total obtida nas vendas (valor de venda - custo de operação). Permite ao utilizador ver se está a vender nos meses mais rentáveis. Barras com cor: verde para meses acima da média, vermelho para abaixo.

---

## 5. Tab: Fornecedores

### 5.1 Ranking de Fornecedores

Tabela ordenável e filtrável com todos os fornecedores ativos. Implementação do conceito do slide 9 e da secção 7 da especificação de Lotes & Qualidade.

| Coluna | Tipo | Fonte de Dados | Interação |
|--------|------|---------------|-----------|
| Posição (#) | Inteiro | Ordenação por score | Re-ordena ao clicar |
| Fornecedor | Texto (nome + NIF) | Tabela clientes | Link para ficha completa |
| Score Global (1-5) | Numérico 1 decimal + letra (A-E) | media_ponderada(LQI lotes) | Badge colorido por grau |
| Tendência | Seta + % variação | score_3m_atual vs. score_3m_anterior | Verde/Vermelho/Amarelo |
| Yield Médio (%) | Percentual 0 decimais | media(yield_rate lotes) | Barra de progresso visual |
| Contaminação Média (%) | Percentual 1 decimal | media(contaminacao entradas) | Cor: verde<8%, amarelo 8-15%, vermelho>15% |
| Volume (t/mês) | Numérico 1 decimal | media_mensal(peso entradas) | Sparkline últimos 6 meses |
| Próxima Entrega | Data ou ~N dias | ultima_entrada + intervalo_medio | Cor: normal/proximo/atraso |
| Margem Média (%) | Percentual 0 decimais | media(margem lotes) | Verde se > margem_media_global |

### 5.2 Ficha de Fornecedor (Drill-Down)

Ao clicar num fornecedor, abrir uma vista detalhada (side-panel ou página dedicada) com:

- **Dados cadastrais:** nome, NIF, morada, contacto, tipo de resíduo principal.
- **KPIs individuais:** score, yield, contaminação, volume, regularidade, todos com gráfico de evolução temporal (6-12 meses).
- **Histórico de lotes:** tabela com todos os lotes em que participou, com LQI, datas, peso contribuído.
- **Ciclo de produção:** gráfico com as datas de entregas passadas, intervalo médio, previsão da próxima entrega, e desvio padrão (para medir regularidade).
- **Comparação com média:** radar chart comparando o fornecedor vs. média de todos os fornecedores em 5 eixos: score, yield, contaminação, regularidade, volume.

### 5.3 Ciclo de Produção e Previsão de Entregas

Vista tipo calendário/timeline que mostra, para os próximos 30 dias:

- **Fornecedores com entrega prevista** — barras coloridas por score (verde=A/B, amarelo=C, vermelho=D/E).
- **Fornecedores em atraso** — destacados com ícone de alerta.
- **Capacidade de receção** — indicar se há zonas/lotes abertos para receber o tipo de resíduo previsto.

Fórmulas de previsão:

```
intervalo_medio = AVG(dias entre entradas consecutivas)
desvio_padrao = STDDEV(dias entre entradas consecutivas)
proxima_previsao = data_ultima_entrada + intervalo_medio
janela_previsao = [proxima_previsao - desvio_padrao, proxima_previsao + desvio_padrao]
confianca = 1 - (desvio_padrao / intervalo_medio)  -- 0 a 1, quanto maior melhor
```

---

## 6. Tab: Lotes e Qualidade

### 6.1 Visão dos Lotes Ativos

Painel principal com todos os lotes que não estão fechados, organizados por estado. Cada lote é um cartão com informação resumida.

| Estado | Cor do Cartão | Informação Visível | Ações Disponíveis |
|--------|--------------|-------------------|-------------------|
| ABERTO | Borda verde | N.º lote, tipo LER, peso total, n.º entradas, raw_grade, % ocupação, zonas | Adicionar entrada, Iniciar tratamento, Ver detalhes |
| EM TRATAMENTO | Borda âmbar | N.º lote, tipo LER, peso total, data início tratamento, dias em tratamento | Registar peso final, Fechar lote, Ver folha classificação |
| FECHADO (recentes) | Borda cinza | N.º lote, LQI (badge A-E), yield, raw_grade, transformed_grade, margem | Ver detalhes, Rastreabilidade, Exportar relatório |

### 6.2 Detalhe do Lote (Drill-Down)

Ao abrir um lote, mostrar toda a informação associada:

- **Cabeçalho:** número, nome, estado (badge colorido), códigos LER, datas de abertura/tratamento/fecho.
- **Indicadores de qualidade:** 4 KPI cards lado a lado: Raw Grade, Transformed Grade, Yield Rate, LQI (com classificação A-E).
- **Entradas do lote:** tabela com todas as entradas: data, fornecedor, peso, grau de entrada, e-GAR. Ordenável por qualquer coluna.
- **Zonas associadas:** lista de zonas com ocupação individual.
- **Valorização:** se o lote está fechado, mostrar: valor de mercado do produto final, custo estimado de operação, margem em EUR e %.
- **Rastreabilidade:** árvore navegável de Saída → Lote → Entradas → Fornecedores (ver secção 7).

### 6.3 Mapa de Zonas do Parque

Representação visual (grid ou mapa esquemático) das zonas do parque. Cada zona é um bloco colorido de acordo com o estado:

- 🟢 **Verde:** zona livre, disponível para receção.
- 🔵 **Azul:** zona ocupada com lote aberto (a receber entradas). Tooltip: nome do lote, tipo LER, % ocupação.
- 🟡 **Âmbar:** zona bloqueada (lote em tratamento). Tooltip: nome do lote, dias em tratamento.
- 🔴 **Vermelho:** zona bloqueada há mais de N dias (alerta). Tooltip: motivo, dias bloqueados.
- ⚪ **Cinza:** zona desativada.

O mapa deve ser configurável pelo gestor de parque nas definições, permitindo posicionar as zonas de acordo com a disposição física real do parque.

---

## 7. Rastreabilidade e Navegação Bidirecional

A rastreabilidade é uma funcionalidade transversal, acessível a partir de vários pontos do dashboard. Deve permitir navegar em ambas as direções da cadeia de valor.

### 7.1 Rastreabilidade Direta (Fornecedor → Produto)

A partir de um fornecedor ou de uma entrada, navegar para o lote associado e para as saídas geradas.

```
Fornecedor > Entrada E-2025-031 > Lote L-2025-015 > Saída S-2025-042
```

### 7.2 Rastreabilidade Inversa (Produto → Fornecedor)

A partir de uma saída ou produto final, navegar de volta ao lote de origem e aos fornecedores que contribuíram. Implementação funcional do conceito do slide 10 da apresentação comercial.

```
Saída S-2025-042 > Lote L-2025-015 (LQI: 2.8 C)
  > Entrada E-2025-031 — Empresa A — 8.2t — Grau 4
  > Entrada E-2025-038 — Empresa C — 6.1t — Grau 2 <-- origem provável
  > Entrada E-2025-041 — Empresa A — 4.8t — Grau 4
```

### 7.3 Componente Visual

Implementar como uma árvore expansível (tree view) ou grafo interativo. Cada nó mostra: identificador, entidade, peso, grau de qualidade. Nós com qualidade baixa (grau 1-2) devem ser destacados a vermelho. Ao clicar num nó, abrir o detalhe da entidade (ficha de fornecedor, detalhe de entrada, detalhe de lote).

---

## 8. Catálogo Completo de Indicadores e Fórmulas

Esta secção lista todos os indicadores, KPIs e métricas calculadas do sistema, com as respetivas fórmulas, para referência da equipa de desenvolvimento.

### 8.1 Indicadores de Lote

| Indicador | Fórmula | Unidade | Quando Calcula |
|-----------|---------|---------|----------------|
| Raw Grade | SUM(grau_i × peso_i) / SUM(peso_i) | 1.0 - 5.0 | A cada entrada associada (tempo real) |
| Yield Rate | (peso_produto_final / peso_total_entradas) × 100 | % | Ao fechar o lote |
| Transformed Grade | Inserido pelo classificador ou inferido | 1.0 - 5.0 | Ao fechar o lote |
| LQI | (raw × 0.30) + (yield_norm × 0.40) + (transformed × 0.30) | 1.0 - 5.0 (A-E) | Ao fechar o lote |
| Yield Normalizado | MIN(yield_rate / 100 × 5, 5) | 1.0 - 5.0 | Ao fechar o lote |
| Valor de Mercado | peso_produto_final × cotacao_mercado(LER) | EUR | Ao fechar + quando cotação atualiza |
| Custo de Operação | custo_por_tonelada(LER) × peso_total_entradas | EUR | Configurável por tipo |
| Margem | valor_mercado - custo_operacao | EUR e % | Ao fechar o lote |

### 8.2 Indicadores de Fornecedor

| Indicador | Fórmula | Unidade | Atualização |
|-----------|---------|---------|-------------|
| Score Global | SUM(LQI_lote × peso_contribuicao) / SUM(peso_contribuicao) | 1.0 - 5.0 | A cada lote fechado |
| Tendência | score_ultimos_3m - score_3m_anteriores | +/- valor | Mensal |
| Yield Médio | AVG(yield_rate dos lotes onde participou) | % | A cada lote fechado |
| Contaminação Média | AVG(% contaminação das entradas) | % | A cada entrada |
| Regularidade | 1 - (STDDEV(intervalos) / AVG(intervalos)) | 0.0 - 1.0 | A cada entrada |
| Volume Mensal | SUM(peso_entradas) / N_meses_ativo | t/mês | A cada entrada |
| Intervalo Médio | AVG(dias entre entradas consecutivas) | dias | A cada entrada |
| Próxima Previsão | data_ultima_entrada + intervalo_medio | data | A cada entrada |

### 8.3 Indicadores de Mercado e Valorização

| Indicador | Fórmula | Unidade | Atualização |
|-----------|---------|---------|-------------|
| Stock por LER | SUM(peso_entradas ativas) - SUM(peso_saidas) | toneladas | Tempo real |
| Valor em Parque | SUM(stock_ler × cotacao_ler) | EUR | Quando stock ou cotação mudam |
| Cotação Atual | Último registo market_prices por LER | EUR/t | Manual ou feed |
| Variação Mensal Preço | (cotacao_atual - cotacao_mes_anterior) / cotacao_mes_anterior × 100 | % | Mensal |
| Média Sazonal | AVG(cotação por mês, últimos 2-3 anos) | EUR/t por mês | Anual (recálculo) |
| Pico Sazonal | Meses com cotação > media_anual × 1.10 | Meses | Anual (recálculo) |
| Margem Total Período | SUM(margem lotes fechados no período) | EUR | A cada lote fechado |

---

## 9. Sistema de Classificação LQI

### 9.1 Escala de Qualidade de Entrada (1-5)

| Grau | Denominação | Contaminação | Cor | Código Hex |
|------|------------|-------------|-----|-----------|
| 5 | Premium | < 2% | Verde escuro | `#1B8A2E` |
| 4 | Bom | 2 - 8% | Verde | `#5CB85C` |
| 3 | Aceitável | 8 - 15% | Âmbar | `#F5A623` |
| 2 | Baixo | 15 - 25% | Laranja | `#E67E22` |
| 1 | Rejeitável | > 25% | Vermelho | `#D9534F` |

### 9.2 Classificação LQI (Lote)

| Classificação | Range LQI | Denominação | Cor | Ação Sugerida |
|--------------|-----------|------------|-----|---------------|
| A | 4.5 - 5.0 | Excelente | Verde escuro | Vender no pico de mercado |
| B | 3.5 - 4.5 | Bom | Verde | Operação normal |
| C | 2.5 - 3.5 | Aceitável | Âmbar | Analisar fornecedores contribuintes |
| D | 1.5 - 2.5 | Baixo | Laranja | Alerta: rever fornecedores com grau baixo |
| E | < 1.5 | Crítico | Vermelho | Ação urgente: investigar origem |

---

## 10. Requisitos Técnicos

### 10.1 Atualização de Dados

| Componente | Frequência | Método |
|-----------|-----------|--------|
| KPIs da barra superior | Tempo real (< 5 segundos após evento) | WebSocket ou polling a 5s |
| Tabela de Stock Valorizado | Tempo real | Recalcular ao registar entrada/saída |
| Cotações de Mercado | Diária (se feed) ou manual | Cron job ou trigger manual |
| Sazonalidade (gráficos) | Mensal (dados históricos) + diário (ano corrente) | Cron job + cache |
| Ranking de Fornecedores | A cada lote fechado | Trigger de base de dados |
| Alertas | Tempo real + verificação horária | Evento + cron job a cada hora |
| Mapa de Zonas | Tempo real | WebSocket ou polling a 10s |

### 10.2 Filtros Globais

Todos os separadores do dashboard devem respeitar os filtros globais, persistentes na sessão do utilizador:

- **Parque:** seletor de parque (se multi-parque). Obrigatório.
- **Período:** seletor de data (últimos 30d, 90d, 6m, 12m, personalizado). Default: últimos 30 dias.
- **Tipo de Resíduo:** multi-select de códigos LER. Default: todos.

### 10.3 Responsividade

O dashboard deve ser responsivo e funcional em:

- **Desktop (1920×1080+):** layout completo com painéis lado a lado.
- **Tablet (768-1024px):** layout empilhado, gráficos mantêm legibilidade.
- **Mobile (< 768px):** apenas KPIs + alertas + ações rápidas. Gráficos em scroll horizontal.

### 10.4 Exportação

Todas as tabelas e gráficos devem suportar exportação:

- **Tabelas:** CSV e Excel (.xlsx)
- **Gráficos:** PNG e PDF
- **Relatório completo:** PDF com todos os KPIs do período selecionado (template pré-definido)
