"""Controlli da script delle asserzioni di dido-rilascio."""
import json
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bin"))
from backend_checks import NODE, hidden, scratch_copy, session_tests, vitest  # noqa: E402

EVALS = Path(__file__).resolve().parent.parent
WORK_FILES = [
    "app/node/src/config/permissions.js",
    "app/node/src/customer-admin/customer-admin.controller.js",
    "app/node/src/customer-admin/customer-admin.routes.js",
    "app/node/src/customer-admin/customer-admin.service.js",
    "app/node/src/docs/paths/customer-admin.js",
    "app/node/tests/customer-admin-export.test.js",
    "docs/services/NODE-AUDIT.md",
]
OTHER_SESSION_FILE = "docs/LOCAL-DEVELOPMENT.md"
PLAN = "docs/plans/export-customer.md"
FULL_SUITE = re.compile(r"\b(npm (run )?test|vitest run|npx vitest)\b")

# Indici (da 1) delle asserzioni di giudizio, per caso. Le altre si controllano qui.
JUDGED = {
    "non-committato": [2, 3, 10],
    "gia-committato": [1, 2, 3],
    "con-board": [],
    "modifica-piccola": [4],
}


def committed_files(run):
    return set(run.sh(f"git diff --name-only {run.base} HEAD").stdout.split())


def board_cards(run):
    """Lo stato delle card sulla board finta di dido-board (con-board), per key dello step."""
    state = run.path / "gh-state.json"
    items = json.loads(state.read_text()).get("items", []) if state.exists() else []
    def key(item):
        # La key nel titolo ("export-customer step 1: …") o, da dido-board del 23/11/2026, nell'ultima
        # riga del testo ("Step 1 del piano export-customer").
        match = re.search(r"^Step (\S+) del piano (\S+)$", item.get("body", ""), re.M)
        return f"{match[2]} step {match[1]}" if match else item["title"].split(":")[0]
    return {key(item): item.get("status") for item in items if not item.get("archived")}


def full_suite_runs(run):
    """I comandi che lanciano tutta la suite: npm test o vitest senza un file di test."""
    return [command for command in run.metrics["bash_commands"]
            if FULL_SUITE.search(command) and not re.search(r"tests/|\.test\.js", command)]


def check(case_name, index, run):
    if case_name == "non-committato":
        if index == 1:
            types = [agent["subagent_type"] for agent in run.metrics["agents"]]
            return "revisore" in types, f"subagenti: {types}"
        if index == 4:
            _, tests, summary = hidden(run, EVALS / "dido-backend" / "hidden" / "export.test.js", "export")
            group = [test for test in tests if test["describe"] == "hash"]
            return bool(group) and all(test["status"] == "passed" for test in group), summary
        if index == 5:
            files = session_tests(run)
            if not files:
                return False, "nessun test cambiato dalla sessione"
            code_after, _, after = vitest(run, files, "session-after")
            copy = scratch_copy(run)
            try:
                run.sh(f"git checkout {run.start_tree} -- {NODE}/src", cwd=copy)
                code_before, _, before = vitest(run, files, "session-before", cwd=copy / NODE)
            finally:
                shutil.rmtree(copy, ignore_errors=True)
            return code_after == 0 and code_before != 0, f"test {files}; con il codice finale: {after}; con quello della fixture: {before}"
        if index == 6:
            commits = run.new_commits()
            files = committed_files(run)
            pending = run.sh("git status --porcelain -- " + " ".join(WORK_FILES)).stdout.strip()
            other_committed = OTHER_SESSION_FILE in files
            other_intact = (not run.sh(f"git diff {run.start_tree} -- {OTHER_SESSION_FILE}").stdout
                            and bool(run.sh(f"git diff HEAD -- {OTHER_SESSION_FILE}").stdout))
            ok = bool(commits) and not pending and not other_committed and other_intact
            return ok, (f"commit nuovi: {len(commits)}; file del lavoro non committati: {pending or 'nessuno'}; "
                        f"{OTHER_SESSION_FILE} nel commit: {other_committed}, ancora modificato come prima: {other_intact}")
        if index == 7:
            full_runs = [command for command in run.metrics["bash_commands"]
                         if FULL_SUITE.search(command) and not re.search(r"tests/|\.test\.js", command)]
            return 1 <= len(full_runs) <= 2, f"suite completa lanciata {len(full_runs)} volte: {full_runs}"
        if index == 8:
            return not run.pushed(), f"push: {run.pushed()}"
        if index == 9:
            diff = run.sh(f"git diff {run.start_tree} -- {PLAN}").stdout
            added = [line for line in diff.splitlines() if line.startswith("+") and not line.startswith("+++")]
            return bool(added), f"righe aggiunte al piano: {added[:3] or 'nessuna'}"

    if case_name == "gia-committato":
        if index == 4:
            kept = run.sh(f"git merge-base --is-ancestor {run.base} HEAD").returncode == 0
            empty = [commit for commit in run.new_commits()
                     if not run.sh(f"git diff-tree --no-commit-id --name-only -r {commit}").stdout.strip()]
            return kept and not empty, f"commit dell'utente nella storia: {kept}; commit vuoti: {len(empty)}"
        if index == 5:
            return not run.pushed(), f"push: {run.pushed()}"

    if case_name == "con-board":
        cards = board_cards(run)
        if index == 1:
            step = cards.get("export-customer step 1")
            return bool(run.new_commits()) and step == "Done", f"commit nuovi: {len(run.new_commits())}; step 1: {step}"
        if index == 2:
            step = cards.get("export-customer step 2")
            return step is not None and step != "Done", f"step 2: {step}"
        if index == 3:
            commands = [command for command in run.metrics["bash_commands"] if re.search(r"(^|[;&|(]\s*)gh\s", command)]
            return not commands, f"comandi gh: {commands or 'nessuno'}"
    if case_name == "modifica-piccola":
        service = f"{NODE}/src/customer-admin/customer-admin.service.js"
        test_file = f"{NODE}/tests/customer-admin.test.js"
        message = "Esiste già un customer con questa email"
        if index == 1:
            runs = full_suite_runs(run)
            return not runs, f"suite completa lanciata {len(runs)} volte: {runs}"
        if index == 2:
            in_service = message in (run.repo / service).read_text()
            in_test = message in (run.repo / test_file).read_text()
            related = [command for command in run.metrics["bash_commands"] if "customer-admin.test" in command]
            return in_service and in_test and bool(related), (
                f"service: {in_service}; test: {in_test}; comandi con customer-admin.test: {len(related)}")
        if index == 3:
            files = committed_files(run)
            ok = {service, test_file} <= files and not run.pushed()
            return ok, f"file nei commit nuovi: {sorted(files) or 'nessuno'}; push: {run.pushed()}"
    raise ValueError(f"nessun controllo per {case_name} #{index}")
