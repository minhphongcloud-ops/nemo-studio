import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import * as store from './store.js';
import { TikTokManager } from './tiktok.js';
import { GiftEngine } from './giftEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// ─── Express App ─────────────────────────────────────────
const app = express();
app.use(express.json());

// Serve static files (Vite build output) in production
const distPath = path.join(__dirname, '..', 'dist');
if (IS_PROD) {
  app.use(express.static(distPath));
}

const httpServer = createServer(app);

// ─── Socket.IO ───────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ─── Services ────────────────────────────────────────────
const tiktok = new TikTokManager();
const giftEngine = new GiftEngine();

// ─── REST API ────────────────────────────────────────────

// Accounts
app.get('/api/accounts', async (_, res) => res.json(await store.getAccounts()));
app.post('/api/accounts', async (req, res) => {
  const account = await store.addAccount(req.body);
  io.emit('accounts:updated', await store.getAccounts());
  res.json(account);
});
app.put('/api/accounts/:id', async (req, res) => {
  const result = await store.updateAccount(req.params.id, req.body);
  if (result) {
    io.emit('accounts:updated', await store.getAccounts());
    res.json(result);
  } else {
    res.status(404).json({ error: 'Không tìm thấy' });
  }
});
app.delete('/api/accounts/:id', async (req, res) => {
  tiktok.disconnect(req.params.id);
  await store.deleteAccount(req.params.id);
  io.emit('accounts:updated', await store.getAccounts());
  res.json({ ok: true });
});
app.post('/api/accounts/:id/select', async (req, res) => {
  const result = await store.selectAccount(req.params.id);
  io.emit('accounts:updated', await store.getAccounts());
  res.json(result);
});

// Rules
app.get('/api/rules', async (_, res) => res.json(await store.getRules()));
app.post('/api/rules', async (req, res) => {
  const rule = await store.addRule(req.body);
  io.emit('rules:updated', await store.getRules());
  res.json(rule);
});
app.put('/api/rules/:id', async (req, res) => {
  const result = await store.updateRule(req.params.id, req.body);
  if (result) {
    io.emit('rules:updated', await store.getRules());
    res.json(result);
  } else {
    res.status(404).json({ error: 'Không tìm thấy' });
  }
});
app.delete('/api/rules/:id', async (req, res) => {
  await store.deleteRule(req.params.id);
  io.emit('rules:updated', await store.getRules());
  res.json({ ok: true });
});
app.post('/api/rules/reorder', async (req, res) => {
  const rules = await store.reorderRules(req.body.ids);
  io.emit('rules:updated', rules);
  res.json(rules);
});

// Dances
app.get('/api/dances', async (_, res) => res.json(await store.getDances()));
app.post('/api/dances', async (req, res) => {
  const dance = await store.addDance(req.body);
  io.emit('dances:updated', await store.getDances());
  res.json(dance);
});
app.put('/api/dances/:id', async (req, res) => {
  const result = await store.updateDance(req.params.id, req.body);
  if (result) {
    io.emit('dances:updated', await store.getDances());
    res.json(result);
  } else {
    res.status(404).json({ error: 'Không tìm thấy' });
  }
});
app.delete('/api/dances/:id', async (req, res) => {
  await store.deleteDance(req.params.id);
  io.emit('dances:updated', await store.getDances());
  res.json({ ok: true });
});

// Settings
app.get('/api/settings', async (_, res) => res.json(await store.getSettings()));
app.put('/api/settings', async (req, res) => {
  const settings = await store.updateSettings(req.body);
  io.emit('settings:updated', settings);
  res.json(settings);
});

// Gift engine state
app.get('/api/engine/state', (_, res) => res.json(giftEngine.getState()));

// SPA fallback — serve index.html for non-API routes (production only)
if (IS_PROD) {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// ─── Socket.IO Events ───────────────────────────────────
io.on('connection', async (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send initial state (all async)
  const [accounts, rules, dances, settings] = await Promise.all([
    store.getAccounts(),
    store.getRules(),
    store.getDances(),
    store.getSettings(),
  ]);

  socket.emit('init', {
    accounts,
    rules,
    dances,
    settings,
    engine: giftEngine.getState(),
    tiktokStatus: tiktok.getStatus(),
  });

  // ── TikTok Account Actions ──
  socket.on('tiktok:connect', async ({ accountId, username }) => {
    console.log(`[Socket] Connecting to @${username}...`);
    await store.updateAccount(accountId, { status: 'connecting', isConnected: false });
    io.emit('accounts:updated', await store.getAccounts());
    const state = await tiktok.connect(accountId, username);
    if (state) {
      await store.updateAccount(accountId, {
        status: 'live',
        isConnected: true,
        roomId: state.roomId,
        viewers: String(state.viewerCount || 0),
      });
    } else {
      await store.updateAccount(accountId, { status: 'offline', isConnected: false });
    }
    io.emit('accounts:updated', await store.getAccounts());
  });

  socket.on('tiktok:disconnect', async ({ accountId }) => {
    tiktok.disconnect(accountId);
    await store.updateAccount(accountId, { status: 'offline', isConnected: false, roomId: null });
    io.emit('accounts:updated', await store.getAccounts());
  });

  // ── Gift Engine Controls ──
  socket.on('engine:start',  () => giftEngine.start());
  socket.on('engine:stop',   () => giftEngine.stop());
  socket.on('engine:pause',  () => giftEngine.pause());
  socket.on('engine:resume', () => giftEngine.resume());
  socket.on('engine:reset',  () => giftEngine.reset());
  socket.on('engine:skip',   () => giftEngine.skipCurrent());

  // ── Queue Controls ──
  socket.on('queue:remove', ({ itemId }) => giftEngine.removeFromQueue(itemId));
  socket.on('queue:clear', () => giftEngine.clearQueue());

  // ── DevTools: Simulate Gift ──
  socket.on('devtools:gift', async (data) => {
    console.log(`[DevTools] Simulated gift: ${data.giftName} x${data.quantity}`);
    const giftEvent = {
      giftId: Date.now().toString(),
      giftName: data.giftName,
      repeatCount: data.quantity,
      nickname: data.username || 'DevUser',
      uniqueId: data.username || 'devuser',
      userId: 'dev_' + Date.now(),
      profilePictureUrl: '',
      timestamp: Date.now()
    };
    io.emit('tiktok:gift', giftEvent);
    const result = await giftEngine.processGift(giftEvent);
    if (result && result.matched) {
      io.emit('gift:matched', { rule: result.rule, queueItem: result.queueItem });
    }
  });

  // ── Account CRUD via Socket ──
  socket.on('account:add', async (data) => {
    await store.addAccount(data);
    io.emit('accounts:updated', await store.getAccounts());
  });
  socket.on('account:delete', async ({ id }) => {
    tiktok.disconnect(id);
    await store.deleteAccount(id);
    io.emit('accounts:updated', await store.getAccounts());
  });
  socket.on('account:select', async ({ id }) => {
    await store.selectAccount(id);
    io.emit('accounts:updated', await store.getAccounts());
  });

  // ── Settings via Socket ──
  socket.on('settings:update', async (data) => {
    const settings = await store.updateSettings(data);
    io.emit('settings:updated', settings);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ─── TikTok Events → Socket.IO ──────────────────────────
tiktok.on('connected', (data) => io.emit('tiktok:connected', data));

tiktok.on('gift', async (data) => {
  io.emit('tiktok:gift', data);
  const result = await giftEngine.processGift(data);
  if (result && result.matched) {
    io.emit('gift:matched', { rule: result.rule, queueItem: result.queueItem });
  }
});

tiktok.on('chat', (data) => io.emit('tiktok:chat', data));
tiktok.on('like', (data) => io.emit('tiktok:like', data));

tiktok.on('roomUser', async (data) => {
  await store.updateAccount(data.accountId, { viewers: String(data.viewerCount) });
  io.emit('tiktok:roomUser', data);
  io.emit('accounts:updated', await store.getAccounts());
});

tiktok.on('streamEnd', async (data) => {
  await store.updateAccount(data.accountId, { status: 'offline', isConnected: false });
  io.emit('tiktok:streamEnd', data);
  io.emit('accounts:updated', await store.getAccounts());
});

tiktok.on('disconnected', async (data) => {
  if (data.accountId) {
    await store.updateAccount(data.accountId, { status: 'offline', isConnected: false });
    io.emit('accounts:updated', await store.getAccounts());
  }
});

tiktok.on('error', (data) => io.emit('tiktok:error', data));

// ─── Gift Engine Events → Socket.IO ─────────────────────
giftEngine.on('queueUpdate',      (data) => io.emit('engine:queueUpdate', data));
giftEngine.on('animationStart',   (data) => io.emit('engine:animationStart', data));
giftEngine.on('animationUpdate',  (data) => io.emit('engine:animationUpdate', data));
giftEngine.on('animationEnd',     (data) => io.emit('engine:animationEnd', data));
giftEngine.on('engineState',      (data) => io.emit('engine:state', data));
giftEngine.on('ruleMatched',      (data) => io.emit('engine:ruleMatched', data));

// ─── Start Server ────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║     🎤 Nemo Studio Server v1.0.0     ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║  Port:   ${PORT}                          ║`);
  console.log(`  ║  Mode:   ${IS_PROD ? 'production' : 'development'}                ║`);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');

  // Auto-start gift engine
  giftEngine.start();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  tiktok.disconnectAll();
  giftEngine.stop();
  httpServer.close(() => process.exit(0));
});
