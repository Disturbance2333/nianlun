# 云端部署（让站点不依赖你的电脑）

本地跑要你开着机器；这份说明是把它搬到免费云容器上，**得到一个稳定的公网地址，功能一样完整**（实时检索、AI 挑句、输入推荐都在）。

---

## 为什么能做到

| 依赖 | 本地情况 | 云端怎么办 |
|---|---|---|
| 服务端 | Python 标准库，**无第三方包** | `python:3.12-slim` 直接跑 |
| 知乎 CLI | 本机 `zhihu-cli.exe`（Windows） | 官方 CDN 有 **Linux 版**，`Dockerfile` 里下载并校验 sha256 |
| 知乎鉴权 | Windows 凭证库 | CLI 支持 **`ZHIHU_ACCESS_SECRET` 环境变量**，优先于凭证库 |
| 大模型 | `.ai_key` 文件 | **`AI_API_KEY` 环境变量** |
| 检索存档 | `cache/` | 一起打进镜像，**断网也能演示** |

`Dockerfile` 已经写好并推到仓库，任何支持 Docker 的平台都能一键构建。

---

## 需要设置的三个环境变量

在平台的后台（Settings → Environment / Secrets）填，**不要写进仓库**：

| 变量 | 值 | 说明 |
|---|---|---|
| `ZHIHU_ACCESS_SECRET` | 知乎开放平台的 Access Secret | 没有它实时检索会失败（但缓存仍可用） |
| `AI_API_KEY` | 大模型 API key | 没有它 AI 功能降级，页面照常能用 |
| `AI_MODEL` | `deepseek-v4-flash` | 可选，有默认值 |
| `AI_BASE_URL` | `https://api.openai-next.com/v1` | 可选，有默认值 |

> 平台一般会自己注入 `PORT`，`server.py` 会读它；读不到才用 7860。

---

## 部署步骤（以 Render 为例）

1. 注册 <https://render.com>（免费，GitHub 账号直接登录）
2. **New → Web Service** → 选 **Build and deploy from a Git repository**
3. 连上 `Disturbance2333/nianlun` 这个仓库
4. 环境选 **Docker**（会自动用仓库根目录的 `Dockerfile`）
5. Instance Type 选 **Free**
6. 在 **Environment** 里加 `ZHIHU_ACCESS_SECRET` 和 `AI_API_KEY`
7. Create → 等构建完，拿到 `https://<名字>.onrender.com`

## 或者用 Hugging Face Spaces（免费额度更宽松）

1. 注册 <https://huggingface.co>
2. **New Space** → SDK 选 **Docker** → 选 **Blank**
3. 把本仓库文件推到这个 Space 的 git 地址
4. Space 的 **Settings → Variables and secrets** 里加同样两个变量
5. 地址是 `https://<用户名>-<空间名>.hf.space`

---

## 两个已知差异

- **Render 免费实例闲置 15 分钟会休眠**，下一个访客要等约 50 秒冷启动。
  Hugging Face Spaces 是闲置 48 小时才休眠，对评审更友好。
- **云上的文件系统是临时的**：服务跑起来后新检索的结果在容器重启后会丢，
  但镜像里带的 `cache/`（15 个话题的真实存档）一直都在。

---

## 自检

部署完访问：

```
https://<你的地址>/api/health
```

期望看到：

```json
{"ok": true, "ai": true, "model": "deepseek-v4-flash",
 "zhihu_cli": true, "cached": 15}
```

- `ai: false` → `AI_API_KEY` 没设对
- `zhihu_cli: false` → 镜像里没装上 CLI（看构建日志）
- `cached: 0` → `cache/` 没打进镜像
