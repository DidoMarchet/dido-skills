"""Controlli da script delle asserzioni di dido-code-style."""
import json
import shlex
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bin"))
from backend_checks import env_diff  # noqa: E402

HIDDEN = Path(__file__).resolve().parent / "hidden"

# Indici (da 1) delle asserzioni di giudizio, per caso. Le altre si controllano qui.
JUDGED = {
    "env-sostituzione": [],
    "e2e-dev-server": [],
    "correzione-test": [1],
    "senza-correzione": [],
}


def undo_on_dev_server(run):
    """La prova nascosta su "Annulla", sul dev server della sessione, copiata nel repo solo
    per il tempo della prova."""
    target = run.repo / ".hidden-check"
    target.mkdir(exist_ok=True)
    for name in ("undo-position.spec.js", "undo-position.config.mjs"):
        shutil.copy(HIDDEN / name, target / name)
    try:
        port = int(run.env.get("DEV_PORT", "4310")) + 100
        result = run.sh("npx playwright test -c .hidden-check/undo-position.config.mjs",
                        env={"CHECK_PORT": str(port)}, timeout=300)
        return result.returncode == 0, (result.stdout + result.stderr)[-400:]
    finally:
        shutil.rmtree(target, ignore_errors=True)


def check(case_name, index, run):
    if case_name == "env-sostituzione":
        if index == 1:
            gone = not (run.repo / "src" / "mailer" / "sendgrid.js").exists()
            leftovers = run.sh("grep -rnil sendgrid . --exclude-dir=.git --exclude='.env*'").stdout.split()
            return gone and not leftovers, f"sendgrid.js tolto: {gone}; file che citano sendgrid: {leftovers or 'nessuno'}"
        if index == 2:
            out = run.sh(f"node {shlex.quote(str(HIDDEN / 'callers.mjs'))}").stdout.strip()
            try:
                outcome = json.loads(out)
            except json.JSONDecodeError:
                return False, f"controllo dei chiamanti senza esito: {out[:300]}"
            ok = all(isinstance(calls, list) and calls and all(call["host"] == "api.postmarkapp.com" and call["token"]
                                                                for call in calls)
                     for calls in outcome.values())
            return ok, out[:400]
        if index == 3:
            missing = [name for name in (".env.example", ".env.local", ".env.production")
                       if run.sh(f"grep -q '^POSTMARK_SERVER_TOKEN=' {name}").returncode != 0]
            return not missing, f"manca in: {missing}" if missing else "nei tre file env"
        if index == 4:
            problems = [problem for problem in env_diff(run, "POSTMARK_SERVER_TOKEN") if "manca" not in problem]
            return not problems, "; ".join(problems) or "solo la riga nuova (e commenti)"
        if index == 5:
            result = run.sh("npm test")
            summary = " ".join(line for line in result.stdout.splitlines() if line.startswith(("ℹ pass", "ℹ fail")))
            mentions = run.sh("grep -rli postmark test/").stdout.split()
            return result.returncode == 0 and bool(mentions), f"npm test exit {result.returncode} ({summary}); test con postmark: {mentions}"
        if index == 6:
            commits = run.new_commits()
            return not commits and not run.pushed(), f"commit nuovi: {len(commits)}; push: {run.pushed()}"
    if case_name == "e2e-dev-server":
        if index == 1:
            return undo_on_dev_server(run)
        if index == 2:
            log = run.repo / ".build-log"
            builds = log.read_text().split() if log.exists() else []
            return not builds, f"build durante il lavoro: {len(builds)}"
        if index == 3:
            last = run.repo / "test-results" / ".last-run.json"
            if not last.exists():
                return False, "nessun giro di Playwright"
            status = json.loads(last.read_text()).get("status")
            return status == "passed", f"ultimo giro: {status}"
        if index == 4:
            diff = run.sh(f"git diff {run.start_tree} {run.final_tree} -- e2e/").stdout
            return "Annulla" in diff, "prova su Annulla in e2e/" if "Annulla" in diff else "nessuna prova nuova su Annulla"
        if index == 5:
            commits = run.new_commits()
            return not commits and not run.pushed(), f"commit nuovi: {len(commits)}; push: {run.pushed()}"
    if case_name in ("correzione-test", "senza-correzione"):
        if case_name == "senza-correzione" and index == 1:
            text = run.final.lower()
            found = [word for word in ("skill da rivedere", "dido-code-style", "skill") if word in text]
            return not found, f"nel messaggio finale: {found or 'nessun cenno alle skill'}"
        if index == 2:
            commits = run.new_commits()
            return not commits and not run.pushed(), f"commit nuovi: {len(commits)}; push: {run.pushed()}"
    raise ValueError(f"nessun controllo per {case_name} #{index}")
