"""Controlli da script delle asserzioni di dido-backend."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bin"))
from backend_checks import NODE, env_diff, hidden, new_lint_problems, session_tests, vitest  # noqa: E402

HIDDEN = Path(__file__).resolve().parent / "hidden"

# Indici (da 1) delle asserzioni di giudizio, per caso. Le altre si controllano qui.
JUDGED = {
    "export-superadmin": [5],
    "rate-limit-account": [1, 2, 3],
    "servizio-opzionale": [4, 5, 6],
}


def no_commit(run):
    commits = run.new_commits()
    return not commits and not run.pushed(), f"commit nuovi: {len(commits)}; push: {run.pushed()}"


def lint_clean(run):
    worse = new_lint_problems(run)
    return not worse, "; ".join(worse) or "nessun problema nuovo"


def src_changed(run):
    return [path for path in run.changed_files() if path.startswith(f"{NODE}/src/")]


def check(case_name, index, run):
    if case_name == "export-superadmin":
        if index in (1, 2):
            if not hasattr(run, "_export_hidden"):
                run._export_hidden = hidden(run, HIDDEN / "export.test.js", "export")
            _, tests, summary = run._export_hidden
            group = [test for test in tests if test["describe"] == ("status" if index == 1 else "hash")]
            ok = bool(group) and all(test["status"] == "passed" for test in group)
            return ok, summary
        if index == 3:
            code, _, summary = vitest(run, ["tests/openapi-routes.test.js"], "openapi")
            return code == 0, summary
        if index == 4:
            files = session_tests(run)
            on_route = [path for path in files if "/export" in (run.repo / NODE / path).read_text()]
            if not on_route:
                return False, f"nessun test della sessione chiama l'export (test cambiati: {files})"
            code, _, summary = vitest(run, sorted(set(files + ["tests/customer-admin.test.js"])), "session")
            return code == 0, f"test sulla rotta: {on_route}; {summary}"
        if index == 6:
            return lint_clean(run)
        if index == 7:
            return no_commit(run)

    if case_name == "rate-limit-account":
        changed = src_changed(run)
        if index == 4:
            if not changed:
                return True, "src/ non cambia"
            files = session_tests(run)
            if not files:
                return False, f"src/ cambia ({changed}) ma nessun test nuovo o cambiato"
            code, _, summary = vitest(run, sorted(set(files + ["tests/auth-flow.test.js"])), "session")
            return code == 0, f"test della sessione: {files}; {summary}"
        if index == 5:
            return (True, "src/ non cambia") if not changed else lint_clean(run)
        if index == 6:
            return no_commit(run)

    if case_name == "servizio-opzionale":
        if index == 1:
            code, _, summary = hidden(run, HIDDEN / "health-without-slack.test.js", "health")
            return code == 0, summary
        if index == 2:
            problems = env_diff(run, "SLACK_ERRORS_WEBHOOK_URL")
            return not problems, "; ".join(problems) or "nei tre file env, nient'altro cambia"
        if index == 3:
            before = json.loads(run.sh(f"git show {run.start_tree}:{NODE}/package.json").stdout)
            after = json.loads((run.repo / NODE / "package.json").read_text())
            added = [name for kind in ("dependencies", "devDependencies")
                     for name in after.get(kind, {}) if name not in before.get(kind, {})]
            return not added, f"dipendenze nuove: {added or 'nessuna'}"
        if index == 7:
            files = session_tests(run)
            code, _, summary = vitest(run, files, "session") if files else (1, [], "nessun test della sessione")
            lint_ok, lint_evidence = lint_clean(run)
            return code == 0 and lint_ok, f"test: {files}; {summary}; lint: {lint_evidence}"
        if index == 8:
            return no_commit(run)

    raise ValueError(f"nessun controllo per {case_name} #{index}")
