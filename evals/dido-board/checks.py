"""Controlli da script delle asserzioni di dido-board.

La board è quella di fake-gh.mjs: il Project finto in <run>/gh-state.json.
"""
import json
import re

# Indici (da 1) delle asserzioni di giudizio, per caso. Le altre si controllano qui.
JUDGED = {
    "piano-approvato": [],
    "github-non-risponde": [4],
}

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
                len(found) == 1 and found[0].get("status") == "Backlog" for found in per_step.values())
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
    raise ValueError(f"nessun controllo per {case_name} #{index}")
