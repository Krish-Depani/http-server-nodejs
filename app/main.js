const net = require("net");

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const request = data.toString();

    const requestLine = request.split("\r\n")[0];
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
    } else {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    }
  });
  socket.on("close", () => {
    socket.end();
    socket.close();
  });
});

server.listen(4221, "localhost");
