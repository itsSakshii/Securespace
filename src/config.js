// Demo mode replaces the (not yet deployed) backend with an in-browser mock API + fake socket.
// It is ON by default. To use the real backend later, build with:  VITE_DEMO_MODE=false
export const DEMO_MODE = import.meta.env?.VITE_DEMO_MODE !== 'false';
