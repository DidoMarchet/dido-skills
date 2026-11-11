#!/usr/bin/env bash
# Un Postgres per sessione, per i test E2E di una copia dello starter backend.
# Uso: backend-db.sh start <repo> <run>   -> container, migration, <run>/session.env,
#                                            nome e porta del container nell'AGENTS.md della copia
#      backend-db.sh stop <run>
# Nome e porta sono della sessione: la porta dello starter (55432) è anche di altri progetti.
set -euo pipefail
action="$1"

if [ "$action" = stop ]; then
  run="$2"
  name="$(cat "$run/db-name" 2>/dev/null || true)"
  [ -n "$name" ] && docker rm -f "$name" >/dev/null 2>&1 || true
  exit 0
fi

repo="$2"; run="$3"
name="dido-evals-pg-$(python3 -c 'import uuid; print(uuid.uuid4().hex[:10])')"
port="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
echo "$name" > "$run/db-name"

docker run -d --name "$name" -p "127.0.0.1:$port:5432" \
  -e POSTGRES_USER=backend_template_user -e POSTGRES_PASSWORD=backend_template_pass \
  -e POSTGRES_DB=backend_template_postgres postgres:15 >/dev/null
for _ in $(seq 1 60); do
  docker exec "$name" pg_isready -q -U backend_template_user -d backend_template_postgres && break
  sleep 1
done

cat > "$run/session.env" <<EOF
NODE_POSTGRES_URI=postgres://backend_template_user:backend_template_pass@127.0.0.1:$port/backend_template_postgres
NODE_SMTP_HOST=127.0.0.1
NODE_SMTP_PORT=2525
NODE_SMTP_SECURE=false
NODE_SMTP_USER=test
NODE_SMTP_PASS=dummy
NODE_SMTP_FROM=noreply@example.com
EOF

(set -a && . "$run/session.env" && set +a && cd "$repo/app/node" && npx prisma migrate deploy >/dev/null)

sed -i '' -e "s/backend-template-test-pg/$name/g" -e "s/55432/$port/g" "$repo/AGENTS.md"
