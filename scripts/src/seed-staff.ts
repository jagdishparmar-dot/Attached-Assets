import "../../load-env.mjs";
import { db } from "@workspace/db";
import { staffTable, hubsTable } from "@workspace/db/schema";

const hubs = [
  { name: "Mumbai Central Hub", city: "Mumbai", address: "APMC Yard, Vashi, Navi Mumbai", lat: 19.0760, lng: 72.8777, radiusMeters: 300 },
  { name: "Delhi North Hub", city: "Delhi", address: "Azadpur Mandi, North Delhi", lat: 28.7041, lng: 77.1025, radiusMeters: 300 },
  { name: "Bangalore Hub", city: "Bangalore", address: "Yeshwantpur Industrial Area", lat: 12.9716, lng: 77.5946, radiusMeters: 300 },
  { name: "Mumbai East Hub", city: "Mumbai", address: "Govandi Industrial Estate", lat: 19.0596, lng: 72.9208, radiusMeters: 300 },
];

const staffSeed = [
  { name: "Ramesh Kumar",  employeeId: "CV-DRV-001", role: "driver",     phone: "9876543210", hub: "Mumbai Central Hub", password: "cold@123", licenseNumber: "MH01 20190012345", shiftStart: "08:00", shiftEnd: "18:00", joiningDate: "2021-03-10" },
  { name: "Suresh Patel",  employeeId: "CV-DRV-002", role: "driver",     phone: "9876543211", hub: "Mumbai Central Hub", password: "cold@123", licenseNumber: "MH01 20180023456", shiftStart: "08:00", shiftEnd: "18:00", joiningDate: "2021-05-15" },
  { name: "Amit Singh",    employeeId: "CV-DRV-003", role: "driver",     phone: "9876543212", hub: "Delhi North Hub",    password: "cold@123", licenseNumber: "DL01 20200034567", shiftStart: "07:00", shiftEnd: "17:00", joiningDate: "2022-01-12" },
  { name: "Vijay Rao",     employeeId: "CV-DRV-005", role: "driver",     phone: "9876543214", hub: "Mumbai East Hub",    password: "cold@123", licenseNumber: "MH02 20210056789", shiftStart: "09:00", shiftEnd: "19:00", joiningDate: "2022-06-20" },
  { name: "Ravi Nair",     employeeId: "CV-PCK-001", role: "picker",     phone: "9876500001", hub: "Mumbai Central Hub", password: "cold@123", licenseNumber: null,               shiftStart: "06:00", shiftEnd: "14:00", joiningDate: "2022-03-01" },
  { name: "Priya Sharma",  employeeId: "CV-PCK-002", role: "picker",     phone: "9876500002", hub: "Delhi North Hub",    password: "cold@123", licenseNumber: null,               shiftStart: "06:00", shiftEnd: "14:00", joiningDate: "2022-04-15" },
  { name: "Mohan Das",     employeeId: "CV-SRT-001", role: "sorter",     phone: "9876500003", hub: "Mumbai Central Hub", password: "cold@123", licenseNumber: null,               shiftStart: "04:00", shiftEnd: "12:00", joiningDate: "2021-11-10" },
  { name: "Ganesh Iyer",   employeeId: "CV-SRT-002", role: "sorter",     phone: "9876500004", hub: "Bangalore Hub",      password: "cold@123", licenseNumber: null,               shiftStart: "04:00", shiftEnd: "12:00", joiningDate: "2022-02-20" },
  { name: "Arjun Mehta",   employeeId: "CV-LDR-001", role: "loader",     phone: "9876500005", hub: "Mumbai Central Hub", password: "cold@123", licenseNumber: null,               shiftStart: "05:00", shiftEnd: "13:00", joiningDate: "2023-01-05" },
  { name: "Deepak Verma",  employeeId: "CV-LDR-002", role: "loader",     phone: "9876500006", hub: "Delhi North Hub",    password: "cold@123", licenseNumber: null,               shiftStart: "05:00", shiftEnd: "13:00", joiningDate: "2023-02-10" },
  { name: "Sanjay Gupta",  employeeId: "CV-SUP-001", role: "supervisor", phone: "9876500007", hub: "Mumbai Central Hub", password: "cold@123", licenseNumber: null,               shiftStart: "08:00", shiftEnd: "20:00", joiningDate: "2020-06-01" },
  { name: "Kavita Reddy",  employeeId: "CV-SUP-002", role: "supervisor", phone: "9876500008", hub: "Bangalore Hub",      password: "cold@123", licenseNumber: null,               shiftStart: "08:00", shiftEnd: "20:00", joiningDate: "2020-08-15" },
  { name: "Prakash Singh", employeeId: "CV-SEC-001", role: "security",   phone: "9876500009", hub: "Mumbai Central Hub", password: "cold@123", licenseNumber: null,               shiftStart: "00:00", shiftEnd: "08:00", joiningDate: "2023-03-01" },
  { name: "Ramu Yadav",    employeeId: "CV-SEC-002", role: "security",   phone: "9876500010", hub: "Delhi North Hub",    password: "cold@123", licenseNumber: null,               shiftStart: "08:00", shiftEnd: "16:00", joiningDate: "2023-04-01" },
];

async function run() {
  console.log("Seeding hubs...");
  for (const h of hubs) {
    await db.insert(hubsTable).values(h).onConflictDoNothing();
  }

  console.log("Seeding staff...");
  for (const s of staffSeed) {
    await db.insert(staffTable).values(s).onConflictDoNothing();
  }

  console.log("Done!");
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
