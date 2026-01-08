---
description: List open GitHub issues
allowed-tools: Bash(gh:*)
argument-hint: [label] - Optional label filter (e.g., "bug", "enhancement")
---

# List Open Issues

List open GitHub issues for this project.

If a label is provided ($ARGUMENTS), filter by that label:
```
gh issue list --label "$ARGUMENTS" --state open
```

Otherwise list all open issues:
```
gh issue list --state open
```

Present the results in a clear format showing issue number, title, and labels.
