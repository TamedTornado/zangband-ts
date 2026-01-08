---
description: Close a GitHub issue as fixed
allowed-tools: Bash(gh:*)
argument-hint: <issue-number> - The issue number to close
---

# Close Issue as Fixed

Close the specified GitHub issue ($ARGUMENTS) with a comment indicating it was fixed.

First, show the issue details (using --json to avoid deprecated Projects Classic API):
```
gh issue view $ARGUMENTS --json title,body,state,url
```

Then ask me for a brief comment about how it was fixed (or what commit fixed it).

Close the issue with:
```
gh issue close $ARGUMENTS --comment "<comment>"
```

Confirm the issue was closed successfully.
