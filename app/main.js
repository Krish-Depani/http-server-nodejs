const net = require("net");
const fs = require("fs").promises;
const path = require("path");

let filesDirectory = null;

const directoryFlagIndex = process.argv.indexOf("--directory");
if (directoryFlagIndex !== -1 && process.argv.length > directoryFlagIndex + 1) {
  filesDirectory = process.argv[directoryFlagIndex + 1];
}

const server = net.createServer((socket) => {
  socket.on("data", async (data) => {
    const request = data.toString();

    const lines = request.split("\r\n");
    const requestLine = lines[0];
    const headers = lines.slice(1);
    const urlPath = requestLine.split(" ")[1];

    if (urlPath === "/") {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
    } else if (urlPath.startsWith("/echo/")) {
      const message = urlPath.substring(6);
      const contentType = "text/plain";
      const contentLength = Buffer.byteLength(message, "utf8");

      socket.write("HTTP/1.1 200 OK\r\n");
      socket.write(`Content-Type: ${contentType}\r\n`);
      socket.write(`Content-Length: ${contentLength}\r\n`);
      socket.write("\r\n");
      socket.write(message);
    } else if (urlPath === "/user-agent") {
      let userAgent = headers.find((line) =>
        line.toLowerCase().startsWith("user-agent:")
      );
      const agent = userAgent.split(":")[1].trim();
      const contentType = "text/plain";
      const contentLength = Buffer.byteLength(agent, "utf8");

      socket.write("HTTP/1.1 200 OK\r\n");
      socket.write(`Content-Type: ${contentType}\r\n`);
      socket.write(`Content-Length: ${contentLength}\r\n`);
      socket.write("\r\n");
      socket.write(agent);
    } else if (urlPath.startsWith("/files/")) {
      try {
        const filename = urlPath.substring(7);
        const filePath = path.join(filesDirectory, filename);

        const stats = await fs.stat(filePath);

        if (!stats.isFile()) {
          throw new Error("The requested file is not a file.");
        }

        const fileContent = await fs.readFile(filePath);
        const contentType = "application/octet-stream";
        const contentLength = Buffer.byteLength(fileContent, "utf8");

        socket.write("HTTP/1.1 200 OK\r\n");
        socket.write(`Content-Type: ${contentType}\r\n`);
        socket.write(`Content-Length: ${contentLength}\r\n`);
        socket.write("\r\n");
        socket.write(fileContent);
      } catch (error) {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      } finally {
        socket.end();
      }
    } else {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    }
  });
  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");
