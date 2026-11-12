"""Controlli da script delle asserzioni di dido-frontend-nuxt."""
import json
import re

CARD = "app/components/contacts/office-card"
DESIGN_SKILLS = ("design-taste-frontend", "impeccable", "mobile-native", "emil-design-eng", "extract-design", "break-ui")
# Larghezze di viewport scritte nei comandi e nei file della sessione.
WIDTH = re.compile(r"\b(320|360|375|390|393|414|430|768|820|834|1024|1280|1366|1440|1536|1920)\b")

# Indici (da 1) delle asserzioni di giudizio, per caso. Le altre si controllano qui.
JUDGED = {
    "componente-cambiato": [6, 7],
}


def tool_inputs(run):
    """Il testo degli input di tutte le chiamate a strumenti, subagenti compresi."""
    texts = []
    for line in (run.path / "transcript.jsonl").read_text().splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("type") != "assistant":
            continue
        for block in event.get("message", {}).get("content", []):
            if block.get("type") == "tool_use":
                texts.append(json.dumps(block.get("input", {}), ensure_ascii=False))
    return texts


def check(case_name, index, run):
    if case_name == "componente-cambiato":
        template = (run.repo / CARD / "index.vue").read_text()
        if index == 1:
            # Il numero può stare nei dizionari e il tel: comporsi nel codice: si cercano tutti e due.
            has_tel = "tel:" in template
            number = run.sh(f"grep -rhE '0432 ?123 ?456' {CARD} i18n configuration app/app.config.ts").stdout.strip()
            return has_tel and bool(number), f"tel: nel template: {has_tel}; numero: {number[:120] or 'non trovato'}"
        if index == 2:
            written = re.search(r"0432\s?123\s?456|0432123456", template)
            return not written, "numero scritto nel template" if written else "numero fuori dal template"
        if index == 3:
            files = [name for name in run.changed_files() if re.search(r"\.(vue|js|scss)$", name)]
            if not files:
                return False, "nessun file toccato"
            scripts = [name for name in files if not name.endswith(".scss")]
            styles = [name for name in files if name.endswith((".scss", ".vue"))]
            eslint = run.sh("npx eslint " + " ".join(scripts)) if scripts else None
            stylelint = run.sh("npx stylelint " + " ".join(styles)) if styles else None
            ok = all(result is None or result.returncode == 0 for result in (eslint, stylelint))
            detail = "".join((result.stdout + result.stderr)[-600:] for result in (eslint, stylelint) if result)
            return ok, f"file: {files}; {detail.strip() or 'nessun problema'}"
        if index == 4:
            loaded = [skill for skill in run.metrics["skills_invoked"] if any(name in (skill or "") for name in DESIGN_SKILLS)]
            return not loaded, f"skill caricate: {run.metrics['skills_invoked']}"
        if index == 5:
            widths = sorted({int(width) for text in tool_inputs(run) for width in WIDTH.findall(text)})
            return len(widths) <= 2, f"larghezze nei comandi e nei file: {widths}"
