---
description: Enforces strict user consent before modifying code or deploying.
---
# Strict Consent for Modifications and Deployment

1. **No Unprompted Code Changes**: Do not proactively write, modify, or delete application code or UI unless the user explicitly requests you to build or change it. If a user asks a question, answer the question instead of proactively building the solution.
2. **No Unprompted Deployments**: NEVER run deployment commands (e.g., `firebase deploy`, `npm run deploy`, or similar) without explicit, undeniable consent from the user. Even if a feature is perfectly completed and verified locally, you must wait for the user to instruct you to deploy it.
