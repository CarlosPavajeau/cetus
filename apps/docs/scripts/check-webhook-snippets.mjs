// Runs each webhook verification example in snippets/webhooks against signed deliveries, so the guide only
// publishes code that accepts a valid signature and rejects a tampered, stale or foreign one. Node, Python
// and Java run locally (Java from mise); PHP and .NET run in Docker.
import { execFileSync } from "node:child_process";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const snippets = join(dirname(fileURLToPath(import.meta.url)), "..", "snippets", "webhooks");

const images = { php: "php:8.3-cli", dotnet: "mcr.microsoft.com/dotnet/sdk:8.0" };

function newSecret() {
    return `whsec_${randomBytes(24).toString("base64")}`;
}

function sign(secret, webhookId, timestamp, body) {
    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const digest = createHmac("sha256", key)
        .update(`${webhookId}.${timestamp}.${body}`)
        .digest("base64");
    return `v1,${digest}`;
}

function delivery({
    secret,
    signingSecret = secret,
    age = 0,
    timestamp,
    body,
    tamper = false,
    extra,
}) {
    const webhookId = randomUUID();
    const sentAt = timestamp ?? String(Math.floor(Date.now() / 1000) - age);
    const signature = sign(signingSecret, webhookId, sentAt, body);
    return {
        webhookId,
        timestamp: sentAt,
        signature: extra ? `${extra} ${signature}` : signature,
        body: tamper ? body.replace("ACCEPTED", "REJECTED") : body,
        secret,
    };
}

function cases() {
    const secret = newSecret();
    const body = JSON.stringify({
        id: randomUUID(),
        type: "invoice.accepted",
        environment: "SANDBOX",
        data: { status: "ACCEPTED", customer: "Compañía de Ejemplo" },
    });
    return [
        { name: "valid", expected: true, ...delivery({ secret, body }) },
        {
            name: "one of several signatures",
            expected: true,
            ...delivery({ secret, body, extra: "v1,AAAA v2,BBBB" }),
        },
        { name: "tampered body", expected: false, ...delivery({ secret, body, tamper: true }) },
        { name: "older than 5 minutes", expected: false, ...delivery({ secret, body, age: 301 }) },
        {
            name: "another secret",
            expected: false,
            ...delivery({ secret, body, signingSecret: newSecret() }),
        },
        {
            name: "timestamp not a number",
            expected: false,
            ...delivery({ secret, body, timestamp: "1e9" }),
        },
    ];
}

const harnesses = {
    "harness.mjs": `import { readFileSync } from "node:fs";
import { verifyCetusWebhook } from "./verify.js";
for (const line of readFileSync(0, "utf8").trim().split("\\n")) {
  const [id, timestamp, signature, body, secret] = line.split("\\t");
  console.log(verifyCetusWebhook(id, timestamp, signature, Buffer.from(body, "base64").toString("utf8"), secret));
}
`,
    "harness.py": `import base64
import sys

from verify import verify_cetus_webhook

for line in sys.stdin.read().strip().split("\\n"):
    webhook_id, timestamp, signature, body, secret = line.split("\\t")
    print(str(verify_cetus_webhook(webhook_id, timestamp, signature, base64.b64decode(body), secret)).lower())
`,
    "harness.php": `<?php
require __DIR__ . '/verify.php';
foreach (explode("\\n", trim(stream_get_contents(STDIN))) as $line) {
    [$id, $timestamp, $signature, $body, $secret] = explode("\\t", $line);
    echo verifyCetusWebhook($id, $timestamp, $signature, base64_decode($body), $secret) ? "true" : "false", "\\n";
}
`,
    "Harness.java": `import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Base64;

public class Harness {
    public static void main(String[] args) throws Exception {
        var reader = new BufferedReader(new InputStreamReader(System.in));
        for (String line = reader.readLine(); line != null; line = reader.readLine()) {
            if (line.isBlank()) continue;
            String[] f = line.split("\\t");
            System.out.println(CetusWebhooks.verify(f[0], f[1], f[2], Base64.getDecoder().decode(f[3]), f[4]));
        }
    }
}
`,
    "Harness.cs": `using System;
string? line;
while ((line = Console.ReadLine()) != null)
{
    if (line.Trim().Length == 0) continue;
    var f = line.Split('\\t');
    Console.WriteLine(CetusWebhooks.Verify(f[0], f[1], f[2], Convert.FromBase64String(f[3]), f[4]) ? "true" : "false");
}
`,
    "check.csproj": `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
`,
};

function docker(image, dir, command) {
    return ["docker", ["run", "--rm", "-i", "-v", `${dir}:/w`, "-w", "/w", image, ...command]];
}

const languages = [
    { name: "JavaScript", file: "verify.js", run: () => ["node", ["harness.mjs"]] },
    { name: "Python", file: "verify.py", run: () => ["python3", ["harness.py"]] },
    {
        name: "PHP",
        file: "verify.php",
        run: (dir) => docker(images.php, dir, ["php", "harness.php"]),
    },
    { name: "Java", file: "CetusWebhooks.java", run: () => ["java", ["Harness.java"]] },
    {
        name: "C#",
        file: "CetusWebhooks.cs",
        run: (dir) =>
            docker(images.dotnet, dir, [
                "sh",
                "-c",
                "dotnet build -nologo -v q -o out >/dev/null && dotnet out/check.dll",
            ]),
    },
];

const work = mkdtempSync(join(tmpdir(), "cetus-webhook-snippets-"));
let failures = 0;
try {
    for (const [name, content] of Object.entries(harnesses)) {
        writeFileSync(join(work, name), content);
    }
    for (const language of languages) {
        copyFileSync(join(snippets, language.file), join(work, language.file));
    }
    for (const language of languages) {
        const checks = cases();
        const input = checks
            .map((check) =>
                [
                    check.webhookId,
                    check.timestamp,
                    check.signature,
                    Buffer.from(check.body).toString("base64"),
                    check.secret,
                ].join("\t"),
            )
            .join("\n");
        const [command, args] = language.run(work);
        let output;
        try {
            output = execFileSync(command, args, {
                cwd: work,
                input,
                encoding: "utf8",
                stdio: ["pipe", "pipe", "inherit"],
            });
        } catch (error) {
            console.error(`✗ ${language.name}: ${error.message}`);
            failures += 1;
            continue;
        }
        const results = output.trim().split("\n").slice(-checks.length);
        checks.forEach((check, index) => {
            const actual = results[index] === "true";
            if (actual !== check.expected) {
                console.error(
                    `✗ ${language.name}: ${check.name} returned ${results[index]}, expected ${check.expected}`,
                );
                failures += 1;
            }
        });
        console.log(`${language.name}: ${checks.length} cases run`);
    }
} finally {
    rmSync(work, { recursive: true, force: true });
}

if (failures > 0) {
    console.error(`${failures} failing check(s)`);
    process.exit(1);
}
console.log("Every webhook example verifies as expected.");
