import React, { useState } from 'react';
import { Box, Paper, Typography, Button, Grid } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

export default function LogSheetViewer({ logImages, dailyLogs }) {
  const [selected, setSelected] = useState(0);
  const [zoom, setZoom]         = useState(1.0);

  const download = (img, day) => {
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${img}`;
    a.download = `hos_log_day${day}.png`;
    a.click();
  };

  const downloadAll = () => logImages.forEach((img, i) => download(img, i + 1));

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, mb: 2,
        flexWrap: 'wrap',
      }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          background: '#052e1680', border: '1px solid #16a34a30',
          borderRadius: 1, px: 1.5, py: 0.5,
        }}>
          <Typography sx={{ color: '#22c55e', fontFamily: '"IBM Plex Mono"', fontSize: 11, fontWeight: 700 }}>
            ✓ {logImages.length} LOG SHEET{logImages.length > 1 ? 'S' : ''} — FMCSA § 395.8
          </Typography>
        </Box>

        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined"
            onClick={() => setZoom(z => Math.min(2, z + 0.2))}
            sx={{ minWidth: 0, px: 1.5, borderColor: '#0f2040', color: '#475569', '&:hover': { borderColor: '#f97316', color: '#f97316' } }}>
            <ZoomInIcon sx={{ fontSize: 18 }} />
          </Button>
          <Button size="small" variant="outlined"
            onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
            sx={{ minWidth: 0, px: 1.5, borderColor: '#0f2040', color: '#475569', '&:hover': { borderColor: '#f97316', color: '#f97316' } }}>
            <ZoomOutIcon sx={{ fontSize: 18 }} />
          </Button>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
            onClick={() => download(logImages[selected], selected + 1)}
            sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 9, borderColor: '#0f2040', color: '#64748b',
              '&:hover': { borderColor: '#f97316', color: '#f97316' } }}>
            DAY {selected + 1}
          </Button>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />}
            onClick={downloadAll}
            sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 9, borderColor: '#0f2040', color: '#64748b',
              '&:hover': { borderColor: '#0ea5e9', color: '#0ea5e9' } }}>
            ALL DAYS
          </Button>
          <Button size="small" variant="outlined" startIcon={<PrintIcon />}
            onClick={() => {
              const w = window.open('');
              logImages.forEach((img, i) => {
                w.document.write(`<img src="data:image/png;base64,${img}" style="width:100%;page-break-after:always" />`);
              });
              w.print();
            }}
            sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 9, borderColor: '#0f2040', color: '#64748b',
              '&:hover': { borderColor: '#a855f7', color: '#a855f7' } }}>
            PRINT ALL
          </Button>
        </Box>
      </Box>

      {/* Day selector tabs */}
      {logImages.length > 1 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {logImages.map((_, i) => (
            <Box key={i} onClick={() => setSelected(i)} sx={{
              px: 2, py: 0.75, borderRadius: 1, cursor: 'pointer',
              fontFamily: '"IBM Plex Mono"', fontSize: 11,
              background: selected === i ? '#f97316' : '#0d1526',
              color: selected === i ? '#fff' : '#475569',
              border: `1px solid ${selected === i ? '#f97316' : '#0f2040'}`,
              transition: 'all 0.15s',
              '&:hover': { borderColor: '#f97316', color: selected === i ? '#fff' : '#f97316' },
            }}>
              DAY {i + 1}
              <Box component="span" sx={{ ml: 1, fontSize: 9, opacity: 0.7 }}>
                {dailyLogs[i]?.total_driving?.toFixed(1)}h
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Main sheet viewer */}
      <Paper sx={{
        overflow: 'hidden', background: '#0d1526', border: '1px solid #0f2040',
        mb: logImages.length > 1 ? 3 : 0,
      }}>
        <Box sx={{
          px: 2, py: 1.5, background: '#070d1a', borderBottom: '1px solid #0f2040',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <Typography sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 11, color: '#64748b' }}>
            {dailyLogs[selected]?.date_label?.toUpperCase()} — DRIVER'S DAILY LOG
          </Typography>
          <Typography sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 9, color: '#334155' }}>
            Zoom: {Math.round(zoom * 100)}%
          </Typography>
        </Box>
        <Box sx={{ overflowX: 'auto', background: '#fff' }}>
          <Box sx={{ transform: `scale(${zoom})`, transformOrigin: 'top left',
            width: zoom < 1 ? `${100 / zoom}%` : '100%' }}>
            <img
              src={`data:image/png;base64,${logImages[selected]}`}
              alt={`Log Sheet Day ${selected + 1}`}
              style={{ width: '100%', display: 'block', imageRendering: 'crisp-edges' }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Thumbnail strip */}
      {logImages.length > 1 && (
        <Box>
          <Typography sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 9, color: '#1e3a5f', mb: 1.5, letterSpacing: '0.1em' }}>
            ALL LOG SHEETS:
          </Typography>
          <Grid container spacing={1.5}>
            {logImages.map((img, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Paper onClick={() => setSelected(i)} sx={{
                  overflow: 'hidden', cursor: 'pointer',
                  background: '#0d1526',
                  border: `1px solid ${selected === i ? '#f97316' : '#0f2040'}`,
                  boxShadow: selected === i ? '0 0 0 2px #f97316' : 'none',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: '#f97316', transform: 'translateY(-2px)' },
                }}>
                  <Box sx={{
                    px: 1.5, py: 0.75, display: 'flex', justifyContent: 'space-between',
                    background: selected === i ? '#f97316' : '#070d1a',
                    borderBottom: `1px solid ${selected === i ? '#ea580c' : '#0f2040'}`,
                  }}>
                    <Typography sx={{ fontFamily: '"IBM Plex Mono"', fontSize: 10,
                      color: selected === i ? '#fff' : '#64748b', fontWeight: 700 }}>
                      DAY {i + 1}
                    </Typography>
                    <Typography sx={{ fontSize: 9, color: selected === i ? 'rgba(255,255,255,0.7)' : '#334155',
                      fontFamily: '"IBM Plex Mono"' }}>
                      {dailyLogs[i]?.total_driving?.toFixed(1)}h drive · {parseInt(dailyLogs[i]?.odometer_end - dailyLogs[i]?.odometer_start)} mi
                    </Typography>
                  </Box>
                  <img
                    src={`data:image/png;base64,${img}`}
                    alt={`Day ${i + 1}`}
                    style={{ width: '100%', display: 'block', opacity: selected === i ? 1 : 0.55, transition: 'opacity 0.15s' }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
