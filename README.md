# net-socket-messaging

Implementation of a simple messaging protocol on top of `net.Socket`s.
The protocol is the simplest I could think of:
- The head consists in 4 bytes which encodes an unsigned 32 int written in little endian.
- The body is a string of bytes which encodes a string in utf8 and whose length is defined by the head.

```sh
npm i net-socket-messaging
```

```js
const socket = require("net").connect();
// `registerSocket` monkey-patches a net.Socket
// with the `send` method and the `message` event.
require("net-socket-messaging").registerSocket(socket);
// Once monkey-patched, the socket should not be
// directly used to read or write data.
const message = "foo";
socket.send(message);
// The `message` event is emitted only if there is a
// least one listener registered.
socket.on("message", (message) => {
  console.log("Received:", message);
});
```

Note that the maximum number of bytes present in the body is not 2**32 but rather 256MiB (ie `256 * 2^20` bytes).
The first restriction is imposed by node: the `net.Socket.read(size)` method does not accept a size greater than `2**30` (1GiB).
The second restriction is imposed by the ECMAScript 2016 spec: the maximum number of elements of a string is `2^53 - 1`.
However most JS engines do not follow this requirement.
Hence, to make sure that the protocol can be implemented across a large spectre of JS engines, I chose a limit of 256MiB.
Once decoded as utf8, this limit strings to a length of maximum `256 * 2^20` elements which seems like a conservative limits.
