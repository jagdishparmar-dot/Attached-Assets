import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import {
  CreateCustomerBody,
  GetCustomerParams,
  BulkCreateCustomersBody,
  UpdateCustomerBody,
  UpdateCustomerParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatCustomer(c: typeof customersTable.$inferSelect) {
  return {
    id: c.id,
    customerCode: c.customerCode,
    companyName: c.companyName,
    address: c.address,
    area: c.area ?? null,
    city: c.city,
    contactPerson: c.contactPerson,
    phone: c.phone,
    email: c.email ?? null,
    deliveryWindow: c.deliveryWindow ?? null,
    specialInstructions: c.specialInstructions ?? null,
    totalDeliveries: c.totalDeliveries,
  };
}

router.get("/customers", async (_req, res): Promise<void> => {
  const customers = await db.select().from(customersTable).orderBy(customersTable.companyName);
  res.json(customers.map(formatCustomer));
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [customer] = await db.insert(customersTable).values(parsed.data).returning();
  res.status(201).json(formatCustomer(customer));
});

router.post("/customers/bulk", async (req, res): Promise<void> => {
  const parsed = BulkCreateCustomersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const errors: { row: number; message: string }[] = [];
  let created = 0;

  for (let i = 0; i < parsed.data.customers.length; i++) {
    const customer = parsed.data.customers[i];
    try {
      await db.insert(customersTable).values(customer);
      created++;
    } catch (err) {
      const cause = err instanceof Error ? (err.cause as { code?: string; message?: string } | undefined) : undefined;
      const text = `${err instanceof Error ? err.message : ""} ${cause?.message ?? ""}`;
      const isDuplicate = cause?.code === "23505" || /unique|duplicate/i.test(text);
      const message = isDuplicate
        ? `Customer code "${customer.customerCode}" already exists`
        : "Could not import this row";
      errors.push({ row: i + 1, message });
    }
  }

  res.json({ created, failed: errors.length, errors });
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(formatCustomer(customer));
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [customer] = await db
      .update(customersTable)
      .set(parsed.data)
      .where(eq(customersTable.id, params.data.id))
      .returning();

    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    res.json(formatCustomer(customer));
  } catch (err) {
    const cause = err instanceof Error ? (err.cause as { code?: string; message?: string } | undefined) : undefined;
    const text = `${err instanceof Error ? err.message : ""} ${cause?.message ?? ""}`;
    if (cause?.code === "23505" || /unique|duplicate/i.test(text)) {
      res.status(409).json({ error: `Customer code "${parsed.data.customerCode ?? ""}" already exists` });
      return;
    }
    throw err;
  }
});

export default router;
