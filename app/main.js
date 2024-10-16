const net = require("net");
const fs = require("fs").promises;
const path = require("path");
const zlib = require("zlib");

let filesDirectory = null;

const directoryFlagIndex = process.argv.indexOf("--directory");
if (directoryFlagIndex !== -1 && process.argv.length > directoryFlagIndex + 1) {
  filesDirectory = process.argv[directoryFlagIndex + 1];
}

const handleRootRequest = (socket) => {
  socket.write("HTTP/1.1 200 OK\r\n\r\n");
};

const handleEchoRequest = (socket, urlPath, headers) => {
  const message = urlPath.substring(6);
  const contentType = "text/plain";

  const acceptEncodingHeader = headers.find((header) =>
    header.toLowerCase().startsWith("accept-encoding:")
  );
  const supportsGzip =
    acceptEncodingHeader && acceptEncodingHeader.includes("gzip");

  if (supportsGzip) {
    zlib.gzip(message, (err, compressed) => {
      if (err) {
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.end();
        return;
      }

      const contentLength = compressed.length;

      socket.write("HTTP/1.1 200 OK\r\n");
      socket.write(`Content-Type: ${contentType}\r\n`);
      socket.write("Content-Encoding: gzip\r\n");
      socket.write(`Content-Length: ${contentLength}\r\n`);
      socket.write("\r\n");
      socket.write(compressed);
      socket.end();
    });
  } else {
    const contentLength = Buffer.byteLength(message, "utf8");

    socket.write("HTTP/1.1 200 OK\r\n");
    socket.write(`Content-Type: ${contentType}\r\n`);
    socket.write(`Content-Length: ${contentLength}\r\n`);
    socket.write("\r\n");
    socket.write(message);
    socket.end();
  }
};

const handleUserAgentRequest = (socket, headers) => {
  const userAgentHeader = headers.find((line) =>
    line.toLowerCase().startsWith("user-agent:")
  );
  const agent = userAgentHeader.split(":")[1].trim();
  const contentType = "text/plain";
  const contentLength = Buffer.byteLength(agent, "utf8");

  socket.write("HTTP/1.1 200 OK\r\n");
  socket.write(`Content-Type: ${contentType}\r\n`);
  socket.write(`Content-Length: ${contentLength}\r\n`);
  socket.write("\r\n");
  socket.write(agent);
  socket.end();
};

const handleFileRequest = async (socket, urlPath) => {
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
};

const handleFileUploadRequest = async (socket, urlPath, headers, body) => {
  const filename = urlPath.substring(7);
  const filePath = path.join(filesDirectory, filename);

  try {
    await fs.writeFile(filePath, body);
    socket.write("HTTP/1.1 201 Created\r\n\r\n");
  } catch (error) {
    socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
  } finally {
    socket.end();
  }
};

const server = net.createServer((socket) => {
  socket.on("data", async (data) => {
    const request = data.toString();
    const [requestLine, ...headers] = request.split("\r\n");
    const [method, urlPath] = requestLine.split(" ");
    const contentLengthHeader = headers.find((h) =>
      h.toLowerCase().startsWith("content-length:")
    );
    let contentLength = 0;

    if (contentLengthHeader) {
      contentLength = parseInt(contentLengthHeader.split(":")[1].trim(), 10);
    }

    if (method === "GET") {
      if (urlPath === "/") {
        handleRootRequest(socket);
      } else if (urlPath.startsWith("/echo/")) {
        handleEchoRequest(socket, urlPath, headers);
      } else if (urlPath === "/user-agent") {
        handleUserAgentRequest(socket, headers);
      } else if (urlPath.startsWith("/files/")) {
        await handleFileRequest(socket, urlPath);
      } else {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.end();
      }
    } else if (method === "POST" && urlPath.startsWith("/files/")) {
      const bodyStartIndex = request.indexOf("\r\n\r\n") + 4;
      const body = data.slice(bodyStartIndex, bodyStartIndex + contentLength);

      await handleFileUploadRequest(socket, urlPath, headers, body);
    } else {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.end();
    }
  });

  socket.on("close", () => {
    socket.end();
  });
});

server.listen(3000, "localhost", () => {
  console.log("Server is listening on http://localhost:3000");
});
