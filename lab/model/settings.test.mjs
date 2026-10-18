// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Where the learner's own endpoint and key live. ADR 0023.
 *
 * On their device, and sent to nobody but the endpoint they named. There is
 * no server in this design and no "remember my key for me".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryBackend } from "../notebook/store.mjs";
import { openModelSettings, MODEL_KEY } from "./settings.mjs";

const open = (backend = memoryBackend()) => openModelSettings({ backend });

test("with nothing configured, there is no model and nothing to send", () => {
  // The whole product must work for someone who never sets one up.
  const s = open();
  assert.equal(s.configured, false);
  assert.equal(s.get(), null);
});

test("an endpoint, a key and a model name are enough", () => {
  const s = open();
  const r = s.save({ url: "https://api.example.com/v1/chat/completions", key: "sk-test", model: "a-model" });
  assert.equal(r.ok, true, r.errors?.join(", "));
  assert.equal(s.configured, true);
  assert.equal(s.get().model, "a-model");
});

test("half a configuration is refused, because half of it cannot call anything", () => {
  const s = open();
  for (const half of [
    { url: "https://api.example.com/v1", key: "", model: "m" },
    { url: "", key: "sk", model: "m" },
    { url: "https://api.example.com/v1", key: "sk", model: "" },
  ]) assert.equal(s.save(half).ok, false, JSON.stringify(half));
  assert.equal(s.configured, false);
});

test("an endpoint that is not a web address is refused", () => {
  const s = open();
  for (const bad of ["not a url", "ftp://example.com", "javascript:alert(1)", "/relative"])
    assert.equal(s.save({ url: bad, key: "sk", model: "m" }).ok, false, bad);
});

test("a local endpoint is fine — most people's own AI is on their own machine", () => {
  const s = open();
  assert.equal(s.save({ url: "http://localhost:11434/v1/chat/completions", key: "ollama", model: "qwen2.5" }).ok, true);
});

test("settings survive the tab, because retyping a key is how a feature dies", () => {
  const backend = memoryBackend();
  open(backend).save({ url: "https://api.example.com/v1", key: "sk-test", model: "m" });
  assert.equal(open(backend).get().key, "sk-test");
});

test("forgetting the key forgets all of it", () => {
  const backend = memoryBackend();
  const s = open(backend);
  s.save({ url: "https://api.example.com/v1", key: "sk-secret", model: "m" });
  s.forget();
  assert.equal(s.configured, false);
  assert.equal(JSON.stringify(backend.getItem(MODEL_KEY) ?? ""), '""',
    "the key must not be left behind in storage");
});

test("unreadable settings are discarded, not carried forward", () => {
  const backend = memoryBackend();
  backend.setItem(MODEL_KEY, "{ not json");
  assert.equal(open(backend).configured, false);
});
