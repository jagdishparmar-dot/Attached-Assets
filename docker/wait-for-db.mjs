import net from "node:net";
import "../load-env.mjs";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const url = new URL(rawUrl);
const host = url.hostname;
const port = Number(url.port || 5432);

const socket = net.createConnection({ host, port });
socket.setTimeout(5000);
socket.on("connect", () => {
  socket.end();
  process.exit(0);
});
socket.on("timeout", () => {
  socket.destroy();
  process.exit(1);
});
socket.on("error", () => {
  process.exit(1);
});
