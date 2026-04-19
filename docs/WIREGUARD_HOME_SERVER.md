# WireGuard Home Server Deployment

Use this deployment when Solar Portal should run on your home server and stay reachable only through WireGuard.

This path is intended for a small trusted group, not for a public customer portal.

## What This Stack Does

- exposes only the WireGuard UDP port to the internet
- keeps Solar Portal reachable over the VPN at a private address such as `http://10.13.13.1`
- avoids buying a domain at this stage
- keeps frontend and backend behind the same internal reverse proxy

Files used by this setup:

- [docker-compose.wireguard.yml](../docker-compose.wireguard.yml)
- [nginx.wireguard.conf](../nginx.wireguard.conf)
- [.env.example](../.env.example)

## Prerequisites

- Linux home server running 24/7
- Docker Engine with Compose plugin
- router access to forward UDP port `51820` to that server
- public IP address or dynamic DNS hostname

This compose file uses `network_mode: host` for the WireGuard container, so it is meant for Linux hosts.

## Network Model

```text
Phone / Laptop
    |
    | WireGuard VPN
    v
Home router public IP:51820/udp
    |
    v
Home server
    |- WireGuard server
    |- Solar Portal reverse proxy on port 80
    |- Backend + Frontend + Postgres in Docker
```

After connecting the client to WireGuard, open the portal at:

```text
http://10.13.13.1
```

## 1. Prepare Environment

Copy the template and edit it:

```bash
cp .env.example .env
nano .env
```

Recommended values for the WireGuard deployment:

```env
NODE_ENV=production
LOG_LEVEL=info

POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-this-db-password
POSTGRES_DB=solar_portal

JWT_SECRET=generate-a-long-random-secret-1
REFRESH_TOKEN_SECRET=generate-a-long-random-secret-2
SESSION_SECRET=generate-a-long-random-secret-3

VPN_PORTAL_ORIGIN=http://10.13.13.1
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=
STRICT_CORS=true

VITE_API_BASE_URL=/api

WG_SERVER_URL=your-public-ip-or-ddns.example.net
WG_SERVER_PORT=51820
WG_PEERS=3
WG_INTERNAL_SUBNET=10.13.13.0
WG_ALLOWED_IPS=10.13.13.0/24
WG_PEER_DNS=1.1.1.1
TZ=Europe/Prague
```

Important notes:

- `VPN_PORTAL_ORIGIN` must exactly match the URL users open in the browser
- `COOKIE_SECURE=false` is intentional here because the app is carried inside the VPN over HTTP
- do not reuse this cookie mode on a public internet deployment

## 2. Start the Stack

```bash
docker compose -f docker-compose.wireguard.yml up -d --build
```

Then inspect logs:

```bash
docker compose -f docker-compose.wireguard.yml logs -f wireguard nginx backend
```

## 3. Get Client Configurations

The WireGuard container writes peer configs into:

```text
wireguard-config/
```

Typical files:

```text
wireguard-config/peer1/peer1.conf
wireguard-config/peer2/peer2.conf
wireguard-config/peer3/peer3.conf
```

Import one config into each phone or notebook WireGuard app.

## 4. Router and Firewall

Forward only this port from the router to the server:

```text
UDP 51820 -> home-server:51820
```

Do not forward:

- port `80`
- port `443`
- port `5000`
- port `3000`

If you use a host firewall, allow HTTP only from the WireGuard subnet. Example with UFW:

```bash
sudo ufw allow 51820/udp
sudo ufw allow from 10.13.13.0/24 to any port 80 proto tcp
sudo ufw deny 80/tcp
sudo ufw deny 443/tcp
sudo ufw deny 5000/tcp
sudo ufw deny 3000/tcp
```

## 5. Open the Portal

1. Connect the device to WireGuard.
2. Open `http://10.13.13.1`.
3. Log in with the Solar Portal access code.

## 6. Agent Configuration

If the data-collection agent should talk to the portal over the VPN too, use:

```env
CLOUD_API_URL=http://10.13.13.1/api
```

If the agent runs on the same home LAN and can reach the server locally, you can also keep it on the LAN address instead of WireGuard.

## 7. Verification

On the server:

```bash
docker compose -f docker-compose.wireguard.yml ps
curl http://localhost/health
curl http://10.13.13.1/health
```

From a connected client:

```bash
curl http://10.13.13.1/api/auth/registration-status
```

## Security Boundaries

This setup is acceptable because the transport encryption is provided by WireGuard and the portal is intended for a trusted private network.

It is not the right final architecture if:

- many unrelated customers should access the portal
- users must open it directly from a browser without VPN software
- you want public HTTPS, SEO, or email links on a real hostname