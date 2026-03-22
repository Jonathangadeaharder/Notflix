terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
  required_version = ">= 1.3.0"

  # Remote state stored in DigitalOcean Spaces (S3-compatible).
  # With state persisted, Terraform sees the live droplet on every run and
  # makes zero changes — the droplet stays alive between deploys and Docker's
  # layer cache is fully preserved, cutting build time from ~20 min to ~2 min.
  #
  # One-time setup (do this once, then never again):
  #   1. Create a Spaces bucket named "notflix-tf-state" in fra1 via DO console
  #   2. Generate a Spaces access key: DO console → API → Spaces Keys
  #   3. Add two secrets to the GitHub repo:
  #        TF_BACKEND_ACCESS_KEY  →  Spaces key ID
  #        TF_BACKEND_SECRET_KEY  →  Spaces secret key
  backend "s3" {
    endpoints = {
      s3 = "https://fra1.digitaloceanspaces.com"
    }
    bucket = "notflix-tf-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1" # required by S3 protocol, value ignored by DO Spaces

    # Disable AWS-specific checks not supported by DO Spaces
    skip_credentials_validation = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    use_path_style              = true
  }
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_ssh_key" "deploy" {
  name       = "notflix-deploy"
  public_key = var.ssh_public_key
}

resource "digitalocean_droplet" "notflix" {
  name     = "notflix-prod"
  region   = "fra1"
  size     = "s-1vcpu-2gb"
  image    = "ubuntu-24-04-x64"
  ssh_keys = [digitalocean_ssh_key.deploy.fingerprint]

  user_data = <<-USERDATA
    #!/bin/bash
    # 4 GB swap so Docker builds don't OOM on 2 GB RAM
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab

    apt-get update -y
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    usermod -aG docker ubuntu
  USERDATA

  tags = ["notflix", "production"]
}

resource "digitalocean_firewall" "notflix" {
  name        = "notflix-prod-fw"
  droplet_ids = [digitalocean_droplet.notflix.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "3000"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "8000"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "all"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "all"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
