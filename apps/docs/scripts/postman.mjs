// Builds the Postman collection that the docs site offers for download, from the public spec. It is generated
// on every build, never edited by hand: public/cetus.postman_collection.json is git-ignored.

import { readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

import converter from "openapi-to-postmanv2";

const spec = readFileSync(new URL("../public/openapi.public.json", import.meta.url), "utf8");
const target = new URL("../public/cetus.postman_collection.json", import.meta.url);

const result = await promisify(converter.convertV2)(
    { type: "string", data: spec },
    {
        folderStrategy: "Tags",
        parametersResolution: "Example",
        requestNameSource: "Fallback",
        alwaysInheritAuthentication: true,
    },
);
if (!result.result) {
    throw new Error(`Could not convert the spec: ${result.reason}`);
}
const collection = result.output[0]?.data;
if (!collection) {
    throw new Error("The converter returned no collection");
}

collection.info.description =
    "Colección generada desde la especificación pública de Cetus. Pon tu llave de simulación en la " +
    "variable apiKey; Idempotency-Key se genera en cada envío.";
collection.variable = [
    { key: "baseUrl", value: "https://cetus-api.cantte.com", type: "string" },
    { key: "apiKey", value: "cetus_sandbox_", type: "string" },
];
collection.auth = {
    type: "bearer",
    bearer: [{ key: "token", value: "{{apiKey}}", type: "string" }],
};

// Each folder keeps the id its POST returns, so the requests that follow work without copying it by hand.
const ID_VARIABLES = {
    Facturas: "invoiceId",
    "Notas crédito": "creditNoteId",
    "Notas débito": "debitNoteId",
    Emisores: "issuerId",
    Clientes: "customerId",
    Productos: "productId",
};
const exampleInvoiceId =
    JSON.parse(spec).components.examples.CancellationCreditNote.value.invoiceId;

for (const folder of collection.item) {
    const idVariable = ID_VARIABLES[folder.name];
    if (!idVariable) {
        throw new Error(`No id variable for the folder ${folder.name}`);
    }
    collection.variable.push({ key: idVariable, value: "", type: "string" });
    for (const item of folder.item) {
        const { request } = item;
        for (const header of request.header ?? []) {
            if (header.key === "Idempotency-Key") {
                header.value = "{{$guid}}";
            }
        }
        for (const variable of request.url.variable ?? []) {
            if (variable.key === "id") {
                variable.value = `{{${idVariable}}}`;
            } else if (variable.key === "file") {
                variable.value = "pdf";
            }
        }
        if (request.body?.raw) {
            request.body.raw = request.body.raw.replaceAll(exampleInvoiceId, "{{invoiceId}}");
        }
        if (request.method === "POST") {
            item.event = [
                {
                    listen: "test",
                    script: {
                        type: "text/javascript",
                        exec: [
                            "if (pm.response.code === 201 || pm.response.code === 202) {",
                            `  pm.collectionVariables.set("${idVariable}", pm.response.json().id);`,
                            "}",
                        ],
                    },
                },
            ];
        }
    }
}

writeFileSync(target, `${JSON.stringify(collection, null, 2)}\n`);
console.log(`${target.pathname}: ${countRequests(collection.item)} requests`);

function countRequests(items) {
    return items.reduce((total, item) => total + (item.item ? countRequests(item.item) : 1), 0);
}
