import fs from "node:fs";

const [index, spansFile] = process.argv.slice(2);
if (!index || !spansFile) throw new Error("Usage: build-summary.mjs <index.tsv> <build-spans.csv>");
const content = fs.readFileSync(spansFile, "utf8");
if (!content.startsWith("start_ns,duration_ms\n") || !content.endsWith("\n"))
    throw new Error("Invalid timing file");
const spans = new Map(
    content
        .trim()
        .split("\n")
        .slice(1)
        .map((line) => {
            const [epoch, durationText] = line.split(",");
            if (!/^\d+$/.test(epoch)) throw new Error("Invalid timing timestamp");
            const start = Number(BigInt(epoch) / 1000000n);
            const duration = Number(durationText);
            if (!Number.isFinite(start) || !Number.isFinite(duration) || duration < 0)
                throw new Error("Invalid timing row");
            return [line, { start, duration }];
        }),
);
const records = fs
    .readFileSync(index, "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split("\t"));
console.log(
    "variant,point,repetition,exit_code,expected_builds,observed_builds,build_p50_ms,build_p95_ms,directory",
);
let complete = true;
for (const [variant, point, repetition, code, directory] of records) {
    const windowFile = `${directory}/timing-window.json`;
    const window = fs.existsSync(windowFile)
        ? JSON.parse(fs.readFileSync(windowFile, "utf8"))
        : {
              start: fs.statSync(`${directory}/run.txt`).birthtimeMs,
              end: fs.statSync(`${directory}/summary.json`).mtimeMs,
          };
    if (
        !Number.isFinite(window.start) ||
        !Number.isFinite(window.end) ||
        window.start <= 0 ||
        window.end < window.start
    )
        throw new Error("Invalid measurement window");
    fs.writeFileSync(windowFile, `${JSON.stringify(window)}\n`);
    const summary = JSON.parse(fs.readFileSync(`${directory}/summary.json`, "utf8"));
    const accepted = summary.metrics?.accepted?.values ?? summary.metrics?.accepted;
    const expected = accepted?.passes;
    if (!Number.isInteger(expected) || expected < 0) throw new Error("Accepted count is missing");
    const durations = [...spans.values()]
        .filter((span) => span.start >= window.start - 1000 && span.start <= window.end + 1000)
        .map((span) => span.duration)
        .sort((a, b) => a - b);
    if (durations.length !== expected || expected === 0 || code !== "0") complete = false;
    const percentile = (p) => durations[Math.max(0, Math.ceil(durations.length * p) - 1)] ?? "";
    console.log(
        [
            variant,
            point,
            repetition,
            code,
            expected,
            durations.length,
            percentile(0.5),
            percentile(0.95),
            directory,
        ].join(","),
    );
}
if (!complete) {
    console.error(
        "Timing profile has failed runs or incomplete span capture; do not treat it as complete",
    );
    process.exitCode = 1;
}
