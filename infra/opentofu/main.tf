terraform {
  required_version = ">= 1.8"
  required_providers {
    fly = {
      source  = "fly-apps/fly"
      version = "~> 0.1"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "fly" {
  fly_api_token = var.fly_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# --- Fly.io Server (WebSocket + API) ---
resource "fly_app" "server" {
  name = "${var.project_name}-server"
  org  = var.fly_org
}

resource "fly_machine" "server" {
  app    = fly_app.server.name
  region = var.fly_region
  name   = "${var.project_name}-server-machine"

  image = "ghcr.io/${var.github_repo}-server:prod-latest"

  cpus     = 1
  cputype  = "shared"
  memorymb = 256

  env = {
    PORT            = "8080"
    NODE_ENV        = "production"
    ALLOWED_ORIGINS = var.allowed_origins
  }

  services = [{
    ports = [
      { port = 443, handlers = ["tls", "http"] },
      { port = 80, handlers = ["http"] }
    ]
    protocol      = "tcp"
    internal_port = 8080
  }]
}

# --- Cloudflare Pages Project (Static Client) ---
resource "cloudflare_pages_project" "client" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = "production"

  build_config {
    build_command   = "cd packages/client && bun install && bun run build"
    destination_dir = "packages/client/dist"
    root_dir        = ""
  }

  deployment_configs {
    production {
      environment_variables = {
        VITE_SERVER_URL = "wss://${fly_app.server.name}.fly.dev"
      }
    }
    preview {
      environment_variables = {
        VITE_SERVER_URL = "wss://${fly_app.server.name}.fly.dev"
      }
    }
  }
}
