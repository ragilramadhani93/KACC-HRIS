import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import dotenv from "dotenv";
import { createPrismaClient } from "../src/prisma.js";

dotenv.config();

const UserRole = { admin: "admin", employee: "employee" };
const EntryStatus = { PENDING: "PENDING", APPROVED: "APPROVED", REJECTED: "REJECTED", PRESENT: "PRESENT", LATE: "LATE", ABSENT: "ABSENT" };

const prisma = createPrismaClient();

async function seed() {
  await prisma.outletShift.deleteMany();
  await prisma.outlet.deleteMany();
  await prisma.timeOffRequest.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const outlets = await prisma.outlet.createMany({
    data: [
      { code: "JKT-HQ", name: "Jakarta HQ", address: "Jl. Sudirman No.10, Jakarta", isActive: true },
      { code: "BDG-01", name: "Bandung Store", address: "Jl. Braga No.22, Bandung", isActive: true },
      { code: "SBY-01", name: "Surabaya Store", address: "Jl. Tunjungan No.8, Surabaya", isActive: true },
    ],
  });

  const outletRows = await prisma.outlet.findMany({ orderBy: { code: "asc" } });

  for (const outlet of outletRows) {
    await prisma.outletShift.createMany({
      data: [
        { outletId: outlet.id, name: "Morning", startTime: "08:00", endTime: "16:00", isOvernight: false, isActive: true },
        { outletId: outlet.id, name: "Evening", startTime: "16:00", endTime: "23:00", isOvernight: false, isActive: true },
        { outletId: outlet.id, name: "Night", startTime: "23:00", endTime: "07:00", isOvernight: true, isActive: true },
      ],
    });
  }

  const [itDept, opsDept] = await Promise.all([
    prisma.department.create({ data: { name: "IT" } }),
    prisma.department.create({ data: { name: "Operations" } }),
  ]);

  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  const admin = await prisma.user.create({
    data: {
      name: "System Admin",
      email: "admin@company.com",
      passwordHash: adminPasswordHash,
      role: UserRole.admin,
      departmentId: itDept.id,
      position: "HR Administrator",
      hourlyRate: 0,
      isActive: true,
    },
  });

  const employeesInput = [
    { name: "Ari Wijaya", email: "ari@company.com", departmentId: opsDept.id, position: "Cashier", hourlyRate: 12.5 },
    { name: "Bima Saputra", email: "bima@company.com", departmentId: opsDept.id, position: "Barista", hourlyRate: 13.0 },
    { name: "Citra Lestari", email: "citra@company.com", departmentId: itDept.id, position: "Data Staff", hourlyRate: 15.0 },
    { name: "Dewi Anggraini", email: "dewi@company.com", departmentId: itDept.id, position: "Receptionist", hourlyRate: 14.0 },
    { name: "Eko Pratama", email: "eko@company.com", departmentId: opsDept.id, position: "Storekeeper", hourlyRate: 14.5 },
  ];

  const defaultPasswordHash = await bcrypt.hash("Employee123!", 10);

  const employees = [];
  let outletIndex = 0;
  for (const item of employeesInput) {
    const user = await prisma.user.create({
      data: {
        ...item,
        role: UserRole.employee,
        passwordHash: defaultPasswordHash,
        outletId: outletRows[outletIndex % outletRows.length]?.id ?? null,
        isActive: true,
      },
    });
    employees.push(user);
    outletIndex += 1;

    for (let d = 1; d <= 5; d += 1) {
      await prisma.schedule.create({
        data: {
          userId: user.id,
          dayOfWeek: d,
          startTime: "09:00",
          endTime: "17:00",
        },
      });
    }
  }

  const statuses = [EntryStatus.PRESENT, EntryStatus.LATE, EntryStatus.APPROVED, EntryStatus.PENDING];

  for (const employee of employees) {
    for (let i = 0; i < 30; i += 1) {
      const date = dayjs().subtract(i, "day");
      const isWeekend = date.day() === 0 || date.day() === 6;
      if (isWeekend) continue;

      const lateMinutes = i % 5 === 0 ? 20 : 0;
      const clockIn = date.hour(9).minute(lateMinutes).second(0).millisecond(0).toDate();
      const breakStart = date.hour(12).minute(0).second(0).toDate();
      const breakEnd = date.hour(12).minute(45).second(0).toDate();
      const clockOut = date.hour(17).minute(i % 3 === 0 ? 20 : 0).second(0).toDate();
      const totalHours = Number(((dayjs(clockOut).diff(dayjs(clockIn), "minute") - 45) / 60).toFixed(2));

      await prisma.timeEntry.create({
        data: {
          userId: employee.id,
          clockIn,
          clockOut,
          breakStart,
          breakEnd,
          totalHours,
          latitude: -6.2,
          longitude: 106.816666,
          address: "Jakarta, Indonesia",
          ipAddress: "127.0.0.1",
          selfieUrl: null,
          status: statuses[i % statuses.length],
          notes: lateMinutes > 0 ? "Late arrival due to traffic" : null,
        },
      });
    }
  }

  await prisma.timeOffRequest.createMany({
    data: [
      {
        userId: employees[0].id,
        startDate: dayjs().add(7, "day").toDate(),
        endDate: dayjs().add(9, "day").toDate(),
        reason: "Family event",
        status: "PENDING",
      },
      {
        userId: employees[1].id,
        startDate: dayjs().subtract(14, "day").toDate(),
        endDate: dayjs().subtract(13, "day").toDate(),
        reason: "Medical leave",
        status: "APPROVED",
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete", { admin: admin.email, employees: employees.length, outlets: outletRows.length, shiftsPerOutlet: 3 });
}

seed()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
