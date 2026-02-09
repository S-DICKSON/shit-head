output "client_url" {
  description = "URL of the deployed client"
  value       = "https://${cloudflare_pages_project.client.name}.pages.dev"
}

output "cf_pages_project" {
  description = "Cloudflare Pages project name"
  value       = cloudflare_pages_project.client.name
}
