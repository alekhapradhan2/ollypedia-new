# Ollypedia - AWS Production Deployment & Update Guide

This document contains full instructions on how the production AWS server is configured and how to deploy new updates whenever you push code changes to GitHub.

---

## 1. Current Server Setup & Branch Configuration

When we ran:
```bash
git clone https://github.com/alekhapradhan2/ollypedia-new.git
```
Git automatically configured the repository to track your default **`main`** branch.

### How to verify on the server:
Open your AWS terminal and run:
```bash
cd /var/www/ollypedia-new/ollypedia
git status
git branch
```
You will see `* main` and `Your branch is up to date with 'origin/main'`.

---

## 2. Standard Update Workflow (Manual Steps)

Whenever you make changes on your local computer and push them to GitHub:

### Step 1: On your Local Computer
```bash
git add .
git commit -m "Update feature or fix bug"
git push origin main
```

### Step 2: On your AWS Lightsail Terminal
Connect to your Lightsail terminal (or via SSH) and run:

```bash
# 1. Navigate to the project directory
cd /var/www/ollypedia-new/ollypedia

# 2. Pull the latest changes from GitHub
git pull origin main

# 3. (Optional) Install any new npm packages if you added any
npm install

# 4. Rebuild the Next.js application with optimized memory
NODE_OPTIONS="--max-old-space-size=2048" npm run build

# 5. Restart PM2 with zero downtime
pm2 restart ollypedia
```

---

## 3. Automated 1-Command Deployment Script (Recommended)

To make deployments effortless, you can set up a deployment script on your server.

### One-Time Setup on Server:
In your AWS terminal, run:

```bash
cat << 'EOF' > /var/www/ollypedia-new/ollypedia/deploy.sh
#!/bin/bash
set -e

echo "🚀 Starting Deployment for Ollypedia..."
cd /var/www/ollypedia-new/ollypedia

echo "📥 Pulling latest changes from GitHub (main branch)..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building Next.js production bundle..."
NODE_OPTIONS="--max-old-space-size=2048" npm run build

echo "🔄 Restarting PM2 process..."
pm2 restart ollypedia

echo "✅ Deployment completed successfully!"
EOF

chmod +x /var/www/ollypedia-new/ollypedia/deploy.sh
```

### Future Deployments:
From now on, whenever you push changes to GitHub, just run this single command in your AWS terminal:

```bash
/var/www/ollypedia-new/ollypedia/deploy.sh
```

---

## 4. Useful Maintenance Commands

| Action | Command |
| :--- | :--- |
| **Check Live App Status** | `pm2 status` |
| **View Realtime Logs** | `pm2 logs ollypedia` |
| **View Last 100 Log Lines** | `pm2 logs ollypedia --lines 100` |
| **Restart App** | `pm2 restart ollypedia` |
| **Restart Nginx** | `sudo systemctl restart nginx` |
| **Check Memory & Swap** | `free -m` |
| **Check Disk Space** | `df -h` |

---

## 5. Architecture Summary

- **Live URL**: [https://www.ollypedia.in](https://www.ollypedia.in) / [https://ollypedia.in](https://ollypedia.in)
- **Server IP**: `13.234.217.93`
- **Location**: AWS Lightsail (Mumbai Region `ap-south-1`)
- **Web Server**: Nginx (Reverse Proxy to `localhost:3000`)
- **Process Manager**: PM2 (`ollypedia` service with systemd auto-boot)
- **Node.js**: v20 LTS
- **DNS & CDN / SSL**: Cloudflare (Proxied + Flexible SSL)
- **Database**: MongoDB Atlas Cluster (Cloud-hosted)
- **App Path on Server**: `/var/www/ollypedia-new/ollypedia`
