# Connecting ERP Report Studio to the client SQL Server

Run these on the same PC that runs the **backend** (VPN connected). Stop at the first one that fails.

```powershell
# 1. Is the host reachable and is the port open?   (TcpTestSucceeded must be True)
Test-NetConnection 192.168.1.215 -Port 1433
Test-NetConnection 192.168.1.215 -Port 1444

# 2. Is the VPN actually routing that subnet?
route print | findstr 192.168.1
tracert -d -h 5 192.168.1.215

# 3. Does the backend itself reach it? (uses backend/.env)
cd backend
npm run erp:connect
```

| Result | Meaning / fix |
|---|---|
| `TcpTestSucceeded : False` on both ports | VPN does not route the subnet (split tunnel), firewall, or wrong IP |
| True on 1433, False on 1444 | The port in `.env` is wrong. Use 1433 (or whatever SQL Server Configuration Manager shows) |
| True, but `ELOGIN` / "Login failed" | Wrong password, or SQL Server is in Windows-only mode (enable mixed mode, restart the service) |
| True, but `ESOCKET` / handshake / TLS | Old SQL Server: set `ERP_DB_LEGACY_TLS=true` in `backend/.env` |
| "Cannot open database" | Database name wrong, or the login has no access to it |

Notes
* Use a dedicated **read-only** SQL login instead of `sa`.
* `backend/.env` in the zip contained the real `sa` password and JWT / encryption keys. Rotate them and keep `.env` out of the zip/Git.
* The Add Data Source form now saves to the backend, so you must **sign in** first (default seed user: see `SEED_ADMIN_*` in `.env`; run `npm run seed` once).
