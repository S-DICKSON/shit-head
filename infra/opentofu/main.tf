terraform {
  required_version = ">= 1.8"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

# Get the availability domain
data "oci_identity_availability_domain" "ad" {
  compartment_id = var.tenancy_ocid
  ad_number      = 1
}

# Get the latest Ubuntu 24.04 ARM64 image for Always Free A1 shape
data "oci_core_images" "ubuntu_arm64" {
  compartment_id           = var.tenancy_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# Virtual Cloud Network
resource "oci_core_vcn" "shithead_vcn" {
  compartment_id = var.tenancy_ocid
  cidr_block     = "10.0.0.0/16"
  display_name   = "shithead-vcn"
  dns_label      = "shithead"
}

# Internet Gateway
resource "oci_core_internet_gateway" "shithead_igw" {
  compartment_id = var.tenancy_ocid
  vcn_id         = oci_core_vcn.shithead_vcn.id
  display_name   = "shithead-igw"
  enabled        = true
}

# Route Table
resource "oci_core_route_table" "shithead_route_table" {
  compartment_id = var.tenancy_ocid
  vcn_id         = oci_core_vcn.shithead_vcn.id
  display_name   = "shithead-route-table"

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.shithead_igw.id
  }
}

# Security List
resource "oci_core_security_list" "shithead_security_list" {
  compartment_id = var.tenancy_ocid
  vcn_id         = oci_core_vcn.shithead_vcn.id
  display_name   = "shithead-security-list"

  # Ingress rules
  ingress_security_rules {
    protocol    = "6" # TCP
    source      = "0.0.0.0/0"
    description = "SSH access"

    tcp_options {
      min = 22
      max = 22
    }
  }

  ingress_security_rules {
    protocol    = "6" # TCP
    source      = "0.0.0.0/0"
    description = "HTTP access"

    tcp_options {
      min = 80
      max = 80
    }
  }

  ingress_security_rules {
    protocol    = "6" # TCP
    source      = "0.0.0.0/0"
    description = "HTTPS access"

    tcp_options {
      min = 443
      max = 443
    }
  }

  # Egress rules
  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
    description = "Allow all outbound traffic"
  }
}

# Subnet
resource "oci_core_subnet" "shithead_subnet" {
  compartment_id      = var.tenancy_ocid
  vcn_id              = oci_core_vcn.shithead_vcn.id
  cidr_block          = "10.0.1.0/24"
  display_name        = "shithead-subnet"
  dns_label           = "shitheadsub"
  route_table_id      = oci_core_route_table.shithead_route_table.id
  security_list_ids   = [oci_core_security_list.shithead_security_list.id]
  prohibit_public_ip_on_vnic = false
}

# Compute Instance
resource "oci_core_instance" "shithead_server" {
  compartment_id      = var.tenancy_ocid
  availability_domain = data.oci_identity_availability_domain.ad.name
  display_name        = "shithead-game-server"
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = 4
    memory_in_gbs = 24
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ubuntu_arm64.images[0].id
    boot_volume_size_in_gbs = 100
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.shithead_subnet.id
    assign_public_ip = true
    display_name     = "shithead-vnic"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(file("${path.module}/cloud-init.yaml"))
  }
}
