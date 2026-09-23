// The HTTP API end to end: a real server on a spare port with an in-memory database.
process.env.BLOCKOUT_DB = ':memory:';
process.env.BLOCKOUT_AUTH_SECRET = 'test-secret';
const test = require('node:test');
const assert = require('node:assert');
const { server } = require('../server/classroom.js');

let base;
test.before(() => new Promise((resolve) => server.listen(0, () => ((base = `http://localhost:${server.address().port}`), resolve()))));
test.after(() => server.close());

async function call(method, path, body, token) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}
const signIn = async (person) => (await call('POST', '/api/auth/dev', person)).data.token;

test('HTTP: sign in, class roster, hosting needs a teacher, signed-in students join under their account name', async () => {
  const config = await call('GET', '/api/auth/config');
  assert.equal(config.data.provider, 'dev');
  assert.deepEqual(config.data.schools.map((s) => s.name), ['Cadence Park']);

  const teacher = await signIn({ firstName: 'Ms', lastInitial: 'R', role: 'teacher', schoolId: 'cadence-park' });
  const kid = await signIn({ firstName: 'Maya', lastInitial: 'K', role: 'student', email: 'maya@iusd.org' });
  assert.equal((await call('GET', '/api/me', null, kid)).data.user.name, 'Maya K.');
  assert.equal((await call('GET', '/api/me')).status, 401);
  assert.equal((await call('GET', '/api/me', null, 'nonsense')).status, 401);

  const c = (await call('POST', '/api/classes', { name: 'Room 12' }, teacher)).data;
  assert.equal((await call('POST', '/api/me/classes', { code: c.code }, kid)).status, 200);
  assert.equal((await call('POST', '/api/classes', { name: 'Nope' }, kid)).status, 403);
  const detail = (await call('GET', `/api/classes/${c.id}`, null, teacher)).data;
  assert.deepEqual(detail.students.map((s) => s.name), ['Maya K.']);

  // guests and students can't host; teachers can
  assert.equal((await call('POST', '/api/rooms', { settings: {} })).status, 401);
  assert.equal((await call('POST', '/api/rooms', { settings: {} }, kid)).status, 401);
  const room = (await call('POST', '/api/rooms', { settings: {} }, teacher)).data;
  assert.match(room.code, /^[A-Z]+$/);
  // a signed-in student joins as their account's first name, whatever they type
  const joined = (await call('POST', `/api/rooms/${room.code}/join`, { name: 'Whatever' }, kid)).data;
  assert.equal(joined.name, 'Maya');
  // guests still join with a name
  assert.equal((await call('POST', `/api/rooms/${room.code}/join`, { name: 'Leo' })).data.name, 'Leo');

  // progress sync
  const P = require('../js/progress.js');
  const save = P.createProgress();
  save.wallet = 42;
  assert.equal((await call('PUT', '/api/me/progress', { progress: save }, kid)).status, 200);
  assert.equal((await call('GET', '/api/me/progress', null, kid)).data.progress.wallet, 42);
});
