"""Controlli da script delle asserzioni di dido-board.

La board è quella di fake-gh.mjs (il Project finto in <run>/gh-state.json) o, nei casi infinity-*,
quella di fake-infinity.mjs (<run>/infinity-state.json).
"""
import html
import json
import re

# Indici (da 1) delle asserzioni di giudizio, per caso. Le altre si controllano qui.
JUDGED = {
    "piano-approvato": [],
    "github-non-risponde": [4],
    "infinity-piano-approvato": [],
    "infinity-token-env": [],
    "nessuna-board": [2, 3],
    "infinity-assegna": [],
}
MEMBERS = {53509: "Davide Marchet", 51103: "Lorenzo Furno"}

# Per ogni step del piano M1 della fixture, una parola del suo testo che la card deve avere.
STEPS = {
    "M1 step 1": "countWords",
    "M1 step 2": "GET /notes",
    "M1 step 3": "N parole",
    "M1 step 4": "report",
}
PLAN_LINK = "https://github.com/acme/notes-app/blob/main/docs/plans/M1.md"
COUNT_WORDS_PROBE = (
    "node --input-type=module -e \"const { countWords } = await import('./src/words.js'); "
    "const ok = countWords('uno due  tre') === 3 && countWords('') === 0 && countWords('   ') === 0; "
    "process.exit(ok ? 0 : 1)\""
)


def board_cards(run):
    state = run.path / "gh-state.json"
    if not state.exists():
        return []
    return [item for item in json.loads(state.read_text()).get("items", []) if not item.get("archived")]


def infinity_cards(run):
    """Le card della board di Infinity finta, con titolo, testo e colonna leggibili."""
    path = run.path / "infinity-state.json"
    if not path.exists():
        return []
    state = json.loads(path.read_text())
    attributes = {attribute["name"]: attribute for attribute in state["attributes"]}
    title, description = (next(a for a in state["attributes"] if a["type"] == kind) for kind in ("text", "longtext"))
    labels = {label["id"]: label["name"]
              for attribute in state["attributes"] if attribute["type"] == "label"
              for label in attribute["settings"]["labels"]}
    cards = []
    for item in state["items"]:
        if item.get("deleted"):
            continue
        values = {value["attribute_id"]: value["data"] for value in item["values"]}
        body = values.get(description["id"], "")
        body = html.unescape(re.sub(r"<[^>]+>", "", re.sub(r"<br\s*/?>|</p>", "\n", body)))
        named = lambda name: values.get(attributes[name]["id"], []) if name in attributes else []
        cards.append({
            "title": values.get(title["id"], ""),
            "body": body,
            "status": ", ".join(labels[label] for label in named("Attività") or named("Stato")),
            "assignee": [MEMBERS.get(member, member) for member in named("Responsabile")],
            "referent": [MEMBERS.get(member, member) for member in named("Referente")],
            "department": [labels[label] for label in named("Reparto")],
            "priority": [labels[label] for label in named("Priorità")],
        })
    return cards


def bash_commands(run):
    return [call["input"].get("command", "") for call in run.calls if call["name"] == "Bash"]


def gh_commands(run):
    """I comandi gh lanciati dall'agente, fuori dallo script della skill."""
    return [command for command in bash_commands(run) if re.search(r"(^|[;&|(]\s*)gh\s", command)]


def check(case_name, index, run):
    if case_name == "piano-approvato":
        cards = board_cards(run)
        if index == 1:
            per_step = {key: [card for card in cards if card["title"].startswith(f"{key}:")] for key in STEPS}
            ok = len(cards) == len(STEPS) and all(
                len(found) == 1 and found[0].get("status") == "Ready" for found in per_step.values())
            return ok, "; ".join(f"{card['title']} ({card.get('status')})" for card in cards) or "board vuota"
        if index == 2:
            problems = []
            for key, word in STEPS.items():
                card = next((card for card in cards if card["title"].startswith(f"{key}:")), None)
                body = card["body"] if card else ""
                missing = [part for part in (word, "Repo:", PLAN_LINK) if part not in body]
                if missing:
                    problems.append(f"{key}: manca {missing}")
            return not problems, "; ".join(problems) or "testo dello step, repo e link al piano in ogni card"
        if index == 3:
            commands = gh_commands(run)
            return not commands, f"comandi gh: {commands or 'nessuno'}"
        if index == 4:
            changed = [name for name in run.changed_files() if name != "docs/plans/M1.md"]
            commits = run.new_commits()
            return not changed and not commits, f"altri file cambiati: {changed or 'nessuno'}; commit nuovi: {len(commits)}"
    if case_name == "github-non-risponde":
        if index == 1:
            tests = run.sh("npm test")
            probe = run.sh(COUNT_WORDS_PROBE)
            return tests.returncode == 0 and probe.returncode == 0, (
                f"npm test exit {tests.returncode}; countWords {'giusto' if probe.returncode == 0 else 'sbagliato o assente'}")
        if index == 2:
            calls = [command for command in bash_commands(run) if "board.mjs" in command]
            return 1 <= len(calls) <= 2, f"chiamate allo script della board: {len(calls)}"
        if index == 3:
            commands = gh_commands(run)
            return not commands, f"comandi gh: {commands or 'nessuno'}"
        if index == 5:
            commits = run.new_commits()
            return not commits and not run.pushed(), f"commit nuovi: {len(commits)}; push: {run.pushed()}"
    if case_name in ("infinity-piano-approvato", "infinity-token-env"):
        cards = infinity_cards(run)
        if index == 1:
            per_step = {key: [card for card in cards if card["title"].startswith(f"{key}:")] for key in STEPS}
            ok = len(cards) == len(STEPS) and all(
                len(found) == 1 and found[0]["status"] == "To-do" for found in per_step.values())
            return ok, "; ".join(f"{card['title']} ({card['status']})" for card in cards) or "board vuota"
        if index == 2:
            problems = []
            for key, word in STEPS.items():
                card = next((card for card in cards if card["title"].startswith(f"{key}:")), None)
                body = card["body"] if card else ""
                missing = [part for part in (word, "Repo:", PLAN_LINK) if part not in body]
                if missing:
                    problems.append(f"{key}: manca {missing}")
            return not problems, "; ".join(problems) or "testo dello step, repo e link al piano in ogni card"
        if index == 3:
            around = [command for command in bash_commands(run)
                      if "board.mjs" not in command and re.search(r"startinfinity|INFINITY_TOKEN", command)]
            commands = gh_commands(run) + around
            return not commands, f"comandi fuori dallo script: {commands or 'nessuno'}"
        if index == 4:
            changed = [name for name in run.changed_files() if name != "docs/plans/M1.md"]
            commits = run.new_commits()
            return not changed and not commits, f"altri file cambiati: {changed or 'nessuno'}; commit nuovi: {len(commits)}"
    if case_name == "nessuna-board":
        if index == 1:
            changed = [name for name in run.changed_files() if name != "docs/plans/M1.md"]
            commits = run.new_commits()
            return not changed and not commits, f"altri file cambiati: {changed or 'nessuno'}; commit nuovi: {len(commits)}"
    if case_name == "infinity-assegna":
        cards = infinity_cards(run)
        if index == 1:
            per_step = {key: [card for card in cards if card["title"].startswith(f"{key}:")] for key in STEPS}
            ok = len(cards) == len(STEPS) and all(
                len(found) == 1 and found[0]["status"] == "To-do" for found in per_step.values())
            return ok, "; ".join(f"{card['title']} ({card['status']})" for card in cards) or "board vuota"
        if index == 2:
            wanted = {"assignee": ["Davide Marchet"], "referent": ["Lorenzo Furno"], "department": ["Develop"]}
            wrong = [f"{card['title']}: {field}={card[field]}" for card in cards for field, value in wanted.items()
                     if card[field] != value]
            return bool(cards) and not wrong, "; ".join(wrong) or ("tutte assegnate" if cards else "board vuota")
        if index == 3:
            shown = {card["title"].split(":")[0]: card["priority"] for card in cards}
            ok = (len(cards) == len(STEPS)
                  and all(len(priority) == 1 and priority[0] in ("Alta", "Media", "Normale") for priority in shown.values())
                  and shown.get("M1 step 1") == ["Alta"])
            return ok, "; ".join(f"{key}: {value}" for key, value in shown.items()) or "board vuota"
        if index == 4:
            changed = [name for name in run.changed_files() if name != "docs/plans/M1.md"]
            commits = run.new_commits()
            around = [command for command in bash_commands(run)
                      if "board.mjs" not in command and re.search(r"startinfinity|INFINITY_TOKEN", command)]
            outside = gh_commands(run) + around
            ok = not changed and not commits and not outside
            return ok, f"altri file: {changed or 'nessuno'}; commit: {len(commits)}; comandi fuori: {outside or 'nessuno'}"
    raise ValueError(f"nessun controllo per {case_name} #{index}")
