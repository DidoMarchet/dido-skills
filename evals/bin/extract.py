"""Dal transcript stream-json di una sessione: messaggio finale, tempi e metriche delle chiamate.

Le chiamate dei subagenti (parent_tool_use_id) stanno a parte: le metriche dell'agente
contano solo le sue.
"""
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

run = Path(sys.argv[1])
events = []
for line in (run / "transcript.jsonl").read_text().splitlines():
    try:
        events.append(json.loads(line))
    except json.JSONDecodeError:
        pass


def result_text(content):
    if isinstance(content, str):
        return content
    return "\n".join(part.get("text", "") for part in content or [] if isinstance(part, dict))


calls = []  # chiamate dell'agente principale, in ordine
subagent_calls = []
results = {}  # tool_use_id -> testo del risultato
texts = []
for event in events:
    parent = event.get("parent_tool_use_id")
    for block in event.get("message", {}).get("content", []) if isinstance(event.get("message"), dict) else []:
        if not isinstance(block, dict):
            continue
        if event.get("type") == "assistant" and block.get("type") == "tool_use":
            call = {"id": block.get("id"), "name": block["name"], "input": block.get("input", {})}
            (subagent_calls if parent else calls).append({**call, "parent": parent})
        elif event.get("type") == "assistant" and block.get("type") == "text" and not parent:
            texts.append(block["text"])
        elif event.get("type") == "user" and block.get("type") == "tool_result":
            results[block.get("tool_use_id")] = {
                "text": result_text(block.get("content")),
                "is_error": bool(block.get("is_error")),
            }

for call in calls + subagent_calls:
    outcome = results.get(call["id"], {})
    call["result"] = outcome.get("text", "")[:4000]
    call["is_error"] = outcome.get("is_error", False)
(run / "transcript-calls.json").write_text(json.dumps(calls, ensure_ascii=False))
(run / "transcript-subagent-calls.json").write_text(json.dumps(subagent_calls, ensure_ascii=False))

result = next((event for event in reversed(events) if event.get("type") == "result"), {})
final_message = result.get("result") or (texts[-1] if texts else "")
(run / "outputs" / "final-message.md").write_text(final_message + "\n")

TEST_COMMAND = re.compile(r"npm (run )?test|npm t\b|node --test|scripts/run-tests|vitest|pnpm (run )?test")
bash_commands = [call["input"].get("command", "") for call in calls if call["name"] == "Bash"]
test_runs = sum(1 for command in bash_commands if TEST_COMMAND.search(command))
edits = [index for index, call in enumerate(calls) if call["name"] in ("Edit", "Write")]
skill_calls = [call["input"].get("skill") for call in calls if call["name"] == "Skill"]
agent_calls = [
    {"subagent_type": call["input"].get("subagent_type"), "description": call["input"].get("description"),
     "prompt": call["input"].get("prompt", ""), "report": call["result"]}
    for call in calls if call["name"] == "Agent"
]

repo = run / "outputs" / "repo"
diff_names = subprocess.run(
    ["git", "status", "--porcelain"], cwd=repo, capture_output=True, text=True
).stdout.splitlines()

# Con un subagente in background la sessione riparte a ogni sua notifica e scrive un "result"
# per ogni ripresa: il tempo vero è quello di orologio, da start-tree.txt (scritto subito prima
# della sessione) a exit-code (subito dopo). Le iterazioni vecchie non hanno start-tree.txt.
clock = [run / "start-tree.txt", run / "exit-code"]
if all(path.exists() for path in clock):
    duration_ms = round((clock[1].stat().st_mtime - clock[0].stat().st_mtime) * 1000)
else:
    duration_ms = sum(event.get("duration_ms", 0) for event in events if event.get("type") == "result")
usage = result.get("usage", {})
total_tokens = sum(usage.get(key, 0) for key in (
    "input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"))
(run / "timing.json").write_text(json.dumps({
    "total_tokens": total_tokens,
    "output_tokens": usage.get("output_tokens", 0),
    "duration_ms": duration_ms,
    "total_duration_seconds": round(duration_ms / 1000, 1),
    "num_turns": result.get("num_turns"),
    "total_cost_usd": result.get("total_cost_usd"),
}, indent=2) + "\n")
(run / "outputs" / "metrics.json").write_text(json.dumps({
    "tool_calls": dict(Counter(call["name"] for call in calls)),
    "total_tool_calls": len(calls),
    "subagent_tool_calls": len(subagent_calls),
    "test_runs": test_runs,
    "first_edit_index": edits[0] if edits else None,
    "skills_invoked": skill_calls,
    "agents": agent_calls,
    "final_message_words": len(final_message.split()),
    "changed_files": diff_names,
    "bash_commands": bash_commands,
}, indent=2, ensure_ascii=False) + "\n")
print(f"{run}: {len(calls)} chiamate (+{len(subagent_calls)} dei subagenti), {test_runs} test, "
      f"skill {skill_calls}, {round(duration_ms / 1000)}s, {result.get('total_cost_usd')} $")
