import { spawn } from "node:child_process";

const env = {
	...process.env,
	PRISMA_DATABASE_URL: process.env.PRISMA_DATABASE_URL || "file:./dev.db",
};

const child = spawn(process.execPath, ["./node_modules/prisma/build/index.js", "generate"], {
	cwd: process.cwd(),
	env,
	stdio: "inherit",
});

child.on("exit", (code) => {
	process.exit(code ?? 1);
});

child.on("error", (error) => {
	console.error(error);
	process.exit(1);
});