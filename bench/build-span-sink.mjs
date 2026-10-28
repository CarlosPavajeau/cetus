import fs from "node:fs";
import http from "node:http";
import zlib from "node:zlib";

const output = process.env.OUTPUT || "/data/build-spans.csv";
const limit = 8 * 1024 * 1024;
const header = Buffer.from("start_ns,duration_ms\n");
if (!fs.existsSync(output) || fs.statSync(output).size === 0) {
    fs.appendFileSync(output, header);
} else {
    const descriptor = fs.openSync(output, "r");
    try {
        const stored = Buffer.alloc(header.length);
        const read = fs.readSync(descriptor, stored, 0, stored.length, 0);
        if (read !== header.length || !stored.equals(header))
            throw new Error("Incompatible timing file");
    } finally {
        fs.closeSync(descriptor);
    }
}

function varint(bytes, offset) {
    let value = 0n;
    for (let shift = 0n; shift < 70n && offset < bytes.length; shift += 7n) {
        const byte = bytes[offset++];
        value |= BigInt(byte & 127) << shift;
        if (byte < 128) return { value, offset };
    }
    throw new Error("Invalid protobuf varint");
}

function* fields(bytes) {
    let offset = 0;
    while (offset < bytes.length) {
        const tag = varint(bytes, offset);
        offset = tag.offset;
        if (tag.value > 0xffffffffn || tag.value < 8n) throw new Error("Invalid protobuf tag");
        const number = Math.floor(Number(tag.value) / 8);
        let value;
        switch (Number(tag.value % 8n)) {
            case 0: {
                const scalar = varint(bytes, offset);
                value = scalar.value;
                offset = scalar.offset;
                break;
            }
            case 1:
                if (offset + 8 > bytes.length) throw new Error("Truncated fixed64");
                value = bytes.readBigUInt64LE(offset);
                offset += 8;
                break;
            case 2: {
                const length = varint(bytes, offset);
                offset = length.offset;
                if (length.value > BigInt(bytes.length - offset))
                    throw new Error("Truncated message");
                value = bytes.subarray(offset, offset + Number(length.value));
                offset += Number(length.value);
                break;
            }
            case 5:
                if (offset + 4 > bytes.length) throw new Error("Truncated fixed32");
                value = bytes.readUInt32LE(offset);
                offset += 4;
                break;
            default:
                throw new Error("Unsupported protobuf wire type");
        }
        yield [number, value];
    }
}

function* messages(bytes, number) {
    for (const [field, value] of fields(bytes)) {
        if (field === number) {
            if (!Buffer.isBuffer(value)) throw new Error("Expected message");
            yield value;
        }
    }
}

function buildTimes(bytes) {
    const rows = [];
    for (const resource of messages(bytes, 1)) {
        for (const scope of messages(resource, 2)) {
            for (const data of messages(scope, 2)) {
                const span = new Map(fields(data));
                const name = span.get(5);
                if (!Buffer.isBuffer(name) || name.toString() !== "document.build") continue;
                const start = span.get(7);
                const end = span.get(8);
                if (typeof start !== "bigint" || typeof end !== "bigint" || end < start) {
                    throw new Error("Invalid span timestamps");
                }
                rows.push(`${start},${Number(end - start) / 1000000}`);
            }
        }
    }
    return rows;
}

const server = http.createServer((request, response) => {
    request.on("error", () => response.destroy());
    if (request.url !== "/v1/traces") {
        request.on("end", () =>
            response.writeHead(200, { "Content-Type": "application/x-protobuf" }).end(),
        );
        request.resume();
        return;
    }
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
        size += chunk.length;
        if (size <= limit) chunks.push(chunk);
    });
    request.on("end", () => {
        if (size > limit) {
            response.writeHead(413).end();
            return;
        }
        let rows;
        try {
            let bytes = Buffer.concat(chunks);
            if (request.headers["content-encoding"] === "gzip") {
                bytes = zlib.gunzipSync(bytes, { maxOutputLength: limit * 2 });
            }
            rows = buildTimes(bytes);
        } catch {
            response.writeHead(400).end();
            return;
        }
        try {
            if (rows.length) fs.appendFileSync(output, `${rows.join("\n")}\n`);
        } catch {
            console.error("Build timing write failed");
            response.writeHead(500).end();
            return;
        }
        response.writeHead(200, { "Content-Type": "application/x-protobuf" }).end();
    });
});
server.on("error", (error) => {
    console.error(error.code);
    process.exitCode = 1;
});
server.listen(Number(process.env.PORT || 4318), "0.0.0.0", () =>
    console.log("Build span sink listening"),
);
