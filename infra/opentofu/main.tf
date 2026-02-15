terraform {
  required_version = ">= 1.8"
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Look up existing Cloudflare zone
data "cloudflare_zone" "main" {
  name = var.domain
}

# Root domain → server IP
resource "cloudflare_record" "root" {
  zone_id = data.cloudflare_zone.main.id
  name    = "@"
  content = hcloud_server.shithead.ipv4_address
  type    = "A"
  proxied = false
}

# www → server IP
resource "cloudflare_record" "www" {
  zone_id = data.cloudflare_zone.main.id
  name    = "www"
  content = hcloud_server.shithead.ipv4_address
  type    = "A"
  proxied = false
}

# SSH key for server access
resource "hcloud_ssh_key" "deploy" {
  name       = "shithead-deploy"
  public_key = var.ssh_public_key
}

# Firewall: SSH, HTTP, HTTPS
resource "hcloud_firewall" "web" {
  name = "shithead-firewall"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

# ARM server (Ampere — same arch as our Docker image)
resource "hcloud_server" "shithead" {
  name        = "shithead-game-server"
  image       = "ubuntu-24.04"
  server_type = "cax11"
  location    = "nbg1"
  ssh_keys    = [hcloud_ssh_key.deploy.id]
  user_data   = file("${path.module}/cloud-init.yaml")

  firewall_ids = [hcloud_firewall.web.id]
}
