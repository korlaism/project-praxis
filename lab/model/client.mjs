// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The only module in the lab that may call out (ADR 0023).
 *
 * `lab/notebook/privacy.test.mjs` walks the built bundle and fails if any
 * transport appears anywhere else. That test used to say "no transport at
 * all", which was the strongest privacy position this project will ever have.
 * It is narrowed here on purpose, in the open, rather than deleted when it
 * became inconvenient — the thing it was written to catch is a prediction
 * being sent somewhere by code nobody reviewed, and it still catches that.
 *
 * What goes out is built by lab/scenario/prompt.mjs: the primitive contract
 * and the topic the learner typed. Never the notebook, never the notes, never
 * the confusion log. That is asserted against the actual request body.
 *
 * No retry loop. A browser press is one call, and a learner who sees "too
 * many requests" can press again — tools/generate-spike.mjs carries the
 * patience, because it is the thing that fires twenty calls unattended.
 */

/** Speak the OpenAI chat-completions shape, which most providers now offer. */
export async function ask(prompt, settings, { fetch: f = globalThis.fetch } = {}) {
  if (!settings?.url || !settings?.key || !settings?.model)
    throw new Error("no model configured");

  const body = {
    model: settings.model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  };

  let res;
  try {
    res = await f(settings.url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${settings.key}` },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // A browser reports a blocked cross-origin call as a bare network error,
    // and that is the likeliest first failure for someone pointing this at a
    // local server. Say so rather than leaving them with "Failed to fetch".
    const e = new Error(
      `could not reach ${settings.url} — if it is your own server, it may need to allow requests from this page`);
    e.cause = err;
    throw e;
  }

  // A provider that will not take response_format is not a reason to stop.
  if (!res.ok && res.status === 400) {
    delete body.response_format;
    res = await f(settings.url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${settings.key}` },
      body: JSON.stringify(body),
    });
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(`${res.status} ${res.statusText || ""} from ${settings.url}: ${detail.slice(0, 200)}`.trim());
    err.status = res.status;
    throw err;
  }

  const reply = await res.json();
  return reply.choices?.[0]?.message?.content ?? "";
}
