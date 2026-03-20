output "droplet_ip" {
  description = "Public IPv4 address of the Notflix droplet"
  value       = digitalocean_droplet.notflix.ipv4_address
}

output "droplet_id" {
  description = "DigitalOcean droplet ID"
  value       = digitalocean_droplet.notflix.id
}

output "ssh_fingerprint" {
  description = "SSH key fingerprint registered on DigitalOcean"
  value       = digitalocean_ssh_key.deploy.fingerprint
}
