# 透明代理（只拦 docker0）

目标：让“容器出网”（包括 docker build 的构建阶段 RUN）通过透明代理加速国际网络下载。

边界：`docker pull` 是 docker daemon 发起的，不经过 `docker0`，仍建议单独配置 docker daemon/CLI 代理。

## 方案

- 你在另一台机器提供显式代理：`192.168.195.1:7890`（Clash `mixed-port`）
- 在构建机本机使用 `redsocks` 把透明流量转成显式代理
- 使用 `iptables nat PREROUTING` 仅对 `docker0` 做 `REDIRECT`（只拦 `80/443`）

## 使用

1. 一键安装/配置 redsocks（构建机本机）

```bash
bash deploy/selfhost/proxy/setup-redsocks.sh
```

默认行为：

- 本地透明入口：`127.0.0.1:12345`
- 上游显式代理：`192.168.195.1:7890`（Clash `mixed-port`，按 socks5 使用）

如需自定义（示例）：

```bash
PROXY_SERVER_HOST=192.168.195.1 PROXY_SERVER_PORT=7890 REDSOCKS_LOCAL_PORT=12345 \
  bash deploy/selfhost/proxy/setup-redsocks.sh
```

2. 启用 docker0 透明代理（只拦 `docker0`，只拦 `80/443`）

```bash
REDIR_PORT=12345 PROXY_SERVER_IP=192.168.195.1 \
  bash deploy/selfhost/proxy/enable-docker0-transparent-proxy.sh
```

3. 检查

```bash
bash deploy/selfhost/proxy/check-redsocks.sh
```

4. 回滚（先撤销 iptables，再停 redsocks）

```bash
bash deploy/selfhost/proxy/disable-docker0-transparent-proxy.sh
bash deploy/selfhost/proxy/stop-redsocks.sh
```

可配置环境变量：

- `REDIR_PORT`：本机透明入口端口（默认 `12345`，通常是 redsocks 的 local_port）
- `PROXY_SERVER_IP`：代理服务器 IP（默认 `192.168.195.1`，用于显式排除避免回环）

## redsocks 示例（仅供参考）

`/etc/redsocks.conf`（把透明 TCP 转为 socks5，再转发到 Clash mixed-port）：

```conf
base { log_debug = off; log_info = on; daemon = on; redirector = iptables; }
redsocks {
  local_ip = 127.0.0.1;
  local_port = 12345;
  ip = 192.168.195.1;
  port = 7890;
  type = socks5;
}
```
