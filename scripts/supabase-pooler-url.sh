#!/usr/bin/env bash
# Prints the IPv4 connection-pooler URL (session mode, port 5432) of a Supabase project.
# GitHub-hosted runners have no IPv6, and the direct database host is IPv6-only, so
# `supabase db push` must go through the pooler (ADR-038).
# Needs SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD.
# The URL contains the password: callers must mask it and never echo it.
set -euo pipefail

config="$(curl -sSf \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/config/database/pooler")"

host="$(jq -r '[.[] | select(.database_type == "PRIMARY")][0].db_host' <<< "$config")"
user="$(jq -r '[.[] | select(.database_type == "PRIMARY")][0].db_user' <<< "$config")"
if [ -z "$host" ] || [ "$host" = "null" ] || [ -z "$user" ] || [ "$user" = "null" ]; then
  echo "Could not read the pooler host from the Supabase API" >&2
  exit 1
fi

password="$(jq -rn --arg value "$SUPABASE_DB_PASSWORD" '$value | @uri')"
# Session mode (5432) keeps prepared statements working for migrations.
printf 'postgresql://%s:%s@%s:5432/postgres' "$user" "$password" "$host"
