#!/usr/bin/env bash
set -euo pipefail

# Decrypt secrets.sops.yaml and export as TF_VAR_* environment variables.
# The age private key is provided via SOPS_AGE_KEY or SOPS_AGE_KEY_FILE.

SECRETS_FILE="/infra/secrets.sops.yaml"

if [ -f "$SECRETS_FILE" ]; then
  # Point SOPS at the age key file from Docker secrets if not already set
  if [ -z "${SOPS_AGE_KEY:-}" ] && [ -z "${SOPS_AGE_KEY_FILE:-}" ]; then
    if [ -f /run/secrets/age_key ]; then
      export SOPS_AGE_KEY_FILE=/run/secrets/age_key
    else
      echo "Warning: No age key found. Set SOPS_AGE_KEY, SOPS_AGE_KEY_FILE, or mount Docker secret."
    fi
  fi

  # Decrypt and export each key as TF_VAR_<key>
  while IFS='=' read -r key value; do
    export "TF_VAR_${key}=${value}"
  done < <(sops -d --output-type json "$SECRETS_FILE" | jq -r 'to_entries[] | "\(.key)=\(.value)"')
fi

# If first arg is a bare tofu subcommand, prefix with "tofu"
case "${1:-}" in
  init|plan|apply|destroy|import|state|output|show|refresh|validate|fmt|console)
    exec tofu "$@"
    ;;
  *)
    exec "$@"
    ;;
esac
