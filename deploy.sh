#!/bin/bash

# Deployment Script for Ubuntu VPS
# Run this script with sudo on your VPS: sudo ./deploy.sh

echo "Starting deployment setup..."

# 1. Update packages
apt-get update -y
apt-get upgrade -y

# 2. Install Docker if not installed
if ! command -v docker &> /dev/null
then
    echo "Docker not found. Installing Docker..."
    apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" -y
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
else
    echo "Docker is already installed."
fi

# 3. Check for .env.production file
if [ ! -f .env.production ]; then
    echo "Warning: .env.production not found! Copying .env.example to .env.production."
    echo "MAKE SURE TO EDIT .env.production with your real production secrets!"
    cp .env.example .env.production
    
    # Replace the DATABASE_URL host from 127.0.0.1 to mysql for docker-compose
    sed -i 's/127.0.0.1/mysql/g' .env.production
fi

# 4. Create uploads folder
mkdir -p uploads
chmod 777 uploads

# 5. Build and start via Docker Compose
echo "Building and starting containers using docker-compose.prod.yml..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Deployment complete! Application should be accessible on port 80."
echo "Check logs with: docker compose -f docker-compose.prod.yml logs -f"
