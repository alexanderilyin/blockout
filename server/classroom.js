#!/usr/bin/env node
// Blockout classroom server. No dependencies: Node's http module serves the
// game itself plus a small JSON API, and pushes live updates with Server-Sent Events.
// Where a proxy holds event streams back (Cloudflare quick tunnels, some school
// filters) pages fall back to long polling: /poll answers as soon as anything changes.
//
//   node server/classroom.js [port] [--public-url https://example.com]
//
// Then open http://localhost:8080 on the teacher's computer. Chromebooks on the
// same network join at the address printed below (the teacher's screen shows it too).
// Behind a tunnel or proxy (e.g. cloudflared tunnel --url http://localhost:8080),
// pass its address as --public-url (or PUBLIC_URL=...) so the join code and QR use it.
'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Rooms = require('./rooms.js');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const PORT = Number(args.find((a) => /^\d+$/.test(a)) || process.env.PORT || 8080);
// The address students should use, when it isn't this computer's own (tunnels, proxies).
const PUBLIC_URL = (flag('--public-url') || process.env.PUBLIC_URL || '').replace(/\/*$/, '/').replace(/^\/$/, '');
const ROOT = path.resolve(__dirname, '..');
const ROOM_IDLE_MS = 4 * 60 * 60 * 1000; // forget a class after 4 hours without activity
const AUTO_NEXT_MS = 2500; // pause after everyone is done, so the class sees the last answers land
const HEARTBEAT_MS = 25000;
const POLL_HOLD_MS = 25000; // a long poll waits this long for a change before answering anyway
const CLOSED_MEMORY_MS = 30 * 60 * 1000; // pollers of a closed class are told so for this long
const MAX_BODY = 16 * 1024;

const rooms = new Map(); // code -> room
const streams = new Map(); // code -> Set of { res, role: 'teacher' | 'student', id }
const pollers = new Map(); // code -> Set of { res, role, id, timer } waiting for a change
const closedRooms = new Map(); // code -> when it was closed

// ---------------------------------------------------------------- static files

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};
const PUBLIC = ['index.html', 'css/', 'js/', 'prototypes/'];

function serveStatic(req, res) {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(ROOT, rel);
  const allowed = file.startsWith(ROOT + path.sep) && PUBLIC.some((p) => rel === p || (p.endsWith('/') && rel.startsWith(p)));
  if (!allowed) return send(res, 404, 'Not found', 'text/plain');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Rooms.RoomError('size', 'Too much data.'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (e) {
        reject(new Rooms.RoomError('json', 'Bad request.'));
      }
    });
  });
}

// ---------------------------------------------------------------- live updates

// Everyone in the room gets their own view of it. Several changes in a row are
// sent once.
const pending = new Map(); // code -> timeout
function broadcast(room) {
  if (pending.has(room.code)) return;
  pending.set(
    room.code,
    setTimeout(() => {
      pending.delete(room.code);
      room.version = (room.version || 0) + 1;
      for (const s of streams.get(room.code) || []) pushView(room, s);
      for (const w of pollers.get(room.code) || []) answerPoll(room, w);
    }, 60)
  );
}

function pushView(room, s) {
  if (s.role === 'teacher') return event(s.res, 'view', Rooms.teacherView(room));
  const p = room.players.find((x) => x.id === s.id);
  if (p) event(s.res, 'view', Rooms.studentView(room, p));
  else {
    event(s.res, 'removed', {});
    s.res.end();
  }
}

function event(res, name, data) {
  res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

function openStream(req, res, room, role, player) {
  // no-transform / X-Accel-Buffering: proxies and tunnels must pass events straight through
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store, no-transform',
    'X-Accel-Buffering': 'no',
    Connection: 'keep-alive',
  });
  res.write('retry: 2000\n\n');
  const s = { res, role, id: player && player.id };
  if (!streams.has(room.code)) streams.set(room.code, new Set());
  streams.get(room.code).add(s);
  if (player) player.connections++;
  pushView(room, s);
  broadcast(room);
  const beat = setInterval(() => res.write(': ♥\n\n'), HEARTBEAT_MS);
  req.on('close', () => {
    clearInterval(beat);
    streams.get(room.code)?.delete(s);
    if (player) {
      player.connections = Math.max(0, player.connections - 1);
      maybeAutoNext(room); // don't keep the class waiting for someone who left
    }
    broadcast(room);
  });
}

// Long polling: GET /api/rooms/CODE/poll?v=VERSION&teacher=KEY (or &id=ID&key=KEY).
// Answers straight away if the room has moved on from VERSION, otherwise at the
// next change (or after POLL_HOLD_MS). Polling students count as here while they poll.
function openPoll(req, res, room, role, player, version) {
  if (player) player.seenAt = Date.now();
  const w = { res, role, id: player && player.id, timer: null };
  if (version !== (room.version || 0)) return answerPoll(room, w);
  if (!pollers.has(room.code)) pollers.set(room.code, new Set());
  pollers.get(room.code).add(w);
  w.timer = setTimeout(() => answerPoll(room, w), POLL_HOLD_MS);
  req.on('close', () => {
    clearTimeout(w.timer);
    pollers.get(room.code)?.delete(w);
  });
}

function answerPoll(room, w) {
  clearTimeout(w.timer);
  pollers.get(room.code)?.delete(w);
  if (w.res.writableEnded) return;
  if (w.role === 'teacher') return send(w.res, 200, { v: room.version || 0, view: Rooms.teacherView(room) });
  const p = room.players.find((x) => x.id === w.id);
  if (!p) return send(w.res, 200, { removed: true });
  p.seenAt = Date.now();
  send(w.res, 200, { v: room.version || 0, view: Rooms.studentView(room, p) });
}

// Polling students who stop polling drop off after a while; keep "who's here"
// and "everyone's done" up to date for them.
const presence = new Map(); // code -> last "who's here" signature
setInterval(() => {
  for (const room of rooms.values()) {
    const sig = room.players.map((p) => Rooms.isHere(p)).join();
    if (presence.get(room.code) === sig) continue;
    presence.set(room.code, sig);
    broadcast(room);
    maybeAutoNext(room);
  }
  const now = Date.now();
  for (const [code, at] of closedRooms) if (now - at > CLOSED_MEMORY_MS) closedRooms.delete(code);
}, 5000).unref();

// ---------------------------------------------------------------- pacing

const autoTimers = new Map(); // code -> timeout

function cancelAutoNext(room) {
  clearTimeout(autoTimers.get(room.code));
  autoTimers.delete(room.code);
}

function maybeAutoNext(room) {
  if (!room.autoNext || !Rooms.allDone(room) || autoTimers.has(room.code)) return;
  const round = room.round;
  autoTimers.set(
    room.code,
    setTimeout(() => {
      autoTimers.delete(room.code);
      if (room.state === 'playing' && room.round === round && Rooms.allDone(room)) {
        Rooms.nextRound(room);
        broadcast(room);
        maybeAutoNext(room); // e.g. everyone had to pass
      }
    }, AUTO_NEXT_MS)
  );
}

// ---------------------------------------------------------------- API

function getRoom(code) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) throw new Rooms.RoomError('room', 'No class with that code. Check the code on the board.');
  room.touchedAt = Date.now();
  return room;
}

function teacherOnly(room, key) {
  if (key !== room.teacherKey) throw new Rooms.RoomError('teacher', 'Only the teacher can do that.');
}

// Addresses students can use to reach this server: the public one first, then
// this computer's addresses on the local network.
function lanUrls() {
  const out = PUBLIC_URL ? [PUBLIC_URL] : [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push(`http://${a.address}:${PORT}/`);
  }
  return out;
}

const routes = {
  'GET /api/health': () => ({ ok: true, lan: lanUrls() }),

  'POST /api/rooms': async (req) => {
    const body = await readJson(req);
    const room = Rooms.createRoom(body.settings, { taken: new Set(rooms.keys()) });
    rooms.set(room.code, room);
    return { code: room.code, teacherKey: room.teacherKey, lan: lanUrls() };
  },

  'POST /api/rooms/:code/join': async (req, code) => {
    const room = getRoom(code);
    const body = await readJson(req);
    const p = Rooms.join(room, body.name);
    broadcast(room);
    return { id: p.id, key: p.key, name: p.name };
  },

  'POST /api/rooms/:code/leave': async (req, code) => {
    const room = getRoom(code);
    const body = await readJson(req);
    const p = Rooms.findPlayer(room, body.id, body.key);
    Rooms.removePlayer(room, p.id);
    broadcast(room);
    maybeAutoNext(room);
    return { ok: true };
  },

  'POST /api/rooms/:code/result': async (req, code) => {
    const room = getRoom(code);
    const body = await readJson(req);
    const p = Rooms.findPlayer(room, body.id, body.key);
    Rooms.submit(room, p, body);
    broadcast(room);
    maybeAutoNext(room);
    return { ok: true, score: p.score };
  },

  'POST /api/rooms/:code/teacher': async (req, code) => {
    const room = getRoom(code);
    const body = await readJson(req);
    teacherOnly(room, body.key);
    switch (body.action) {
      case 'settings':
        Rooms.setSettings(room, body.settings || {});
        break;
      case 'start':
        cancelAutoNext(room);
        Rooms.start(room);
        break;
      case 'next':
        cancelAutoNext(room);
        Rooms.nextRound(room);
        break;
      case 'autoNext':
        room.autoNext = Boolean(body.on);
        if (!room.autoNext) cancelAutoNext(room);
        break;
      case 'end':
        cancelAutoNext(room);
        Rooms.end(room);
        break;
      case 'lobby':
        cancelAutoNext(room);
        Rooms.backToLobby(room);
        break;
      case 'remove':
        Rooms.removePlayer(room, body.id);
        break;
      case 'close':
        cancelAutoNext(room);
        for (const s of streams.get(room.code) || []) {
          event(s.res, 'closed', {});
          s.res.end();
        }
        for (const w of pollers.get(room.code) || []) {
          clearTimeout(w.timer);
          send(w.res, 200, { closed: true });
        }
        rooms.delete(room.code);
        streams.delete(room.code);
        pollers.delete(room.code);
        closedRooms.set(room.code, Date.now());
        return { ok: true };
      default:
        throw new Rooms.RoomError('action', 'Unknown action.');
    }
    broadcast(room);
    maybeAutoNext(room);
    return { ok: true };
  },
};

function route(req) {
  const url = new URL(req.url, 'http://x');
  const parts = url.pathname.split('/').filter(Boolean); // api, rooms, CODE, action
  if (parts[0] !== 'api') return null;
  if (parts.length === 4 && parts[1] === 'rooms') {
    return { handler: routes[`${req.method} /api/rooms/:code/${parts[3]}`], code: parts[2], url };
  }
  return { handler: routes[`${req.method} ${url.pathname}`], url };
}

const server = http.createServer(async (req, res) => {
  const r = route(req);
  if (!r) return serveStatic(req, res);
  try {
    // Live updates: /api/rooms/CODE/events?teacher=KEY or ?id=ID&key=KEY
    // or, where streams don't get through, /poll with the same keys plus ?v=VERSION
    const live = req.method === 'GET' && r.code && /\/(events|poll)$/.test(r.url.pathname);
    if (live) {
      const poll = r.url.pathname.endsWith('/poll');
      const code = String(r.code).toUpperCase();
      if (poll && !rooms.has(code) && closedRooms.has(code)) return send(res, 200, { closed: true });
      const room = getRoom(code);
      const q = r.url.searchParams;
      const version = Number(q.get('v'));
      if (q.has('teacher')) {
        teacherOnly(room, q.get('teacher'));
        return poll ? openPoll(req, res, room, 'teacher', null, version) : openStream(req, res, room, 'teacher', null);
      }
      const player = room.players.find((x) => x.id === q.get('id'));
      if (poll && !player) return send(res, 200, { removed: true });
      const p = Rooms.findPlayer(room, q.get('id'), q.get('key'));
      return poll ? openPoll(req, res, room, 'student', p, version) : openStream(req, res, room, 'student', p);
    }
    if (!r.handler) return send(res, 404, { error: 'not-found', message: 'Not found.' });
    send(res, 200, await r.handler(req, r.code));
  } catch (e) {
    if (e instanceof Rooms.RoomError) {
      const status = e.code === 'room' || e.code === 'player' ? 404 : e.code === 'teacher' ? 403 : 409;
      return send(res, status, { error: e.code, message: e.message });
    }
    console.error(e);
    send(res, 500, { error: 'server', message: 'Something went wrong.' });
  }
});

// Forget classes nobody has touched for a while.
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.touchedAt > ROOM_IDLE_MS && !(streams.get(code) || new Set()).size) {
      rooms.delete(code);
      streams.delete(code);
      pollers.delete(code);
      presence.delete(code);
    }
  }
}, 10 * 60 * 1000).unref();

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Blockout classroom server on http://localhost:${PORT}/`);
    for (const url of lanUrls()) console.log(url === PUBLIC_URL ? `  Students join at: ${url}` : `  Chromebooks on this network: ${url}`);
  });
}

module.exports = { server, rooms };
