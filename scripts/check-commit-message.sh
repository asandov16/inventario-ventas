#!/usr/bin/env sh
# Enforces Conventional Commits on the first line of the commit message.
# Example: "feat(sales): add customer picker"
set -eu

message_file="$1"
first_line=$(head -n 1 "$message_file")
pattern='^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9-]+\))?!?: .{1,72}$'

case "$first_line" in
  Merge*|Revert*|fixup!*|squash!*) exit 0 ;;
esac

if ! printf '%s' "$first_line" | grep -Eq "$pattern"; then
  echo "Commit message must follow Conventional Commits, in English:" >&2
  echo "  <type>(<scope>): <summary>   e.g. feat(sales): add customer picker" >&2
  echo "Got: $first_line" >&2
  exit 1
fi
