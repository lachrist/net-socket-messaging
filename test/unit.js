
const Net = require("net");

const { registerSocket } = require("../lib/main.js");

const server = new Net.Server();

server.listen(8080, () => {
  const socket = Net.connect(8080);
  registerSocket(socket);
  socket.send("x".repeat((256 * (2 ** 20))));
  socket.on("message", (message) => {
    console.log("client got: ", message);
  });
});

server.on("connection", (socket) => {
  registerSocket(socket);
  socket.on("message", (message) => {
    console.log("server got: ", message);
  });
});

setTimeout(() => {
  process.exit(0);
}, 1000);