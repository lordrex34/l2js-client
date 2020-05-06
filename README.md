# Lineage 2 JavaScript Client

This project was made while experimenting with TypeScript and es6. The idea is to have a NCSoft Lineage 2 client library, that allows other projects to build L2 client functionalities (like bots, game helpers, etc.) on top of it. It can be also used as a framework for building Lineage2 automated tests for L2 private servers.

## Supported L2 Chronicles

For now the library supports only Lineage 2 HighFive:

- protocol version 267 - HighFive
- protocol version 268 - HighFive Update 1
- protocol version 271 - HighFive Update 2
- protocol version 273 - HighFive Update 3

If you are interested in other L2 versions, please leave a comment / open an issue.

## Installation

```js
npm install l2js-client
```

///@todo

## Examples

### Logging in

```ts
import Client from "l2js-client";

const l2 = new Client();
l2.enter({
  /* required */ username: "l2js",
  /* required */ password: "passwd",
  /* required */ loginServerIp: "127.0.0.1",
  /* optional */ serverId: 1, //Bartz
  /* optional */ charSlotIndex: 0,
});
```

### Chat

```ts
l2.on("LoggedIn", () => {
  l2.say("Hello from " + l2.Me.Name);
  l2.shout("Hello world !!!");
  l2.tell("hi there", "myMainCharName");
  l2.sayToParty("Hello party");
  l2.sayToClan("Hello clan");
  l2.sayToTrade("Hello traders");
  l2.sayToAlly("Hello ppls");
});
```

### Move to location

```ts
l2.on("LoggedIn", () => {
  let x = 50 + Math.floor(Math.random() * 50) + l2.Me.X;
  let y = 50 + Math.floor(Math.random() * 50) + l2.Me.Y;
  let z = l2.Me.Z;
  l2.moveTo(x, y, z);
});
```

### Fight back

```ts
import { OnAttackedEvent } from "l2js-client/dist/events/EventTypes";

l2.on("Attacked", (e) => {
  var eventData = e.data as OnAttackedEvent;

  if (Array.from(eventData.subjects).indexOf(l2.Me.ObjectId) !== -1) {
    l2.hit(eventData.object);
    l2.hit(eventData.object);
  }
});
```

### Follow a character

```ts
...
import L2Creature from "l2js-client/dist/entities/L2Creature";


l2.on("StartMoving", ({ data }) => {
  let player = data as L2Creature;
  if (player.Name === "MyMainChar") {
    l2.moveTo(player.Dx, player.Dy, player.Dz);
  }
});
```

### Simple bot (auto-target and auto-close-combat-hit)

```ts
type EventData = { creature: L2Creature; isSpoiled: boolean };

l2.on("Die", (e) => {
  let eventData = e.data as EventData;

  if (l2.Me.Target && eventData.creature.ObjectId === l2.Me.Target.ObjectId) {
    l2.cancelTarget();
  }
});

setInterval(() => {
  if (l2.Me.Target === null) {
    l2.nextTarget();
  } else {
    setTimeout(() => l2.hit(l2.Me.Target), 100);
    setTimeout(() => l2.hit(l2.Me.Target), 100);
  }
}, 500);
```

## API

///@todo

## Contributing

I welcome contributions of all types, as long as you enjoy it and do it for fun :-) !

## Protocol Overview

### Data Transfer

```txt
| Header |    Content    |
| A | B  |C|D|E|F|G|H|I|…|
```

All fields (header and content) are written in little endian (a.k.a. Intel's byte order). This includes both numeric and string fields.

### Header

The only field in a packet's header is a 2-byte unsigned integer, specifying the packet's total size.

```txt
| Header |    Content    |
|  Size  |               |
| A | B  |C|D|E|F|G|H|I|…|
```

Thus, the largest packet size is 64K (65535 bytes), with 2 bytes reserved for size. The smallest valid packet is 2 bytes long and has no real meaning (as TCP makes keep-alives redundant).

### Content

The packet's content is what server emulators typically call 'a packet'. The content starts with an unique dynamic-size prefix identifying the type of the packet, followed by the packet's actual content.

```txt
| Header |      Content      |
|  Size  | Opcode(s) |  Data |
| A | B  |C|D|E|F|G|H|I|J|K|…|
```

### Opcodes

If we put protocol versions that predate Prelude BETA (336) aside, then each 'packet' (emulator-wise) starts with 1 to 3 opcodes, where the 1st opcode is a single byte, 2nd – two bytes and 3rd – four bytes.

```txt
| Header |                  Content                    |
|  Size  | Opcode1 |  Opcode2  |    Opcode3    |  Data |
| A | B  |    C    |  D  |  E  | F | G | H | I |J|K|L|…|
```

All transmitted data is enciphered. There are different protocol encryption schemes for `login` and for `game server` communications.

## Login (Auth) Protocol

All login server/client packets are encrypted using a modified blowfish scheme. Each Blowfish encrypted block is 64 bits long. Once a client connects, server initiates communications by sending an initialization packet. This packet is encrypted with a constant blowfish key (which can be found in the client). What is important, this packet contains the blowfish key used for further communications.

First packet from the server:

    1. Write packet data
    2. Extend packet size to a multiple of 8
    3. Encipher packet data by a 32-bit XOR key
    4. Append 8 bytes
    5. Store XOR key in the first 4 appended bytes
    6. Encipher packet using a blowfish key known in advance
    7. Send packet

Other packets from the server:

    1. Write packet data
    2. Extend packet size to a multiple of 8
    3. Calculate packet checksum (simple/fast, XOR-based scheme)
    4. Append 8 bytes
    5. Store checksum in the first 4 appended bytes
    6. Encipher packet using the blowfish key sent in the first packet
    7. Send packet

Packets from the client:

    1. Write packet data
    2. Extend packet size to a multiple of 8
    3. Calculate packet checksum (simple/fast, XOR-based scheme)
    4. Append 16 bytes
    5. Store checksum in the first 4 appended bytes
    6. Encipher packet using the blowfish key received from the server
    7. Send packet

## Game Protocol

The same encryption scheme (with only minor differences) was used both pre- and post-C4, so it was essentially unchanged.

All game server/client packets are enciphered using an XOR-based scheme.

The initial key is made of two parts: a dynamic part given by the game server and a pre-shared part known to the game client (and server) in advance. Legacy clients had two pre-shared key parts. The one to be selected was determined by evaluating the dynamic key part sent by server.

During cipher operations, the last 4 bytes (DWORD) of the dynamic key part is incremented by the amount of bytes processed by each operation.

Once a client connects, it will immediately send an unenciphered protocol version packet. The server will respond with an unenciphered packet specifying whether the protocol is supported and disclose the mutable key part. The server, if applicable, will also identify itself and send an initial opcode obfuscation key for the client. If the opcode obfuscation key is not 0, client will then shuffle most of its 1st and 2nd opcodes.

The CM obfuscation key also changes each time a character is logged in.

Except for the first packet, each game server packet is transmitted by taking the following steps:

    1. Write packet data
    2. Encipher payload using XOR with both parts of the key
    3. Update the mutable part of the key
    4. Send packet

Except for the first packet, each game client packet is transmitted by taking the following steps:

    1. Write packet data
    2. Obfuscate opcode(s)
    3. Encipher payload using XOR with both parts of the key
    4. Update the mutable part of the key
    5. Send packet Game server/client packets are not padded.

## To-do List

- complete the library with all packet handlers
- remove dependency for node-rsa, ideally the library should be able to be executed client-side (by a browser), excluding the part with the socket connection
