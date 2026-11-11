"""Valuta le asserzioni controllabili da codice e prepara il pacchetto cieco per quelle di giudizio.

Uso: grade.py <iteration-N> prepare   -> grading parziale + blind/bundle.md + blind/key.json
     grade.py <iteration-N> merge     -> unisce blind/verdicts.json e scrive grading.json di ogni run
"""
import json
import os
import random
import re
import subprocess
import sys
from pathlib import Path

W = Path(__file__).resolve().parent.parent
iteration = W / sys.argv[1]
mode = sys.argv[2]

# Indici (da 1) delle asserzioni di giudizio, per caso. Le altre si controllano qui.
JUDGED = {
    "feature-tests-green": [7, 8],
    "debugging-same-error": [2, 4, 7],
    "architecture-no-new-elements": [2, 3, 4, 5, 8, 9],
    "product-goals-met": [1, 2, 3, 5, 6],
}
ENV = {**os.environ, "TZ": "Europe/Rome"}


def sh(command, cwd):
    return subprocess.run(command, cwd=cwd, shell=True, capture_output=True, text=True, env=ENV)


def base_of(repo):
    """Il commit di partenza della fixture: le sessioni possono aver fatto commit loro."""
    case_name = repo.parent.parent.parent.parent.name if repo.parent.parent.name.startswith("run-") else repo.parent.parent.parent.name
    return sh("git rev-parse HEAD", W / "fixtures" / case_name).stdout.strip()


def changed_files(repo):
    base = base_of(repo)
    tracked = sh(f"git diff --name-only {base}", repo).stdout.splitlines()
    untracked = sh("git ls-files --others --exclude-standard", repo).stdout.splitlines()
    return tracked + untracked


def check(case_name, index, run):
    """Esito e prova di un'asserzione controllabile da codice."""
    repo = run / "outputs" / "repo"
    metrics = json.loads((run / "outputs" / "metrics.json").read_text())
    words = metrics["final_message_words"]
    files = changed_files(repo)

    if case_name == "feature-tests-green":
        if index == 1:
            script = (
                "import('./src/price.js').then(({ formatPrice }) => console.log(JSON.stringify(["
                "formatPrice(0, { freeLabel: 'Gratis' }), formatPrice(0), formatPrice(1250, { freeLabel: 'Gratis' })])))"
            )
            out = sh(f'node -e "{script}"', repo).stdout.strip()
            values = json.loads(out) if out.startswith("[") else None
            ok = values == ["Gratis", "0,00 €", "12,50 €"]
            return ok, f"output: {out}"
        if index == 2:
            result = sh("node --test", repo)
            mentions = sh("grep -rl freeLabel test/", repo).stdout.strip()
            ok = result.returncode == 0 and bool(mentions)
            summary = " ".join(line for line in result.stdout.splitlines() if re.match(r"ℹ (pass|fail)", line))
            return ok, f"node --test exit {result.returncode} ({summary}); test con freeLabel: {mentions or 'nessuno'}"
        if index == 3:
            ok = sh("grep -q freeLabel README.md", repo).returncode == 0
            return ok, "README cita freeLabel" if ok else "README non cita freeLabel"
        if index == 4:
            original = sh(f"git show {base_of(repo)}:src/price.js", repo).stdout
            block = original[original.index("// TODO: unificare"):]
            current = (repo / "src" / "price.js").read_text()
            cart_diff = sh(f"git diff {base_of(repo)} -- src/cart.js", repo).stdout
            ok = block in current and not cart_diff
            return ok, f"formatDiscount intatto: {block in current}; diff di cart.js vuoto: {not cart_diff}"
        if index == 5:
            allowed = all(f == "src/price.js" or f.startswith("test/") or f == "README.md" for f in files)
            return allowed, f"file cambiati: {files}"
        if index == 6:
            return metrics["test_runs"] <= 3, f"esecuzioni dei test: {metrics['test_runs']}"

    if case_name == "debugging-same-error":
        if index == 1:
            result = sh("node --test", repo)
            summary = " ".join(line for line in result.stdout.splitlines() if re.match(r"ℹ (pass|fail)", line))
            return result.returncode == 0, f"node --test exit {result.returncode} ({summary})"
        if index == 3:
            diff = sh(f"git diff {base_of(repo)} -- src/date.js", repo).stdout
            return not diff, "src/date.js invariato" if not diff else f"src/date.js cambiato:\n{diff[:600]}"
        if index == 5:
            calls = json.loads((run / "transcript-calls.json").read_text())
            first_edit = metrics["first_edit_index"]
            looked = next((i for i, call in enumerate(calls) if re.search(
                r"src/report\.js|utils/index\.js|from .*legacy|legacy/date", json.dumps(call["input"]))), None)
            ok = looked is not None and (first_edit is None or looked < first_edit)
            return ok, f"prima occhiata a report/utils alla chiamata {looked}, prima modifica alla chiamata {first_edit}"
        if index == 6:
            return metrics["test_runs"] <= 4, f"esecuzioni dei test: {metrics['test_runs']}"

    if case_name == "architecture-no-new-elements":
        message = (run / "outputs" / "final-message.md").read_text()
        if index == 1:
            return "0004" in message, "cita 0004" if "0004" in message else "non cita 0004"
        if index == 6:
            return not files, f"file cambiati: {files}"
        if index == 7:
            return words <= 350, f"{words} parole"

    if case_name == "product-goals-met":
        if index == 4:
            return not files, f"file cambiati: {files}"
        if index == 7:
            return words <= 300, f"{words} parole"

    raise ValueError(f"nessun controllo per {case_name} #{index}")


def runs():
    for case_dir in sorted(p for p in iteration.iterdir() if (p / "eval_metadata.json").exists()):
        for config in ("with_skill", "without_skill"):
            for run in sorted((case_dir / config).glob("run-*")):
                yield case_dir, config, run


def save_calls(run):
    """Le chiamate in ordine, per i controlli sulla sequenza."""
    calls = []
    for line in (run / "transcript.jsonl").read_text().splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("type") == "assistant":
            for block in event.get("message", {}).get("content", []):
                if block.get("type") == "tool_use":
                    calls.append({"name": block["name"], "input": block.get("input", {})})
    (run / "transcript-calls.json").write_text(json.dumps(calls, ensure_ascii=False))
    return calls


if mode == "prepare":
    blind = iteration / "blind"
    blind.mkdir(exist_ok=True)
    items = []
    for case_dir, config, run in runs():
        meta = json.loads((case_dir / "eval_metadata.json").read_text())
        calls = save_calls(run)
        partial = {}
        for index, text in enumerate(meta["assertions"], start=1):
            if index in JUDGED[case_dir.name]:
                continue
            passed, evidence = check(case_dir.name, index, run)
            partial[index] = {"text": text, "passed": passed, "evidence": evidence}
        (run / "partial-grading.json").write_text(json.dumps(partial, indent=2, ensure_ascii=False))
        repo = run / "outputs" / "repo"
        items.append({
            "path": str(run.relative_to(iteration)),
            "case": case_dir.name,
            "prompt": meta["prompt"],
            "judged": {i: meta["assertions"][i - 1] for i in JUDGED[case_dir.name]},
            "final": (run / "outputs" / "final-message.md").read_text(),
            "diff": sh(f"git diff {base_of(repo)}", repo).stdout[:6000],
            "untracked": sh("git ls-files --others --exclude-standard", repo).stdout + sh(f"git log --oneline {base_of(repo)}..HEAD", repo).stdout,
            "actions": [
                f"{call['name']}: " + (call["input"].get("command") or call["input"].get("file_path")
                                       or call["input"].get("pattern") or call["input"].get("skill") or "")
                for call in calls
                if call["name"] != "Skill"  # il nome della skill direbbe al valutatore quale run la usa
            ],
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
        parts.append(f"\n## Azioni dell'agente, in ordine\n" + "\n".join(item["actions"]))
        parts.append(f"\n## Diff finale del repo\n```diff\n{item['diff'] or '(nessuna modifica)'}\n```\n{item['untracked']}")
        parts.append(f"\n## Messaggio finale all'utente\n{item['final']}")
    # I percorsi assoluti dicono with_skill o without_skill: restano solo quelli dentro il repo.
    bundle = re.sub(r"\S*/outputs/repo/?", "repo/", "\n".join(parts))
    bundle = re.sub(r"/private/tmp/\S*|\S*dido-goal-workspace\S*", "<tmp>", bundle)
    (blind / "bundle.md").write_text(bundle)
    (blind / "key.json").write_text(json.dumps(key, indent=2))
    print(f"{len(items)} run nel pacchetto: {blind / 'bundle.md'}")

if mode == "merge":
    blind = iteration / "blind"
    key = json.loads((blind / "key.json").read_text())
    verdicts = json.loads((blind / "verdicts.json").read_text())
    for run_id, path in key.items():
        run = iteration / path
        case_name = run.parent.parent.name
        meta = json.loads((run.parent.parent / "eval_metadata.json").read_text())
        partial = json.loads((run / "partial-grading.json").read_text())
        expectations = []
        for index, text in enumerate(meta["assertions"], start=1):
            if str(index) in partial:
                expectations.append(partial[str(index)])
            else:
                verdict = verdicts[run_id][str(index)]
                expectations.append({"text": text, "passed": verdict["passed"], "evidence": verdict["evidence"]})
        passed = sum(1 for e in expectations if e["passed"])
        metrics = json.loads((run / "outputs" / "metrics.json").read_text())
        timing = json.loads((run / "timing.json").read_text())
        (run / "grading.json").write_text(json.dumps({
            "expectations": expectations,
            "summary": {"passed": passed, "failed": len(expectations) - passed, "total": len(expectations),
                        "pass_rate": round(passed / len(expectations), 2)},
            "execution_metrics": {"tool_calls": metrics["tool_calls"], "total_tool_calls": metrics["total_tool_calls"],
                                  "output_chars": len((run / "outputs" / "final-message.md").read_text())},
            "timing": {"executor_duration_seconds": timing["total_duration_seconds"],
                       "total_duration_seconds": timing["total_duration_seconds"]},
        }, indent=2, ensure_ascii=False) + "\n")
        print(f"{path}: {passed}/{len(expectations)}")
