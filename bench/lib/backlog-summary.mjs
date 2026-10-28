import fs from "node:fs";

const index = process.argv[2];
if (!index) throw new Error("Usage: backlog-summary.mjs <index.tsv>");
const records = fs.readFileSync(index, "utf8").trim().split("\n").slice(1).map((line) => line.split("\t"));
function seconds(value) {
    const parts = value.split(":").map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part)) || parts[0] > 23 || parts[1] > 59 || parts[2] > 59) throw new Error("Invalid sample time");
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
}
console.log("variant,point,repetition,elapsed_seconds,process_pending,delivery_pending,phase");
for (const [variant, point, repetition, , directory] of records) {
    const run = fs.readFileSync(`${directory}/run.txt`, "utf8");
    const duration = run.match(/duration=([\d.hms]+)/)?.[1];
    if (!duration) throw new Error("Run duration is missing");
    const units = [...duration.matchAll(/([\d.]+)(h|m|s)/g)];
    if (units.map((part) => part[0]).join("") !== duration) throw new Error("Invalid run duration");
    const durationSeconds = units.reduce((total, part) => total + Number(part[1]) * ({ h: 3600, m: 60, s: 1 }[part[2]]), 0);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error("Invalid run duration");
    const samples = new Map();
    for (const line of fs.readFileSync(`${directory}/jobs.csv`, "utf8").trim().split("\n").slice(1)) {
        const [time, type, status, count] = line.split(",");
        if (!samples.has(time)) samples.set(time, { PROCESS_DOCUMENT: 0, DELIVER_DOCUMENT: 0 });
        const sample = samples.get(time);
        if (status === "PENDING" && Object.hasOwn(sample, type)) {
            const value = Number(count);
            if (!Number.isInteger(value) || value < 0) throw new Error("Invalid job count");
            sample[type] += value;
        }
    }
    const first = samples.keys().next().value;
    if (!first) throw new Error("Job samples are missing");
    for (const [time, sample] of samples) {
        const elapsed = (seconds(time) - seconds(first) + 86400) % 86400;
        console.log([variant, point, repetition, elapsed, sample.PROCESS_DOCUMENT, sample.DELIVER_DOCUMENT, elapsed <= durationSeconds ? "arrival" : "drain"].join(","));
    }
}
