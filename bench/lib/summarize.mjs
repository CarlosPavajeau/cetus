// Prints what bench.sh collected during a run: CPU and memory per container (against its limit) and the
// worker's backlog. Usage: node bench/lib/summarize.mjs bench/results/<run>
import { readFileSync } from "node:fs";

const dir = process.argv[2];
const rows = (file) =>
  readFileSync(`${dir}/${file}`, "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(","));

const mib = (text) => {
  const value = parseFloat(text);
  if (text.includes("GiB")) return value * 1024;
  if (text.includes("KiB")) return value / 1024;
  return value;
};

const containers = new Map();
for (const [, name, cpu, mem] of rows("containers.csv")) {
  const stats = containers.get(name) ?? { cpu: [], mem: [], limit: "" };
  stats.cpu.push(parseFloat(cpu));
  const [used, limit] = mem.split(" / ");
  stats.mem.push(mib(used));
  stats.limit = limit;
  containers.set(name, stats);
}

const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)] ?? 0;
console.log("container            cpu avg   cpu p90   cpu max   mem max (limit)");
for (const [name, { cpu, mem, limit }] of [...containers].sort()) {
  const avg = cpu.reduce((sum, value) => sum + value, 0) / cpu.length;
  console.log(
    `${name.replace(/^cetus-bench-|-1$/g, "").padEnd(18)} ${avg.toFixed(0).padStart(6)}%  ${percentile(cpu, 0.9)
      .toFixed(0)
      .padStart(6)}%  ${Math.max(...cpu).toFixed(0).padStart(6)}%   ${Math.max(...mem).toFixed(0)} MiB (${limit})`,
  );
}
console.log("(100% = one full CPU; the API, the worker and the console are capped at 100%)");

const backlog = new Map();
for (const [time, type, , jobs] of rows("jobs.csv")) {
  backlog.set(time, (backlog.get(time) ?? 0) + Number(jobs));
}
const samples = [...backlog.values()];
if (samples.length > 0) {
  console.log(`worker backlog: max ${Math.max(...samples)} pending jobs, at the end ${samples.at(-1)}`);
} else {
  console.log("worker backlog: empty throughout");
}
