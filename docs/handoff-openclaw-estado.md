# Handoff técnico: integración OpenClaw (estado actual)

## Contexto

Este documento resume dónde quedó la implementación del flujo **Chat -> Spawn -> Agent Office** en `AgentDashboard`, qué partes ya funcionan y qué bloqueos quedan para que el equipo de desarrollo los cierre.

Fecha de corte: **2026-03-20**

---

## Alcance implementado (frontend + Convex + API glue)

Se implementó el alcance acordado sin provisioning Docker/VPS en este repo:

- Frontend Next.js para lanzar sesión de orquestación desde `Chats`.
- Nueva página `Agent Office` con vista 2D, timeline y panel debug temporal.
- Persistencia de sesiones/agentes/eventos en Convex.
- Rutas API de orquestación en Next.js.
- Cliente WS server-side para consumir eventos del gateway y escribir a Convex.

---

## Qué **sí** funciona ahora

### 1) Estructura de datos y backend de orquestación

- `convex/schema.ts` incluye:
  - `orchestrationSessions`
  - `orchestrationAgents`
  - `orchestrationEvents`
- `convex/serverOrchestration.ts` implementa:
  - creación de sesión
  - cambios de estado
  - append de eventos
  - upsert/update de agentes
  - queries por sesión/chat
- `src/lib/convexServer.ts` ya tiene wrappers para todas estas operaciones.

### 2) Flujo de spawn (sin docker exec)

- `app/api/orchestration/spawn/route.ts`:
  - recibe `{ chatId, prompt }`
  - crea sesión en Convex
  - llama al bridge por HTTP `POST /respond` con bearer token
  - registra estado/eventos en Convex
- El route **no** usa `docker exec`.
- Se agregó guard estricto para bridge URL permitida:
  - `https://openclaw.app.avril.life/respond`

### 3) Office UI + debug

- `app/agents/office/page.tsx`:
  - renderiza mapa 2D de agentes/subagentes
  - muestra timeline de eventos
  - controles básicos `pause/kill` (vía API)
  - panel debug temporal con:
    - estado WS inferido
    - último evento
    - conteo raw de agentes
- `app/chats/page.tsx`:
  - botón `Launch Agent Office`.

### 4) Healthcheck

- `app/api/orchestration/health/route.ts`:
  - valida conectividad bridge/gateway (reachability)
  - retorna `gateway`, `bridge`, `timestamp`.

### 5) Build health local

- `npm run typecheck` pasa con cambios actuales.

---

## Dónde estamos (estado operativo actual)

El sistema ya está cableado de punta a punta en código, pero la ejecución real en infraestructura externa OpenClaw está parcialmente bloqueada por validaciones/config del gateway/runtime.

En concreto:

- El gateway arranca correctamente.
- El spawn llega al bridge, pero hay fallas en handshake WS y/o auth runtime según logs.

---

## Qué **no** funciona y hay que arreglar

## Bloqueo A: handshake WS rechazado por `client.id`

Logs observados:

- `code=1008 reason=invalid connect params: at /client/id ...`

Interpretación:

- El gateway exige un `client.id` válido según su schema.
- Se parchó `src/lib/openclawWsClient.ts` para usar:
  - `OPENCLAW_GATEWAY_CLIENT_ID` (override)
  - default `openclaw-control-ui`
- Aun así, si persiste el error, falta alinear exactamente el valor esperado por la config del gateway desplegada.

Acción requerida:

- Confirmar en config del gateway cuál `client.id` está permitido.
- Ajustar `.env.local` y/o schema de gateway para admitir el cliente del dashboard.

## Bloqueo B: auth de proveedor dentro del runtime OpenClaw

Logs observados:

- `No API key found for provider "openai-codex"...`
- Ruta esperada:
  - `/home/node/.openclaw/agents/main/agent/auth-profiles.json`

Interpretación:

- Aunque el bridge reciba prompt, la ejecución del agente falla por credenciales faltantes/no válidas en ese runtime.

Acción requerida:

- Restablecer `auth-profiles.json` válido en el contenedor/runtime correcto.
- Reiniciar servicios y revalidar.

## Bloqueo C: entorno operativo inconsistente entre contenedores

Observado:

- Contenedor de bridge real: `openclaw-bridge`
- Gateway: `openclaw-openclaw-gateway-1`
- Algunas rutas/commands previos asumían nombres distintos y `rg` no instalado en host.

Acción requerida:

- Estandarizar runbook con nombres reales de contenedores.
- Usar `grep` en host si no hay `rg`.

---

## Archivos clave tocados

- `convex/schema.ts`
- `convex/serverOrchestration.ts`
- `src/lib/convexServer.ts`
- `src/lib/openclawWsClient.ts`
- `app/api/orchestration/spawn/route.ts`
- `app/api/orchestration/session/route.ts`
- `app/api/orchestration/control/route.ts`
- `app/api/orchestration/health/route.ts`
- `app/agents/office/page.tsx`
- `src/components/office/OfficeWorld2D.tsx`
- `src/components/office/AgentNodeCard.tsx`
- `src/components/office/OfficeLegend.tsx`
- `src/components/office/SessionTimeline.tsx`
- `app/chats/page.tsx`
- `src/components/Sidebar.tsx`

---

## Próximos pasos para devs (prioridad)

1. **Cerrar handshake WS**
   - Validar `client.id` exacto esperado por gateway.
   - Ajustar `OPENCLAW_GATEWAY_CLIENT_ID`.
   - Confirmar que ya no aparece `1008 invalid connect params`.

2. **Corregir auth runtime OpenClaw**
   - Confirmar presencia y validez de `auth-profiles.json`.
   - Eliminar error `No API key found for provider "openai-codex"`.

3. **Revalidar flujo completo**
   - `GET /api/orchestration/health` -> ambos `reachable`.
   - Launch desde `Chats`.
   - Ver en Office debug:
     - `connected`
     - eventos `agent.presence` / `agent.status`
     - conteo de agentes > 0

4. **Solo después de validar**
   - Pasar a mejoras pendientes:
     - stream WS directo client-side
     - polish de badges de estado
     - agrupación espacial por parent chain
     - routing multi-sesión WS robusto

---

## Nota de seguridad

Durante debugging se expusieron tokens/credenciales en conversación/logs. Se recomienda:

- Rotación inmediata de tokens/API keys.
- Evitar volver a pegar secretos completos en chats o tickets.
