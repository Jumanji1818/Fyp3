# Procura Windows Desktop Build

The Windows desktop application is an additional Electron shell around the same
Vite/React application used by the Android Capacitor build. It does not replace
or remove the Android project or its GitHub Actions workflow.

## Build on GitHub

Push this project to `main` or `master`, or run **Build Windows Desktop EXE**
manually from the Actions tab. Open the successful workflow run and download the
`Procura-Windows-Desktop` artifact. It contains the Windows installer and portable EXE.

When a `v*` tag is pushed, both EXE files are also attached to that GitHub Release.

## Build locally (Windows)

Install Node.js 22, then from the project directory run:

```powershell
npm install --legacy-peer-deps
npm run build
npx electron-builder --win nsis portable --x64
```

The EXE files are written to `release/`.

For renderer development, run `npm run dev` in one terminal and `npm run desktop:dev`
in another terminal.

## Data and security

Procura stores its existing application data in Electron's persistent browser storage
profile under a stable, secure `procura://app` origin. The renderer runs with context
isolation enabled, Node integration disabled, and sandboxing enabled. External web
links open in the system browser.

The Windows package is a desktop shell around the existing client application; it
does not silently turn the application into a hosted multi-user server. Existing
API/backend configuration and network requirements remain unchanged.
