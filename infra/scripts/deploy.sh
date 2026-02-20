#!/usr/bin/env bash
set -euo pipefail

# Deploy script for shithead-game production server.
# Expected env vars (injected by `infisical run --env=prod`):
#   VPS_SSH_PRIVATE_KEY    - PEM-encoded SSH private key
#   DISCORD_CLIENT_SECRET  - Discord application client secret
#   GHCR_PAT               - GitHub Personal Access Token with packages:read
#   GHCR_USERNAME          - GitHub username for GHCR login

IMAGE="ghcr.io/stevedsimkins/shithead-server:latest"
VPS_HOST="root@46.225.52.135"
DISCORD_CLIENT_ID="1473070068190679163"

echo "==> Writing SSH key..."
echo "$VPS_SSH_PRIVATE_KEY" > /tmp/vps_key
chmod 600 /tmp/vps_key
trap 'rm -f /tmp/vps_key' EXIT

echo "==> Deploying to $VPS_HOST..."

# Pass secrets as positional args to the remote bash script.
# The heredoc uses a single-quoted delimiter ('ENDSSH') so $1..$5 are not
# expanded locally — they remain as literal positional param references for
# the remote shell that receives them via `bash -s`.
ssh -o StrictHostKeyChecking=no -i /tmp/vps_key "$VPS_HOST" \
    bash -s "$GHCR_PAT" "$GHCR_USERNAME" "$IMAGE" "$DISCORD_CLIENT_ID" "$DISCORD_CLIENT_SECRET" << 'ENDSSH'
set -euo pipefail

GHCR_PAT="$1"
GHCR_USERNAME="$2"
IMAGE="$3"
DISCORD_CLIENT_ID="$4"  # hardcoded in script, not a secret
DISCORD_CLIENT_SECRET="$5"

echo "==> Logging in to GHCR..."
echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin

echo "==> Pulling latest image..."
docker pull "$IMAGE"

echo "==> Writing .env..."
cat > /opt/shithead/.env << ENVEOF
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://splatmonkey.com
DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET
ENVEOF

echo "==> Restarting service..."
systemctl restart shithead-game

echo "==> Waiting for startup..."
sleep 10

echo "==> Health check..."
curl -f http://localhost:3000/health

echo "==> Deploy complete!"
ENDSSH
