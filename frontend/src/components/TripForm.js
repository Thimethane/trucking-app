import React, { useState, useRef } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Slider,
  InputAdornment, Divider, CircularProgress, Tooltip,
  List, ListItem, ListItemText, ClickAwayListener
} from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PlaceIcon from '@mui/icons-material/Place';
import FlagIcon from '@mui/icons-material/Flag';
import SpeedIcon from '@mui/icons-material/Speed';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { geocodeSuggest } from '../api';

const PRESETS = [
  { label: 'LA → Dallas',     origin: 'Los Angeles, CA', pickup: 'Phoenix, AZ',       dropoff: 'Dallas, TX',        current_cycle_used: 40 },
  { label: 'NY → Chicago',    origin: 'New York, NY',    pickup: 'Philadelphia, PA',   dropoff: 'Chicago, IL',       current_cycle_used: 20 },
  { label: 'Seattle → SF',    origin: 'Seattle, WA',     pickup: 'Portland, OR',       dropoff: 'San Francisco, CA', current_cycle_used: 55 },
  { label: 'Miami → Atlanta', origin: 'Miami, FL',       pickup: 'Jacksonville, FL',   dropoff: 'Atlanta, GA',       current_cycle_used: 10 },
  { label: 'Cross-country',   origin: 'New York, NY',    pickup: 'Chicago, IL',        dropoff: 'Los Angeles, CA',   current_cycle_used: 0  },
];

const FIELD_META = [
  { field: 'origin',  label: 'Current Location',  icon: MyLocationIcon, color: '#22c55e', hint: 'Where the driver is now' },
  { field: 'pickup',  label: 'Pickup Location',   icon: PlaceIcon,      color: '#0ea5e9', hint: '+1h on-duty (not driving) scheduled' },
  { field: 'dropoff', label: 'Drop-off Location', icon: FlagIcon,       color: '#f97316', hint: '+1h on-duty (not driving) scheduled' },
];

// ── Autocomplete field ──────────────────────────────────────────────────────
function LocationField({ field, label, icon: Icon, color, hint, value, onChange, error, debounceMs = 400 }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    clearTimeout(timerRef.current);
    if (v.length >= 3) {
      timerRef.current = setTimeout(async () => {
        const s = await geocodeSuggest(v);
        setSuggestions(s.slice(0, 5));
        setOpen(s.length > 0);
      }, debounceMs);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  };

  const pick = (s) => {
    onChange(s.short || s.name);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ mb: 2, position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
          <Icon sx={{ fontSize: 13, color }} />
          <Typography sx={{ fontSize: 10, color: '#64748b', fontFamily: '"IBM Plex Mono"' }}>
            {label.toUpperCase()}
          </Typography>
          <Tooltip title={hint} arrow placement="right">
            <InfoOutlinedIcon sx={{ fontSize: 11, color: '#334155', ml: 'auto', cursor: 'help' }} />
          </Tooltip>
        </Box>

        <TextField
          fullWidth
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="City, State"
          size="small"
          error={error}
          helperText={error ? 'Required' : ''}
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              </InputAdornment>
            ),
            sx: {
              fontFamily: '"IBM Plex Mono"', fontSize: 13,
              background: '#070d1a', borderRadius: 1,
              '& input::placeholder': { color: '#1e3a5f', fontSize: 12 },
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': { borderColor: color },
            },
          }}
        />

        {open && suggestions.length > 0 && (
          <Paper sx={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
            background: '#0d1526', border: '1px solid #1e293b', borderRadius: 1,
            boxShadow: '0 8px 32px #00000080', mt: 0.25,
            maxHeight: 180, overflow: 'auto',
          }}>
            <List dense disablePadding>
              {suggestions.map((s, i) => (
                <ListItem
                  key={i}
                  button
                  onClick={() => pick(s)}
                  sx={{
                    py: 0.75, px: 1.5,
                    borderBottom: '1px solid #0f2040',
                    cursor: 'pointer',
                    '&:hover': { background: `${color}12` },
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: color, mr: 1, flexShrink: 0 }} />
                  <ListItemText
                    primary={s.short}
                    secondary={s.name !== s.short ? s.name.split(', ').slice(0, 4).join(', ') : null}
                    primaryTypographyProps={{ sx: { fontFamily: '"IBM Plex Mono"', fontSize: 12, color: '#cbd5e1' } }}
                    secondaryTypographyProps={{ sx: { fontFamily: '"IBM Plex Mono"', fontSize: 9, color: '#475569' } }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}

// ── Main form ────────────────────────────────────────────────────────────────
export default function TripForm({ onSubmit, loading }) {
  const [form, setForm]       = useState({ origin: '', pickup: '', dropoff: '', current_cycle_used: 0 });
  const [touched, setTouched] = useState({});

  const setField = (field) => (value) => {
    setForm(p => ({ ...p, [field]: value }));
    setTouched(p => ({ ...p, [field]: true }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ origin: true, pickup: true, dropoff: true });
    if (!form.origin.trim() || !form.pickup.trim() || !form.dropoff.trim()) return;
    onSubmit({ ...form, current_cycle_used: Number(form.current_cycle_used) });
  };

  const loadPreset = (p) => { setForm(p); setTouched({}); };

  const cycleUsed  = Number(form.current_cycle_used);
  const cyclePct   = (cycleUsed / 70) * 100;
  const cycleColor = cyclePct > 85 ? '#ef4444' : cyclePct > 65 ? '#f59e0b' : '#22c55e';
  const cycleAvail = Math.max(0, 70 - cycleUsed);
  const fieldErr   = (f) => touched[f] && !form[f]?.trim();

  return (
    <Paper sx={{
      background: '#0d1526', border: '1px solid #0f2040',
      borderRadius: 2, overflow: 'hidden',
      position: { lg: 'sticky' }, top: { lg: 80 },
    }}>
      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg,#0f1f38,#0d1526)',
        borderBottom: '1px solid #0f2040', px: 2.5, py: 2,
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        <Box sx={{ width: 4, height: 28, background: '#f97316', borderRadius: 2, flexShrink: 0 }} />
        <Box>
          <Typography sx={{ fontFamily: '"IBM Plex Mono"', fontWeight: 700, color: '#f1f5f9', fontSize: 13 }}>
            TRIP PARAMETERS
          </Typography>
          <Typography sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 9, color: '#334155' }}>
            FMCSA § 395.8 — PROPERTY CARRIER
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2.5 }}>
        {/* Presets */}
        <Typography sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 9, color: '#334155', mb: 1, letterSpacing: '0.1em' }}>
          QUICK PRESETS:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2.5 }}>
          {PRESETS.map((p, i) => (
            <Button key={i} size="small" onClick={() => loadPreset(p)} sx={{
              fontSize: 9, py: 0.4, px: 1, minWidth: 0,
              fontFamily: '"IBM Plex Mono"', letterSpacing: '0.04em',
              background: '#111827', border: '1px solid #1e293b', color: '#475569',
              '&:hover': { background: '#f9731612', borderColor: '#f97316', color: '#f97316' },
            }}>
              {p.label}
            </Button>
          ))}
        </Box>

        <Divider sx={{ borderColor: '#0f2040', mb: 2.5 }} />

        <Box component="form" onSubmit={handleSubmit}>
          {/* Location fields with autocomplete */}
          {FIELD_META.map(({ field, label, icon, color, hint }) => (
            <LocationField
              key={field}
              field={field} label={label} icon={icon} color={color} hint={hint}
              value={form[field]}
              onChange={setField(field)}
              error={fieldErr(field)}
            />
          ))}

          {/* Cycle Used Slider */}
          <Box sx={{ background: '#070d1a', border: '1px solid #0f2040', borderRadius: 1.5, p: 2, mb: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <SpeedIcon sx={{ fontSize: 14, color: '#64748b' }} />
                <Typography sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 9, color: '#64748b', letterSpacing: '0.08em' }}>
                  CURRENT CYCLE USED
                </Typography>
              </Box>
              <Tooltip title="How many on-duty hours have been used in the last 8 days (49 CFR § 395.3)" arrow>
                <Typography sx={{ fontFamily: '"IBM Plex Mono"', fontWeight: 700, fontSize: 13, color: cycleColor, cursor: 'help' }}>
                  {cycleUsed}h / 70h
                </Typography>
              </Tooltip>
            </Box>

            <Slider
              value={cycleUsed}
              onChange={(_, v) => setForm(p => ({ ...p, current_cycle_used: v }))}
              min={0} max={70} step={1}
              sx={{
                color: cycleColor, mb: 0.5,
                '& .MuiSlider-thumb': { width: 14, height: 14, boxShadow: `0 0 0 4px ${cycleColor}22` },
                '& .MuiSlider-track': { height: 4 },
                '& .MuiSlider-rail': { height: 4, background: '#1e293b' },
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 9, color: '#334155', fontFamily: '"IBM Plex Mono"' }}>0h (fresh)</Typography>
              <Box sx={{ background: `${cycleColor}18`, border: `1px solid ${cycleColor}30`, borderRadius: 1, px: 1, py: 0.2 }}>
                <Typography sx={{ fontSize: 9, color: cycleColor, fontFamily: '"IBM Plex Mono"', fontWeight: 700 }}>
                  {cycleAvail}h AVAILABLE
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 9, color: '#ef4444', fontFamily: '"IBM Plex Mono"' }}>70h (limit)</Typography>
            </Box>
          </Box>

          <Button
            type="submit" fullWidth variant="contained" size="large"
            disabled={loading}
            startIcon={loading
              ? <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.7)' }} />
              : <PlayArrowIcon />
            }
            sx={{
              py: 1.5, fontSize: 13, fontFamily: '"IBM Plex Mono"',
              letterSpacing: '0.08em', borderRadius: 1,
              background: loading ? '#1e293b' : 'linear-gradient(135deg,#f97316,#ea580c)',
              boxShadow: loading ? 'none' : '0 4px 24px #f9731630',
              '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 6px 28px #f9731640' },
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'CALCULATING ROUTE…' : 'CALCULATE COMPLIANT ROUTE'}
          </Button>
        </Box>

        <Divider sx={{ borderColor: '#0f2040', my: 2.5 }} />

        {/* HOS Rules Reference */}
        <Typography sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 9, color: '#1e3a5f', mb: 1.5, letterSpacing: '0.1em' }}>
          ENFORCED FMCSA RULES:
        </Typography>
        {[
          ['11-HR DRIVE',    'Max driving after 10h consecutive off',      '#ef4444'],
          ['14-HR WINDOW',   'No driving after 14h on-duty window',        '#f97316'],
          ['30-MIN BREAK',   'Mandatory after 8h cumulative driving',      '#22c55e'],
          ['70-HR / 8-DAY',  'Rolling on-duty limit; oldest day drops',    '#a855f7'],
          ['34-HR RESTART',  'Consecutive off resets 70h clock to zero',   '#0ea5e9'],
          ['1,000-MI FUEL',  'Fuel stop required at least every 1,000 mi', '#f59e0b'],
        ].map(([rule, desc, color]) => (
          <Box key={rule} sx={{ display: 'flex', gap: 1.5, mb: 1, alignItems: 'flex-start' }}>
            <Box sx={{
              minWidth: 76, height: 17, background: `${color}15`,
              border: `1px solid ${color}35`, borderRadius: 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.1,
            }}>
              <Typography sx={{ fontSize: 8, color, fontFamily: '"IBM Plex Mono"', fontWeight: 700 }}>
                {rule}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 10, color: '#334155', lineHeight: 1.5 }}>{desc}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
