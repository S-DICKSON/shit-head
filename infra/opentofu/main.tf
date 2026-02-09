terraform {
  required_version = ">= 1.8"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# --- Cloudflare Pages Project (Static Client) ---
resource "cloudflare_pages_project" "client" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = "main"

  build_config {
    build_command   = "cd packages/client && bun install && bun run build"
    destination_dir = "packages/client/dist"
    root_dir        = ""
  }

  deployment_configs {
    production {
      environment_variables = {
        VITE_SERVER_URL = var.vite_server_url
      }
    }
    preview {
      environment_variables = {
        VITE_SERVER_URL = var.vite_server_url
      }
    }
  }
}
