# ChatGPT Troubleshooting Intake for `429: You exceeded your current quota`

Use this template when starting a troubleshooting chat in your ChatGPT account.

## Issue summary
- **What happened:** The `/ai-test` connectivity check failed.
- **Error shown:** `Error: 429 You exceeded your current quota, please check your plan and billing details.`
- **Reference doc in error:** https://platform.openai.com/docs/guides/error-codes/api-errors

## Copy/paste starter message
```text
I need help troubleshooting an OpenAI API quota error.

Environment:
- Endpoint/test path: /ai-test (Connectivity check)
- Error: 429 You exceeded your current quota, please check your plan and billing details.
- First seen (with timezone): <fill in>
- Is this reproducible every time? <yes/no>

Account/Billing checks already done:
- Correct account/org selected: <yes/no>
- Active API billing method on that org/project: <yes/no>
- Monthly budget / hard-limit / project spend caps: <details>
- Free trial credits remaining (if applicable): <details>

API usage details:
- API key source (project/user key): <details>
- Model being called: <model>
- Request rate during test: <req/min>
- Approx token usage per request: <input/output tokens>

Diagnostics:
- Full response body and headers (redacted key): <paste>
- Request ID / trace ID if present: <paste>
- Any recent account/org/project changes: <details>

Please help identify whether this is a true quota exhaustion, wrong org/project selection, billing-limit cap, or rate limit misclassification.
```

## Minimum details to collect before troubleshooting
1. **Timestamp + timezone** of the failing request.
2. **Org/project in use** (many 429 quota errors are caused by using a key tied to a different org/project than expected).
3. **Billing state** for that org/project:
   - payment method status,
   - budget/limit settings,
   - project-level spending caps.
4. **Model and request volume** used by `/ai-test`.
5. **Raw API error payload** (with secrets redacted).

## Common root causes to check quickly
- API key belongs to a different project/org than the one with billing enabled.
- Project budget or hard spend limit reached.
- Free trial credits expired or unavailable.
- Key is valid, but account billing is not active for API usage.
- Script is retrying aggressively and hitting limits rapidly.

## Suggested first actions
1. Confirm your active organization/project where the key was created.
2. Verify billing and usage limits for that exact org/project.
3. Generate a new key in the intended project and retest `/ai-test`.
4. Add logging for response headers/body to distinguish quota vs rate-limit behavior.
5. If still failing, use the starter message above in ChatGPT/support with full diagnostics.
