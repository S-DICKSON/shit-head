output "public_ip" {
  description = "Public IP address of the server"
  value       = hcloud_server.shithead.ipv4_address
}

output "server_id" {
  description = "Hetzner server ID"
  value       = hcloud_server.shithead.id
}

output "domain" {
  description = "Domain name for reference"
  value       = var.domain
}
