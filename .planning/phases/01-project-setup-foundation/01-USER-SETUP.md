# User Setup Required

**Phase:** 01-project-setup-foundation
**Status:** Incomplete - Awaiting user action

This document tracks external service setup and credentials needed for the project to function.

## Environment Variables Required

| Variable | Purpose | How to Obtain |
|----------|---------|---------------|
| `RENDER_API_KEY` | Authenticate OpenTofu and GitHub Actions with Render | Render Dashboard → Account Settings → API Keys → Create API Key |
| `RENDER_CLIENT_SERVICE_ID` | GitHub Actions deployment target for client | Render Dashboard → Client service → Settings → Service ID (after OpenTofu creates service) |
| `RENDER_SERVER_SERVICE_ID` | GitHub Actions deployment target for server | Render Dashboard → Server service → Settings → Service ID (after OpenTofu creates service) |

## Account Setup

### Render

- [ ] Create a Render account at https://render.com/register
- [ ] Connect GitHub repository to Render
  - Location: Render Dashboard → Settings → Git
  - Connect your GitHub account and authorize repository access
- [ ] Generate API key
  - Location: Render Dashboard → Account Settings → API Keys
  - Click "Create API Key"
  - Save securely - needed for OpenTofu and GitHub Actions
- [ ] Run OpenTofu to provision services
  - Copy `infra/opentofu/terraform.tfvars.example` to `infra/opentofu/terraform.tfvars`
  - Fill in your values (API key, repo URL)
  - Run `tofu init` in `infra/opentofu/` directory
  - Run `tofu plan` to preview changes
  - Run `tofu apply` to create services
- [ ] Get service IDs from OpenTofu outputs
  - Run `tofu output` to see service IDs
  - Or get from Render Dashboard → each service → Settings → Service ID
- [ ] Add secrets to GitHub repository
  - Location: GitHub → Repository → Settings → Secrets and variables → Actions
  - Add secret: `RENDER_API_KEY`
  - Add secret: `RENDER_CLIENT_SERVICE_ID`
  - Add secret: `RENDER_SERVER_SERVICE_ID`

## Verification

Once setup is complete, verify:

```bash
# Check OpenTofu configuration is valid
cd infra/opentofu
tofu init
tofu validate

# Verify GitHub Actions can access secrets
# Push a branch and create a PR - CI workflow should run
# Merge to main - Deploy workflow should trigger
```

## Next Steps

After completing this setup:
1. CI pipeline will automatically run on pull requests
2. Deployment will automatically trigger on merge to main
3. Services will be live on Render with automatic deployments

---

*Generated: 2026-02-07*
*From plan: 01-04*
