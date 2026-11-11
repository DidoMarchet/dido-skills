"""Aiuti comuni ai controlli sulle copie dello starter backend: database, test, lint."""
import json
import re
import shutil
import subprocess
import time
import uuid
from pathlib import Path

NODE = "app/node"


def ensure_db(run):
    """Il Postgres della sessione: se la sessione l'ha tolto, lo ricrea con nome e porta suoi."""
    name = (run.path / "db-name").read_text().strip()
    running = subprocess.run(["docker", "inspect", "-f", "{{.State.Running}}", name],
                             capture_output=True, text=True).stdout.strip()
    if running == "true":
        return
    subprocess.run(["docker", "rm", "-f", name], capture_output=True)
    port = re.search(r"127\.0\.0\.1:(\d+)/", run.env["NODE_POSTGRES_URI"]).group(1)
    subprocess.run(["docker", "run", "-d", "--name", name, "-p", f"127.0.0.1:{port}:5432",
                    "-e", "POSTGRES_USER=backend_template_user", "-e", "POSTGRES_PASSWORD=backend_template_pass",
                    "-e", "POSTGRES_DB=backend_template_postgres", "postgres:15"], capture_output=True, check=True)
    for _ in range(60):
        ready = subprocess.run(["docker", "exec", name, "pg_isready", "-q", "-U", "backend_template_user",
                                "-d", "backend_template_postgres"], capture_output=True)
        if ready.returncode == 0:
            break
        time.sleep(1)
    run.sh("npx prisma migrate deploy", cwd=run.repo / NODE)


def vitest(run, files, label, cwd=None):
    """Lancia vitest sui file dati; restituisce (exit, risultati per test, riassunto)."""
    ensure_db(run)
    report = run.path / f"vitest-{label}.json"
    report.unlink(missing_ok=True)
    result = run.sh(f"npx vitest run {' '.join(files)} --reporter=json --outputFile={report}",
                    cwd=cwd or run.repo / NODE)
    tests = []
    if report.exists():
        for file_result in json.loads(report.read_text()).get("testResults", []):
            for assertion in file_result.get("assertionResults", []):
                tests.append({"describe": (assertion.get("ancestorTitles") or [""])[0],
                              "title": assertion["title"], "status": assertion["status"]})
    failed = [f"{test['describe']} > {test['title']}" for test in tests if test["status"] != "passed"]
    summary = f"exit {result.returncode}, {len(tests) - len(failed)}/{len(tests)} passati"
    return result.returncode, tests, summary + (f"; falliti: {failed}" if failed else "")


def hidden(run, source, label):
    """Un test nascosto copiato in tests/ solo per il tempo della prova."""
    target = run.repo / NODE / "tests" / f"zz-hidden-{label}.test.js"
    shutil.copy(source, target)
    try:
        return vitest(run, [f"tests/{target.name}"], f"hidden-{label}")
    finally:
        target.unlink(missing_ok=True)


def session_tests(run):
    """I file di test E2E nuovi o cambiati dalla sessione, dal punto di vista di app/node."""
    return [path.removeprefix(f"{NODE}/") for path in run.changed_files()
            if path.startswith(f"{NODE}/tests/") and path.endswith(".test.js") and (run.repo / path).exists()]


def eslint_count(run, path, source=None):
    """Problemi di ESLint (Prettier compreso) in un file; source per una versione da stdin."""
    relative = path.removeprefix(f"{NODE}/")
    if source is None:
        result = run.sh(f"npx eslint --format json {relative}", cwd=run.repo / NODE)
    else:
        result = subprocess.run(["npx", "eslint", "--format", "json", "--stdin", "--stdin-filename", relative],
                                input=source, cwd=run.repo / NODE, capture_output=True, text=True)
    try:
        return sum(len(entry["messages"]) for entry in json.loads(result.stdout))
    except json.JSONDecodeError:
        return 0


def new_lint_problems(run):
    """File JS di app/node con più problemi di ESLint che al punto di partenza."""
    worse = []
    for path in run.changed_files():
        if not (path.startswith(f"{NODE}/") and path.endswith((".js", ".mjs")) and (run.repo / path).exists()):
            continue
        before_source = run.sh(f"git show {run.start_tree}:{path}")
        before = eslint_count(run, path, before_source.stdout) if before_source.returncode == 0 else 0
        after = eslint_count(run, path)
        if after > before:
            worse.append(f"{path}: {before} -> {after}")
    return worse


def env_diff(run, variable):
    """Differenze dei tre file env dal punto di partenza: righe tolte e righe aggiunte che non
    sono la variabile nuova, un commento o una riga vuota."""
    problems = []
    for name in (".env.example", ".env.local", ".env.production"):
        diff = run.sh(f"git diff {run.start_tree} -- {name}").stdout.splitlines()
        content = (run.repo / name).read_text() if (run.repo / name).exists() else ""
        if not re.search(rf"^{variable}=", content, re.M):
            problems.append(f"{name}: manca {variable}")
        for line in diff:
            if line.startswith("---") or line.startswith("+++"):
                continue
            if line.startswith("-"):
                problems.append(f"{name}: tolta {line[1:].strip()[:60]}")
            elif line.startswith("+"):
                text = line[1:].strip()
                if text and not text.startswith("#") and not text.startswith(f"{variable}="):
                    problems.append(f"{name}: aggiunta {text[:60]}")
    return problems


def scratch_copy(run):
    """Una copia usa e getta del repo finale (APFS, senza spazio in più), per provare il codice di prima."""
    target = run.path / f"scratch-{uuid.uuid4().hex[:6]}"
    subprocess.run(["cp", "-c", "-R", str(run.repo), str(target)], check=True)
    return target
