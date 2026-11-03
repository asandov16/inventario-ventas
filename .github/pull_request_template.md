## What

<!-- One or two sentences. Link the roadmap task(s), e.g. F1-T03. -->

## Why

## How it was verified

- [ ] `pnpm check` green
- [ ] `pnpm db:test` green (if SQL changed) and types regenerated

## Public-repo exposure review

- [ ] No secrets, tokens, keys or connection strings
- [ ] No real customer, sales or business data; fixtures use fictional data
- [ ] No real business name
- [ ] Logs added by this PR print no secrets or query results
