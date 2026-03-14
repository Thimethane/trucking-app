import React, { useState } from 'react';
import { Box, Paper, Typography, Tooltip, Chip } from '@mui/material';

const STATUSES = ['off_duty','sleeper','driving','on_duty_nd'];
const STATUS_CONFIG = {
  off_duty:   { label: '1 — Off Duty',              short: 'OFF',  color: '#3b82f6', cfr: '§395.2' },
  sleeper:    { label: '2 — Sleeper Berth',          short: 'SLB',  color: '#6366f1', cfr: '§395.2' },
  driving:    { label: '3 — Driving',                short: 'DRV',  color: '#ef4444', cfr: '§395.2' },
  on_duty_nd: { label: '4 — On Duty (Not Driving)',  short: 'ODND', color: '#22c55e', cfr: '§395.2' },
};
const HOURS = Array.from({ length: 25 }, (_, i) => i);
const H_LABELS = {0:'M', 1:'1', 2:'2', 3:'3', 4:'4', 5:'5', 6:'6A', 7:'7', 8:'8', 9:'9', 10:'10', 11:'11',
  12:'N', 13:'1', 14:'2', 15:'3', 16:'4', 17:'5', 18:'6P', 19:'7', 20:'8', 21:'9', 22:'10', 23:'11', 24:'M'};

const GL = 200, GR_PAD = 60;
const ROW_H = 48;

function h2pct(h) { return `${(h / 24) * 100}%`; }
function dur2pct(d) { return `${(d / 24) * 100}%`; }

export default function HOSLogGrid({ dailyLogs }) {
  const [day, setDay] = useState(0);
  const log = dailyLogs[day];
  if (!log) return null;

  const summary24 = {
    off_duty:   log.total_off_duty,
    sleeper:    0,
    driving:    log.total_driving,
    on_duty_nd: log.total_on_duty,
    total:      Math.min(24, log.total_off_duty + log.total_driving + log.total_on_duty),
  };

  return (
    <Box>
      {/* Day tabs */}
      {dailyLogs.length > 1 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {dailyLogs.map((d, i) => (
            <Box key={i} onClick={() => setDay(i)} sx={{
              px: 2, py: 0.75, borderRadius: 1, cursor: 'pointer',
              fontFamily: '"IBM Plex Mono"', fontSize: 11, letterSpacing: '0.04em',
              background: day === i ? '#f97316' : '#0d1526',
              color: day === i ? '#fff' : '#475569',
              border: `1px solid ${day === i ? '#f97316' : '#0f2040'}`,
              transition: 'all 0.15s',
              '&:hover': { borderColor: '#f97316', color: day === i ? '#fff' : '#f97316' },
            }}>
              DAY {i + 1}
              <Box component="span" sx={{ ml: 1, fontSize: 9, opacity: 0.7 }}>
                {d.total_driving.toFixed(1)}h drive
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Paper sx={{ background: '#0d1526', border: '1px solid #0f2040', overflow: 'hidden' }}>
        {/* Top info bar */}
        <Box sx={{
          background: '#070d1a', px: 2.5, py: 1.5, borderBottom: '1px solid #0f2040',
          display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap',
        }}>
          <Typography sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 11, color: '#64748b', letterSpacing: '0.08em' }}>
            {log.date_label.toUpperCase()} — 24-HOUR GRID
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, ml: 'auto' }}>
            {[
              ['DRIVE', log.total_driving, '#ef4444'],
              ['ON-DUTY', log.total_on_duty, '#22c55e'],
              ['OFF', log.total_off_duty, '#3b82f6'],
            ].map(([l, v, c]) => (
              <Box key={l} sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 9, color: '#334155', fontFamily: '"IBM Plex Mono"' }}>{l}</Typography>
                <Typography sx={{ fontSize: 14, color: c, fontFamily: '"IBM Plex Mono"', fontWeight: 700, lineHeight: 1.1 }}>
                  {v.toFixed(1)}h
                </Typography>
              </Box>
            ))}
            <Box sx={{ textAlign: 'right', pl: 2, borderLeft: '1px solid #0f2040' }}>
              <Typography sx={{ fontSize: 9, color: '#334155', fontFamily: '"IBM Plex Mono"' }}>ODOMETER</Typography>
              <Typography sx={{ fontSize: 11, color: '#94a3b8', fontFamily: '"IBM Plex Mono"' }}>
                {parseInt(log.odometer_start)}–{parseInt(log.odometer_end)} mi
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Hour header */}
        <Box sx={{ display: 'flex', borderBottom: '1px solid #0f2040', height: 34, background: '#070d1a' }}>
          <Box sx={{ width: GL, minWidth: GL, borderRight: '1px solid #0f2040' }} />
          <Box sx={{ flex: 1, position: 'relative' }}>
            {HOURS.map(h => (
              <Box key={h} sx={{ position: 'absolute', left: h2pct(h), transform: 'translateX(-50%)', top: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {h % 2 === 0 && (
                  <Typography sx={{
                    fontSize: h % 6 === 0 ? 9 : 8,
                    color: h % 6 === 0 ? '#64748b' : '#1e3a5f',
                    fontFamily: '"IBM Plex Mono"', fontWeight: h % 6 === 0 ? 700 : 400,
                    userSelect: 'none',
                  }}>
                    {H_LABELS[h]}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
          <Box sx={{ width: GR_PAD, minWidth: GR_PAD, borderLeft: '1px solid #0f2040', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 8, color: '#1e3a5f', fontFamily: '"IBM Plex Mono"' }}>HRS</Typography>
          </Box>
        </Box>

        {/* Grid rows */}
        {STATUSES.map((status, rowIdx) => {
          const cfg = STATUS_CONFIG[status];
          const entries = log.entries.filter(e => e.status === status);
          const rowTotal = entries.reduce((s, e) => s + e.duration_hours, 0);

          return (
            <Box key={status} sx={{
              display: 'flex', borderBottom: '1px solid #0f2040', height: ROW_H,
              background: rowIdx % 2 === 0 ? '#0a0f1e' : '#0d1526',
            }}>
              {/* Label cell */}
              <Box sx={{
                width: GL, minWidth: GL, px: 1.5,
                display: 'flex', alignItems: 'center', gap: 1,
                borderRight: '1px solid #0f2040',
              }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '2px', background: cfg.color, flexShrink: 0 }} />
                <Box>
                  <Typography sx={{ fontSize: 10, color: '#94a3b8', fontFamily: '"IBM Plex Mono"', fontWeight: 700, lineHeight: 1.2 }}>
                    {cfg.label}
                  </Typography>
                  <Typography sx={{ fontSize: 8, color: '#1e3a5f', fontFamily: '"IBM Plex Mono"' }}>
                    {cfg.cfr}
                  </Typography>
                </Box>
              </Box>

              {/* Timeline cell */}
              <Box sx={{ flex: 1, position: 'relative' }}>
                {/* Hour grid lines */}
                {HOURS.map(h => (
                  <Box key={h} sx={{
                    position: 'absolute', left: h2pct(h), top: 0, bottom: 0, width: 0,
                    borderLeft: `1px solid ${h % 6 === 0 ? '#0f2040' : '#070d1a'}`,
                  }} />
                ))}

                {/* Duty blocks */}
                {entries.map((e, i) => {
                  const sh = Math.max(0, Math.min(24, e.start_hour));
                  const eh = Math.min(24, sh + e.duration_hours);
                  if (eh - sh < 0.01) return null;
                  return (
                    <Tooltip key={i} arrow title={
                      <Box sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 10 }}>
                        <Box sx={{ color: cfg.color, fontWeight: 700, mb: 0.3 }}>{e.label}</Box>
                        <Box sx={{ color: '#94a3b8' }}>
                          {e.start_hour.toFixed(1)}h – {(e.start_hour + e.duration_hours).toFixed(1)}h
                          ({e.duration_hours.toFixed(2)}h)
                        </Box>
                        <Box sx={{ color: '#64748b' }}>{e.location}</Box>
                        {e.miles > 0 && <Box sx={{ color: '#22c55e' }}>{e.miles} mi</Box>}
                      </Box>
                    }>
                      <Box sx={{
                        position: 'absolute',
                        left: h2pct(sh),
                        width: dur2pct(eh - sh),
                        top: 5, bottom: 5,
                        background: cfg.color,
                        borderRadius: 0.5,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: `0 1px 8px ${cfg.color}40`,
                        transition: 'filter 0.15s',
                        '&:hover': { filter: 'brightness(1.2)', zIndex: 5 },
                      }}>
                        {((eh - sh) / 24 * 100) > 6 && (
                          <Typography sx={{
                            fontSize: 8, color: '#fff', fontFamily: '"IBM Plex Mono"',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', px: 0.5,
                            textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                          }}>
                            {e.label}
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>

              {/* Total cell */}
              <Box sx={{
                width: GR_PAD, minWidth: GR_PAD, borderLeft: '1px solid #0f2040',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Typography sx={{
                  fontSize: rowTotal > 0 ? 12 : 10,
                  color: rowTotal > 0 ? cfg.color : '#1e3a5f',
                  fontFamily: '"IBM Plex Mono"', fontWeight: 700,
                }}>
                  {rowTotal.toFixed(1)}
                </Typography>
              </Box>
            </Box>
          );
        })}

        {/* Totals footer */}
        <Box sx={{ display: 'flex', background: '#070d1a', borderTop: '2px solid #0f2040' }}>
          <Box sx={{ width: GL, minWidth: GL, px: 1.5, py: 1.5, borderRight: '1px solid #0f2040' }}>
            <Typography sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 10, color: '#64748b', fontWeight: 700 }}>
              24-HR SUMMARY
            </Typography>
          </Box>
          <Box sx={{ flex: 1, display: 'flex', gap: 2, px: 2, alignItems: 'center' }}>
            {STATUSES.map(s => {
              const v = summary24[s];
              const cfg = STATUS_CONFIG[s];
              return (
                <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 10, height: 10, background: cfg.color, borderRadius: '2px' }} />
                  <Typography sx={{ fontSize: 10, color: '#475569', fontFamily: '"IBM Plex Mono"' }}>
                    {cfg.short}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: cfg.color, fontFamily: '"IBM Plex Mono"', fontWeight: 700 }}>
                    {v.toFixed(1)}h
                  </Typography>
                </Box>
              );
            })}
          </Box>
          <Box sx={{ width: GR_PAD, minWidth: GR_PAD, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #0f2040' }}>
            <Typography sx={{ fontSize: 12, color: '#f97316', fontFamily: '"IBM Plex Mono"', fontWeight: 700 }}>
              {summary24.total.toFixed(1)}
            </Typography>
          </Box>
        </Box>

        {/* Remarks */}
        <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #0f2040' }}>
          <Typography sx={{ fontSize: 9, color: '#1e3a5f', fontFamily: '"IBM Plex Mono"', mb: 1, letterSpacing: '0.1em' }}>
            REMARKS:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {log.entries
              .filter(e => ['on_duty_nd'].includes(e.status) ||
                ['Pickup','Dropoff','Fuel','Break','Rest','Inspection','Restart'].some(k => e.label.includes(k)))
              .slice(0, 8)
              .map((e, i) => (
                <Chip key={i}
                  label={`${e.label} @ ${e.location.substring(0,22)}`}
                  size="small"
                  sx={{
                    background: `${STATUS_CONFIG[e.status]?.color || '#334155'}18`,
                    color: STATUS_CONFIG[e.status]?.color || '#64748b',
                    border: `1px solid ${STATUS_CONFIG[e.status]?.color || '#334155'}25`,
                    fontFamily: '"IBM Plex Mono"', fontSize: 9,
                  }}
                />
              ))}
          </Box>
        </Box>
      </Paper>

      {/* Legend */}
      <Box sx={{ mt: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {STATUSES.map(s => {
          const cfg = STATUS_CONFIG[s];
          return (
            <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 20, height: 8, background: cfg.color, borderRadius: 0.5 }} />
              <Typography sx={{ fontSize: 9, color: '#334155', fontFamily: '"IBM Plex Mono"' }}>{cfg.label}</Typography>
            </Box>
          );
        })}
        <Typography sx={{ fontSize: 9, color: '#1e3a5f', ml: 'auto', fontFamily: '"IBM Plex Mono"' }}>
          Hover blocks for details
        </Typography>
      </Box>
    </Box>
  );
}
