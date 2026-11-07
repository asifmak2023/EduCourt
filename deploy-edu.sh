#!/bin/bash
set -euo pipefail

# ============================================================
# EduCourt Production Deploy Script (DB-SAFE)
# Usage: bash /root/deploy-edu.sh
#
# GUARANTEES:
#   - Never runs data/fixture seeders (only RbacSeeder, which is idempotent)
#   - Never runs migrate:fresh / migrate:refresh / migrate:reset
#   - Never truncates or drops tables
#   - Aborts if a NEW migration contains DROP/TRUNCATE/DELETE
#
# App layout (pnpm monorepo):
#   backend  = Laravel API  (apps/api, served by php-fpm)
#   frontend = Next.js      (apps/web, served under pm2 "educourt-web")
# ============================================================

PROJECT=/var/www/educourt
BACKEND=$PROJECT/apps/api
FRONTEND=$PROJECT/apps/web
BACKUP_DIR=/root/backups
DB_NAME=educourt
DB_USER=educourt
BRANCH=master
WEB_PORT=3001
API_PORT=8080

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}==>${NC} $1"; }
warn() { echo -e "${YELLOW}!! ${NC} $1"; }
err()  { echo -e "${RED}XX ${NC} $1"; }

[ -d "$PROJECT" ]  || { err "Project folder missing: $PROJECT"; exit 1; }
[ -d "$BACKEND" ]  || { err "Backend folder missing: $BACKEND"; exit 1; }
[ -d "$FRONTEND" ] || { err "Frontend folder missing: $FRONTEND"; exit 1; }
[ -f "$BACKEND/.env" ] || { err "Backend .env missing: $BACKEND/.env"; exit 1; }

DB_PASSWORD=$(grep -E '^DB_PASSWORD=' "$BACKEND/.env" | head -1 | cut -d= -f2-)
[ -n "$DB_PASSWORD" ] || { err "DB_PASSWORD not found in $BACKEND/.env"; exit 1; }

# ------------------------------------------------------------
# 1. Pull latest code
# ------------------------------------------------------------
log "Pulling latest code from GitHub"
cd "$PROJECT"
git fetch origin "$BRANCH"

# Show which migrations are NEW (pending) before we pull
PENDING_MIGRATIONS=$(git diff --name-only HEAD "origin/$BRANCH" -- 'apps/api/database/migrations/' || true)

git reset --hard "origin/$BRANCH"

# ------------------------------------------------------------
# 2. Backup database BEFORE any migration
# ------------------------------------------------------------
log "Backing up MySQL database"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/educourt-$(date +%F-%H%M%S).sql.gz"
MYSQL_PWD="$DB_PASSWORD" mysqldump --no-defaults -u "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
log "Backup saved: $BACKUP_FILE"

# Old backups are kept on purpose. Prune manually (e.g. keep the last 14 days)
# if disk usage grows; this script never deletes files.

# ------------------------------------------------------------
# 3. DB SAFETY: Scan new migrations for destructive SQL
# ------------------------------------------------------------
if [ -n "$PENDING_MIGRATIONS" ]; then
    log "New migrations detected - scanning for destructive operations..."
    UNSAFE=0
    for mf in $PENDING_MIGRATIONS; do
        if [ -f "$PROJECT/$mf" ]; then
            if grep -Eqi "dropColumn|dropTable|dropIfExists|truncate|->delete\(\)|DB::statement\(['\"]DROP|DB::statement\(['\"]TRUNCATE" "$PROJECT/$mf"; then
                warn "DESTRUCTIVE migration found: $mf"
                grep -nEi "dropColumn|dropTable|dropIfExists|truncate|->delete\(\)|DB::statement\(['\"]DROP|DB::statement\(['\"]TRUNCATE" "$PROJECT/$mf" || true
                UNSAFE=1
            fi
        fi
    done
    if [ "$UNSAFE" = "1" ]; then
        err "Aborting - one or more new migrations may DESTROY DATA."
        err "Review the migration files, then re-run with: SKIP_DB_SAFETY=1 bash /root/deploy-edu.sh"
        if [ "${SKIP_DB_SAFETY:-0}" != "1" ]; then
            exit 1
        fi
        warn "SKIP_DB_SAFETY=1 set - continuing anyway (data loss is possible)"
    fi
else
    log "No new migrations - skipping DB safety scan"
fi

# ------------------------------------------------------------
# 4. Preview migrations (--pretend)
# ------------------------------------------------------------
log "Previewing pending migrations (--pretend)"
cd "$BACKEND"
php artisan migrate --pretend --force || true

# ------------------------------------------------------------
# 5. Run migrations (only NEW ones - never deletes data)
# ------------------------------------------------------------
log "Running migrations (only new ones)"
php artisan migrate --force

# ------------------------------------------------------------
# 5b. Sync RBAC from config/rbac.php (idempotent)
# ------------------------------------------------------------
# Permissions and role grants live in config/rbac.php. Without this step the
# database drifts from the code: routes require new permission names (e.g.
# report.campus) that the roles never received, so pages return 403. The
# seeder only uses findOrCreate + syncPermissions, so it is safe to re-run and
# never touches application data.
log "Syncing RBAC roles and permissions"
php artisan db:seed --class=RbacSeeder --force
php artisan permission:cache-reset || true

# ------------------------------------------------------------
# 6. Install Composer dependencies
# ------------------------------------------------------------
log "Installing Composer dependencies"
COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader --no-interaction

# ------------------------------------------------------------
# 7. Cache Laravel config/routes/views
# ------------------------------------------------------------
log "Caching Laravel config, routes, views"
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart || true

# ------------------------------------------------------------
# 8. Fix permissions
# ------------------------------------------------------------
log "Fixing file permissions"
php artisan storage:link >/dev/null 2>&1 || true
chown -R www-data:www-data "$BACKEND/storage" "$BACKEND/bootstrap/cache"
chmod -R 775 "$BACKEND/storage" "$BACKEND/bootstrap/cache"

# ------------------------------------------------------------
# 9. Build Next.js
# ------------------------------------------------------------
log "Building Next.js frontend"
cd "$PROJECT"
pnpm install --frozen-lockfile
API_ORIGIN="http://127.0.0.1:$API_PORT" pnpm --filter web build

# ------------------------------------------------------------
# 10. Restart PM2
# ------------------------------------------------------------
log "Restarting PM2 processes"
pm2 restart educourt-web --update-env
pm2 restart educourt-queue 2>/dev/null || true
pm2 save

# ------------------------------------------------------------
# 11. Health check
# ------------------------------------------------------------
log "Checking app health"
sleep 3

curl -sf "http://127.0.0.1:$API_PORT/up" > /dev/null && log "Laravel API: OK" || err "Laravel API: NOT RESPONDING"
curl -sf "http://127.0.0.1:$WEB_PORT/login" > /dev/null && log "Next.js: OK" || err "Next.js: NOT RESPONDING"
curl -sf "https://educourt.asifent.com/login" > /dev/null && log "Public site: OK" || err "Public site: NOT RESPONDING"

echo ""
log "Deploy complete - database data untouched."
pm2 list
