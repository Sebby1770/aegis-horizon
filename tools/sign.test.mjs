import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import {
  canonicalJson,
  canonicalJsonBytes,
  generateDeviceKeyPair,
  PACKET_ALG,
  signPacket,
  verifyPacket,
  webCryptoAvailable
} from "../src/sign.js";

describe("canonicalJson", () => {
  it("sorts object keys so signatures stay stable", () => {
    assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}');
    assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }));
    assert.equal(canonicalJson({ nested: { z: 0, a: true }, list: [2, 1] }), '{"list":[2,1],"nested":{"a":true,"z":0}}');
  });

  it("encodes the same object to identical bytes", () => {
    const left = canonicalJsonBytes({ mission: "rail", integrity: 71, csf: { recover: 80, govern: 70 } });
    const right = canonicalJsonBytes({ csf: { govern: 70, recover: 80 }, integrity: 71, mission: "rail" });
    assert.equal(Buffer.from(left).equals(Buffer.from(right)), true);
    const hex = createHash("sha256").update(Buffer.from(left)).digest("hex");
    assert.equal(createHash("sha256").update(Buffer.from(right)).digest("hex"), hex);
    assert.match(hex, /^[0-9a-f]{64}$/);
  });
});

describe("PACKET_ALG", () => {
  it("names ECDSA P-256 SHA-256", () => {
    assert.equal(PACKET_ALG, "ECDSA-P256-SHA256");
  });
});

describe("signPacket", () => {
  it("round-trips when WebCrypto is present", async (t) => {
    if (!webCryptoAvailable()) {
      t.skip("WebCrypto unavailable");
      return;
    }
    const keys = await generateDeviceKeyPair(true);
    const bytes = canonicalJsonBytes({ mission: "rail", integrity: 71 });
    const signature = await signPacket(bytes, keys.privateKey);
    assert.equal(typeof signature, "string");
    assert.equal(await verifyPacket(bytes, signature, keys.publicKey), true);
    assert.equal(await verifyPacket(canonicalJsonBytes({ mission: "rail", integrity: 70 }), signature, keys.publicKey), false);
  });
});
