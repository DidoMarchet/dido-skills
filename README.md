# dido-skills
AI skills for coding conventions and full repo analysis, writing documentation, guides, structured project content, and developer-facing resources.

Install with the [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add DidoMarchet/dido-skills --skill <name>      # current project
npx skills add DidoMarchet/dido-skills --skill <name> -g   # every project (user level)
npx skills update <name>                                    # pull the latest version
```

A skill loads only when the task matches it. The writing rules that apply everywhere, chat replies included, are in [claude/CLAUDE.md](claude/CLAUDE.md). On a new machine, add them once to your user-level `CLAUDE.md`:

```bash
mkdir -p ~/.claude && curl -fsSL https://raw.githubusercontent.com/DidoMarchet/dido-skills/main/claude/CLAUDE.md >> ~/.claude/CLAUDE.md
```
