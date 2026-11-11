"""Valuta le asserzioni controllabili da codice e prepara il pacchetto cieco per quelle di giudizio.

Uso: grade.py <cartella-iterazione> prepare [skill]  -> grading parziale + blind/bundle.md + blind/key.json
     grade.py <cartella-iterazione> merge   [skill]  -> unisce blind/verdicts.json, scrive grading.json
                                                        di ogni run e summary.md dell'iterazione

I controlli di ogni skill stanno in evals/<skill>/checks.py: JUDGED (le asserzioni di giudizio,
per caso) e check(case_name, index, run), che restituisce (esito, prova). [skill] serve solo per
le iterazioni vecchie, il cui eval_metadata.json non dice la skill.
"""
import importlib.util
import json
import os
import random
import re
import subprocess
import sys
from pathlib import Path
from statistics import mean

EVALS = Path(__file__).resolve().parent.parent
iteration = Path(sys.argv[1]).resolve()
mode = sys.argv[2]
default_skill = sys.argv[3] if len(sys.argv) > 3 else None
ENV = {**os.environ, "TZ": "Europe/Rome"}


def sh(command, cwd, env=None, timeout=900):
    return subprocess.run(command, cwd=cwd, shell=True, capture_output=True, text=True,
                          env={**ENV, **(env or {})}, timeout=timeout)


class Run:
    """Una sessione già fatta, con gli aiuti che servono ai controlli."""

    def __init__(self, path, skill, case_name, meta):
        self.path = path
        self.skill = skill
        self.case = case_name
        self.meta = meta
        self.repo = path / "outputs" / "repo"
        self.metrics = json.loads((path / "outputs" / "metrics.json").read_text())
        self.final = (path / "outputs" / "final-message.md").read_text()
        self.calls = json.loads((path / "transcript-calls.json").read_text())
        subagent_file = path / "transcript-subagent-calls.json"
        self.subagent_calls = json.loads(subagent_file.read_text()) if subagent_file.exists() else []

    @property
    def base(self):
        """Il commit da cui è partita la sessione."""
        if (self.path / "base.txt").exists():
            return (self.path / "base.txt").read_text().strip()
        # Iterazioni vecchie di dido-goal: il commit della fixture.
        return sh("git rev-parse HEAD", EVALS / self.skill / "fixtures" / self.case).stdout.strip()

    @property
    def start_tree(self):
        """L'albero di partenza, file non committati compresi."""
        tree_file = self.path / "start-tree.txt"
        return tree_file.read_text().strip() if tree_file.exists() else self.base

    @property
    def env(self):
        """Le variabili della sessione (session.env), per lanciare test e comandi come lei."""
        values = {}
        env_file = self.path / "session.env"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if "=" in line and not line.startswith("#"):
                    key, value = line.removeprefix("export ").split("=", 1)
                    values[key] = value.strip("'\"")
        return values

    def sh(self, command, cwd=None, env=None, timeout=900):
        return sh(command, cwd or self.repo, env={**self.env, **(env or {})}, timeout=timeout)

    @property
    def final_tree(self):
        """L'albero del lavoro finale, file non committati compresi, fatto con un indice
        temporaneo: l'indice del repo resta com'è."""
        if not hasattr(self, "_final_tree"):
            index = {"GIT_INDEX_FILE": str(self.path / "final-index")}
            self.sh("git add -A", env=index)
            self._final_tree = self.sh("git write-tree", env=index).stdout.strip()
            (self.path / "final-index").unlink(missing_ok=True)
        return self._final_tree

    def changed_files(self):
        """File cambiati dal punto di partenza: modificati, nuovi o cancellati, committati o no."""
        return self.sh(f"git diff --name-only {self.start_tree} {self.final_tree}").stdout.splitlines()

    def diff(self):
        return self.sh(f"git diff {self.start_tree} {self.final_tree}").stdout

    def new_commits(self):
        return self.sh(f"git log --format=%H {self.base}..HEAD").stdout.split()

    def pushed(self):
        return any(re.search(r"\bgit\b[^|;&]*\bpush\b", command) for command in self.metrics["bash_commands"])


def load_checks(skill):
    spec = importlib.util.spec_from_file_location(f"checks_{skill}", EVALS / skill / "checks.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def case_dirs():
    """Iterazioni nuove: <iterazione>/<skill>/<caso>; vecchie di dido-goal: <iterazione>/<caso>."""
    found = sorted(iteration.glob("*/*/eval_metadata.json")) + sorted(iteration.glob("*/eval_metadata.json"))
    for meta_path in found:
        meta = json.loads(meta_path.read_text())
        yield meta_path.parent, meta.get("skill") or default_skill, meta


def runs():
    for case_dir, skill, meta in case_dirs():
        for config in ("with_skill", "without_skill"):
            for path in sorted((case_dir / config).glob("run-*")):
                if (path / "outputs" / "metrics.json").exists():
                    yield Run(path, skill, case_dir.name, meta), config


def describe(call):
    if call["name"] == "Agent":
        return (f"Agent ({call['input'].get('subagent_type')}): {call['input'].get('description', '')}\n"
                f"---- messaggio al subagente ----\n{call['input'].get('prompt', '')[:3000]}\n"
                f"---- rapporto del subagente ----\n{call.get('result', '')[:3000]}\n---- fine ----")
    detail = (call["input"].get("command") or call["input"].get("file_path")
              or call["input"].get("pattern") or "")
    return f"{call['name']}: {detail}"


if mode == "prepare":
    blind = iteration / "blind"
    blind.mkdir(exist_ok=True)
    items = []
    checks_by_skill = {}
    for run, config in runs():
        checks = checks_by_skill.setdefault(run.skill, load_checks(run.skill))
        judged = checks.JUDGED[run.case]
        partial = {}
        for index, text in enumerate(run.meta["assertions"], start=1):
            if index in judged:
                continue
            try:
                passed, evidence = checks.check(run.case, index, run)
            except Exception as error:  # un controllo rotto non deve fermare gli altri
                passed, evidence = False, f"controllo fallito: {error!r}"
            partial[index] = {"text": text, "passed": passed, "evidence": evidence}
            print(f"{run.path.relative_to(iteration)} #{index}: {'ok' if passed else 'NO'} {str(evidence)[:160]}")
        (run.path / "partial-grading.json").write_text(json.dumps(partial, indent=2, ensure_ascii=False))
        if not judged:
            continue
        items.append({
            "path": str(run.path.relative_to(iteration)),
            "case": run.case,
            "prompt": run.meta["prompt"],
            "judged": {i: run.meta["assertions"][i - 1] for i in judged},
            "final": run.final,
            "diff": run.diff()[:8000],
            "untracked": run.sh(f"git log --oneline {run.base}..HEAD").stdout or "(nessun commit)\n",
            # Il nome della skill direbbe al valutatore quale run la usa.
            "actions": [describe(call) for call in run.calls if call["name"] != "Skill"],
        })
    random.seed(7)
    random.shuffle(items)
    key = {}
    parts = ["# Pacchetto cieco\n"]
    for number, item in enumerate(items, start=1):
        run_id = f"R{number:02d}"
        key[run_id] = item["path"]
        parts.append(f"\n\n========== {run_id} (caso: {item['case']}) ==========\n")
        parts.append(f"## Richiesta dell'utente\n{item['prompt']}\n")
        parts.append("## Asserzioni da giudicare\n" + "\n".join(f"- #{i}: {t}" for i, t in item["judged"].items()))
        parts.append("\n## Azioni dell'agente, in ordine\n" + "\n".join(item["actions"]))
        parts.append(f"\n## Diff finale del repo dal punto di partenza\n```diff\n{item['diff'] or '(nessuna modifica)'}\n```\n"
                     f"Commit fatti dalla sessione:\n{item['untracked']}")
        parts.append(f"\n## Messaggio finale all'utente\n{item['final']}")
    # I percorsi assoluti dicono with_skill o without_skill: restano solo quelli dentro il repo.
    bundle = re.sub(r"\S*/outputs/repo/?", "repo/", "\n".join(parts))
    bundle = re.sub(r"/private/tmp/\S*|\S*dido-goal-workspace\S*|\S*dido-evals\S*", "<tmp>", bundle)
    (blind / "bundle.md").write_text(bundle)
    (blind / "key.json").write_text(json.dumps(key, indent=2))
    print(f"{len(items)} run nel pacchetto: {blind / 'bundle.md'}")

if mode == "merge":
    blind = iteration / "blind"
    key_file, verdicts_file = blind / "key.json", blind / "verdicts.json"
    path_to_id = {path: run_id for run_id, path in json.loads(key_file.read_text()).items()} if key_file.exists() else {}
    verdicts = json.loads(verdicts_file.read_text()) if verdicts_file.exists() else {}
    table = {}
    for run, config in runs():
        partial = json.loads((run.path / "partial-grading.json").read_text())
        run_id = path_to_id.get(str(run.path.relative_to(iteration)))
        expectations = []
        for index, text in enumerate(run.meta["assertions"], start=1):
            if str(index) in partial:
                expectations.append(partial[str(index)])
            else:
                verdict = verdicts.get(run_id, {}).get(str(index), {"passed": False, "evidence": "nessun giudizio"})
                expectations.append({"text": text, "passed": verdict["passed"], "evidence": verdict["evidence"]})
        passed = sum(1 for expectation in expectations if expectation["passed"])
        timing = json.loads((run.path / "timing.json").read_text())
        (run.path / "grading.json").write_text(json.dumps({
            "expectations": expectations,
            "summary": {"passed": passed, "failed": len(expectations) - passed, "total": len(expectations),
                        "pass_rate": round(passed / len(expectations), 2)},
            "execution_metrics": {"tool_calls": run.metrics["tool_calls"],
                                  "total_tool_calls": run.metrics["total_tool_calls"],
                                  "output_chars": len(run.final)},
            "timing": {"executor_duration_seconds": timing["total_duration_seconds"],
                       "total_duration_seconds": timing["total_duration_seconds"]},
        }, indent=2, ensure_ascii=False) + "\n")
        print(f"{run.path.relative_to(iteration)}: {passed}/{len(expectations)}")
        entry = table.setdefault((run.skill, run.case, config), {"runs": 0, "passes": {}, "seconds": [], "cost": []})
        entry["runs"] += 1
        entry["seconds"].append(timing["total_duration_seconds"])
        entry["cost"].append(timing.get("total_cost_usd") or 0)
        for index, expectation in enumerate(expectations, start=1):
            entry["passes"][index] = entry["passes"].get(index, 0) + int(expectation["passed"])
    lines = ["# Riepilogo\n", "| Skill | Caso | Config | Asserzioni (passate su run) | Tempo medio | Costo medio |",
             "|---|---|---|---|---|---|"]
    for (skill, case_name, config), entry in sorted(table.items()):
        passes = " · ".join(f"#{index} {count}/{entry['runs']}" for index, count in sorted(entry["passes"].items()))
        lines.append(f"| {skill} | {case_name} | {config} | {passes} | {mean(entry['seconds']):.0f} s "
                     f"| {mean(entry['cost']):.2f} $ |")
    (iteration / "summary.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
