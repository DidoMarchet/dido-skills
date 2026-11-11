---
tags: [dido-backend]
---

Il backoffice deve poter scaricare i dati di un customer quando li chiede per email (GDPR): GET /v1/admin/customers/:id/export, con lo stesso contenuto dell'export che il customer fa da solo. Solo il SUPERADMIN.
