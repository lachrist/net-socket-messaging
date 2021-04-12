# net-socket-messaging

```sh
npm install net-socket-messaging
```

Implementation of a simple messaging protocol by monkey-patching a `net.Socket`.
The protocol is the simplest I could think of:
- The head consists of 4 bytes which encodes an unsigned 32 int written in little endian.
- The body is a string of bytes which encodes a string in utf8 and whose byte length is defined by the head.

## Example

```js
const socket = require("net").connect();
// `registerSocket` monkey-patches a net.Socket
// with the `send` method and the `message` event.
require("net-socket-messaging").monkeyPatch(socket);
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

## API

### NetSocketMessaging.patch(socket)

* `socket` `<net.Socket>`: the socket to monkey-patch.
* Returns `<undefined>`: I'm not a big fan of artificial chain callings, you should assume your side effects!

### NetSocketMessaging.getMaxByteLength()

* Returns `<integer>`: the maximum number of utf8 bytes for messages.

### `socket.send(message)`

Send a message through the `net.Socket`.

* `message` `<string>`: the message to send.
  N.B.: the maximum number of utf8 bytes of `message` is not `2^32` (~ 4GiB) but rather `256 * 2^20` (256MiB).
* Returns `<null>` | `<boolean>`: `null` if the message is too big to send (an `'error'` event is emitted to the socket), and `<boolean>` as per the return value of `new.Socket.write(buffer)`.

### Event `'message'`

Emitted when a message has been fully received.
Receiving a message larger than utf8 256MiB may succeed but it will always trigger an `'error'` event on the socket.

* `message` `<string>`: the received message.

## Rant about the maximum number of bytes in the body

The first restriction is imposed by node: the `net.Socket.read(size)` method does not accept a size greater than `2**30` (1GiB).
The second restriction is imposed by the ECMAScript 2016 spec: the maximum number of elements of a string is `2^53 - 1`.
However most JS engines do not follow this requirement.
To make sure that the protocol can be implemented across a large spectre of JS engines, I chose a the conservative limit of 256MiB.
