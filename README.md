# 后院 · 个人站与像素小世界

一个无需数据库的静态个人站：作品入口、浏览器本地随手记、像素农圃，以及带挖掘、建造、合成、探索和存档的《坡下小世界》。游戏使用原创程序绘制的像素素材；它借鉴横版沙盒玩法，不包含《泰拉瑞亚》的素材。

## Debian / Ubuntu VPS 一键安装

在**你有管理权限**的 Debian / Ubuntu VPS 上执行：

```bash
curl -fsSL https://raw.githubusercontent.com/LYISTR2/houyuan-personal-site/main/install.sh -o install.sh
sudo bash install.sh
```

完成后访问 `http://你的VPS公网IP:8081/`。本站配置仅监听 `8081`，不修改已有的 `80/443` 站点或防火墙，也不会替你申请域名或证书。**全新安装 Nginx 时，发行版自带的默认欢迎页可能另外监听 80**；若不需要，请自行核查并停用默认站点。若安全组或防火墙未放行 TCP 8081，请自行按 VPS 服务商规则配置。

选择其他端口：

```bash
sudo env PORT=8092 bash install.sh
```

重新执行同一个脚本即可拉取 `main` 最新代码更新；它会备份旧的本站目录，仅替换本安装器标记过的目录和独立 Nginx 配置。如果站点目录或配置文件被其他程序占用，脚本会拒绝覆盖。也可先审核脚本内容，再执行；**不要对不信任的链接直接运行提权脚本**。

可选环境变量：`PORT`（1024–65535）、`BRANCH`、`REPO_URL`、`SITE_DIR`（默认 `/var/www/houyuan-personal-site`，仅允许 `/var/www/` 或 `/srv/` 下的目录）、`NGINX_CONF`（默认 `/etc/nginx/conf.d/houyuan-personal-site.conf`，仅允许该目录下的 `.conf` 文件）、`BACKUP_DIR`（默认 `/var/backups/houyuan-personal-site`）。更换路径前先确认不会与现有站点冲突；自定义路径由管理员负责核对。

**部署前提**：机器可以从 GitHub 和系统软件源下载文件；如本机缺少 `git`、`curl` 或 `nginx`，脚本会用 `apt-get` 安装。Nginx 必须包含常规的 `/etc/nginx/conf.d/*.conf`；脚本会运行 `nginx -t`，并通过本机 HTTP 读取检查部署页面。更新前已存在的目标站点目录会备份至 `BACKUP_DIR`；安装失败时尽力回滚站点目录及本站配置。安装成功后的备份可由管理员自行保留或清理。

如需域名、HTTPS 或将站点放到已有反向代理下，请自行增加**独立** Nginx 站点配置，不要直接覆盖正在运行的其他服务。此安装器不负责配置 TLS。

## 个性化

- 修改 `index.html` 中的网站名称、个人介绍、作品描述与链接（默认展示名 `lyistr`，可按需换成你自己的）。
- `hero-preview.webp`、`project-preview.webp`、`farm-preview.webp` 是首页静态预览；可以替换为你的作品截图。
- `game.html` 是当前游戏，`game-classic.html` 是上一版，`farm.html` 是农圃。
- 随手记、农圃和游戏进度保存在访问者**自己的浏览器 localStorage**，不会同步到服务器，也不会随重新部署而清除；浏览器清理数据或换设备后无法从服务器恢复。

本仓库只包括静态页面、预览图片和部署脚本；不包含私有服务器配置、备份或测试页面。
