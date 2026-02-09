variable "fly_api_token" {
  description = "Fly.io API token for authentication"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token for Pages deployment"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "fly_org" {
  description = "Fly.io organization"
  type        = string
  default     = "personal"
}

variable "fly_region" {
  description = "Fly.io region for server deployment"
  type        = string
  default     = "sjc"
}

variable "project_name" {
  description = "Project name prefix for services"
  type        = string
  default     = "shit-head"
}

variable "github_repo" {
  description = "GitHub repository (owner/repo format)"
  type        = string
  default     = "YOUR_USERNAME/shit-head"
}

variable "allowed_origins" {
  description = "Comma-separated list of allowed WebSocket origins"
  type        = string
  default     = "https://shit-head.pages.dev"
}
