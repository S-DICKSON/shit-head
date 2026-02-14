output "public_ip" {
  description = "Public IP address of the compute instance"
  value       = oci_core_instance.shithead_server.public_ip
}

output "instance_id" {
  description = "OCID of the compute instance"
  value       = oci_core_instance.shithead_server.id
}

output "domain" {
  description = "Domain name for reference"
  value       = var.domain
}
