require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { once } = require("node:events");
const { createApp } = require("../dist/app");
const { prisma } = require("../dist/lib/prisma");

test("login, user roles and ticket workflow are enforced by the API", { skip: process.env.RUN_DB_TESTS !== "1" }, async () => {
  const unique = randomUUID().replaceAll("-", "");
  const prefix = "qa_" + unique.slice(0, 12);
  const password = "QA-Password-" + unique;
  const bootstrapKey = "test-bootstrap-key-" + unique;
  const ownedTicketIds = [];
  const ownedUserIds = [];

  // Cleanup all users first to ensure we can test the bootstrap flow (count === 0)
  // Note: in a real environment this test might run concurrently with others,
  // but since we want to test bootstrap we assume this runs isolated or against a clean DB.
  await prisma.user.deleteMany({}); 

  const server = createApp({ clientOrigins: [], userBootstrapKey: bootstrapKey }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port + "/api";

  async function call(path, method = "GET", data, token, headers = {}) {
    const response = await fetch(base + path, {
      method,
      headers: { ...(data === undefined ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: "Bearer " + token } : {}), ...headers },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    return { status: response.status, body: await response.json() };
  }
  async function login(username) {
    const result = await call("/auth/login", "POST", { username, password });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.user.username, username);
    return result.body.data.token;
  }

  try {
    // 1. Create first admin with wrong bootstrap key
    assert.equal((await call("/users", "POST", { username: prefix + "_admin", password, displayName: "QA Admin", role: "ADMIN" }, null, { "x-bootstrap-key": "wrong-key" })).status, 401);

    // 2. Create first admin with correct bootstrap key
    const adminRes = await call("/users", "POST", { username: prefix + "_admin", password, displayName: "QA Admin", role: "ADMIN" }, null, { "x-bootstrap-key": bootstrapKey });
    assert.equal(adminRes.status, 201);
    ownedUserIds.push(adminRes.body.data.id);
    const admin = adminRes.body.data;

    // 3. Login with wrong password
    assert.equal((await call("/auth/login", "POST", { username: admin.username, password: "wrong-password" })).status, 401);

    // 4. Login correctly
    const adminToken = await login(admin.username);

    // 5. Test valid token and me endpoint
    assert.equal((await call("/auth/me", "GET", undefined, adminToken)).body.data.user.role, "ADMIN");

    // 6. Test invalid token
    assert.equal((await call("/auth/me", "GET", undefined, "invalid.token.here")).status, 401);

    // 7. Create IT and Procurement using Admin token
    for (const role of ["IT", "PROCUREMENT"]) {
      const created = await call("/users", "POST", { username: prefix + "_" + role.toLowerCase(), password, displayName: "QA " + role, role }, adminToken);
      assert.equal(created.status, 201);
      assert.equal(created.body.data.passwordHash, undefined);
      ownedUserIds.push(created.body.data.id);
    }

    const itToken = await login(prefix + "_it");
    const procurementToken = await login(prefix + "_procurement");

    // 8. Try to create user with IT token (should be forbidden)
    assert.equal((await call("/users", "POST", { username: prefix + "_denied", password, displayName: "Denied", role: "IT" }, itToken)).status, 403);

    // 9. Workflow testing
    const input = { title: prefix, description: "ทดสอบสิทธิ์", requesterName: "QA", department: prefix, contact: "QA", location: "QA", items: [{ name: "จอภาพ", quantity: 1, unit: "เครื่อง", estimatedUnitPrice: 1000 }] };
    const createdTicket = await call("/tickets", "POST", input);
    assert.equal(createdTicket.status, 201);
    let ticket = createdTicket.body.data;
    ownedTicketIds.push(ticket.id);
    const update = (status, token) => call("/tickets/" + ticket.id, "PUT", { status, note: "QA transition", version: ticket.version }, token);
    
    // Procurement cannot transition from PENDING -> IN_REVIEW
    assert.equal((await update("IN_REVIEW", procurementToken)).status, 403);
    
    // IT can transition PENDING -> IN_REVIEW
    let result = await update("IN_REVIEW", itToken);
    assert.equal(result.status, 200); ticket = result.body.data;
    assert.equal(ticket.history.at(-1).actor, "QA IT");
    
    // IT transitions to AWAITING_APPROVAL
    result = await update("AWAITING_APPROVAL", itToken);
    assert.equal(result.status, 200); ticket = result.body.data;
    
    // IT cannot transition to APPROVED
    assert.equal((await update("APPROVED", itToken)).status, 403);
    
    // Procurement handles the rest
    for (const status of ["APPROVED", "PURCHASING", "COMPLETED"]) {
      result = await update(status, procurementToken);
      assert.equal(result.status, 200); ticket = result.body.data;
    }
    assert.equal(ticket.status, "COMPLETED");

    // 10. Logout and test invalidated token
    assert.equal((await call("/auth/logout", "POST", undefined, itToken)).status, 200);
    assert.equal((await call("/auth/me", "GET", undefined, itToken)).status, 401);
  } finally {
    await prisma.repairTicket.deleteMany({ where: { id: { in: ownedTicketIds }, department: prefix } });
    await prisma.user.deleteMany({ where: { id: { in: ownedUserIds }, username: { startsWith: prefix } } });
    await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
  }
});
