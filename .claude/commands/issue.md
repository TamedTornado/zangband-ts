---
description: Create a GitHub issue
allowed-tools: Bash(gh:*)
argument-hint: <title> - Short description of the issue
---

# Create Issue

Create a GitHub issue for this project.

**Title**: $ARGUMENTS

Use your context from our conversation to fill in the issue body. If we've been discussing something related to the issue, include relevant details. If the issue is self-explanatory from the title, create a sensible body. Only ask for more details if you genuinely don't have enough context.

Create using:
```
gh issue create --title "<title>" --body "<body>"
```

Report the issue number and URL when done.
