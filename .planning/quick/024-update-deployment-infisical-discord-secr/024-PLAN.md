---
phase: quick-024
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - infra/Makefile
  - packages/server/Dockerfile
  - .github/workflows/deploy.yml
autonomous: true

must_haves:
  truths:
    - "Running `make deploy` from infra/ pulls secrets from Infisical and deploys to VPS with Discord env vars"
    - "Production .env on VPS includes DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET"
    - "Docker image builds with VITE_DISCORD_CLIENT_ID available at client build time"
    - "GitHub Actions deploy also writes Discord secrets to production .env"
  artifacts:
    - path: "infra/Makefile"
      provides: "deploy target using Infisical secrets"
      contains: "deploy:"
    - path: "packages/server/Dockerfile"
      provides: "VITE_DISCORD_CLIENT_ID build arg in client-build stage"
      contains: "ARG VITE_DISCORD_CLIENT_ID"
    - path: ".github/workflows/deploy.yml"
      provides: "Discord env vars in production .env"
      contains: "DISCORD_CLIENT_ID"
  key_links:
    - from: "infra/Makefile deploy target"
      to: "infisical run --env=prod"
      via: "INFRA_EXEC with infisical wrapper"
      pattern: "infisical run --env=prod"
    - from: "/opt/shithead/.env on VPS"
      to: "systemd shithead-game.service"
      via: "--env-file /opt/shithead/.env"
      pattern: "DISCORD_CLIENT"
---

<objective>
Add a `make deploy` target to the infra Makefile that uses Infisical to inject all secrets (Discord credentials, SSH key, GHCR credentials) and deploys to the Hetzner VPS. Also update the production Dockerfile to pass VITE_DISCORD_CLIENT_ID as a build arg, and update the GitHub Actions deploy workflow to include Discord env vars in the production .env file.

Purpose: Enable manual deploys with Infisical-managed Discord secrets, and ensure both manual and CI deploys produce a working Discord OAuth setup in production.
Output: Updated Makefile with `deploy` target, updated Dockerfile with build arg, updated deploy.yml with Discord env vars.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@infra/Makefile
@packages/server/Dockerfile
@.github/workflows/deploy.yml
@infra/docker-compose.yml
@Dockerfile.tunnel (reference for VITE_DISCORD_CLIENT_ID build arg pattern)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add VITE_DISCORD_CLIENT_ID build arg to production Dockerfile</name>
  <files>packages/server/Dockerfile</files>
  <action>
Add `ARG VITE_DISCORD_CLIENT_ID` and `ENV VITE_DISCORD_CLIENT_ID=$VITE_DISCORD_CLIENT_ID` to the `client-build` stage, immediately before the `RUN bunx vite build` line (line 45). Follow the exact pattern from Dockerfile.tunnel lines 19-20.

This ensures Vite can embed the Discord client ID into the built client JS at image build time. Without this, `import.meta.env.VITE_DISCORD_CLIENT_ID` resolves to undefined in production.

The production stage does NOT need this arg — it's only needed during the Vite build in client-build.
  </action>
  <verify>
Read the Dockerfile and confirm ARG + ENV lines exist in client-build stage before the vite build command. Verify the production stage is unchanged except that builds will now accept the build arg.
  </verify>
  <done>client-build stage has ARG VITE_DISCORD_CLIENT_ID and ENV VITE_DISCORD_CLIENT_ID=$VITE_DISCORD_CLIENT_ID before the vite build command.</done>
</task>

<task type="auto">
  <name>Task 2: Add deploy target to infra Makefile</name>
  <files>infra/Makefile</files>
  <action>
Add a `deploy` target to the infra Makefile that mirrors what the GitHub Actions workflow does, but sources all secrets from Infisical.

The target should:
1. Depend on `up` (ensure infra container is running)
2. Use `$(INFRA_EXEC)` with `infisical run --env=prod` to inject secrets
3. Inside the infisical-wrapped command:
   a. Write the SSH key to a temp file (same pattern as `ssh` target)
   b. SSH to root@46.225.52.135 and execute:
      - Login to GHCR: `echo "$$GHCR_PAT" | docker login ghcr.io -u $$GHCR_USERNAME --password-stdin`
      - Pull latest image: `docker pull ghcr.io/stevedsimkins/shithead-server:latest`
      - Write .env file to /opt/shithead/.env with:
        ```
        NODE_ENV=production
        PORT=3000
        ALLOWED_ORIGINS=https://splatmonkey.com
        DISCORD_CLIENT_ID=$$DISCORD_CLIENT_ID
        DISCORD_CLIENT_SECRET=$$DISCORD_CLIENT_SECRET
        ```
      - Restart systemd service: `systemctl restart shithead-game`
      - Health check: `sleep 10 && curl -f http://localhost:3000/health`
   c. Clean up temp SSH key file

Important implementation notes:
- Use `$$` to escape shell variables in the Makefile (Makefile syntax)
- The infisical run command injects env vars, so `$$DISCORD_CLIENT_ID` etc. are available inside the sh -c
- Expected Infisical secret names: `VPS_SSH_PRIVATE_KEY`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `GHCR_PAT`, `GHCR_USERNAME`
- GHCR_PAT is a GitHub Personal Access Token (not GITHUB_TOKEN which is only available in Actions). The user must have this in Infisical.
- ALLOWED_ORIGINS can be hardcoded to `https://splatmonkey.com` (it's not a secret)
- Do NOT include Caddy config or systemd sed — those are one-time setup already done by cloud-init and initial deploy
- Add help comment: `## Deploy latest image to VPS (secrets via Infisical)`
- Update the .PHONY line at the top to include `deploy`

For the SSH command, use a heredoc-style approach similar to the existing `ssh` target but with the deploy commands embedded. The full command will be a single `$(INFRA_EXEC)` call wrapping `infisical run --env=prod -- sh -c '...'`.

Structure the command as:
```
deploy: up ## Deploy latest image to VPS (secrets via Infisical)
	$(INFRA_EXEC) "infisical run --env=prod -- sh -c '\
		echo \"\$$VPS_SSH_PRIVATE_KEY\" > /tmp/vps_key && chmod 600 /tmp/vps_key && \
		ssh -o StrictHostKeyChecking=no -i /tmp/vps_key root@46.225.52.135 \"\
			echo \\\"$$GHCR_PAT\\\" | docker login ghcr.io -u \\\"$$GHCR_USERNAME\\\" --password-stdin && \
			docker pull ghcr.io/stevedsimkins/shithead-server:latest && \
			... (write .env, restart, health check) \
		\" && \
		rm -f /tmp/vps_key \
	'"
```

NOTE: The nested quoting (Makefile -> docker exec -> infisical -> sh -c -> ssh -> remote commands) is tricky. Use the escape pattern from the existing `ssh` target as reference. The key insight is:
- `$$` for Makefile escaping of `$`
- `\"` for inner quotes within the outer single-quoted sh -c
- For the .env heredoc on the remote, use `printf` or `echo` with newlines rather than heredoc (heredocs inside SSH inside sh -c are nightmare quoting)

Use a series of escaped echo/printf lines to write the .env, like:
```
printf 'NODE_ENV=production\nPORT=3000\nALLOWED_ORIGINS=https://splatmonkey.com\nDISCORD_CLIENT_ID=%s\nDISCORD_CLIENT_SECRET=%s\n' \$$DISCORD_CLIENT_ID \$$DISCORD_CLIENT_SECRET > /opt/shithead/.env
```

Actually, the simplest approach: Write a shell script approach where `infisical run` exports the vars, then use a HERE document for the SSH session. Look at how the `ssh` target works — it uses a SINGLE `$(INFRA_EXEC)` call. For deploy, do the same but pass commands to ssh instead of opening an interactive session.

SIMPLEST CORRECT APPROACH: Write the deploy as a shell script file `infra/deploy.sh` that takes env vars as arguments, OR use the same pattern as `ssh` target but replace the interactive ssh with a non-interactive ssh that runs commands. The non-interactive approach:

```makefile
deploy: up ## Deploy latest image to VPS (secrets via Infisical)
	$(INFRA_EXEC) "infisical run --env=prod -- sh -c ' \
		echo \"\$$VPS_SSH_PRIVATE_KEY\" > /tmp/vps_key && chmod 600 /tmp/vps_key && \
		ssh -o StrictHostKeyChecking=no -i /tmp/vps_key root@46.225.52.135 \" \
			echo \\\"\$$GHCR_PAT\\\" | docker login ghcr.io -u \\\"\$$GHCR_USERNAME\\\" --password-stdin && \
			docker pull ghcr.io/stevedsimkins/shithead-server:latest && \
			printf \\\"NODE_ENV=production\nPORT=3000\nALLOWED_ORIGINS=https://splatmonkey.com\nDISCORD_CLIENT_ID=\$$DISCORD_CLIENT_ID\nDISCORD_CLIENT_SECRET=\$$DISCORD_CLIENT_SECRET\n\\\" > /opt/shithead/.env && \
			systemctl restart shithead-game && \
			sleep 10 && \
			curl -f http://localhost:3000/health \
		\" && \
		rm -f /tmp/vps_key'"
```

ACTUALLY -- the quoting hell here is real. Let me suggest the CLEANEST approach: Create a separate `infra/scripts/deploy.sh` script that `infisical run` executes. This avoids nested quoting entirely.

REVISED APPROACH -- create two files:

1. `infra/scripts/deploy.sh` -- a bash script that:
   - Expects env vars: VPS_SSH_PRIVATE_KEY, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, GHCR_PAT, GHCR_USERNAME
   - Writes SSH key to temp file
   - SSHes to VPS with a heredoc of commands
   - Cleans up

2. Update `infra/Makefile` -- add deploy target that runs:
   ```
   $(INFRA_EXEC) "infisical run --env=prod -- bash /infra/scripts/deploy.sh"
   ```

The infra container mounts `./opentofu:/infra` (from docker-compose.yml). But scripts/ is not under opentofu/. So EITHER:
- Add a volume mount for scripts: `./scripts:/infra/scripts`
- OR put deploy.sh under opentofu/ (messy)
- OR mount the whole infra dir

SIMPLEST: Add volume mount `./scripts:/scripts` to docker-compose.yml and create `infra/scripts/deploy.sh`. OR just mount the whole infra directory.

Wait -- re-reading docker-compose.yml: it mounts `./opentofu:/infra`. We could change this to mount `./:/infra` (the whole infra/ dir) but that changes the existing tofu commands that reference `/infra`.

CLEANEST solution: Just add another volume mount. Update `infra/docker-compose.yml` to add `- ./scripts:/scripts` and create `infra/scripts/deploy.sh`.

So the final plan for this task:

1. Create `infra/scripts/deploy.sh` (new file) with the deploy logic
2. Update `infra/docker-compose.yml` to mount `./scripts:/scripts`
3. Update `infra/Makefile` to add the deploy target

deploy.sh should be:
```bash
#!/usr/bin/env bash
set -euo pipefail

# Expected env vars (injected by infisical run):
# VPS_SSH_PRIVATE_KEY, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, GHCR_PAT, GHCR_USERNAME

IMAGE="ghcr.io/stevedsimkins/shithead-server:latest"
VPS_HOST="root@46.225.52.135"

# Write SSH key
echo "$VPS_SSH_PRIVATE_KEY" > /tmp/vps_key
chmod 600 /tmp/vps_key
trap 'rm -f /tmp/vps_key' EXIT

echo "==> Deploying to $VPS_HOST..."

ssh -o StrictHostKeyChecking=no -i /tmp/vps_key "$VPS_HOST" bash -s "$GHCR_PAT" "$GHCR_USERNAME" "$IMAGE" "$DISCORD_CLIENT_ID" "$DISCORD_CLIENT_SECRET" << 'ENDSSH'
set -euo pipefail

GHCR_PAT="$1"
GHCR_USERNAME="$2"
IMAGE="$3"
DISCORD_CLIENT_ID="$4"
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
```

Wait -- `bash -s` with positional args AND a heredoc... The heredoc with `<< 'ENDSSH'` (single-quoted delimiter) prevents variable expansion, so `$1` etc. refer to the remote shell's positional params passed via `-s`. This is correct!

Actually no -- with `bash -s`, the positional arguments come AFTER the script read from stdin. So `ssh ... bash -s "$ARG1" "$ARG2" << 'HEREDOC'` passes $ARG1 as $1 inside the heredoc script. This is a well-known pattern and it works.

For the Makefile target:
```makefile
deploy: up ## Deploy latest image to VPS (secrets via Infisical)
	$(INFRA_EXEC) "infisical run --env=prod -- bash /scripts/deploy.sh"
```

For docker-compose.yml, add the scripts volume.
  </action>
  <verify>
1. Verify `infra/scripts/deploy.sh` exists and is executable
2. Verify `infra/docker-compose.yml` has the scripts volume mount
3. Verify `infra/Makefile` has the deploy target
4. Run `make -n deploy` from infra/ to verify the make target parses correctly (dry run)
  </verify>
  <done>
- `infra/scripts/deploy.sh` exists with deploy logic using env vars from Infisical
- `infra/docker-compose.yml` mounts `./scripts:/scripts`
- `infra/Makefile` has `deploy` target that runs `infisical run --env=prod -- bash /scripts/deploy.sh`
- `make -n deploy` succeeds (no syntax errors)
  </done>
</task>

<task type="auto">
  <name>Task 3: Update GitHub Actions deploy.yml to include Discord env vars</name>
  <files>.github/workflows/deploy.yml</files>
  <action>
Update the GitHub Actions deploy workflow to:

1. Add `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` as secrets in the "Deploy to Hetzner VPS" step's env block:
   ```yaml
   DISCORD_CLIENT_ID: ${{ secrets.DISCORD_CLIENT_ID }}
   DISCORD_CLIENT_SECRET: ${{ secrets.DISCORD_CLIENT_SECRET }}
   ```

2. Update the .env heredoc (lines 74-78) to include the Discord vars:
   ```
   NODE_ENV=production
   PORT=3000
   ALLOWED_ORIGINS=${DEPLOY_ORIGINS}
   DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
   DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}
   ```

3. Add `VITE_DISCORD_CLIENT_ID` as a build arg in the "Build and push ARM64 image" step so the client build in Docker has access to it:
   ```yaml
   build-args: |
     VITE_DISCORD_CLIENT_ID=${{ secrets.DISCORD_CLIENT_ID }}
   ```
   (The VITE_ prefixed version uses the same value as DISCORD_CLIENT_ID -- it's the public client ID)

This ensures both CI and manual deploys produce the same result with Discord credentials available.

NOTE: The user will need to add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET as GitHub Actions secrets in the repository settings. This is a one-time manual step.
  </action>
  <verify>
Read the updated deploy.yml and confirm:
1. DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET are in the env block of the deploy step
2. The .env heredoc includes both Discord vars
3. The build step has build-args with VITE_DISCORD_CLIENT_ID
4. YAML syntax is valid (no indentation issues)
  </verify>
  <done>
- deploy.yml env block includes DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET from secrets
- Production .env on VPS will include Discord credentials
- Docker build passes VITE_DISCORD_CLIENT_ID as build arg
  </done>
</task>

</tasks>

<verification>
1. `packages/server/Dockerfile` client-build stage has ARG/ENV for VITE_DISCORD_CLIENT_ID
2. `infra/Makefile` has a `deploy` target, `make -n deploy` parses without error
3. `infra/scripts/deploy.sh` exists and contains the full deploy logic
4. `infra/docker-compose.yml` mounts scripts directory
5. `.github/workflows/deploy.yml` includes Discord env vars in .env and build-args
6. `make lint` passes (if applicable to these file types)
</verification>

<success_criteria>
- Running `make deploy` from infra/ will use Infisical to inject secrets, SSH to VPS, pull latest image, write .env with Discord credentials, and restart the service
- GitHub Actions deploys also write Discord credentials to production .env
- Docker image builds embed VITE_DISCORD_CLIENT_ID in client JS at build time
- Both deploy paths (manual and CI) produce identical .env files on the VPS
</success_criteria>

<output>
After completion, create `.planning/quick/024-update-deployment-infisical-discord-secr/024-SUMMARY.md`
</output>
