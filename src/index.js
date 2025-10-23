import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { RealtimeProvider } from './providers/RealtimeProvider';

// Import bootstrap CSS globally
import 'bootstrap/dist/css/bootstrap.min.css';
// Import Leaflet CSS for maps
import 'leaflet/dist/leaflet.css';
// Global theme overrides for the redesigned dashboard
import './styles/theme.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
      <RealtimeProvider>
        <RouterProvider
          router={createBrowserRouter([
            {
              // Use a splat parent so nested <Routes> inside <App /> can
              // match deeper paths like /vehicles/files. This matches the
              // warning recommending <Route path="*"> for nested routes.
              path: '*',
              element: <App />,
            },
          ])}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        />
      </RealtimeProvider>
  </React.StrictMode>
);
