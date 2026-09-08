require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { once } = require("node:events");
const { createApp } = require("../dist/app");
const { prisma } = require("../dist/lib/prisma");

test(
  "HTTP request, print data, authorization, workflow, concurrency and global search",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async () => {
    const key = randomUUID();
    const prefix = "TP-QA-" + randomUUID();
    const ownedIds = [];
    const server = createApp({ clientOrigins: [], staffAccessKey: key }).listen(
      0,
      "127.0.0.1",
    );
    await once(server, "listening");
    const base = "http://127.0.0.1:" + server.address().port + "/api";
    async function call(path, method = "GET", data, authorized = false) {
      const response = await fetch(base + path, {
        method,
        headers: {
          ...(data === undefined ? {} : { "Content-Type": "application/json" }),
          ...(authorized ? { Authorization: "Bearer " + key } : {}),
        },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      });
      return { status: response.status, body: await response.json() };
    }
    const input = {
      title: prefix,
      description: "ทดสอบการบันทึกภาษาไทย",
      requesterName: "QA ทดสอบ",
      department: prefix,
      contact: "ทดสอบเท่านั้น",
      location: "QA",
      items: [
        {
          name: "จอภาพ",
          quantity: 2,
          unit: "เครื่อง",
          estimatedUnitPrice: 1000.25,
        },
      ],
    };
    try {
      assert.equal((await call("/tickets?page=-1")).status, 400);
      assert.equal(
        (await call("/tickets", "POST", { ...input, title: " " })).status,
        400,
      );
      const result = await call("/tickets", "POST", input);
      assert.equal(result.status, 201);
      let ticket = result.body.data;
      ownedIds.push(ticket.id);
      assert.match(ticket.documentNumber, /^TP-IT-\d{4}-\d+$/);
      assert.equal(ticket.items[0].estimatedUnitPrice, 1000.25);
      assert.equal(ticket.history.length, 1);
      assert.equal(ticket.requesterName, input.requesterName);
      const statusInput = {
        status: "IN_REVIEW",
        actor: "QA",
        note: "ทดสอบ",
        version: ticket.version,
      };
      assert.equal(
        (await call("/tickets/" + ticket.id, "PUT", statusInput)).status,
        401,
      );
      assert.equal(
        (
          await call(
            "/tickets/" + ticket.id,
            "PUT",
            { ...statusInput, status: "APPROVED" },
            true,
          )
        ).status,
        409,
      );
      const parallel = await Promise.all([
        call("/tickets/" + ticket.id, "PUT", statusInput, true),
        call("/tickets/" + ticket.id, "PUT", statusInput, true),
      ]);
      assert.deepEqual(parallel.map((r) => r.status).sort(), [200, 409]);
      ticket = parallel.find((r) => r.status === 200).body.data;
      assert.equal(ticket.history.length, 2);
      for (const status of [
        "AWAITING_APPROVAL",
        "APPROVED",
        "PURCHASING",
        "COMPLETED",
      ]) {
        const update = await call(
          "/tickets/" + ticket.id,
          "PUT",
          {
            status,
            actor: "QA",
            note: "อ้างอิงผลทดสอบ",
            version: ticket.version,
          },
          true,
        );
        assert.equal(update.status, 200);
        ticket = update.body.data;
      }
      assert.equal(ticket.history.length, 6);
      assert.deepEqual(ticket.allowedTransitions, []);
      const read = await call("/tickets/" + ticket.id);
      assert.equal(read.body.data.documentNumber, ticket.documentNumber);
      for (let index = 0; index < 11; index++) {
        const created = await call("/tickets", "POST", {
          ...input,
          title: prefix + "-" + index,
          items: [],
        });
        assert.equal(created.status, 201);
        ownedIds.push(created.body.data.id);
      }
      const list = await call("/tickets?search=" + prefix + "&limit=10");
      assert.equal(list.body.pagination.total, 12);
      assert.equal(list.body.data.length, 10);
      const page2 = await call(
        "/tickets?search=" + prefix + "&page=2&limit=10",
      );
      assert.equal(page2.body.data.length, 2);
      assert.equal(
        new Set([...list.body.data, ...page2.body.data].map((t) => t.id)).size,
        12,
      );
      const found = await call("/tickets?search=" + ticket.documentNumber);
      assert.equal(found.body.pagination.total, 1);
      assert.equal(found.body.data[0].id, ticket.id);
      assert.ok(found.body.stats.total >= 12);
      const completed = await call(
        "/tickets?search=" + prefix + "&status=COMPLETED",
      );
      assert.equal(completed.body.pagination.total, 1);
      const corrected = await call("/tickets?search=" + prefix + "&page=999");
      assert.equal(corrected.body.pagination.page, 2);
      assert.equal(
        (await call("/tickets/" + ticket.id, "DELETE", undefined, true)).status,
        404,
      );
      assert.equal((await call("/tickets/nope")).status, 400);
      assert.equal((await call("/tickets/2147483647")).status, 404);
    } finally {
      // Only remove IDs created by this test, never existing user records.
      await prisma.repairTicket.deleteMany({
        where: { id: { in: ownedIds }, department: prefix },
      });
      await new Promise((resolve) => server.close(resolve));
      await prisma.$disconnect();
    }
  },
);
