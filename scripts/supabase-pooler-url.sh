#!/usr/bin/env bash
# Prints the IPv4 connection-pooler URL (session mode, port 5432) of a Supabase project.
# GitHub-hosted runners have no IPv6, and the direct database host is IPv6-only, so
# `supabase db push` must go through the pooler (ADR-038).
#
# Needs SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD (secrets) and SUPABASE_POOLER_HOST
# (a plain environment variable, e.g. aws-0-us-east-1.pooler.supabase.com, taken from
# Supabase → Connect → Session pooler). The CI access token is deliberately too narrow
# to read the pooler settings from the Management API, so the host is configured instead.
# The URL contains the password: callers must mask it and never echo it.
set -euo pipefail

if [ -z "${SUPABASE_POOLER_HOST:-}" ]; then
  echo "SUPABASE_POOLER_HOST is not set for this environment (see docs/runbooks/staging.md)" >&2
  exit 1
fi

user="postgres.${SUPABASE_PROJECT_REF}"
password="$(jq -rn --arg value "$SUPABASE_DB_PASSWORD" '$value | @uri')"
# Session mode (5432) keeps prepared statements working for migrations.
printf 'postgresql://%s:%s@%s:5432/postgres' "$user" "$password" "$SUPABASE_POOLER_HOST"
