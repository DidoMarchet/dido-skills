"""Dal transcript stream-json di una sessione: messaggio finale, tempi e metriche delle chiamate."""
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

tool_calls = []
texts = []
for event in events:
    if event.get("type") != "assistant":
        continue
    for block in event.get("message", {}).get("content", []):
        if block.get("type") == "tool_use":
            tool_calls.append({"name": block["name"], "input": block.get("input", {})})
        elif block.get("type") == "text":
            texts.append(block["text"])

result = next((event for event in reversed(events) if event.get("type") == "result"), {})
final_message = result.get("result") or (texts[-1] if texts else "")
(run / "outputs" / "final-message.md").write_text(final_message + "\n")

TEST_COMMAND = re.compile(r"npm (run )?test|npm t\b|node --test|scripts/run-tests")
test_runs = sum(
    1 for call in tool_calls
    if call["name"] == "Bash" and TEST_COMMAND.search(call["input"].get("command", ""))
)
edits = [index for index, call in enumerate(tool_calls) if call["name"] in ("Edit", "Write")]
skill_calls = [call["input"].get("skill") for call in tool_calls if call["name"] == "Skill"]

repo = run / "outputs" / "repo"
diff_names = subprocess.run(
    ["git", "status", "--porcelain"], cwd=repo, capture_output=True, text=True
).stdout.splitlines()

duration_ms = result.get("duration_ms", 0)
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
    "tool_calls": dict(Counter(call["name"] for call in tool_calls)),
    "total_tool_calls": len(tool_calls),
    "test_runs": test_runs,
    "first_edit_index": edits[0] if edits else None,
    "skills_invoked": skill_calls,
    "final_message_words": len(final_message.split()),
    "changed_files": diff_names,
    "bash_commands": [call["input"].get("command", "") for call in tool_calls if call["name"] == "Bash"],
}, indent=2, ensure_ascii=False) + "\n")
print(f"{run}: {len(tool_calls)} chiamate, {test_runs} test, skill {skill_calls}, {round(duration_ms / 1000)}s")
