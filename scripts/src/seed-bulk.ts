import "../../load-env.mjs";
import { db, pool } from "@workspace/db";
import {
  hubsTable,
  staffTable,
  driversTable,
  vehiclesTable,
  customersTable,
  deliveriesTable,
  attendanceRecords,
  staffLocations,
  activityTable,
} from "@workspace/db/schema";

/**
 * Bulk seed for performance / feature testing.
 *
 * Volumes (approx):
 *   hubs         6
 *   staff        120  (40 drivers + other roles)
 *   drivers      40
 *   vehicles     50
 *   customers    200
 *   deliveries   2500
 *   attendance   ~3600 (120 staff × 30 days, ~70% present)
 *   locations    ~35 active GPS pings
 *   activity     200
 *
 * Default password for all staff: cold@123
 * Supervisor login: 9876500007 / cold@123 (from seed-staff)
 */

const HUBS = [
  { name: "Mumbai Central Hub", city: "Mumbai", address: "APMC Yard, Vashi, Navi Mumbai", lat: 19.076, lng: 72.8777, radiusMeters: 300 },
  { name: "Delhi North Hub", city: "Delhi", address: "Azadpur Mandi, North Delhi", lat: 28.7041, lng: 77.1025, radiusMeters: 300 },
  { name: "Bangalore Hub", city: "Bangalore", address: "Yeshwantpur Industrial Area", lat: 12.9716, lng: 77.5946, radiusMeters: 300 },
  { name: "Mumbai East Hub", city: "Mumbai", address: "Govandi Industrial Estate", lat: 19.0596, lng: 72.9208, radiusMeters: 300 },
  { name: "Pune Hub", city: "Pune", address: "MIDC Chakan Phase II", lat: 18.7603, lng: 73.8636, radiusMeters: 300 },
  { name: "Hyderabad Hub", city: "Hyderabad", address: "Gaddiannaram Fruit Market", lat: 17.385, lng: 78.4867, radiusMeters: 300 },
];

const FIRST_NAMES = [
  "Ramesh", "Suresh", "Amit", "Vijay", "Ravi", "Priya", "Mohan", "Ganesh", "Arjun", "Deepak",
  "Sanjay", "Kavita", "Prakash", "Ramu", "Anil", "Sunita", "Nikhil", "Meena", "Rajesh", "Pooja",
  "Kiran", "Neha", "Vikas", "Anita", "Manish", "Rekha", "Sandeep", "Jyoti", "Ashok", "Seema",
];
const LAST_NAMES = [
  "Kumar", "Patel", "Singh", "Rao", "Nair", "Sharma", "Das", "Iyer", "Mehta", "Verma",
  "Gupta", "Reddy", "Yadav", "Joshi", "Pillai", "Khan", "Chopra", "Malhotra", "Desai", "Bose",
];

const ROLES = ["driver", "picker", "sorter", "loader", "supervisor", "security", "house_keeper"] as const;
const ROLE_WEIGHTS = [40, 20, 15, 15, 8, 12, 10]; // relative counts → ~120 total

const PRODUCT_CATALOG = [
  { name: "Frozen Peas 1kg", unit: "kg", unitPrice: 120 },
  { name: "Ice Cream Tub 5L", unit: "tub", unitPrice: 450 },
  { name: "Frozen Chicken 2kg", unit: "pack", unitPrice: 380 },
  { name: "Butter 500g", unit: "pack", unitPrice: 280 },
  { name: "Cheese Block 1kg", unit: "block", unitPrice: 520 },
  { name: "Frozen Prawns 1kg", unit: "kg", unitPrice: 680 },
  { name: "Yogurt 400g", unit: "cup", unitPrice: 45 },
  { name: "Milk 1L", unit: "ltr", unitPrice: 62 },
  { name: "Frozen Mix Veg 1kg", unit: "kg", unitPrice: 95 },
  { name: "Paneer 200g", unit: "pack", unitPrice: 90 },
];

const CITIES: Record<string, { areas: string[]; addresses: string[] }> = {
  Mumbai: {
    areas: ["Andheri", "Bandra", "Powai", "Thane", "Vashi", "Goregaon", "Dadar", "Kurla"],
    addresses: ["Shop 12, Link Road", "Warehouse B, MIDC", "Plot 45, Industrial Estate", "Unit 3, Cold Storage Complex"],
  },
  Delhi: {
    areas: ["Azadpur", "Okhla", "Dwarka", "Rohini", "Karol Bagh", "Lajpat Nagar"],
    addresses: ["Gali No. 4, Mandi Road", "Sector 18 Market", "Plot 22, Okhla Phase II", "Shop 8, Main Bazaar"],
  },
  Bangalore: {
    areas: ["Yeshwantpur", "Whitefield", "Peenya", "Electronic City", "Koramangala"],
    addresses: ["4th Cross, Industrial Layout", "Plot 11, Peenya 2nd Stage", "Warehouse 7, EPIP Zone"],
  },
  Pune: {
    areas: ["Chakan", "Hinjewadi", "Hadapsar", "Pimpri"],
    addresses: ["Plot 9, MIDC", "Unit 2, Phase I", "Godown 5, Market Yard"],
  },
  Hyderabad: {
    areas: ["Gachibowli", "Kukatpally", "Secunderabad", "Uppal"],
    addresses: ["Survey No. 44, Industrial Area", "Plot 18, IDA", "Shop 21, Fruit Market"],
  },
};

const STATUSES = ["pending", "assigned", "in_transit", "delivered", "failed"] as const;
const STATUS_WEIGHTS = [15, 15, 15, 45, 10];
const PRIORITIES = ["low", "normal", "high"] as const;
const WINDOWS = ["06:00–10:00", "10:00–14:00", "14:00–18:00", "18:00–22:00"];
const VEHICLE_TYPES = ["reefer_van", "reefer_truck", "mini_reefer", "insulated_van"] as const;
const FUEL_TYPES = ["diesel", "cng", "electric"] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function weightedPick<T>(items: readonly T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

function pad(n: number, width = 4): string {
  return String(n).padStart(width, "0");
}

function dateOffset(daysAgo: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isoAt(dateStr: string, hour: number, minute: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(hour, minute, Math.floor(Math.random() * 50), 0);
  return d.toISOString();
}

function jitter(base: number, delta = 0.02): number {
  return base + (Math.random() - 0.5) * 2 * delta;
}

function phoneFromIndex(i: number): string {
  return `98${String(70000000 + i).padStart(8, "0")}`;
}

function roleCode(role: string): string {
  const map: Record<string, string> = {
    driver: "DRV",
    picker: "PCK",
    sorter: "SRT",
    loader: "LDR",
    supervisor: "SUP",
    security: "SEC",
    house_keeper: "HSK",
  };
  return map[role] ?? "STF";
}

function makeProducts() {
  const count = 1 + Math.floor(Math.random() * 4);
  const products = [];
  for (let i = 0; i < count; i++) {
    const p = pick(PRODUCT_CATALOG);
    const quantity = 1 + Math.floor(Math.random() * 20);
    products.push({
      name: p.name,
      quantity,
      unit: p.unit,
      amount: quantity * p.unitPrice,
    });
  }
  return products;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function insertBatches<T extends Record<string, unknown>>(
  label: string,
  table: any,
  rows: T[],
  batchSize = 200,
) {
  console.log(`  → ${label}: ${rows.length} rows…`);
  for (const batch of chunk(rows, batchSize)) {
    await db.insert(table).values(batch as any).onConflictDoNothing();
  }
}

async function run() {
  // Always reset transactional tables so bulk seed is deterministic for testing.
  // Pass --keep to append without truncating.
  const keep = process.argv.includes("--keep");
  console.log(`\nColdverse bulk seed ${keep ? "(KEEP existing data)" : "(RESET mode)"}\n`);

  if (!keep) {
    console.log("Clearing transactional tables…");
    await pool.query(`TRUNCATE TABLE
      attendance_records,
      staff_locations,
      activity,
      deliveries,
      customers,
      vehicles,
      drivers,
      staff,
      hubs
      RESTART IDENTITY CASCADE`);
  }

  // ── Hubs ──────────────────────────────────────────────────────
  console.log("Seeding hubs…");
  await insertBatches("hubs", hubsTable, HUBS);
  const hubs = await db.select().from(hubsTable);
  const hubNames = hubs.map((h) => h.name);

  // ── Staff ─────────────────────────────────────────────────────
  console.log("Seeding staff…");
  const staffRows: Array<{
    name: string;
    employeeId: string;
    role: string;
    phone: string;
    hub: string;
    password: string;
    licenseNumber: string | null;
    shiftStart: string;
    shiftEnd: string;
    joiningDate: string;
    status: string;
  }> = [];

  let staffIdx = 1;
  for (let r = 0; r < ROLES.length; r++) {
    const role = ROLES[r]!;
    const count = ROLE_WEIGHTS[r]!;
    for (let i = 0; i < count; i++) {
      const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      const employeeId = `CV-${roleCode(role)}-${pad(i + 1, 3)}`;
      staffRows.push({
        name,
        employeeId,
        role,
        phone: phoneFromIndex(staffIdx++),
        hub: pick(hubNames),
        password: "cold@123",
        licenseNumber: role === "driver" ? `MH${pad(10 + i, 2)} 20${10 + (i % 15)}00${pad(i + 1, 5)}` : null,
        shiftStart: role === "sorter" ? "04:00" : role === "security" ? "00:00" : "08:00",
        shiftEnd: role === "sorter" ? "12:00" : role === "security" ? "08:00" : "18:00",
        joiningDate: dateOffset(365 + Math.floor(Math.random() * 900)),
        status: Math.random() < 0.92 ? "active" : "inactive",
      });
    }
  }

  await insertBatches("staff", staffTable, staffRows);

  // Ensure known admin login always works (override generated CV-SUP-001)
  await pool.query(
    `UPDATE staff
     SET name = $1, phone = $2, password = $3, hub = $4, status = 'active', role = 'supervisor'
     WHERE employee_id = 'CV-SUP-001'`,
    ["Sanjay Gupta", "9876500007", "cold@123", "Mumbai Central Hub"],
  );

  const allStaff = await db.select().from(staffTable);
  const driverStaff = allStaff.filter((s) => s.role === "driver" && s.status === "active");
  console.log(`  staff in DB: ${allStaff.length} (${driverStaff.length} active drivers)`);

  // ── Drivers (mirror driver staff) ─────────────────────────────
  console.log("Seeding drivers…");
  const driverRows = driverStaff.map((s) => ({
    name: s.name,
    employeeId: s.employeeId,
    phone: s.phone,
    licenseNumber: s.licenseNumber ?? `MH00 202000${pad(s.id, 5)}`,
    licenseExpiry: dateOffset(-Math.floor(Math.random() * 400)),
    address: `${pick(["Flat", "Room", "House"])} ${1 + Math.floor(Math.random() * 40)}, ${s.hub}`,
    emergencyContact: phoneFromIndex(9000 + s.id),
    hub: s.hub,
    status: s.status,
    joiningDate: s.joiningDate,
    deliveriesToday: Math.floor(Math.random() * 8),
    deliveriesTotal: 20 + Math.floor(Math.random() * 400),
  }));
  await insertBatches("drivers", driversTable, driverRows);
  const drivers = await db.select().from(driversTable);

  // ── Vehicles ──────────────────────────────────────────────────
  console.log("Seeding vehicles…");
  const vehicleRows = Array.from({ length: 50 }, (_, i) => {
    const state = pick(["MH", "DL", "KA", "PN", "TS"]);
    const inUse = i < Math.min(25, drivers.length);
    return {
      vehicleNumber: `${state}${pad(1 + (i % 40), 2)} AB ${pad(1000 + i, 4)}`,
      vehicleType: pick(VEHICLE_TYPES),
      capacity: pick(["1 ton", "2 ton", "3.5 ton", "5 ton", "8 ton"]),
      fuelType: pick(FUEL_TYPES),
      gpsDeviceId: `GPS-${pad(i + 1, 4)}`,
      insuranceExpiry: dateOffset(-Math.floor(Math.random() * 200)),
      fitnessExpiry: dateOffset(-Math.floor(Math.random() * 300)),
      rcExpiry: dateOffset(-Math.floor(Math.random() * 500)),
      pucExpiry: dateOffset(-Math.floor(Math.random() * 90)),
      status: inUse ? "in_use" : pick(["available", "available", "available", "maintenance"] as const),
      currentDriverId: inUse ? drivers[i % drivers.length]!.id : null,
    };
  });
  await insertBatches("vehicles", vehiclesTable, vehicleRows);
  const vehicles = await db.select().from(vehiclesTable);
  const availableVehicles = vehicles.filter((v) => v.status === "available" || v.status === "in_use");

  // Pair some drivers ↔ vehicles
  for (let i = 0; i < Math.min(25, drivers.length, vehicles.length); i++) {
    await pool.query(
      `UPDATE drivers SET current_vehicle_id = $1 WHERE id = $2`,
      [vehicles[i]!.id, drivers[i]!.id],
    );
  }

  // ── Customers ─────────────────────────────────────────────────
  console.log("Seeding customers…");
  const companyTypes = ["Foods", "Mart", "Fresh", "Dairy", "Kitchen", "Stores", "Caterers", "Hotels", "Cafe", "Wholesale"];
  const customerRows = Array.from({ length: 200 }, (_, i) => {
    const hub = pick(hubs);
    const cityMeta = CITIES[hub.city] ?? CITIES.Mumbai!;
    const area = pick(cityMeta.areas);
    return {
      customerCode: `CUST-${pad(i + 1, 4)}`,
      companyName: `${pick(FIRST_NAMES)} ${pick(companyTypes)} ${pad(i + 1, 3)}`,
      address: `${pick(cityMeta.addresses)}, ${area}`,
      area,
      city: hub.city,
      contactPerson: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      phone: phoneFromIndex(2000 + i),
      email: `buyer${i + 1}@example.com`,
      deliveryWindow: pick(WINDOWS),
      specialInstructions: Math.random() < 0.3 ? "Keep cold chain unbroken; call on arrival" : null,
      totalDeliveries: Math.floor(Math.random() * 80),
    };
  });
  await insertBatches("customers", customersTable, customerRows);
  const customers = await db.select().from(customersTable);

  // ── Deliveries ────────────────────────────────────────────────
  console.log("Seeding deliveries…");
  const deliveryRows = Array.from({ length: 2500 }, (_, i) => {
    const customer = pick(customers);
    const status = weightedPick(STATUSES, STATUS_WEIGHTS);
    const daysAgo = Math.floor(Math.random() * 45);
    const deliveryDate = dateOffset(daysAgo);
    const products = makeProducts();
    const weight = products.reduce((s, p) => s + p.quantity * 0.8, 0);

    let assignedDriverId: number | null = null;
    let assignedDriverName: string | null = null;
    let assignedVehicleId: number | null = null;
    let assignedVehicleNumber: string | null = null;
    let failureReason: string | null = null;
    let completedAt: Date | null = null;

    if (status !== "pending" && drivers.length > 0) {
      const driver = pick(drivers);
      assignedDriverId = driver.id;
      assignedDriverName = driver.name;
      const vehicle = pick(availableVehicles.length ? availableVehicles : vehicles);
      if (vehicle) {
        assignedVehicleId = vehicle.id;
        assignedVehicleNumber = vehicle.vehicleNumber;
      }
    }
    if (status === "failed") {
      failureReason = pick([
        "Customer unavailable",
        "Address not found",
        "Vehicle breakdown",
        "Rejected – temperature excursion",
        "Access restricted",
      ]);
    }
    if (status === "delivered" || status === "failed") {
      completedAt = new Date(isoAt(deliveryDate, 12 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60)));
    }

    return {
      deliveryNumber: `DLV-${pad(i + 1, 5)}`,
      orderNumber: `ORD-${pad(10000 + i, 5)}`,
      invoiceNumber: Math.random() < 0.7 ? `INV-${pad(5000 + i, 5)}` : null,
      status,
      priority: pick(PRIORITIES),
      customerId: customer.id,
      customerName: customer.companyName,
      customerPhone: customer.phone,
      deliveryAddress: customer.address,
      deliveryArea: customer.area,
      deliveryCity: customer.city,
      deliveryDate,
      deliveryWindow: customer.deliveryWindow ?? pick(WINDOWS),
      totalWeight: `${weight.toFixed(1)} kg`,
      specialHandling: Math.random() < 0.2 ? "Frozen – maintain -18°C" : null,
      remarks: Math.random() < 0.15 ? "Priority HO account" : null,
      products,
      assignedDriverId,
      assignedDriverName,
      assignedVehicleId,
      assignedVehicleNumber,
      failureReason,
      completedAt,
    };
  });
  await insertBatches("deliveries", deliveriesTable, deliveryRows, 250);

  // ── Attendance (last 30 days) ─────────────────────────────────
  console.log("Seeding attendance…");
  const attendanceRows: Array<Record<string, unknown>> = [];
  const activeStaff = allStaff.filter((s) => s.status === "active");

  for (let day = 0; day < 30; day++) {
    const date = dateOffset(day);
    for (const s of activeStaff) {
      // ~72% present overall
      if (Math.random() > 0.72) {
        if (Math.random() < 0.35) {
          attendanceRows.push({
            staffId: s.id,
            date,
            status: "absent",
            checkIn: null,
            checkOut: null,
            withinGeofence: null,
            geofenceDistance: null,
            workingHours: null,
          });
        }
        continue;
      }

      const hub = hubs.find((h) => h.name === s.hub) ?? hubs[0]!;
      const late = Math.random() < 0.18;
      const halfDay = !late && Math.random() < 0.08;
      const inHour = late ? 9 + Math.floor(Math.random() * 2) : 7 + Math.floor(Math.random() * 2);
      const checkIn = isoAt(date, inHour, Math.floor(Math.random() * 50));
      const outHour = halfDay ? inHour + 3 : inHour + 8 + Math.floor(Math.random() * 2);
      const checkOut = day === 0 && Math.random() < 0.4
        ? null
        : isoAt(date, Math.min(outHour, 22), Math.floor(Math.random() * 50));

      const within = Math.random() < 0.88;
      const distance = within ? Math.floor(Math.random() * 180) : 250 + Math.floor(Math.random() * 800);

      let workingHours: string | null = null;
      if (checkOut) {
        const mins = Math.max(30, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
        workingHours = `${Math.floor(mins / 60)}h ${Math.floor(mins % 60)}m`;
      }

      attendanceRows.push({
        staffId: s.id,
        date,
        status: halfDay ? "half_day" : late ? "late" : "present",
        checkIn,
        checkOut,
        checkInLat: jitter(hub.lat, 0.008),
        checkInLng: jitter(hub.lng, 0.008),
        checkOutLat: checkOut ? jitter(hub.lat, 0.008) : null,
        checkOutLng: checkOut ? jitter(hub.lng, 0.008) : null,
        withinGeofence: within,
        geofenceDistance: distance,
        workingHours,
      });
    }
  }
  await insertBatches("attendance", attendanceRecords, attendanceRows, 300);

  // ── Live locations (active drivers / some staff) ──────────────
  console.log("Seeding live locations…");
  const locationStaff = [...driverStaff.slice(0, 25), ...activeStaff.filter((s) => s.role !== "driver").slice(0, 10)];
  const locationRows = locationStaff.map((s) => {
    const hub = hubs.find((h) => h.name === s.hub) ?? hubs[0]!;
    return {
      staffId: s.id,
      lat: jitter(hub.lat, 0.04),
      lng: jitter(hub.lng, 0.04),
      accuracy: 5 + Math.random() * 20,
      speed: s.role === "driver" ? Math.random() * 40 : Math.random() * 3,
      heading: Math.random() * 360,
      isActive: true,
      updatedAt: new Date(),
    };
  });
  await insertBatches("locations", staffLocations, locationRows);

  // ── Activity feed ─────────────────────────────────────────────
  console.log("Seeding activity…");
  const activityRows = Array.from({ length: 200 }, (_, i) => {
    const type = pick(["delivery_created", "delivery_assigned", "delivery_completed", "delivery_failed", "check_in", "vehicle_alert"]);
    const driver = drivers.length ? pick(drivers) : null;
    return {
      type,
      message: pick([
        `Delivery DLV-${pad(1 + (i % 2500), 5)} marked ${pick(STATUSES)}`,
        `${driver?.name ?? "Staff"} checked in at hub`,
        `Vehicle ${pick(vehicles).vehicleNumber} status updated`,
        `Customer ${pick(customers).companyName} order received`,
        `Geofence alert near ${pick(hubNames)}`,
      ]),
      status: pick(["info", "success", "warning", "error"]),
      deliveryNumber: `DLV-${pad(1 + (i % 2500), 5)}`,
      driverName: driver?.name ?? null,
    };
  });
  await insertBatches("activity", activityTable, activityRows);

  // ── Summary ───────────────────────────────────────────────────
  const summary = await pool.query(`
    SELECT 'hubs' AS t, count(*)::int AS c FROM hubs
    UNION ALL SELECT 'staff', count(*)::int FROM staff
    UNION ALL SELECT 'drivers', count(*)::int FROM drivers
    UNION ALL SELECT 'vehicles', count(*)::int FROM vehicles
    UNION ALL SELECT 'customers', count(*)::int FROM customers
    UNION ALL SELECT 'deliveries', count(*)::int FROM deliveries
    UNION ALL SELECT 'attendance', count(*)::int FROM attendance_records
    UNION ALL SELECT 'locations', count(*)::int FROM staff_locations
    UNION ALL SELECT 'activity', count(*)::int FROM activity
  `);

  console.log("\n✅ Bulk seed complete\n");
  for (const row of summary.rows) {
    console.log(`  ${String(row.t).padEnd(12)} ${row.c}`);
  }
  console.log("\nAdmin login: phone 9876500007 / password cold@123\n");

  await pool.end();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
