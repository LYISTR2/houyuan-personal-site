#!/usr/bin/env bash
# 后院 · Debian / Ubuntu VPS 安装或更新程序。默认只使用 8081，不改动现有 80/443 站点。
set -Eeuo pipefail

REPO_URL="${REPO_URL:-https://github.com/LYISTR2/houyuan-personal-site.git}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-8081}"
SITE_DIR="${SITE_DIR:-/var/www/houyuan-personal-site}"
NGINX_CONF="${NGINX_CONF:-/etc/nginx/conf.d/houyuan-personal-site.conf}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/houyuan-personal-site}"
SITE_FILES=(index.html game.html farm.html hero-preview.webp project-preview.webp farm-preview.webp)

fail() { printf '错误：%s\n' "$*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || fail '请使用 sudo bash install.sh，或将下载的脚本通过 sudo bash 执行。'
[[ $PORT =~ ^[0-9]+$ ]] && (( PORT >= 1024 && PORT <= 65535 )) || fail 'PORT 只接受 1024–65535 之间的端口；本脚本不占用 80/443。'
[[ -f /etc/os-release ]] || fail '只支持 Debian / Ubuntu 的 systemd 或常见 Nginx 环境。'
. /etc/os-release
case "${ID:-}" in debian|ubuntu) ;; *) fail "不支持 ${ID:-unknown}；请使用 Debian 或 Ubuntu。" ;; esac
for path in "$SITE_DIR" "$NGINX_CONF" "$BACKUP_DIR"; do
  [[ $path =~ ^/[A-Za-z0-9_./-]+$ && $path != *..* ]] || fail "无效的部署路径：$path"
done
[[ $SITE_DIR != / && $SITE_DIR != /var/www && $BACKUP_DIR != / && $NGINX_CONF == *.conf ]] || fail '拒绝危险的部署路径。'
case "$SITE_DIR" in /var/www/*|/srv/*) ;; *) fail '站点目录必须位于 /var/www 或 /srv 下。' ;; esac
case "$NGINX_CONF" in /etc/nginx/conf.d/*.conf) ;; *) fail '本站配置文件必须位于 /etc/nginx/conf.d/ 下。' ;; esac
case "$BACKUP_DIR" in /var/backups/*) ;; *) fail '备份目录必须位于 /var/backups/ 下。' ;; esac
[[ ! -L $SITE_DIR && ! -L $NGINX_CONF ]] || fail '站点目录或配置文件不能是符号链接。'
if command -v ss >/dev/null 2>&1 && [[ ! -f $NGINX_CONF ]] && [[ -n $(ss -H -ltn "( sport = :$PORT )") ]]; then
  fail "端口 $PORT 已在使用，请指定其他端口：PORT=8092 sudo -E bash install.sh（或先核对端口服务）。"
fi
if [[ -f $NGINX_CONF ]] && ! grep -q '^# Managed by houyuan-personal-site installer$' "$NGINX_CONF"; then
  fail "$NGINX_CONF 已存在但不是本站安装脚本创建的，拒绝覆盖。"
fi

if ! command -v git >/dev/null 2>&1 || ! command -v nginx >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
  command -v apt-get >/dev/null 2>&1 || fail '未找到 apt-get，无法安装依赖。'
  printf '安装缺失依赖：git、curl、nginx（不会调整防火墙）。\n'
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y git curl nginx
fi

work=$(mktemp -d)
stage=''
backup=''
old_conf_exists=0
committed=0
if [[ -f $NGINX_CONF ]]; then cp -p "$NGINX_CONF" "$work/previous.conf"; old_conf_exists=1; fi
rollback() {
  local code=$?
  trap - EXIT
  if (( code != 0 && committed )); then
    printf '部署未通过检查，正在还原本站文件与配置…\n' >&2
    rm -f -- "$NGINX_CONF"
    if (( old_conf_exists )); then cp -p "$work/previous.conf" "$NGINX_CONF"; fi
    rm -rf -- "$SITE_DIR"
    if [[ -n $backup && -d $backup ]]; then mv -- "$backup" "$SITE_DIR"; fi
    nginx -t >/dev/null 2>&1 && { systemctl reload nginx >/dev/null 2>&1 || nginx -s reload >/dev/null 2>&1 || true; } || true
  fi
  if [[ -n $stage && -d $stage ]]; then rm -rf -- "$stage"; fi
  rm -rf -- "$work"
  exit "$code"
}
trap rollback EXIT
trap 'exit 130' INT TERM

printf '下载 %s (%s)…\n' "$REPO_URL" "$BRANCH"
git clone --quiet --depth 1 --branch "$BRANCH" -- "$REPO_URL" "$work/repo"
for file in "${SITE_FILES[@]}"; do [[ -f $work/repo/$file ]] || fail "仓库缺少 $file"; done
mkdir -p -- "$(dirname "$SITE_DIR")" "$(dirname "$NGINX_CONF")" "$BACKUP_DIR"
stage=$(mktemp -d "${SITE_DIR}.stage.XXXXXX")
for file in "${SITE_FILES[@]}"; do install -m 0644 "$work/repo/$file" "$stage/$file"; done
printf '%s\n' 'houyuan-personal-site' > "$stage/.houyuan-installer"
chmod 0644 "$stage/.houyuan-installer"
chmod 0755 "$stage"
cat > "$work/houyuan.conf" <<EOF
# Managed by houyuan-personal-site installer
server {
    listen $PORT;
    server_name _;
    root $SITE_DIR;
    index index.html;
    location / { try_files \$uri \$uri/ =404; }
    add_header X-Content-Type-Options nosniff always;
}
EOF
# 已有站点先备份；只替换属于本项目的目标目录和独立配置文件。
if [[ -e $SITE_DIR ]]; then
  [[ -d $SITE_DIR && ! -L $SITE_DIR ]] || fail "$SITE_DIR 已存在但不是普通目录。"
  [[ -f $SITE_DIR/.houyuan-installer && ! -L $SITE_DIR/.houyuan-installer && $(< "$SITE_DIR/.houyuan-installer") == houyuan-personal-site ]] || fail "$SITE_DIR 已存在但不是本安装器创建的站点，拒绝覆盖；请选择其他 SITE_DIR。"
  backup="$BACKUP_DIR/$(date -u +%Y%m%dT%H%M%SZ)-$$"
  mv -- "$SITE_DIR" "$backup"
fi
committed=1
mv -- "$stage" "$SITE_DIR"
stage=''
install -m 0644 "$work/houyuan.conf" "$NGINX_CONF"
nginx -t
if [[ -r /run/nginx.pid ]] && kill -0 "$(< /run/nginx.pid)" 2>/dev/null; then
  nginx -s reload
elif command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet nginx; then
  systemctl reload nginx
elif command -v systemctl >/dev/null 2>&1 && systemctl start nginx; then
  :
else
  nginx
fi
curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:$PORT/" -o "$work/served.html"
cmp -s "$SITE_DIR/index.html" "$work/served.html" || fail 'HTTP 页面内容与刚部署的版本不符（可能有其他 Nginx 站点占用该端口）。'
committed=0
printf '\n后院已安装/更新： http://<你的VPS公网IP>:%s/\n' "$PORT"
printf '代码版本：%s\n' "$(git -C "$work/repo" rev-parse --short HEAD)"
if [[ -n $backup ]]; then printf '上一个版本备份：%s\n' "$backup"; fi
printf '如需公网访问，请在 VPS 服务商安全组/防火墙手动放行 TCP %s。本站未修改防火墙或已有站点；新装 Nginx 的发行版默认页可能另行监听 80。\n' "$PORT"
