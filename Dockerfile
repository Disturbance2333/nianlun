# 观念年轮 · 云端部署镜像
# ─────────────────────────────────────────────────────────────
# 目的：让这个站点**不依赖任何本机环境**跑在云上 ——
#   服务端是纯标准库 Python，唯一的本机依赖是知乎 CLI，
#   而它也有 Linux 版，所以整件事可以塞进一个容器。
#
# 需要的三个环境变量在平台后台设置，**不要写进镜像**：
#   ZHIHU_ACCESS_SECRET   知乎开放平台的 Access Secret
#   AI_API_KEY            大模型 API key
#   AI_MODEL / AI_BASE_URL  可选，有默认值
FROM python:3.12-slim

# 知乎 CLI 从官方 CDN 拉，不在仓库里转发它（避免再分发），并校验 sha256。
# 版本和校验值是钉死的：CDN 上的文件变了会构建失败，而不是悄悄跑起来。
ARG ZHIHU_CLI_URL=https://developer-cdn.zhihu.com/zhihu-cli/releases/beta/cli/0.6.0-beta.20260908125143/zhihu-cli-0.6.0-beta.20260908125143-linux-amd64.tar.gz
ARG ZHIHU_CLI_SHA=d21691ac3bebeac4fb29f6982da6b4e4dddf659b731cd8f65dea1c0242a7d0ba
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl ca-certificates; \
    rm -rf /var/lib/apt/lists/*; \
    curl -fsSL "$ZHIHU_CLI_URL" -o /tmp/cli.tgz; \
    echo "$ZHIHU_CLI_SHA  /tmp/cli.tgz" | sha256sum -c -; \
    tar -xzf /tmp/cli.tgz -C /usr/local/bin; \
    chmod +x /usr/local/bin/zhihu-cli; \
    rm -f /tmp/cli.tgz; \
    /usr/local/bin/zhihu-cli version

WORKDIR /app
# cache/ 一起进镜像：里面是真实检索存档，断网也能演示
COPY nianlun-web/ /app/nianlun-web/

ENV ZHIHU_CLI=/usr/local/bin/zhihu-cli \
    HOST=0.0.0.0 \
    PORT=7860 \
    PYTHONUNBUFFERED=1

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD python -c "import urllib.request,os;urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','7860')+'/api/health',timeout=4)"

CMD ["python", "/app/nianlun-web/server.py"]
