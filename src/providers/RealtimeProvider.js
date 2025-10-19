import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const RealtimeContext = createContext({
  socket: null,
  connected: false,
});

function getSocketBaseUrl() {
  if (process.env.REACT_APP_SOCKET_URL && process.env.REACT_APP_SOCKET_URL.trim().length > 0) {
    return process.env.REACT_APP_SOCKET_URL.trim();
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

function getSocketPath() {
  if (process.env.REACT_APP_SOCKET_PATH && process.env.REACT_APP_SOCKET_PATH.trim().length > 0) {
    return process.env.REACT_APP_SOCKET_PATH.trim();
  }
  return '/socket.io';
}

export function RealtimeProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const socketRef = useRef(null);

  useEffect(() => {
    const handleTokenChange = () => {
      setToken(localStorage.getItem('token'));
    };

    window.addEventListener('storage', handleTokenChange);
    window.addEventListener('auth-token', handleTokenChange);

    return () => {
      window.removeEventListener('storage', handleTokenChange);
      window.removeEventListener('auth-token', handleTokenChange);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setConnected(false);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const baseUrl = getSocketBaseUrl();
    if (!baseUrl) {
      console.warn('Realtime socket URL is not configured.');
      return;
    }

    const client = io(baseUrl, {
      path: getSocketPath(),
      auth: {
        token,
        role: 'admin',
      },
      transports: ['websocket'],
    });

    socketRef.current = client;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleError = (error) => {
      console.error('Realtime connection error:', error);
    };

    client.on('connect', handleConnect);
    client.on('disconnect', handleDisconnect);
    client.on('connect_error', handleError);

    return () => {
      client.off('connect', handleConnect);
      client.off('disconnect', handleDisconnect);
      client.off('connect_error', handleError);
      client.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      socket: socketRef.current,
      connected,
    }),
    [connected],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
