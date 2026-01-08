---
description: Create a GitHub issue for a bug
allowed-tools: Bash(gh:*)
argument-hint: <title> - Short description of the bug
---

# Create Bug Issue

Create a GitHub issue with the label "bug" for this project.

**Title**: $ARGUMENTS

Use your context from our conversation to fill in the issue body. If we've been discussing something related to the bug, include relevant details. If the bug is self-explanatory from the title, create a sensible body. Only ask for more details if you genuinely don't have enough context.

Create using:
```
gh issue create --title "<title>" --body "<body>" --label "bug"
```

Report the issue number and URL when done.
