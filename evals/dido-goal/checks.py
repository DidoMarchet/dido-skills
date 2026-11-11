"""Controlli da script delle asserzioni di dido-goal (gli altri li giudica il valutatore cieco)."""
import json
import re

# Indici (da 1) delle asserzioni di giudizio, per caso. Le altre si controllano qui.
JUDGED = {
    "feature-tests-green": [7, 8],
    "debugging-same-error": [2, 4, 7],
    "architecture-no-new-elements": [2, 3, 4, 5, 8, 9],
    "product-goals-met": [1, 2, 3, 5, 6],
}


def node_test_summary(result):
    return " ".join(line for line in result.stdout.splitlines() if re.match(r"ℹ (pass|fail)", line))


def check(case_name, index, run):
    words = run.metrics["final_message_words"]
    files = run.changed_files()

    if case_name == "feature-tests-green":
        if index == 1:
            script = (
                "import('./src/price.js').then(({ formatPrice }) => console.log(JSON.stringify(["
                "formatPrice(0, { freeLabel: 'Gratis' }), formatPrice(0), formatPrice(1250, { freeLabel: 'Gratis' })])))"
            )
            out = run.sh(f'node -e "{script}"').stdout.strip()
            values = json.loads(out) if out.startswith("[") else None
            # Intl separa importo e simbolo con uno spazio non separabile.
            return values == ["Gratis", "0,00 €", "12,50 €"], f"output: {out}"
        if index == 2:
            result = run.sh("node --test")
            mentions = run.sh("grep -rl freeLabel test/").stdout.strip()
            ok = result.returncode == 0 and bool(mentions)
            return ok, f"node --test exit {result.returncode} ({node_test_summary(result)}); test con freeLabel: {mentions or 'nessuno'}"
        if index == 3:
            ok = run.sh("grep -q freeLabel README.md").returncode == 0
            return ok, "README cita freeLabel" if ok else "README non cita freeLabel"
        if index == 4:
            original = run.sh(f"git show {run.base}:src/price.js").stdout
            block = original[original.index("// TODO: unificare"):]
            current = (run.repo / "src" / "price.js").read_text()
            cart_diff = run.sh(f"git diff {run.base} -- src/cart.js").stdout
            ok = block in current and not cart_diff
            return ok, f"formatDiscount intatto: {block in current}; diff di cart.js vuoto: {not cart_diff}"
        if index == 5:
            allowed = all(f == "src/price.js" or f.startswith("test/") or f == "README.md" for f in files)
            return allowed, f"file cambiati: {files}"
        if index == 6:
            return run.metrics["test_runs"] <= 3, f"esecuzioni dei test: {run.metrics['test_runs']}"

    if case_name == "debugging-same-error":
        if index == 1:
            result = run.sh("node --test")
            return result.returncode == 0, f"node --test exit {result.returncode} ({node_test_summary(result)})"
        if index == 3:
            diff = run.sh(f"git diff {run.base} -- src/date.js").stdout
            return not diff, "src/date.js invariato" if not diff else f"src/date.js cambiato:\n{diff[:600]}"
        if index == 5:
            first_edit = run.metrics["first_edit_index"]
            looked = next((i for i, call in enumerate(run.calls) if re.search(
                r"src/report\.js|utils/index\.js|from .*legacy|legacy/date", json.dumps(call["input"]))), None)
            ok = looked is not None and (first_edit is None or looked < first_edit)
            return ok, f"prima occhiata a report/utils alla chiamata {looked}, prima modifica alla chiamata {first_edit}"
        if index == 6:
            return run.metrics["test_runs"] <= 4, f"esecuzioni dei test: {run.metrics['test_runs']}"

    if case_name == "architecture-no-new-elements":
        if index == 1:
            return "0004" in run.final, "cita 0004" if "0004" in run.final else "non cita 0004"
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
