# Notflix Infrastructure

This directory contains the Infrastructure as Code (IaC) for deploying Notflix to production.

## Architecture

- **DigitalOcean Droplet** (`s-1vcpu-2gb`, Frankfurt FRA1, ~$12/mo)
- **Docker Compose** for orchestrating all services
- **Terraform** for provisioning the droplet and firewall
- **Ansible** for server configuration and rolling deployments
- **GitHub Actions** for CI/CD

## Services

| Service | Port | Description |
|---------|------|-------------|
| platform | 3000 | SvelteKit frontend |
| kong | 8000 | API gateway |
| auth | internal | Supabase GoTrue auth |
| ai-service | internal | FastAPI AI service |
| db | internal | PostgreSQL |

## Prerequisites

1. [Terraform](https://www.terraform.io/downloads) >= 1.3
2. [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/index.html) >= 2.14
3. A [DigitalOcean API token](https://cloud.digitalocean.com/account/api/tokens)
4. A deploy SSH key pair (see below)

## Setup

### 1. Generate a Deploy SSH Key

```bash
ssh-keygen -t ed25519 -C "notflix-deploy" -f ~/.ssh/notflix_deploy -N ""
# Public key:
cat ~/.ssh/notflix_deploy.pub
# Private key:
cat ~/.ssh/notflix_deploy
```

### 2. GitHub Secrets

Add these secrets in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `DO_TOKEN` | DigitalOcean API token |
| `DO_SSH_PUBLIC_KEY` | Contents of `~/.ssh/notflix_deploy.pub` |
| `DO_SSH_PRIVATE_KEY` | Contents of `~/.ssh/notflix_deploy` |
| `PROD_ENV_FILE` | Full contents of your production `.env` file |

### 3. Create Production .env

```bash
cp .env.production.example .env.production
# Edit .env.production with real values
```

### 4. Configure Terraform (local use only)

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your DO token and SSH public key
```

## CI/CD Pipelines

### Quality Gates (`quality-gates.yml`)

Runs on every push and PR:
- Lint (ESLint, Ruff)
- Type check
- Unit tests
- Integration tests

### Deploy (`deploy.yml`)

Runs on push to `master`:
1. **Build & Push** — Docker images pushed to GHCR with short SHA tag
2. **Terraform** — Provisions/updates the DigitalOcean droplet (idempotent)
3. **Ansible** — Pulls new images and does a rolling `docker compose up`

## Branch Protection

The `master` branch is protected:
- Direct pushes are blocked
- PRs require 1 approving review
- Status checks (Quality Gates) must pass before merge

## Manual Deploy

```bash
# Provision infra
cd infra/terraform
terraform init
terraform apply

# Deploy
cd infra/ansible
ansible-playbook -i "$(terraform -chdir=../terraform output -raw droplet_ip)," site.yml
```
