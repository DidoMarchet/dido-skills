# Piano export-customer: i dati di un customer scaricati dal backoffice

> Stato: **approvato il 10/11/2026**.
> Riguarda l'API (`app/node`). Lo stato sta in "Dove siamo", in fondo a questo piano.

## Cosa si chiede e cosa si fa

| Voce | Cosa si fa |
|---|---|
| Il backoffice scarica i dati di un customer che li chiede per email (GDPR) | `GET /v1/admin/customers/:id/export`, con lo stesso contenuto dell'export self-service |
| Solo il SUPERADMIN | permesso nuovo in `src/config/permissions.js`, controllato nel controller |

**Si chiude quando**: il SUPERADMIN scarica profilo e sessioni di un customer, un ADMIN_GENERALE riceve 403, la rotta è nella spec e ha i suoi test E2E, l'export lascia un evento nell'audit.

## Step

1. Rotta, controller, service, spec, evento d'audit e test E2E.
2. Rilascio.

## Cosa non si fa

- L'export in CSV: per ora JSON, come l'export self-service.

## Dove siamo

- 10/11/2026: piano approvato.
