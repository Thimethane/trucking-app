import React, { useState, useCallback } from 'react';
import {
  Box, Container, Typography, Paper, Alert, Chip,
  LinearProgress, Tabs, Tab, Fade,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import VerifiedIcon from '@mui/icons-material/Verified';
import TripForm from '../components/TripForm';
import TripSummary from '../components/TripSummary';
import RouteMap from '../components/RouteMap';
import HOSLogGrid from '../components/HOSLogGrid';
import LogSheetViewer from '../components/LogSheetViewer';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const HOS_RULES = [
  { code:'11-HR',     desc:'Max driving',    color:'#ef4444' },
  { code:'14-HR',     desc:'Window limit',   color:'#f97316' },
  { code:'30-MIN',    desc:'Break rule',     color:'#22c55e' },
  { code:'70-HR',     desc:'8-day cycle',    color:'#a855f7' },
  { code:'34-HR RST', desc:'Cycle restart',  color:'#0ea5e9' },
];

const LOAD_STEPS = [
  { pct:15,  msg:'Geocoding locations via OpenStreetMap Nominatim…' },
  { pct:40,  msg:'Running FMCSA HOS compliance engine…' },
  { pct:60,  msg:'Scheduling mandatory stops & fuel breaks…' },
  { pct:80,  msg:'Building daily log entries…' },
  { pct:92,  msg:'Rendering ELD log sheet images…' },
  { pct:100, msg:'Finalizing route…' },
];

export default function TripPlannerPage() {
  const [loading,   setLoading]   = useState(false);
  const [loadPct,   setLoadPct]   = useState(0);
  const [loadMsg,   setLoadMsg]   = useState('');
  const [error,     setError]     = useState(null);
  const [result,    setResult]    = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const handleSubmit = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    setResult(null);

    // Animate progress through fake steps while the API call runs
    let stepIdx = 0;
    const tick = () => {
      if (stepIdx < LOAD_STEPS.length - 1) {
        const step = LOAD_STEPS[stepIdx++];
        setLoadPct(step.pct);
        setLoadMsg(step.msg);
        setTimeout(tick, 600 + Math.random() * 400);
      }
    };
    tick();

    try {
      const resp = await axios.post(`${API_URL}/api/trips/plan/`, formData);
      setLoadPct(100);
      setLoadMsg('Done!');
      await new Promise(r => setTimeout(r, 300));
      setResult(resp.data);
      setActiveTab(0);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        `Connection failed — is the backend running at ${API_URL}?`
      );
    } finally {
      setLoading(false);
      setLoadPct(0);
      setLoadMsg('');
    }
  }, []);

  return (
    <Box sx={{ minHeight:'100vh', background:'#070d1a' }}>

      {/* ── TOPBAR ─────────────────────────────────────────────────────── */}
      <Box sx={{
        borderBottom:'1px solid #0f2040',
        background:'linear-gradient(180deg,#0d1a2e 0%,#070d1a 100%)',
        px:{ xs:2, md:4 }, py:1.5,
        display:'flex', alignItems:'center', gap:2,
        position:'sticky', top:0, zIndex:100,
        backdropFilter:'blur(12px)',
      }}>
        <Box sx={{
          width:38, height:38, borderRadius:1.5,
          background:'linear-gradient(135deg,#f97316,#ea580c)',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }}>
          <LocalShippingIcon sx={{ color:'#fff', fontSize:22 }} />
        </Box>
        <Box>
          <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontWeight:700, color:'#f1f5f9', fontSize:14 }}>
            TRUCKLOGGER HOS
          </Typography>
          <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:9, color:'#1e3a5f', letterSpacing:'0.08em' }}>
            FMCSA HOURS OF SERVICE COMPLIANCE ENGINE
          </Typography>
        </Box>

        <Box sx={{ ml:'auto', display:'flex', gap:1, flexWrap:'wrap' }}>
          {HOS_RULES.map(r => (
            <Chip key={r.code} label={r.code} size="small" sx={{
              background:`${r.color}12`, color:r.color,
              border:`1px solid ${r.color}25`,
              fontFamily:'"IBM Plex Mono"', fontSize:9, letterSpacing:'0.04em',
            }} />
          ))}
          <Chip
            icon={<VerifiedIcon sx={{ fontSize:'12px !important', color:'#22c55e !important' }} />}
            label="49 CFR § 395"
            size="small"
            sx={{ background:'#22c55e12', color:'#22c55e', border:'1px solid #22c55e25',
              fontFamily:'"IBM Plex Mono"', fontSize:9 }}
          />
        </Box>
      </Box>

      {/* ── Loading bar ─────────────────────────────────────────────────── */}
      {loading && (
        <Box sx={{ position:'sticky', top:57, zIndex:99, background:'#070d1a',
          borderBottom:'1px solid #0f2040', px:3, py:1.5 }}>
          <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.75 }}>
            <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:10, color:'#475569' }}>
              {loadMsg}
            </Typography>
            <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:10, color:'#f97316', fontWeight:700 }}>
              {loadPct}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={loadPct} sx={{
            height:3, borderRadius:2, background:'#0f2040',
            '& .MuiLinearProgress-bar':{
              background:'linear-gradient(90deg,#f97316,#0ea5e9)',
              transition:'transform 0.6s ease',
            },
          }} />
        </Box>
      )}

      {/* ── MAIN LAYOUT ─────────────────────────────────────────────────── */}
      <Container maxWidth="xl" sx={{ py:3 }}>
        <Box sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr', lg:'320px 1fr' }, gap:3 }}>

          {/* Sidebar */}
          <Box>
            <TripForm onSubmit={handleSubmit} loading={loading} />
          </Box>

          {/* Results panel */}
          <Box>
            {error && (
              <Alert severity="error" sx={{
                mb:2, background:'#2d0a0a', border:'1px solid #7f1d1d',
                color:'#fca5a5', fontFamily:'"IBM Plex Mono"', fontSize:12,
                '& .MuiAlert-icon':{ color:'#ef4444' },
              }}>
                {error}
              </Alert>
            )}

            {!result && !loading && !error && (
              <Box sx={{
                height:400, display:'flex', alignItems:'center', justifyContent:'center',
                border:'1px dashed #0f2040', borderRadius:2,
              }}>
                <Box sx={{ textAlign:'center' }}>
                  <LocalShippingIcon sx={{ fontSize:48, color:'#0f2040', mb:2 }} />
                  <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:13, color:'#1e3a5f', mb:1 }}>
                    READY TO PLAN
                  </Typography>
                  <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:10, color:'#0f2040' }}>
                    Enter your route or select a preset to calculate
                  </Typography>
                  <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:10, color:'#0f2040' }}>
                    an FMCSA-compliant schedule with ELD log sheets
                  </Typography>
                </Box>
              </Box>
            )}

            {result && (
              <Fade in timeout={500}>
                <Box>
                  {/* Summary always visible */}
                  <TripSummary
                    summary={result.summary}
                    stops={result.stops}
                    locations={result.locations}
                    dailyLogs={result.daily_logs}
                  />

                  {/* Tabbed detail views */}
                  <Paper sx={{ mt:2, background:'#0d1526', border:'1px solid #0f2040', borderRadius:1.5, overflow:'hidden' }}>
                    <Tabs
                      value={activeTab}
                      onChange={(_, v) => setActiveTab(v)}
                      sx={{
                        borderBottom:'1px solid #0f2040',
                        '& .MuiTab-root':{ fontFamily:'"IBM Plex Mono"', fontSize:10, color:'#334155',
                          letterSpacing:'0.06em', minHeight:44, textTransform:'none' },
                        '& .Mui-selected':{ color:'#f97316 !important' },
                        '& .MuiTabs-indicator':{ background:'#f97316' },
                      }}
                    >
                      <Tab label="🗺  Route Map" />
                      <Tab label="📊  HOS Grid" />
                      <Tab label="📋  Log Sheets" />
                    </Tabs>
                    <Box sx={{ p:2 }}>
                      {activeTab === 0 && (
                        <RouteMap
                          locations={result.locations}
                          stops={result.stops}
                          waypoints={result.waypoints}
                        />
                      )}
                      {activeTab === 1 && (
                        <HOSLogGrid dailyLogs={result.daily_logs} />
                      )}
                      {activeTab === 2 && (
                        <LogSheetViewer logImages={result.log_images} dailyLogs={result.daily_logs} />
                      )}
                    </Box>
                  </Paper>
                </Box>
              </Fade>
            )}
          </Box>
        </Box>
      </Container>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <Box sx={{ borderTop:'1px solid #0a1628', py:2, px:4, mt:4, display:'flex', gap:3, flexWrap:'wrap' }}>
        <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:8, color:'#0f2040' }}>
          TRUCKLOGGER HOS  ·  49 CFR PART 395 PROPERTY-CARRYING VEHICLES
        </Typography>
        <Typography sx={{ fontFamily:'"IBM Plex Mono"', fontSize:8, color:'#0f2040', ml:'auto' }}>
          MAP DATA © OPENSTREETMAP CONTRIBUTORS  ·  ROUTING BY OSRM  ·  TILES BY CARTO
        </Typography>
      </Box>
    </Box>
  );
}
