import React from 'react';
import { Box, Grid, Paper, Typography, Chip, Tooltip, LinearProgress } from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import HotelIcon from '@mui/icons-material/Hotel';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TimerIcon from '@mui/icons-material/Timer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const STOP_COLORS  = { pickup:'#0ea5e9', dropoff:'#f97316', fuel:'#22c55e', rest:'#a855f7', restart:'#f59e0b' };
const STOP_EMOJIS  = { pickup:'📦', dropoff:'🏁', fuel:'⛽', rest:'🛌', restart:'🔄' };
const STOP_LABELS  = { pickup:'Pickup', dropoff:'Drop-off', fuel:'Fuel Stop', rest:'Rest Break', restart:'34-Hr Restart' };

function StatCard({ icon, label, value, color='#f97316', sub }) {
  return (
    <Paper sx={{
      p:2, background:'#0d1526', border:'1px solid #0f2040', borderRadius:1.5,
      height:'100%', position:'relative', overflow:'hidden',
      transition:'border-color 0.2s,transform 0.2s',
      '&:hover':{ borderColor:`${color}40`, transform:'translateY(-1px)' },
    }}>
      <Box sx={{ position:'absolute', top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg,${color},transparent)` }} />
      <Box sx={{ position:'absolute', bottom:0, right:0, width:56, height:56,
        borderRadius:'50%', background:`${color}06`, transform:'translate(20%,20%)' }} />
      <Box sx={{ display:'flex', gap:1.5, alignItems:'flex-start' }}>
        <Box sx={{ width:32, height:32, borderRadius:1, background:`${color}15`,
          border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {React.cloneElement(icon, { sx:{ color, fontSize:16 } })}
        </Box>
        <Box>
          <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:9, color:'#334155', letterSpacing:'0.08em' }}>
            {label}
          </Typography>
          <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:20, fontWeight:700, color:'#f1f5f9', lineHeight:1.2 }}>
            {value}
          </Typography>
          {sub && <Typography sx={{ fontSize:10, color:'#1e3a5f', mt:0.2 }}>{sub}</Typography>}
        </Box>
      </Box>
    </Paper>
  );
}

function DayBar({ log, maxMiles }) {
  const driving   = log.total_driving;
  const onduty    = log.total_on_duty;
  const offduty   = log.total_off_duty;
  const miles     = log.odometer_end - log.odometer_start;
  const milesPct  = maxMiles > 0 ? Math.round((miles / maxMiles) * 100) : 0;

  return (
    <Box sx={{ mb:1.5 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
        <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:10, color:'#64748b', fontWeight:700 }}>
          {log.date_label}
        </Typography>
        <Box sx={{ display:'flex', gap:1.5 }}>
          {[
            { label:'drive', val:driving,  color:'#ef4444' },
            { label:'work',  val:onduty,   color:'#22c55e' },
            { label:'off',   val:offduty,  color:'#3b82f6' },
          ].map(({ label, val, color }) => val > 0 && (
            <Typography key={label} sx={{ fontFamily:'"IBM Plex Mono"', fontSize:9, color }}>
              {val.toFixed(1)}h {label}
            </Typography>
          ))}
          <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:9, color:'#475569' }}>
            | {miles.toFixed(0)} mi
          </Typography>
        </Box>
      </Box>

      {/* Stacked 24-hr bar */}
      <Box sx={{ height:10, borderRadius:1, overflow:'hidden', background:'#0a1628',
        border:'1px solid #0f2040', display:'flex' }}>
        {log.entries && log.entries.map((e, i) => {
          const pct = (e.duration_hours / 24) * 100;
          const col = { driving:'#ef4444', on_duty_nd:'#22c55e', off_duty:'#3b82f6', sleeper:'#6366f1' }[e.status] || '#1e293b';
          return (
            <Tooltip key={i} title={`${e.label} (${e.duration_hours.toFixed(1)}h)`} arrow>
              <Box sx={{ width:`${pct}%`, background:col, minWidth: pct > 2 ? undefined : 1 }} />
            </Tooltip>
          );
        })}
      </Box>

      {/* Miles progress vs best day */}
      <Box sx={{ mt:0.5, display:'flex', alignItems:'center', gap:1 }}>
        <LinearProgress variant="determinate" value={milesPct}
          sx={{ flex:1, height:3, borderRadius:1, background:'#0f2040',
            '& .MuiLinearProgress-bar':{ background:`linear-gradient(90deg,#f97316,#ea580c)` } }} />
        <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:8, color:'#1e3a5f', minWidth:28 }}>
          {milesPct}%
        </Typography>
      </Box>
    </Box>
  );
}

export default function TripSummary({ summary, stops, locations, dailyLogs }) {
  if (!summary) return null;

  const maxDayMiles = dailyLogs
    ? Math.max(...dailyLogs.map(l => l.odometer_end - l.odometer_start))
    : 1;

  return (
    <Box>
      {/* Route header bar */}
      <Paper sx={{ mb:2, p:2, background:'#0d1526', border:'1px solid #0f2040',
        borderRadius:1.5, display:'flex', alignItems:'center', gap:2, flexWrap:'wrap' }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1, background:'#052e1680',
          border:'1px solid #16a34a30', borderRadius:1, px:1.5, py:0.5 }}>
          <CheckCircleIcon sx={{ color:'#22c55e', fontSize:16 }} />
          <Typography sx={{ color:'#22c55e', fontFamily:'"IBM Plex Mono"', fontSize:11, fontWeight:700 }}>
            HOS COMPLIANT
          </Typography>
        </Box>
        <Box sx={{ display:'flex', alignItems:'center', gap:1, flexWrap:'wrap' }}>
          {[
            { label:locations?.origin?.name,  color:'#22c55e' },
            { label:locations?.pickup?.name,  color:'#0ea5e9', arrow:true },
            { label:locations?.dropoff?.name, color:'#f97316', arrow:true },
          ].map((loc, i) => (
            <React.Fragment key={i}>
              {loc.arrow && <ArrowForwardIcon sx={{ fontSize:14, color:'#1e3a5f' }} />}
              <Chip label={loc.label} size="small" sx={{
                background:`${loc.color}12`, color:loc.color,
                border:`1px solid ${loc.color}25`, fontFamily:'"IBM Plex Mono"', fontSize:10,
              }} />
            </React.Fragment>
          ))}
        </Box>
        <Box sx={{ ml:'auto', display:'flex', gap:2 }}>
          <Box sx={{ textAlign:'center' }}>
            <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:9, color:'#334155' }}>TOTAL</Typography>
            <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontWeight:700, color:'#f97316', fontSize:16 }}>
              {summary.total_miles.toLocaleString()} mi
            </Typography>
          </Box>
          <Box sx={{ textAlign:'center' }}>
            <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:9, color:'#334155' }}>DURATION</Typography>
            <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontWeight:700, color:'#0ea5e9', fontSize:16 }}>
              {summary.total_days} days
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stat cards */}
      <Grid container spacing={1.5} sx={{ mb:2 }}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<RouteIcon />} label="TOTAL MILES"
            value={summary.total_miles.toLocaleString()}
            sub={`≈ ${summary.estimated_drive_hours}h drive`} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<CalendarTodayIcon />} label="TRIP DAYS"
            value={summary.total_days} color="#0ea5e9" sub="incl. rest days" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<TimerIcon />} label="DRIVE TIME"
            value={`${summary.estimated_drive_hours}h`} color="#a855f7" sub="@ 55 mph avg" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<LocalGasStationIcon />} label="FUEL STOPS"
            value={summary.fuel_stops} color="#22c55e" sub="≤ 1,000-mi intervals" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<HotelIcon />} label="REST STOPS"
            value={summary.rest_stops} color="#f59e0b" sub="mandatory HOS breaks" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<RouteIcon />} label="TO PICKUP"
            value={`${summary.distance_to_pickup} mi`} color="#64748b"
            sub={`+ ${summary.distance_pickup_to_dropoff} mi`} />
        </Grid>
      </Grid>

      {/* Per-day breakdown + stop timeline */}
      <Grid container spacing={2}>

        {/* Day-by-day bars */}
        {dailyLogs && dailyLogs.length > 0 && (
          <Grid item xs={12} md={7}>
            <Paper sx={{ p:2, background:'#0d1526', border:'1px solid #0f2040', borderRadius:1.5, height:'100%' }}>
              <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:2 }}>
                <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:9, color:'#334155', letterSpacing:'0.1em' }}>
                  DAILY BREAKDOWN
                </Typography>
                <Box sx={{ display:'flex', gap:1.5 }}>
                  {[
                    { label:'Driving', color:'#ef4444' },
                    { label:'On-Duty', color:'#22c55e' },
                    { label:'Off/Rest', color:'#3b82f6' },
                  ].map(({ label, color }) => (
                    <Box key={label} sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                      <Box sx={{ width:8, height:8, borderRadius:1, background:color }} />
                      <Typography sx={{ fontSize:8, color, fontFamily:'"IBM Plex Mono"' }}>{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              {dailyLogs.map((log, i) => (
                <DayBar key={i} log={log} maxMiles={maxDayMiles} />
              ))}
            </Paper>
          </Grid>
        )}

        {/* Stop sequence */}
        <Grid item xs={12} md={dailyLogs?.length > 0 ? 5 : 12}>
          <Paper sx={{ p:2, background:'#0d1526', border:'1px solid #0f2040', borderRadius:1.5, height:'100%' }}>
            <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:9, color:'#334155', mb:1.5, letterSpacing:'0.1em' }}>
              STOP SEQUENCE
            </Typography>

            {/* Origin */}
            <Box sx={{ display:'flex', alignItems:'flex-start', gap:1.5, mb:1.5 }}>
              <Box sx={{ width:28, height:28, borderRadius:'50%', background:'#22c55e20',
                border:'2px solid #22c55e', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Typography sx={{ fontSize:13 }}>🚛</Typography>
              </Box>
              <Box sx={{ pt:0.3 }}>
                <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:10, color:'#22c55e', fontWeight:700 }}>
                  ORIGIN
                </Typography>
                <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:11, color:'#94a3b8' }}>
                  {locations?.origin?.name}
                </Typography>
              </Box>
            </Box>

            {/* Connector line + stops */}
            {stops.map((s, i) => {
              const color = STOP_COLORS[s.stop_type] || '#64748b';
              const emoji = STOP_EMOJIS[s.stop_type] || '📍';
              const label = STOP_LABELS[s.stop_type] || s.stop_type;
              return (
                <Box key={i}>
                  <Box sx={{ display:'flex', alignItems:'stretch', gap:0, ml:1.3, mb:0 }}>
                    <Box sx={{ width:2, background:`${color}25`, alignSelf:'stretch', minHeight:12, mr:1.8 }} />
                  </Box>
                  <Box sx={{ display:'flex', alignItems:'flex-start', gap:1.5, mb:1 }}>
                    <Tooltip title={`Day ${s.day} · ${s.duration_hours}h stop · Mile ${s.cumulative_miles}`} arrow>
                      <Box sx={{ width:28, height:28, borderRadius:'50%', background:`${color}20`,
                        border:`2px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center',
                        flexShrink:0, cursor:'help' }}>
                        <Typography sx={{ fontSize:12 }}>{emoji}</Typography>
                      </Box>
                    </Tooltip>
                    <Box sx={{ pt:0.2 }}>
                      <Box sx={{ display:'flex', gap:1, alignItems:'center' }}>
                        <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:10, color, fontWeight:700 }}>
                          {label.toUpperCase()}
                        </Typography>
                        <Chip label={`Day ${s.day}`} size="small" sx={{
                          height:14, fontSize:8, fontFamily:'"IBM Plex Mono"',
                          background:`${color}15`, color, border:`1px solid ${color}30`,
                        }} />
                      </Box>
                      <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:11, color:'#94a3b8' }}>
                        {s.name}
                      </Typography>
                      <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:9, color:'#334155' }}>
                        {s.duration_hours}h · {s.cumulative_miles} mi mark
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
