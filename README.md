# 后院 · 个人站与《后院物语》

一个无需数据库的静态个人站，以及可以种植、养殖、认识邻居和探索矿洞的原创像素河谷。

《后院物语》把向阳农庄、河湾牧场、石溪小镇、风车游乐园、青杉伐木林、柳荫钓鱼湾与北山矿洞放在同一个世界里。角色可以沿着地图行走，照料田地、拜访居民，再把探险得到的建材带回小镇。美术采用温暖的乡村像素、草木配色、木框与纸质面板；全部地图和人物由代码绘制，不包含《星露谷物语》或《泰拉瑞亚》的素材。

## 本地开发

无需 npm 安装或构建，使用 Python 3 提供静态 HTTP 服务：

```bash
cd /workspace/houyuan-personal-site
python3 -m http.server 8081 --bind 127.0.0.1
```

`index.html` 是个人主页，`world.html` 是统一游戏入口。旧的 `farm.html` 地址会转到大世界。`game.html` 保留冒险引擎，进入北山时在世界界面内加载；也支持独立游玩。

## 河谷生活

- **向阳农庄**：七种种子、浇水、施肥、品质收成、仓库、邻里订单、蜂箱与喷灌。收成先入仓，再出售或交付。
- **河湾牧场**：领养鸡、鸭、奶牛和绵羊，补料、添水、清理、改名、摸摸与刷毛。产物可以加工或交给居民。
- **石溪小镇**：集市、居民好感、每日委托、钓鱼、磨坊与厨房、修桥与设施建设。
- **风车游乐园**：套圈、萝卜打靶、河谷翻翻乐。每日前三场成功游戏奖励游园票，兑奖亭兑换种子包、鱼饵、饲料与堆肥。
- **青杉伐木林**：靠近树木挥斧三次，得到四份木材；杉树额外产出树脂。树桩在十二个游戏小时后生出树苗，二十四小时后可再次采集。
- **柳荫钓鱼湾**：三个河岸钓点，抛竿、及时提竿、按住与松开控线。鱼获存入小镇库存，鱼饵让控线更宽容，与原钓鱼功能共享每日次数。
- **北山矿洞**：横版挖掘、建造、合成、地底晶洞、宝箱、营火、护甲与战斗。进入时携带河谷的建材，离开时把剩余材料与新收获放回背包。
- **同一个日常**：共享经营库存与游戏日历；探索期间农庄时间暂停，在返回时补算探索经过的游戏小时。没有离线惩罚。

首页首次访问有一段植物夜游开场，参考用户提供的 `backyard-garden.html`：深绿夜色、光环、萤火、渐显文字与沿小径缓进的镜头。开场可以跳过、回看或切换章节；同一会话后续访问与首页锚点直接进入主页。Three.js 以 MIT 许可保存在本地，只在播放开场时加载；不请求 CDN、远程字体或 GSAP。关闭开场停止渲染并释放资源；WebGL 或脚本不可用时保留 CSS 夜景及正常进入路径。

地图会随季节改变外观，日夜带来灯光，雨天为田地补水。环境动效遵循系统的“减少动态效果”设置；这个设置不会影响行走与玩法。

### 操作

| 河谷 | 操作 |
| --- | --- |
| 行走 | WASD / 方向键；Shift 快走；触屏或鼠标点地面自动寻路 |
| 地点、田地、动物 | 点目标，角色靠近后互动；附近也可按 E 或点“互动” |
| 地图与旅行 | M，或地图按钮；选择地点后沿地图行走 |
| 全景镜头 | “全景”显示整张地图；“跟随”回到角色镜头；加减按钮或滚轮缩放 |
| 伐木 | 点树 / 靠近按 E，三次完成采集 |
| 钓鱼 | 咬钩后按 E / 点提竿；按住右移绿色区域，松开左移 |
| 游乐园 | 套圈按 Space / E；打靶点萝卜或 1–6；翻牌点卡片或 1–8 |
| 物品与委托 | B 打开当前区域背包；菜单打开统一委托板 |
| 播种与工具 | 1–7 选种；底部选择照料、施肥、铲除 |
| 休息 | 空格或“歇一会儿”推进八小时；窗口打开时暂停时间 |
| 关闭窗口 | Esc |

矿洞沿用 A/D 移动、空格跳跃、左键挖掘／攻击、右键放置、E 合成、J 手记、F 与宝箱／营火互动、H 药水、R 回城石、Shift 冲刺。手机提供触屏按钮。顶部“返回河谷”保存进度并结算物资。

## 文件结构

```text
index.html / world.html / game.html    页面结构与入口
farm.html                             旧地址兼容
assets/js/farm.js                      种植、经营存档与仓库
assets/js/town.js / ranch.js           居民、交易、加工与动物
assets/js/world.js                     世界行走、寻路、镜头、交互与矿洞衔接
assets/js/world-art.js                 原创景物、人物与缓存地形
assets/js/world-data.js                七区地点、树木、钓点与障碍定义
assets/js/activities.js                伐木、钓鱼、游园与兑奖交互
assets/js/activity-rules.js            再生、计分、控线与每日奖励规则
assets/js/adventure.js                 冒险引擎
assets/js/storage.js                   可恢复的跨存档物资转移
assets/js/site.js                      首页主题与随手记
assets/js/opening.js                   夜游开场、章节、焦点与降级
assets/js/opening-scene.js             程序生成的植物、镜头、光环与萤火
assets/vendor/three.min.js             本地 Three.js r128（MIT）
assets/css/                           各页面与场景样式
farm-font.css / farm-ui*.woff2         本地中文字体与子集
```

七区布局与玩法安排见 [设计方案](docs/valley-design.md)。场景绘制和地图布局可以独立扩展，见 [架构说明](docs/architecture.md)。

## 存档与兼容

存档保存在访问者自己的浏览器 localStorage，不会上传或跨设备同步。沿用 `pixelfarm-v1`（作物、品质、零钱、订单、小镇、牧场与户外玩法）与 `yard-world-v1`（地形、装备、探险进度）；旧鸡牛会迁入牧场，新增字段补默认值。

`backyard-world-v1` 只记录世界位置与到访地点。物资通过 `backyard-transfer-v1` 暂存完整转移结果：中断后恢复同一结果，重复返回不重复发放。作物、动物产物和冒险装备各自保留；木材、石料、煤、铜、铁、金、晶石与遗迹碎片在矿洞往返时转移。清理浏览器数据会删除本地存档。

## 验证

Node.js 自带测试运行器检查物资转移与小游戏规则，包括中断恢复、容量边界、树木再生、每日奖励限制和不同帧率的控线：

```bash
node --test tests/*.test.cjs
```

启动静态服务后，用现有 Python Playwright 与 Chromium 跑浏览器检查：

```bash
python3 tests/smoke.py
python3 tests/outdoors-smoke.py
python3 tests/opening-smoke.py
# 或 python3 tests/smoke.py http://127.0.0.1:8092/
```

浏览器检查使用独立浏览器上下文，覆盖旧存档迁移、真实田地收获与播种、订单、步行、矿洞合成与物资往返、手机地图、减少动态效果、首页随手记与主题。开场检查覆盖本地 WebGL 场景、跳过与回看、章节切换、手机布局、键盘焦点、首次访问记忆、减少动态效果、图形资源失败和自动退出。户外检查另外覆盖实际挥斧与再生、套圈计分、兑换、翻牌配对、打靶、手机钓鱼控线、鱼获入库、取消抛竿与刷新恢复。

如本机尚未安装浏览器测试工具，可使用 `python3 -m pip install playwright` 与 `python3 -m playwright install chromium`；将测试文件中的 `executable_path` 改为本机 Chromium 路径，或使用 Playwright 自带浏览器。

## Debian / Ubuntu VPS 部署

在有管理权限的 VPS 上：

```bash
curl -fsSL https://raw.githubusercontent.com/LYISTR2/houyuan-personal-site/main/install.sh -o install.sh
sudo bash install.sh
```

完成后访问 VPS 公网 IP 的 8081 端口；更换端口可运行 `sudo env PORT=8092 bash install.sh`。

安装器复制页面、整个 `assets/` 目录和本地字体，配置独立 Nginx 站点；检查 `nginx -t` 与 HTTP 页面内容。更新会备份本安装器管理的旧站点，失败时尽力回滚。仅替换带有安装器标记的目录和本站配置，不修改既有 80/443 站点或防火墙。首次安装 Nginx 时，发行版默认欢迎页可能监听 80，请按需检查。

可选变量：`PORT`、`BRANCH`、`REPO_URL`、`SITE_DIR`（默认 `/var/www/houyuan-personal-site`）、`NGINX_CONF`（默认 `/etc/nginx/conf.d/houyuan-personal-site.conf`）、`BACKUP_DIR`（默认 `/var/backups/houyuan-personal-site`）。部署需要从 GitHub 和系统软件源下载；开放安全组端口、域名与 TLS 由管理员配置。

这次本地重构须先提交到仓库，远端安装器才会部署新版文件。
