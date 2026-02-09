output "server_url" {
  description = "URL of the deployed server"
  value       = "https://${fly_app.server.name}.fly.dev"
}

output "client_url" {
  description = "URL of the deployed client"
  value       = "https://${cloudflare_pages_project.client.name}.pages.dev"
}

output "fly_app_name" {
  description = "Fly.io app name for CLI operations"
  value       = fly_app.server.name
}

output "cf_pages_project" {
  description = "Cloudflare Pages project name"
  value       = cloudflare_pages_project.client.name
}
