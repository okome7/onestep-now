import { spawn } from "node:child_process";

const env = {
  ...process.env,
  RAILS_ENV: process.env.RAILS_ENV || "test",
};

const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn("bundle", ["exec", "rails", ...args], {
      cwd: "backend",
      env,
      shell: true,
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`rails ${args.join(" ")} exited with ${code}`));
      }
    });
  });

await run(["db:prepare"]);

const server = spawn(
  "bundle",
  ["exec", "rails", "s", "-p", "3001", "-b", "127.0.0.1"],
  {
    cwd: "backend",
    env,
    shell: true,
    stdio: "inherit",
  },
);

const stopServer = () => {
  if (!server.killed) {
    server.kill();
  }
};

process.on("SIGINT", stopServer);
process.on("SIGTERM", stopServer);

server.on("exit", (code) => {
  process.exit(code ?? 0);
});
