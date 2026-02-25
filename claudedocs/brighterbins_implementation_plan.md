# Plano de Implementação — Integração BrighterBins Vision API

> **Baseado em:** `brighterbins_integration_spec_v2.md`
> **Branch sugerida:** `feature/brighterbins-vision`
> **Dependências prévias:** Migration 00012 aplicada, módulo de Entradas funcional

---

## Visão Geral

```
Fase 0 ─── Fundação (DB + Config)
  │
  ▼
Fase 1 ─── Backend Core (cliente + sync + actions)
  │
  ▼
Fase 2 ─── Settings: Associação de Câmaras
  │
  ▼
Fase 3 ─── Frontend: Entradas (secção Vision)
  │
  ▼
Fase 4 ─── Integração & Validação
```

**Paralelizável:** Fase 2 e Fase 3 podem avançar em paralelo assim que a Fase 1 estiver concluída.

---

## Matriz de Responsabilidades

| Papel | Responsabilidade |
|-------|-----------------|
| **Arquiteto** | Valida decisões de design, dependências entre fases, RLS e segurança |
| **Backend** | Camada de serviço, sync, server actions, cron route, TypeScript types |
| **Frontend** | Componentes de UI, páginas, integração de dados, estados de UI |
| **DevOps** | Variáveis de ambiente, `vercel.json`, cron configuration |
| **QA** | Testes de integração, validação de estados, cobertura de erros |

---

## Fase 0 — Fundação

**Objetivo:** Preparar a base de dados e a configuração do projeto antes de qualquer código de aplicação.

### Tarefa 0.1 — Criar migração SQL `00013_brighterbins.sql`

> **Responsável:** Arquiteto + Backend

**Ficheiro:** `supabase/migrations/00013_brighterbins.sql`

Conteúdo a criar (conforme secção 12 da spec):
- Tabela `park_brighterbins_devices`
- Tabela `brighterbins_sync_state`
- Tabela `entrada_vision_readings`
- Índices em todas as tabelas
- RLS policies (por `park_users`, service role para sync)
- Função RPC `get_top_contaminants(p_park_id UUID, days INT)`

**Critérios de conclusão:**
- [ ] `supabase db push` ou aplicação manual sem erros
- [ ] RLS activo nas 3 tabelas
- [ ] Índices criados e verificados no dashboard Supabase
- [ ] Função RPC testável: `SELECT * FROM get_top_contaminants('<park_id>', 30)`

---

### Tarefa 0.2 — Configurar variáveis de ambiente

> **Responsável:** DevOps + Backend

**Ficheiro:** `.env.local` (desenvolvimento) + Vercel Dashboard (produção)

Variáveis a adicionar:
```bash
BRIGHTERBINS_API_URL=https://api.brighterbins.com
BRIGHTERBINS_EMAIL=...
BRIGHTERBINS_PASSWORD=...
BRIGHTERBINS_MATCH_TOLERANCE_MINUTES=10
BRIGHTERBINS_PAGE_SIZE=100
SYNC_SECRET=<string aleatória longa>
```

**Critérios de conclusão:**
- [ ] `.env.local` atualizado com todas as variáveis
- [ ] `.env.example` atualizado (sem valores reais)
- [ ] Variáveis adicionadas no painel Vercel (produção)
- [ ] `SYNC_SECRET` NÃO tem prefixo `NEXT_PUBLIC_`

---

### Tarefa 0.3 — Configurar cron Vercel

> **Responsável:** DevOps

**Ficheiro:** `vercel.json` (criar ou atualizar se já existir)

```json
{
  "crons": [
    {
      "path": "/api/brighterbins/sync",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Critérios de conclusão:**
- [ ] `vercel.json` válido (sem conflitos com entradas existentes)
- [ ] Deploy verifica cron no painel Vercel

---

## Fase 1 — Backend Core

**Objetivo:** Implementar toda a lógica de servidor: autenticação, sync, server actions e endpoint de cron.

### Tarefa 1.1 — Tipos TypeScript

> **Responsável:** Backend

**Ficheiro:** `src/types/brighterbins.ts`

Tipos a criar (conforme secção 10 da spec):
- `LoginResponse`
- `BrighterBinsDevice`
- `DeviceDetail`
- `UplinkRecord`
- `TimeSeriesResponse`
- `EntradaVisionReading` (inclui `park_id`)
- `VisionReading` (tipo de inserção, sem `id`/`created_at`/`synced_at`)

**Critérios de conclusão:**
- [ ] Ficheiro sem erros TypeScript (`tsc --noEmit`)
- [ ] `VisionReading` alinhado com colunas de `entrada_vision_readings`

---

### Tarefa 1.2 — BrighterBins Client

> **Responsável:** Backend

**Ficheiro:** `src/lib/brighterbins/client.ts`

Funções a implementar (conforme secção 4 da spec):
- `getBrighterBinsToken()` — autenticação simples, sem cache (stateless)
- `listVisionDevices()` — lista dispositivos da conta
- `fetchTimeSeriesAll(deviceId, fromMs, toMs)` — paginação automática

**Critérios de conclusão:**
- [ ] `getBrighterBinsToken()` retorna token válido em dev (pode ser testado com `console.log`)
- [ ] `listVisionDevices()` retorna array de dispositivos (pode estar vazio em dev)
- [ ] `fetchTimeSeriesAll()` itera páginas até `total_records` ser atingido
- [ ] Sem variáveis de ambiente com prefixo `NEXT_PUBLIC_`

---

### Tarefa 1.3 — Função de Sincronização

> **Responsável:** Backend

**Ficheiro:** `src/lib/brighterbins/sync.ts`

Lógica a implementar (conforme secção 5 da spec):
1. Consultar `park_brighterbins_devices` para obter dispositivos ativos (por `parkId` opcional)
2. Para cada dispositivo, ler `last_uplink_ts` de `brighterbins_sync_state`
3. Chamar `fetchTimeSeriesAll()` com `fromMs = last_uplink_ts + 1` (ou últimas 24h se nunca sincronizou)
4. Para cada leitura, procurar entrada correspondente em `entries.created_at ± MATCH_TOLERANCE_MS` e `park_id`
5. Construir `rowsToInsert` com `park_id` do dispositivo
6. Upsert em `entrada_vision_readings` com `onConflict: 'device_id,uplink_time_ms'`
7. Atualizar `brighterbins_sync_state` com o novo `last_uplink_ts`

**Critérios de conclusão:**
- [ ] Função aceita `parkId?: string` para sync seletivo
- [ ] Sem sync se `associations` está vazio (retorna `{ synced: 0, matched: 0, errors: [] }`)
- [ ] `park_id` corretamente tagado em cada registo inserido
- [ ] Resiliente a erros por dispositivo (um dispositivo com erro não bloqueia os restantes)
- [ ] `last_uplink_ts` só atualizado após inserção bem-sucedida

---

### Tarefa 1.4 — Server Actions

> **Responsável:** Backend

**Ficheiro:** `src/actions/brighterbins.ts`

Actions a implementar (conforme secção 6 da spec):
- `syncBrighterBinsAction(parkId: string)` — sync manual da UI, requer sessão autenticada
- `listBrighterBinsDevicesAction()` — lista dispositivos para a página de settings
- `associateDeviceAction(parkId, deviceId, deviceName)` — associar câmara ao parque
- `dissociateDeviceAction(parkId, deviceId)` — remover associação

**Critérios de conclusão:**
- [ ] Todas as actions verificam `auth.getUser()` (lança erro se não autenticado)
- [ ] `syncBrighterBinsAction` chama `revalidatePath('/entries')`
- [ ] `associateDeviceAction` usa upsert com `onConflict: 'park_id,device_id'`
- [ ] `dissociateDeviceAction` chama `revalidatePath('/settings/cameras')`
- [ ] Sem `NEXT_PUBLIC_` em nenhuma variável referenciada

---

### Tarefa 1.5 — Cron Route

> **Responsável:** Backend

**Ficheiro:** `src/app/api/brighterbins/sync/route.ts`

Comportamento (conforme secção 6 da spec):
- Método `POST` apenas
- Verifica header `x-sync-secret` contra `process.env.SYNC_SECRET`
- Retorna 401 se inválido
- Chama `syncBrighterBinsReadings()` sem `parkId` (sync de todos os parques)
- Retorna JSON com `{ success, synced, matched, errors }`

**Critérios de conclusão:**
- [ ] Retorna 401 com secret errado
- [ ] Retorna 200 com secret correto (mesmo que `synced: 0`)
- [ ] Testável via `curl -X POST -H "x-sync-secret: ..." http://localhost:3000/api/brighterbins/sync`

---

## Fase 2 — Settings: Associação de Câmaras

**Objetivo:** Permitir que gestores de parque associem dispositivos BrighterBins ao parque via UI.

> **Pode decorrer em paralelo com Fase 3** após Fase 1 concluída.

### Tarefa 2.1 — Actualizar menu de Settings

> **Responsável:** Frontend

**Ficheiro:** `src/app/[locale]/(app)/settings/layout.tsx`

Alteração:
- Importar `Camera` de `lucide-react`
- Adicionar item `{ href: '/settings/cameras', label: 'Câmaras', icon: Camera }` entre "Balanças" e "Utilizadores"

**Critérios de conclusão:**
- [ ] Item "Câmaras" visível no sidebar de settings (desktop e mobile scroll)
- [ ] Estado ativo correto ao navegar para `/settings/cameras`
- [ ] Ícone `Camera` consistente com os restantes (lucide, `h-4 w-4`)

---

### Tarefa 2.2 — Página de Câmaras

> **Responsável:** Frontend

**Ficheiro:** `src/app/[locale]/(app)/settings/cameras/page.tsx`

Estados a implementar (conforme secção 15.2 da spec):

**A) Loading**
- Spinner com texto "A carregar dispositivos..."

**B) Erro de API**
- Mensagem de erro descritiva
- Botão "Tentar novamente" que re-executa o `useEffect`

**C) Lista de dispositivos**
- Para cada dispositivo: status dot, nome, device_id truncado, status label
- Badge "Associada" se `associated.has(device.variant_id)`
- Botão "Associar" (default) ou "Remover" (outline)
- Rodapé com contagem: `"{total} dispositivos encontrados · {N} associado(s) a este parque"`

**D) Sem dispositivos**
- Ícone muted + mensagem explicativa

**Fluxo de dados** (conforme secção 15.5):
- `Promise.all([listBrighterBinsDevicesAction(), supabase query])` no `useEffect`
- Estado `associated: Set<string>` atualizado otimisticamente em `handleAssociate`/`handleDissociate`
- Feedback via `toast.success` / `toast.error`
- `isPending` via `useTransition` para bloquear botões durante ação

**Critérios de conclusão:**
- [ ] Os quatro estados renderizam corretamente
- [ ] Associar dispositivo: badge aparece, botão muda para "Remover", toast de sucesso
- [ ] Remover dispositivo: badge desaparece, botão muda para "Associar", toast de sucesso
- [ ] Erro na action: botão regressa ao estado original, toast de erro
- [ ] Botões disabled durante `isPending`
- [ ] Carregamento paralelo de dispositivos e associações

---

## Fase 3 — Frontend: Secção Vision nas Entradas

**Objetivo:** Mostrar leituras BrighterBins na página de detalhe de cada entrada.

> **Pode decorrer em paralelo com Fase 2** após Fase 1 concluída.

### Tarefa 3.1 — Componentes base de leitura

> **Responsável:** Frontend

**Ficheiros:**
- `src/components/entries/VisionReadingCard.tsx`
- `src/components/entries/VisionReadingRow.tsx`

Implementar conforme secções 8.4 e 8.5 da spec.

`VisionReadingCard`:
- Container `aspect-video` com `<Image fill>`
- Overlay de contaminação (badge vermelho) e fill level (badge preto/60)
- Info em baixo: timestamp, pills de contaminantes, bateria

`VisionReadingRow`:
- Grid `grid-cols-[auto_1fr_auto_auto_auto]`
- Thumbnail 12×16 com `<Image fill>`
- Colunas: hora/dispositivo, fill%, contaminação, bateria

**Critérios de conclusão:**
- [ ] Ambos renderizam sem imagem (placeholder `📷` muted)
- [ ] `annotated_img_url ?? image_url` usado na imagem
- [ ] `fill_level > 100` mostra "Overflow" em vez de barra cheia a rebentar
- [ ] Zero erros TypeScript

---

### Tarefa 3.2 — VisionReadingsList

> **Responsável:** Frontend

**Ficheiro:** `src/components/entries/VisionReadingsList.tsx`

Implementar conforme secção 8.3 da spec:
- Filtros: `todos | com contaminação | limpos`
- Toggle vista: cartões (`LayoutGrid`) / lista (`List`)
- Contagem de resultados filtrados
- Empty state quando `filtered.length === 0`
- Delegação para `VisionReadingCard` (grid) ou `VisionReadingRow` (tabela)

**Critérios de conclusão:**
- [ ] Filtros funcionais
- [ ] Toggle entre vistas mantém filtro selecionado
- [ ] Grid em cartões: `grid-cols-3 sm:grid-cols-4`
- [ ] Lista: header com colunas + linhas de `VisionReadingRow`

---

### Tarefa 3.3 — SyncButton

> **Responsável:** Frontend

**Ficheiro:** `src/components/entries/SyncButton.tsx`

Implementar conforme secção 8.1 da spec:
- Props: `{ parkId: string }`
- Chama `syncBrighterBinsAction(parkId)` via `useTransition`
- Estado de loading: ícone `RefreshCw` com `animate-spin`
- Resultado: texto de feedback inline (não toast, para não desaparecer)
- Sem qualquer referência a HTTP fetch ou `NEXT_PUBLIC_`

**Critérios de conclusão:**
- [ ] Botão disabled durante `isPending`
- [ ] Feedback inline após sync: "✓ N leituras sincronizadas" ou mensagem de erro
- [ ] Nenhuma variável de ambiente exposta ao cliente

---

### Tarefa 3.4 — VisionSection (componente principal)

> **Responsável:** Frontend

**Ficheiro:** `src/components/entries/VisionSection.tsx`

Props:
```typescript
interface VisionSectionProps {
  readings: EntradaVisionReading[]
  hasCameraConfigured: boolean
  parkId: string
  lastSyncAt: string | null
}
```

**Estado A** (`hasCameraConfigured === false`):
- Ícone `Camera` muted, texto explicativo, link para `/settings/cameras`

**Estado B** (`hasCameraConfigured && readings.length === 0`):
- Texto "Sem leituras", nota sobre janela de tolerância, `SyncButton`

**Estado C** (`readings.length > 0`):
- Header: título + `lastSyncAt` formatado + `SyncButton`
- Strip de 3 mini-cards: fill level (com barra e overflow detection), contaminação, dispositivo
- Hero image da leitura mais recente (`readings[0]`) com overlays
- `VisionReadingsList` para a galeria completa

**Dados derivados para Estado C:**
- `latest = readings[0]`
- `isOverflow = latest.fill_level !== null && latest.fill_level > 100`
- `hasContamination = (latest.contamination_count ?? 0) > 0`

**Critérios de conclusão:**
- [ ] Os três estados renderizam sem erros
- [ ] `isOverflow` mostra texto "Overflow >{fill_level}%" em âmbar
- [ ] Hero image usa `annotated_img_url ?? image_url`
- [ ] Link do Estado A usa `Link` de `@/i18n/navigation`
- [ ] `SyncButton` recebe `parkId`

---

### Tarefa 3.5 — Integrar VisionSection em `entries/[id]/page.tsx`

> **Responsável:** Frontend

**Ficheiro:** `src/app/[locale]/(app)/entries/[id]/page.tsx`

Alterações ao `load()` existente — adicionar 3 queries paralelas:
```typescript
// Query 1: leituras vision para esta entrada
supabase
  .from('entrada_vision_readings')
  .select('*')
  .eq('entry_id', id)
  .order('uplink_time', { ascending: false })

// Query 2: verificar se há câmaras configuradas para o parque
supabase
  .from('park_brighterbins_devices')
  .select('device_id')
  .eq('park_id', entry.park_id)
  .eq('is_active', true)
  .limit(1)

// Query 3: última sync
supabase
  .from('brighterbins_sync_state')
  .select('last_sync_at')
  .in('device_id', associatedDeviceIds)  // IDs do Query 2
  .order('last_sync_at', { ascending: false })
  .limit(1)
  .single()
```

**Nota sobre ordem:** Query 3 depende do resultado de Query 2 (precisa dos `device_id`). Queries 1 e 2 podem correr em paralelo.

Adicionar no JSX, após a secção "Pedido de Recolha":
```tsx
<VisionSection
  readings={visionReadings}
  hasCameraConfigured={hasCameras}
  parkId={entry.park_id}
  lastSyncAt={lastSyncAt}
/>
```

**Critérios de conclusão:**
- [ ] Queries 1 e 2 correm em `Promise.all`
- [ ] `VisionSection` renderiza nos três estados
- [ ] Nenhuma regressão nas secções existentes da página
- [ ] TypeScript sem erros

---

## Fase 4 — Integração & Validação

**Objetivo:** Verificar o fluxo de ponta a ponta, cobertura de estados de erro e consistência visual.

### Tarefa 4.1 — Teste do fluxo de sync manual

> **Responsável:** QA + Backend

Passos:
1. Associar um dispositivo ao parque via `/settings/cameras`
2. Confirmar registo em `park_brighterbins_devices` no Supabase Dashboard
3. Abrir uma entrada existente e clicar "Sincronizar"
4. Verificar que `entrada_vision_readings` tem novos registos com `park_id` correto
5. Confirmar que `brighterbins_sync_state` foi atualizado com novo `last_uplink_ts`

**Critérios de conclusão:**
- [ ] Leituras aparecem na secção Vision da entrada correspondente (se matching temporal OK)
- [ ] Leituras sem matching temporal guardam `entry_id = null`
- [ ] Segunda sync não duplica registos (upsert idempotente)

---

### Tarefa 4.2 — Teste do cron endpoint

> **Responsável:** DevOps + Backend

```bash
curl -X POST http://localhost:3000/api/brighterbins/sync \
  -H "x-sync-secret: <SYNC_SECRET>"
# Esperado: { "success": true, "synced": N, "matched": M, "errors": [] }

curl -X POST http://localhost:3000/api/brighterbins/sync \
  -H "x-sync-secret: errado"
# Esperado: { "error": "Unauthorized" } status 401
```

**Critérios de conclusão:**
- [ ] 401 com secret inválido
- [ ] 200 com secret válido
- [ ] Resposta inclui `synced`, `matched`, `errors`

---

### Tarefa 4.3 — Validação de estados de UI

> **Responsável:** QA + Frontend

| Cenário | Estado esperado |
|---------|-----------------|
| Parque sem câmaras associadas | Estado A — link para settings |
| Câmara associada, entrada antiga (sem leituras) | Estado B — "Sem leituras" |
| Câmara associada, entrada com leituras | Estado C — KPIs + imagem + galeria |
| `fill_level = 150` | Indicador "Overflow 150%" em âmbar |
| `fill_level = null` | Strip mostra "—" no card de enchimento |
| `annotated_img_url = null, image_url = null` | Placeholder 📷 no hero e cartões |
| BrighterBins API offline (settings) | Estado de erro com "Tentar novamente" |
| Parque sem dispositivos na conta | Estado "Sem dispositivos disponíveis" |

---

### Tarefa 4.4 — Build final e verificação TypeScript

> **Responsável:** Backend + Frontend

```bash
npm run build
# Esperado: zero erros TypeScript, zero avisos ESLint críticos
```

**Critérios de conclusão:**
- [ ] `npm run build` conclui sem erros
- [ ] Nenhum `any` implícito nos ficheiros novos
- [ ] Nenhum `NEXT_PUBLIC_SYNC_SECRET` ou similar no bundle cliente

---

## Resumo de Ficheiros por Fase

| Fase | Ficheiro | Operação | Responsável |
|------|----------|----------|-------------|
| 0.1 | `supabase/migrations/00013_brighterbins.sql` | Criar | Arquiteto + Backend |
| 0.2 | `.env.local`, `.env.example` | Atualizar | DevOps + Backend |
| 0.3 | `vercel.json` | Criar/Atualizar | DevOps |
| 1.1 | `src/types/brighterbins.ts` | Criar | Backend |
| 1.2 | `src/lib/brighterbins/client.ts` | Criar | Backend |
| 1.3 | `src/lib/brighterbins/sync.ts` | Criar | Backend |
| 1.4 | `src/actions/brighterbins.ts` | Criar | Backend |
| 1.5 | `src/app/api/brighterbins/sync/route.ts` | Criar | Backend |
| 2.1 | `src/app/[locale]/(app)/settings/layout.tsx` | Modificar | Frontend |
| 2.2 | `src/app/[locale]/(app)/settings/cameras/page.tsx` | Criar | Frontend |
| 3.1 | `src/components/entries/VisionReadingCard.tsx` | Criar | Frontend |
| 3.1 | `src/components/entries/VisionReadingRow.tsx` | Criar | Frontend |
| 3.2 | `src/components/entries/VisionReadingsList.tsx` | Criar | Frontend |
| 3.3 | `src/components/entries/SyncButton.tsx` | Criar | Frontend |
| 3.4 | `src/components/entries/VisionSection.tsx` | Criar | Frontend |
| 3.5 | `src/app/[locale]/(app)/entries/[id]/page.tsx` | Modificar | Frontend |

**Total:** 3 ficheiros modificados · 13 ficheiros novos · 1 migração SQL

---

## Dependências entre Tarefas

```
0.1 (migração) ──────────────────────────────────────────┐
0.2 (env vars) ──┬──────────────────────────────────────┐│
0.3 (vercel.json)┘                                       ││
                                                          ││
1.1 (tipos) ──► 1.2 (client) ──► 1.3 (sync) ──► 1.4 (actions) ──► 1.5 (cron)
                                                     │              │
                                      ┌──────────────┘              │
                                      ▼                             ▼
                              2.1 (nav) ──► 2.2 (cameras page)    1.5 ◄── 0.1 + 0.2

                                      ┌──────────────────────────────┐
                                      ▼                              │
                              3.1 (cards/row) ──► 3.2 (list) ──► 3.3 (button) ──► 3.4 (section) ──► 3.5 (entries/[id])
                                                                      ▲
                                                                   1.4 (actions)

Fase 4 depende de: 1.5 + 2.2 + 3.5 todos completos
```

**Regra:** Fase 2 e Fase 3 podem ser desenvolvidas em paralelo por equipas diferentes, desde que Fase 1 (especialmente 1.1 e 1.4) esteja concluída.
