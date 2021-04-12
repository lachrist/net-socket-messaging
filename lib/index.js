
const global_Reflect_defineProperty = global.Reflect.defineProperty;
const global_Error = global.Error;

const { Buffer } = require("buffer");
const Util = require("util");

let log = Util.debuglog("net-socket-messaging", (optimized) => {
  log = optimized;
});

// https://github.com/nodejs/node/issues/26607
// let BUFFER = Buffer.allocUnsafe(1024);
// function send (message) {
//   let bytelength = BUFFER.write(message, 4, "utf8") + 4;
//   if (bytelength > BUFFER.length - 8) {
//     bytelength = Buffer.byteLength(message, "utf8") + 4;
//     BUFFER = Buffer.allocUnsafe(bytelength + 8);
//     BUFFER.write(message, 4, "utf8");
//   }
//   BUFFER.writeUInt32LE(bytelength, 0);
//   this.write(BUFFER.slice(0, bytelength));
// };

const descriptor = {
  __proto__: null,
  value: null,
  writable: true,
  configurable: true,
  enumerable: true
};

exports.patch = (socket) => {
  global_Reflect_defineProperty(socket, "_messaging_length", {
    __proto__: descriptor,
    value: null,
  });
  global_Reflect_defineProperty(socket, "send", {
    __proto__: descriptor,
    value: send,
  });
  socket.on("newListener", onNewListener);
  socket.on("readable", onReadable);
};

function onReadable () {
  if (this.listenerCount("message") > 0) {
    const message = receive(this);
    log("received due to readable event: %s", message);
    if (message !== null) {
      this.emit("message", message);
    }
  }
}

function onNewListener (event, listener) {
  if (event === "message") {
    const message = receive(this);
    log("received due to new message listener event: %s", message);
    if (message !== null) {
      listener(message);
    }
  }
}

// console.assert(Number.MAX_SAFE_INTEGER === 2**53 - 1);
const MAX = 256 * (2 ** 20); // 256MiB

exports.getMaxByteLength = () => MAX;

const send = function (message) {
  const body = Buffer.from(message, "utf8");
  if (body.length > MAX) {
    log("message too large %i", body.length);
    this.emit("error", new global_Error(`Cannot send message because its utf8 byte length is greater than ${MAX}, got: ${body.length}`));
    return null;
  }
  log("send: %s", message);
  const head = Buffer.allocUnsafe(4);
  head.writeUInt32LE(body.length, 0);
  this.write(head);
  return this.write(body);
};

const receive = (socket) => {
  if (socket._messaging_length === null) {
    const head = socket.read(4);
    if (head === null) {
      log("not enough byte for reading a head (4)");
      return null;
    }
    if (head.length < 4) {
      log("socket ended in the middle of a head (4)");
      return null;
    }
    socket._messaging_length = head.readUInt32LE(0);
  }
  /* c8 ignore start */
  if (socket._messaging_length > MAX) {
    socket.emit("error", new global_Error(`Attempting to receive a message greater than ${MAX}, got: ${socket._messaging_length}`));
  }
  /* c8 ignore stop */
  const body = socket.read(socket._messaging_length);
  if (body === null) {
    log("not enough byte for reading a body (%i)", socket._messaging_length);
    return null;
  }
  if (body.length < socket._messaging_length) {
    log("socket ended in the middle of a body (%i)", socket._messaging_length);
    return null;
  }
  return body.toString("utf8");
};
