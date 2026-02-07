terraform {
  required_version = ">= 1.0"
  required_providers {
    render = {
      source  = "render-oss/render"
      version = "~> 1.0"
    }
  }
}

provider "render" {
  api_key = var.render_api_key
}

# Server service - Docker web service
resource "render_web_service" "server" {
  name               = "${var.project_name}-server"
  plan               = "free"
  region             = var.region
  runtime            = "docker"
  repo_url           = var.repo_url
  auto_deploy        = true
  dockerfile_path    = "packages/server/Dockerfile"
  docker_command     = ""

  env_vars = {
    PORT = {
      value = "3000"
    }
  }
}

# Client service - Static site
resource "render_web_service" "client" {
  name               = "${var.project_name}-client"
  plan               = "free"
  region             = var.region
  runtime            = "docker"
  repo_url           = var.repo_url
  auto_deploy        = true
  dockerfile_path    = "packages/client/Dockerfile"
  docker_command     = ""

  env_vars = {}
}
