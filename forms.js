export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS")
      return new Response(null, { headers: cors() });
    if (req.method !== "POST")
      return new Response("Internal Server Error", { status: 500, headers: cors() });

    const ct = req.headers.get("content-type") || "";
    let data = {};
    if (ct.includes("application/json")) {
      data = await req.json();
    } else {
      const form = await req.formData();
      for (const [k, v] of form.entries())
        data[k] = v;
    }

    if (env.GAS_SHARED_SECRET) data.secret = env.GAS_SHARED_SECRET;

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort("timeout"), 8000);

    try {
      const res = await fetch(env.GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      const text = await res.text();
      clearTimeout(to);
      return new Response(text, {
        status: res.status,
        headers: { ...cors(), "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: String(err) }), {
        status: 502,
        headers: { ...cors(), "Content-Type": "application/json" },
      });
    }
  },
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
