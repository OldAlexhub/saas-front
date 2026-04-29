import 'bootstrap/dist/css/bootstrap.min.css';
import 'leaflet/dist/leaflet.css';
import './styles/theme.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { RealtimeProvider } from './providers/RealtimeProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  </React.StrictMode>
);
