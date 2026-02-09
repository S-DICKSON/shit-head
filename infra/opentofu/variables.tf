variable "cloudflare_api_token" {
  description = "Cloudflare API token for Pages deployment"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "project_name" {
  description = "Project name prefix for services"
  type        = string
  default     = "shit-head"
}

variable "vite_server_url" {
  description = "WebSocket URL for the game server"
  type        = string
  default     = "wss://shit-head-server.fly.dev"
}
