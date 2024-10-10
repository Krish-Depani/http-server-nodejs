const net = require("net");

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const request = data.toString();
    console.log(request);
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
    } else {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    }
  });
  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");
