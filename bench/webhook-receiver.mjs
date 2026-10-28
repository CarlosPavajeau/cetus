import http from "node:http";

const server = http.createServer((request, response) => {
    request.on("error", () => response.destroy());
    request.on("end", () => response.writeHead(204).end());
    request.resume();
});
server.on("error", (error) => {
    console.error(error.code);
    process.exitCode = 1;
});
server.listen(8192, "0.0.0.0");
