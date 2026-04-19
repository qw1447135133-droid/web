#!/bin/bash
# DigitalOcean VPS deployment script
# Run on the VPS: bash deploy.sh
set -euo pipefail

REPO_URL="${REPO_URL:-}"
APP_DIR="/opt/sports-news"
IMAGE_NAME="sports-news"

echo "=== Sports News VPS Deploy ==="

# 1. Install Docker if missing
if ! command -v docker &>/dev/null; then
  echo "[1/6] Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "[1/6] Docker already installed"
fi

# 2. Install Docker Compose plugin if missing
if ! docker compose version &>/dev/null; then
  echo "[2/6] Installing Docker Compose plugin..."
  apt-get install -y docker-compose-plugin
else
  echo "[2/6] Docker Compose already installed"
fi

# 3. Clone or pull repo
if [ -d "$APP_DIR/.git" ]; then
  echo "[3/6] Pulling latest code..."
  cd "$APP_DIR" && git pull
else
  echo "[3/6] Cloning repo..."
  if [ -z "$REPO_URL" ]; then
    echo "ERROR: Set REPO_URL env var to your git repo URL"
    exit 1
  fi
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

cd "$APP_DIR"

# 4. Check .env exists
if [ ! -f .env ]; then
  echo "[4/6] Creating .env from .env.example..."
  cp .env.example .env
  echo ""
  echo "⚠️  Edit $APP_DIR/.env with your actual values, then re-run this script."
  echo "   Required: DATABASE_URL, ANTHROPIC_API_KEY, FOOTBALL_DATA_API_KEY,"
  echo "             PIPELINE_API_SECRET, NEXT_PUBLIC_SITE_DOMAIN"
  exit 1
else
  echo "[4/6] .env found"
fi

# 5. Build Docker image
echo "[5/6] Building Docker image..."
docker build -t "$IMAGE_NAME:latest" .

# 6. Start services
echo "[6/6] Starting services..."
DOCKER_IMAGE="$IMAGE_NAME:latest" docker compose up -d --remove-orphans

echo ""
echo "✅ Deployed! App running at http://localhost:3000"
echo ""
echo "Next steps:"
echo "  1. Set up Nginx: see docker/nginx/default.conf.template"
echo "  2. Get SSL cert: certbot --nginx -d yourdomain.com"
echo "  3. Check logs: docker compose logs -f app"
