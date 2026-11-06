# Desktop

The desktop target is a Tauri 2 shell over the same React application.

## Boundary

```
apps/desktop/src-tauri   Rust host, window and capabilities
apps/desktop/src         Vite entry and mount call
packages/app             shared React application
```

No feature imports Tauri. Desktop-only operations are exposed through
`packages/app/src/platform`, which web and desktop implement separately.

## Configuration

- Identifier: `com.inventoryu3.app`
- Frontend dev server: Vite
- API URL: `VITE_API_URL_DESKTOP`, falling back to `VITE_API_URL`
- Window and capability settings: `apps/desktop/src-tauri/tauri.conf.json` and
  `capabilities/default.json`

## Development

```bash
pnpm run dev:desktop
```

On this machine the first Rust compile takes several minutes. Linux system
dependencies and a Rust toolchain are required; see `AGENTS.md` section 8.

## Database

The desktop shell does not open a database. It talks to the API exactly as the web
shell does. Local desktop databases and synchronization are out of scope.
