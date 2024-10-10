const net = require("net");

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const request = data.toString();
    console.log(request);
    const requestLine = request.split("\r\n")[0];
    const urlPath = requestLine.split(" ")[1];

    if (urlPath === "/") {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
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
