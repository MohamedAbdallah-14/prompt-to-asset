# 28e — Secrets Management and OIDC for Provider API Keys

## The problem specific to this project

prompt-to-asset routes to OpenAI (`OPENAI_API_KEY`), Ideogram (`IDEOGRAM_API_KEY`),
Recraft (`RECRAFT_API_KEY`), Black Forest Labs (`BFL_API_KEY`), and Google Gemini
(`GEMINI_API_KEY`). These are all third-party API keys — there is no OIDC federation
support from any of these providers directly. GitHub OIDC only solves the AWS/GCP/Azure
credential problem, not arbitrary API key management.

This is the critical gap: **OIDC cannot replace third-party AI provider keys**. The
practical choice is between GitHub Secrets (simple, static) and a secrets manager
(Infisical, HashiCorp Vault, AWS Secrets Manager) fronted by OIDC.

## Option 1: GitHub Secrets (simplest)

Store each key as a repository secret or environment secret:

```
OPENAI_API_KEY
IDEOGRAM_API_KEY
RECRAFT_API_KEY
BFL_API_KEY
GEMINI_API_KEY
```

Inject into jobs that need them:

```yaml
jobs:
  integration:
    environment: integration  # requires manual approval
    env:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      IDEOGRAM_API_KEY: ${{ secrets.IDEOGRAM_API_KEY }}
```

Use GitHub Environments to add mandatory reviewer approval before the job runs. This
prevents PRs from arbitrary contributors from burning API quota.

Rotation: GitHub Secrets do not auto-rotate. Set a calendar reminder (30–90 days) or
use a provider-specific webhook to alert on expiry.

## Option 2: Infisical + OIDC (no long-lived tokens in GitHub)

Infisical (`infisical.com`) supports OIDC authentication from GitHub Actions. The
workflow authenticates to Infisical using a short-lived GitHub OIDC token, then fetches
secrets dynamically. No secrets are stored in GitHub at all.

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: Infisical/secrets-action@v1.0.9
    with:
      method: "oidc"
      identity-id: ${{ vars.INFISICAL_IDENTITY_ID }}
      project-slug: ${{ vars.INFISICAL_PROJECT_SLUG }}
      env-slug: production
```

After this step, all secrets from the Infisical project are available as environment
variables to subsequent steps. The keys exist only for the job's lifetime.

Trade-off: adds an external dependency (Infisical) and requires trust configuration
between GitHub and Infisical. For a small team, the operational overhead may exceed the
security gain versus rotating GitHub Secrets regularly.

## Option 3: AWS Secrets Manager via OIDC (for AWS shops)

If the team already uses AWS, store provider keys in AWS Secrets Manager and assume an
IAM role using `aws-actions/configure-aws-credentials@v4` with OIDC — no AWS access
keys stored in GitHub. Then use `aws secretsmanager get-secret-value` to retrieve
individual keys.

This pattern is documented in GitHub Docs ("Configuring OpenID Connect in cloud providers")
and is production-proven at scale. GCP Workload Identity Federation and Azure Federated
Credentials follow the same principle.

## Practical recommendations for this project

**For integration tests (run on PRs from trusted contributors):**

```yaml
jobs:
  integration:
    runs-on: ubuntu-24.04
    environment: integration
    steps:
      - name: Skip if no keys
        if: env.OPENAI_API_KEY == ''
        run: echo "No API keys — skipping integration tier" && exit 0
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

Use `skipIf` at the test level so unit tests still run regardless:

```typescript
import { skipIf } from "vitest";
const hasOpenAI = !!process.env.OPENAI_API_KEY;
test.skipIf(!hasOpenAI)("asset_generate_logo api mode", async () => { ... });
```

**For mock-based CI (no keys needed):**

Wire `zerob13/mock-openai-api` as a Docker service container in the test job:

```yaml
services:
  openai-mock:
    image: zerob13/mock-openai-api:latest
    ports:
      - 8080:8080
env:
  OPENAI_BASE_URL: http://localhost:8080/v1
  OPENAI_API_KEY: mock-key
```

This lets the full API-mode path run in CI without real keys or real spend. The mock
returns plausible response shapes but not real images — validation tests that check pixel
content will fail and should be skipped.

## Key naming conventions

Use a consistent prefix to distinguish CI scope from local dev:

- `OPENAI_API_KEY` — standard env var name (matches what the provider SDK reads by default)
- `CI_OPENAI_API_KEY` — a separate key scoped to CI with restricted quota/permissions

Some provider dashboards (OpenAI, Anthropic) support key-level rate limiting and usage
alerts — configure both for CI keys.

## Caveats

- GitHub Secrets in fork PRs are not available to `pull_request` event workflows — only
  `pull_request_target`. This means integration tests with real keys cannot run on fork PRs
  by design. Do not work around this: it is a deliberate security boundary.
- Secret scanning in Snyk's 2025 State of Secrets report noted 28M credentials leaked on
  GitHub — the vast majority from committed `.env` files. The `.env.example` in this repo
  must never contain real values; the `.gitignore` must exclude `.env`.
- `id-token: write` at the job level overrides the default `permissions: {}`. Set it only
  on jobs that need OIDC (publish, deploy) — do not add it to test jobs.
