output "client_url" {
  description = "URL of the deployed client application"
  value       = render_web_service.client.url
}

output "server_url" {
  description = "URL of the deployed server application"
  value       = render_web_service.server.url
}

output "client_service_id" {
  description = "Render service ID for the client (used in GitHub Actions)"
  value       = render_web_service.client.id
}

output "server_service_id" {
  description = "Render service ID for the server (used in GitHub Actions)"
  value       = render_web_service.server.id
}
