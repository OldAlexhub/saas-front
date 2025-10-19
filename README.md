TaxiOps Frontend (Client)

This is the administrative web frontend for TaxiOps — a taxi/dispatch operations dashboard built with React. It provides user authentication, driver & vehicle management, bookings, live driver tracking (via Leaflet maps), reporting, and integrations with the backend realtime API.

This repository contains the client app located in the `client/` folder and is a Create React App project.

## Quick facts

- Framework: React 18 (Create React App)
- UI: Bootstrap 5 (via `react-bootstrap`)
- Maps: Leaflet (via `react-leaflet`)
- Realtime: socket.io-client (connected to the server realtime API)
- HTTP client: axios

## Table of contents

- Requirements
- Getting started (development)
- Available scripts
- Environment variables
- Project structure
- Key pages & features
- Building & deployment
- Troubleshooting
- Contributing
- License

## Requirements

- Node.js (LTS recommended) and npm. This project uses Create React App.
- A running TaxiOps backend (server/) for API and realtime; to use live features you should run the backend locally or point the app to a deployed backend.

## Getting started (development)

1. Open a terminal and change into the `client/` directory.
2. Install dependencies:

```bash
cd client
npm install
```

3. Start the development server:

```bash
npm start
```

4. Open http://localhost:3000 in your browser. The app uses the `RealtimeProvider` and `BrowserRouter` from `src/index.js`.

If you want the frontend to communicate with a local backend, make sure your backend server is running (the server folder in the repository) and configure the API base URL using an environment variable (see below).

## Available scripts

All scripts are defined in `client/package.json`:

- `npm start` — start the dev server (Create React App).
- `npm run build` — create a production build in `client/build`.
- `npm test` — run the test runner.
- `npm run eject` — eject CRA configuration (one-way).

## Environment variables

You can configure runtime values using a `.env` file in the `client/` folder. Create React App requires variables to be prefixed with `REACT_APP_` to be available in the app.

Recommended variables (examples):

- `REACT_APP_API_BASE_URL` — Backend REST API base URL (e.g. `http://localhost:4000/api`).
- `REACT_APP_REALTIME_URL` — Realtime server URL for socket.io (e.g. `http://localhost:4000`).

Create a `.env` file:

```bash
# client/.env
REACT_APP_API_BASE_URL=http://localhost:4000/api
REACT_APP_REALTIME_URL=http://localhost:4000
```

Note: after changing `.env`, restart the dev server to pick up the changes.

## Project structure

Key files and folders in `client/`:

- `public/` — static files and the HTML shell.
- `src/index.js` — app entry; sets up Bootstrap, Leaflet CSS, `BrowserRouter`, and `RealtimeProvider`.
- `src/App.js` — main route configuration and protected routes (checks `localStorage.token`).
- `src/pages/` — top-level pages: `Dashboard`, `Login`, `Signup`, `Fares`, and subfolders for `drivers`, `vehicles`, `bookings`, `reports`, `settings`, etc.
- `src/components/` — shared UI components (layout, nav, etc.).
- `src/providers/RealtimeProvider.js` — socket.io connection and realtime context provider.
- `src/services/` — API wrapper modules (`axios` configured here) for working with backend endpoints.
- `src/styles/theme.css` — app-wide style overrides.

## Key pages & features

- Authentication — `Login` and `Signup` pages. Successful login stores a `token` in `localStorage` and enables protected routes.
- Dashboard — landing admin view showing summaries and live activity.
- Drivers management — list, create, and edit drivers. Integrates with driver realtime location features.
- Vehicles management — list, create, and edit vehicles and inspections (uploads stored in `public/uploads`).
- Bookings — create, view, and manage bookings; includes a booking detail page.
- Actives — active driver assignments and live tracking.
- Reports & receipts — tools to generate reports and printable receipts (uses `jspdf`).

Maps and Realtime

- The app uses `react-leaflet` to render maps for drivers and bookings.
- Realtime updates are handled by socket.io via `socket.io-client` and the `RealtimeProvider`.

## Building & deployment

To produce a production build:

```bash
cd client
npm run build
```

This produces optimized static files in `client/build`. Serve these files from a static host, or configure your backend server to serve the build directory.

If deploying behind a reverse proxy, ensure API calls from the client are routed to the backend and that `REACT_APP_API_BASE_URL` is set to the correct origin.

## Troubleshooting

- If maps don't render correctly, ensure Leaflet CSS is loaded (it is imported in `src/index.js`):
	- `import 'leaflet/dist/leaflet.css';`
- If realtime features aren't working, verify `REACT_APP_REALTIME_URL` and check backend realtime server logs.
- If authentication redirects to `/login` unexpectedly, open the browser console and check `localStorage.token` and network requests to the backend login endpoint.

## Contributing

If you'd like to contribute:

1. Fork the repository and create a feature branch.
2. Make small, focused commits with clear messages.
3. Run `npm install` and `npm start` to verify your changes.
4. Open a pull request describing your changes.

## License

This project does not include an explicit license file in the `client/` folder. Add a `LICENSE` file at the repo root if you want to make the license explicit.

---

by Mohamed Gad, Old Alex Hub, LLC
