import net from "node:net";

const delay = Number(process.env.DELAY_MS || 5);
if (!Number.isFinite(delay) || delay < 0) throw new Error("DELAY_MS must be nonnegative");
const server = net.createServer({ allowHalfOpen: true }, (client) => {
    const upstream = net.connect({
        port: Number(process.env.TARGET_PORT || 6432),
        host: process.env.TARGET_HOST || "pgbouncer",
        allowHalfOpen: true,
    });
    const timers = new Set();
    function forward(source, target) {
        source.on("data", (data) => {
            source.pause();
            const timer = setTimeout(() => {
                timers.delete(timer);
                if (!target.destroyed) target.write(data, () => source.resume());
            }, delay);
            timers.add(timer);
        });
        source.on("end", () => {
            const timer = setTimeout(() => {
                timers.delete(timer);
                target.end();
            }, delay);
            timers.add(timer);
        });
    }
    function close() {
        for (const timer of timers) clearTimeout(timer);
        client.destroy();
        upstream.destroy();
    }
    client.on("error", close);
    upstream.on("error", close);
    client.on("close", () => {
        if (!client.readableEnded) close();
    });
    upstream.on("close", () => {
        if (!upstream.readableEnded) close();
    });
    forward(client, upstream);
    forward(upstream, client);
});
server.on("error", (error) => {
    console.error(error.code);
    process.exitCode = 1;
});
server.listen(6433, "0.0.0.0", () => console.log(`Postgres proxy: ${delay} ms per direction`));
