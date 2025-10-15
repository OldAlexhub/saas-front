import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Import bootstrap CSS globally
import 'bootstrap/dist/css/bootstrap.min.css';
// Import Leaflet CSS for maps
import 'leaflet/dist/leaflet.css';
// Global theme overrides for the redesigned dashboard
import './styles/theme.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);