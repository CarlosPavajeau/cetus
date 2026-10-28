import fs from "node:fs";

const index = process.argv[2];
if (!index) throw new Error("Usage: node bench/lib/worker-summary.mjs <index.tsv>");
const records = fs
    .readFileSync(index, "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split("\t"));
const fields = [
    "variant",
    "point",
    "repetition",
    "exit_code",
    "documents",
    "throughput",
    "accepted",
    "delivery_completed",
    "artifacts_ready",
    "validation_p95_ms",
    "delivery_p95_ms",
    "sql_calls",
    "kms_decrypt_calls",
    "worker_cpu_avg",
    "worker_memory_max_mib",
    "gc_pauses",
    "gc_pause_ms",
    "process_pending_max",
    "delivery_pending_max",
    "directory",
];
console.log(fields.join(","));
for (const [variant, point, repetition, code, dir] of records) {
    const read = (file) => fs.readFileSync(`${dir}/${file}`, "utf8");
    const summary = JSON.parse(read("summary.json"));
    const metric = (name, field) => {
        const data = summary.metrics[name];
        return data ? ((data.values ?? data)[field] ?? "") : "";
    };
    const calls = (file) =>
        new Map(
            read(file)
                .trim()
                .split("\n")
                .slice(1)
                .map((line) => {
                    const [id, calls] = line.split(",");
                    return [id, Number(calls)];
                }),
        );
    const before = calls("sql-before.csv");
    const after = calls("sql-after.csv");
    const sqlCalls = [...after].reduce(
        (sum, [id, count]) => sum + Math.max(0, count - (before.get(id) ?? 0)),
        0,
    );
    const containers = read("containers.csv")
        .trim()
        .split("\n")
        .slice(1)
        .map((line) => line.split(","))
        .filter((row) => row[1] === "cetus-bench-worker-1");
    const cpus = containers.map((row) => parseFloat(row[2]));
    const memory = containers.map((row) => {
        const used = row[3].split(" / ")[0];
        return parseFloat(used) * (used.includes("GiB") ? 1024 : 1);
    });
    const logs = read("services.log")
        .split("\n")
        .filter((line) => line.startsWith("worker-"));
    const pauses = logs.flatMap((line) => {
        const match = line.match(/Pause .* ([\d.]+)ms/);
        return match ? [Number(match[1])] : [];
    });
    const jobs = read("jobs.csv")
        .trim()
        .split("\n")
        .slice(1)
        .map((line) => line.split(","));
    const pending = (type) =>
        Math.max(
            0,
            ...jobs
                .filter((row) => row[1] === type && row[2] === "PENDING")
                .map((row) => Number(row[3])),
        );
    console.log(
        [
            variant,
            point,
            repetition,
            code,
            metric("iterations", "count"),
            metric("iterations", "rate"),
            metric("accepted", "value"),
            metric("delivery_completed", "value"),
            metric("artifacts_ready", "value"),
            metric("server_time_to_validation", "p(95)"),
            metric("time_to_delivery", "p(95)"),
            sqlCalls,
            Number(read("kms.txt").trim().split("=")[1]),
            cpus.reduce((sum, value) => sum + value, 0) / cpus.length,
            Math.max(...memory),
            pauses.length,
            pauses.reduce((sum, value) => sum + value, 0),
            pending("PROCESS_DOCUMENT"),
            pending("DELIVER_DOCUMENT"),
            dir,
        ].join(","),
    );
}
