# Remote Access Without Buying a Domain

You do not need to buy a domain on day one.

There are two practical paths:

## Option 0: Private Access With WireGuard On Your Home Server

Use this when Solar Portal runs on your own 24/7 server at home and users should only reach it through VPN.

Why this option is attractive:

- no public website on ports `80` and `443`
- no domain required
- stable private portal address such as `http://10.13.13.1`
- remote users only see the portal after joining the VPN

Recommended setup:

1. Run Solar Portal on the home server.
2. Run WireGuard on the same server.
3. Forward only UDP `51820` from the router.
4. Give each trusted device its own WireGuard peer config.
5. Open the portal through the WireGuard server address.

Environment notes:

```env
VPN_PORTAL_ORIGIN=http://10.13.13.1
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
STRICT_CORS=true
VITE_API_BASE_URL=/api
CLOUD_API_URL=http://10.13.13.1/api
```

Detailed guide:

- [WIREGUARD_HOME_SERVER.md](WIREGUARD_HOME_SERVER.md)

## Option 1: Private Access With Tailscale

Use this when only you or a small trusted group need access.

Why this is the safest no-domain option:

- no public website exposed to the whole internet
- free private network between your laptop/phone and the VPS or Home Assistant host
- automatic HTTPS-like transport security inside the tailnet

Recommended setup:

1. Install Tailscale on the VPS running Solar Portal.
2. Install Tailscale on your phone and laptop.
3. Keep Solar Portal behind [docker-compose.prod.yml](../docker-compose.prod.yml).
4. Access the portal through the Tailscale IP or MagicDNS hostname.

Environment notes:

```env
COOKIE_DOMAIN=
CORS_ORIGIN=https://your-vps-tailnet-name.ts.net
STRICT_CORS=true
VITE_API_BASE_URL=/api
CLOUD_API_URL=https://your-vps-tailnet-name.ts.net/api
```

Best for:

- your own use
- admin access
- testing before public launch

## Option 2: Temporary Public URL With Cloudflare Quick Tunnel

Use this when you need a public HTTPS URL quickly and do not want to buy a domain yet.

Important limitation:

- suitable for staging and early demos
- not ideal as the final production setup for multiple customers
- the generated hostname can change when you recreate the tunnel

Example:

```bash
cloudflared tunnel --url http://localhost:80
```

Cloudflare will return a hostname like:

```text
https://random-name.trycloudflare.com
```

Use that URL in your configuration:

```env
COOKIE_DOMAIN=
CORS_ORIGIN=https://random-name.trycloudflare.com
STRICT_CORS=true
VITE_API_BASE_URL=/api
CLOUD_API_URL=https://random-name.trycloudflare.com/api
```

Best for:

- short-term remote testing
- showing the portal to a few people
- validating the internet-facing flow before buying a domain

## What Not To Do

Avoid these shortcuts:

- exposing Home Assistant directly with router port forwarding
- exposing backend port 5000 directly without reverse proxy and HTTPS
- keeping `COOKIE_SECURE=false` on any internet-facing deployment
- using a public IP over plain HTTP for login or agent traffic

## Recommended Order

1. Start with WireGuard if you already have a home server and want fully private remote access.
2. Use Tailscale if you want the simplest VPN setup with less manual network work.
3. Use Cloudflare Quick Tunnel if you need temporary public HTTPS.
4. Move to your own domain only when you want a stable public customer-facing URL.