#!/usr/bin/env node
// Publishes infra/grafana to a Grafana: the "Cetus" folder, its dashboards, the alert rules and, when given, the
// contact point they notify. Safe to run again: everything is overwritten from the repository, and rules removed
// from alerts.json are removed from Grafana.
//
//   GRAFANA_URL=https://<stack>.grafana.net GRAFANA_TOKEN=glsa_... node scripts/grafana-sync.mjs
//   node scripts/grafana-sync.mjs     (the local Grafana of `mise run infra-otel`, :3002, admin/admin)
//
// GRAFANA_TOKEN is a service account token with the Editor role. Optional:
//   GRAFANA_PROMETHEUS_UID      the metrics data source for the rules; otherwise grafanacloud-*-prom or the default
//   CETUS_ALERT_EMAILS          comma-separated addresses for the "cetus-ops" contact point
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID   also notify a Telegram chat
// Without any of the last three the contact point is left as it is, so one made in the UI stays.
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "infra", "grafana");
const url = (process.env.GRAFANA_URL ?? "http://localhost:3002").replace(/\/$/, "");
const auth = process.env.GRAFANA_TOKEN
  ? `Bearer ${process.env.GRAFANA_TOKEN}`
  : `Basic ${Buffer.from(`${process.env.GRAFANA_USER ?? "admin"}:${process.env.GRAFANA_PASSWORD ?? "admin"}`).toString("base64")}`;

async function grafana(method, path, body) {
  const response = await fetch(url + path, {
    method,
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      // Keeps what this script provisions editable in the UI.
      "X-Disable-Provenance": "true",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 404 && method === "GET") {
    return null;
  }
  if (!response.ok) {
    throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function ensureFolder({ uid, title }) {
  if (!(await grafana("GET", `/api/folders/${uid}`))) {
    await grafana("POST", "/api/folders", { uid, title });
  }
  console.log(`folder ${title}`);
}

async function syncDashboards(folderUid) {
  const dir = join(root, "dashboards");
  for (const file of (await readdir(dir)).filter((name) => name.endsWith(".json")).sort()) {
    const dashboard = JSON.parse(await readFile(join(dir, file), "utf8"));
    await grafana("POST", "/api/dashboards/db", {
      dashboard: { ...dashboard, id: null, version: undefined },
      folderUid,
      overwrite: true,
      message: "grafana-sync",
    });
    console.log(`dashboard ${dashboard.title}`);
  }
}

async function prometheusUid() {
  if (process.env.GRAFANA_PROMETHEUS_UID) {
    return process.env.GRAFANA_PROMETHEUS_UID;
  }
  const sources = (await grafana("GET", "/api/datasources")).filter((source) => source.type === "prometheus");
  const chosen =
    sources.find((source) => /^grafanacloud-.+-prom$/.test(source.name)) ??
    sources.find((source) => source.isDefault) ??
    (sources.length === 1 ? sources[0] : undefined);
  if (!chosen) {
    throw new Error(
      `Cannot tell which Prometheus data source to use (${sources.map((source) => source.name).join(", ") || "none"}); set GRAFANA_PROMETHEUS_UID`,
    );
  }
  return chosen.uid;
}

async function syncContactPoint(name) {
  const wanted = [];
  if (process.env.CETUS_ALERT_EMAILS) {
    wanted.push({
      uid: `${name}-email`,
      type: "email",
      settings: { addresses: process.env.CETUS_ALERT_EMAILS.split(",").map((a) => a.trim()).join(";") },
    });
  }
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    wanted.push({
      uid: `${name}-telegram`,
      type: "telegram",
      settings: { bottoken: process.env.TELEGRAM_BOT_TOKEN, chatid: process.env.TELEGRAM_CHAT_ID },
    });
  }
  const existing = await grafana("GET", `/api/v1/provisioning/contact-points?name=${encodeURIComponent(name)}`);
  for (const point of wanted) {
    const body = { ...point, name, disableResolveMessage: false };
    if (existing.some((current) => current.uid === point.uid)) {
      await grafana("PUT", `/api/v1/provisioning/contact-points/${point.uid}`, body);
    } else {
      await grafana("POST", "/api/v1/provisioning/contact-points", body);
    }
    console.log(`contact point ${name} (${point.type})`);
  }
  return existing.length > 0 || wanted.length > 0;
}

function seconds(duration) {
  const match = /^(\d+)([smh])$/.exec(duration);
  if (!match) {
    throw new Error(`Unsupported duration ${duration}`);
  }
  return Number(match[1]) * { s: 1, m: 60, h: 3600 }[match[2]];
}

function provisioned(rule, { folderUid, group, datasourceUid, receiver }) {
  return {
    uid: rule.uid,
    title: rule.title,
    folderUID: folderUid,
    ruleGroup: group,
    condition: "B",
    data: [
      {
        refId: "A",
        relativeTimeRange: { from: seconds(rule.window), to: 0 },
        datasourceUid,
        model: { refId: "A", expr: rule.expr, instant: true, range: false },
      },
      {
        refId: "B",
        datasourceUid: "__expr__",
        model: {
          refId: "B",
          type: "threshold",
          expression: "A",
          conditions: [{ evaluator: { type: rule.condition.type, params: [rule.condition.value] } }],
        },
      },
    ],
    noDataState: rule.noData,
    execErrState: "Error",
    for: rule.for,
    labels: { severity: rule.severity, service: "cetus" },
    annotations: {
      summary: rule.summary,
      description: rule.description,
      __dashboardUid__: rule.dashboard,
      __panelId__: String(rule.panel),
    },
    ...(receiver ? { notification_settings: { receiver } } : {}),
  };
}

async function main() {
  const alerts = JSON.parse(await readFile(join(root, "alerts.json"), "utf8"));
  await ensureFolder(alerts.folder);
  await syncDashboards(alerts.folder.uid);
  const datasourceUid = await prometheusUid();
  const receiver = (await syncContactPoint(alerts.contactPoint)) ? alerts.contactPoint : undefined;
  const context = { folderUid: alerts.folder.uid, group: alerts.group, datasourceUid, receiver };
  // The group is replaced as a whole: rules no longer in alerts.json disappear.
  await grafana("PUT", `/api/v1/provisioning/folder/${alerts.folder.uid}/rule-groups/${alerts.group}`, {
    title: alerts.group,
    folderUid: alerts.folder.uid,
    interval: alerts.intervalSeconds,
    rules: alerts.rules.map((rule) => provisioned(rule, context)),
  });
  console.log(
    `${alerts.rules.length} alert rules in ${alerts.folder.title}/${alerts.group}` +
      (receiver ? `, notifying ${receiver}` : ", through the default notification policy"),
  );
}

await main();
