variable "render_api_key" {
  description = "Render API key for authentication"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Project name prefix for Render services"
  type        = string
  default     = "shithead-online"
}

variable "repo_url" {
  description = "GitHub repository URL"
  type        = string
  default     = "https://github.com/YOUR_USERNAME/shit-head"
}

variable "region" {
  description = "Render region for deployment"
  type        = string
  default     = "oregon"
}
