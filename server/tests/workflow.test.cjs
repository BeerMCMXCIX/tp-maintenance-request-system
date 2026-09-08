const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createTicketSchema,
  listTicketsSchema,
  updateTicketSchema,
} = require("../dist/schemas/ticket.schema");
const { canTransition } = require("../dist/domain/workflow");

const valid = {
  title: "จอเสีย",
  description: "จอไม่ติด",
  requesterName: "ผู้ทดสอบ",
  department: "QA",
  contact: "123",
  location: "สำนักงาน",
  items: [
    { name: "จอภาพ", quantity: 2, unit: "ชิ้น", estimatedUnitPrice: 1234.56 },
  ],
};
test("request input is trimmed and validates equipment and money", () => {
  assert.equal(
    createTicketSchema.parse({ ...valid, title: "  จอเสีย  " }).title,
    "จอเสีย",
  );
  for (const input of [
    { ...valid, title: "   " },
    { ...valid, requesterName: "" },
    { ...valid, status: "APPROVED" },
    { ...valid, items: [{ ...valid.items[0], quantity: 0 }] },
    { ...valid, items: [{ ...valid.items[0], estimatedUnitPrice: 1.001 }] },
  ])
    assert.equal(createTicketSchema.safeParse(input).success, false);
  assert.equal(
    createTicketSchema.safeParse({
      ...valid,
      items: [{ ...valid.items[0], estimatedUnitPrice: null }],
    }).success,
    true,
  );
});
test("pagination and ordering reject unsafe parameters", () => {
  for (const input of [
    { page: "-1" },
    { limit: "10000" },
    { page: "1.2" },
    { sortBy: "password" },
    { order: "sideways" },
    { search: ["x", "y"] },
  ]) {
    assert.equal(listTicketsSchema.safeParse(input).success, false);
  }
  assert.equal(listTicketsSchema.parse({}).limit, 10);
});
test("workflow requires paper approval before purchasing and has terminal states", () => {
  assert.equal(canTransition("PENDING", "APPROVED"), false);
  assert.equal(canTransition("IN_REVIEW", "COMPLETED"), true);
  assert.equal(canTransition("AWAITING_APPROVAL", "APPROVED"), true);
  assert.equal(canTransition("APPROVED", "PURCHASING"), true);
  assert.equal(canTransition("COMPLETED", "PENDING"), false);
  assert.equal(canTransition("unknown", "COMPLETED"), false);
  assert.equal(
    updateTicketSchema.safeParse({
      status: "APPROVED",
      actor: "QA",
      note: " ",
      version: 0,
    }).success,
    false,
  );
});
