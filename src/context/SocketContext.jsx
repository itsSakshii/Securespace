import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from '../services/mockSocket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Page components call on()/joinRoom() in their mount effects, which run BEFORE this provider's
  // effect creates the socket. So we remember listeners + room joins here and replay them
  // as soon as the socket exists (and again after every reconnect).
  const handlersRef = useRef(new Map()); // event -> Set<handler>
  const joinsRef = useRef(new Map());    // key -> [event, payload]

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    handlersRef.current.forEach((set, event) => set.forEach((fn) => socket.on(event, fn)));

    socket.on('connect', () => {
      setConnected(true);
      joinsRef.current.forEach(([event, payload]) => socket.emit(event, payload));
    });
    socket.on('disconnect', () => { setConnected(false); });
    socket.on('pong', () => {});

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, token]);

  const emit = (event, data) => { socketRef.current?.emit(event, data); };

  const on = (event, handler) => {
    if (!handlersRef.current.has(event)) handlersRef.current.set(event, new Set());
    handlersRef.current.get(event).add(handler);
    socketRef.current?.on(event, handler);
  };

  const off = (event, handler) => {
    handlersRef.current.get(event)?.delete(handler);
    socketRef.current?.off(event, handler);
  };

  const join = (event, payload) => {
    joinsRef.current.set(event + JSON.stringify(payload), [event, payload]);
    if (socketRef.current?.connected) socketRef.current.emit(event, payload);
  };

  const joinRoom = (room) => join('join_incident', { incidentId: room });
  const joinGuardRoom = (guardId) => join('join_guard_room', { guardId });
  const joinUserRoom = (userId) => join('join_user_room', { userId });

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, emit, on, off, joinRoom, joinGuardRoom, joinUserRoom }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
