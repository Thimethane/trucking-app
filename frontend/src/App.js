import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import TripPlannerPage from './pages/TripPlannerPage';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: '#f97316', light: '#fb923c', dark: '#ea580c', contrastText: '#fff' },
    secondary:  { main: '#0ea5e9', light: '#38bdf8', dark: '#0284c7', contrastText: '#fff' },
    success:    { main: '#22c55e', light: '#4ade80', dark: '#16a34a' },
    error:      { main: '#ef4444', light: '#f87171', dark: '#dc2626' },
    warning:    { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
    info:       { main: '#a855f7', light: '#c084fc', dark: '#9333ea' },
    background: { default: '#070d1a', paper: '#0d1526' },
    text:       { primary: '#f1f5f9', secondary: '#94a3b8', disabled: '#334155' },
    divider:    '#0f2040',
  },
  typography: {
    fontFamily: '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
    h1: { fontFamily: '"IBM Plex Mono", "Courier New", monospace', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600 },
    h4: { fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600 },
    h5: { fontFamily: '"IBM Plex Mono", monospace', fontWeight: 500 },
    h6: { fontFamily: '"IBM Plex Mono", monospace', fontWeight: 500 },
    button: { fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600, letterSpacing: '0.06em' },
    caption: { fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.7rem' },
    overline: { fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.12em' },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #070d1a; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #070d1a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #f97316; }
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'uppercase',
          borderRadius: 3,
          fontWeight: 700,
          letterSpacing: '0.06em',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          boxShadow: '0 4px 20px rgba(249,115,22,0.25)',
          '&:hover': {
            background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
            boxShadow: '0 6px 28px rgba(249,115,22,0.35)',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)' },
          transition: 'all 0.2s ease',
        },
        outlined: {
          borderColor: '#1e293b',
          '&:hover': { borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.05)' },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            backgroundColor: '#070d1a',
            '& fieldset': { borderColor: '#1e293b', transition: 'border-color 0.2s' },
            '&:hover fieldset': { borderColor: '#334155' },
            '&.Mui-focused fieldset': { borderColor: '#f97316', borderWidth: 1 },
          },
          '& .MuiInputLabel-root': { color: '#475569' },
          '& .MuiInputLabel-root.Mui-focused': { color: '#f97316' },
          '& .MuiFormHelperText-root': { fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.68rem' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0d1526',
          border: '1px solid #0f2040',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 3,
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '0.7rem',
          height: 24,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#111827',
          border: '1px solid #1e293b',
          borderRadius: 4,
          fontSize: '0.7rem',
          fontFamily: '"IBM Plex Mono", monospace',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          maxWidth: 280,
        },
        arrow: { color: '#111827' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 3, fontFamily: '"IBM Plex Sans", sans-serif' },
        standardError:   { backgroundColor: '#450a0a', border: '1px solid rgba(239,68,68,0.2)' },
        standardWarning: { backgroundColor: '#451a03', border: '1px solid rgba(245,158,11,0.2)' },
        standardInfo:    { backgroundColor: '#0c1a2e', border: '1px solid rgba(14,165,233,0.2)' },
        standardSuccess: { backgroundColor: '#052e16', border: '1px solid rgba(34,197,94,0.2)' },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: '#0f2040' },
        bar:  { borderRadius: 4 },
      },
    },
    MuiSlider: {
      styleOverrides: {
        rail:  { backgroundColor: '#1e293b', height: 4 },
        track: { height: 4 },
        thumb: {
          width: 16, height: 16,
          '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 6px rgba(249,115,22,0.15)' },
        },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: '#0f2040' } },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TripPlannerPage />
    </ThemeProvider>
  );
}
