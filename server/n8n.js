async function postWebhook(action, recordId) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    return { skipped: true, reason: "N8N_WEBHOOK_URL not set" };
  }

  const body = { action, recordId };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    // keep raw text
  }

  if (!response.ok) {
    const err = new Error(`n8n webhook ${response.status}`);
    err.status = response.status;
    err.details = data;
    throw err;
  }

  return { ok: true, status: response.status, data, body };
}

async function triggerN8n(action, recordIds) {
  const ids = [...new Set((recordIds || []).filter(Boolean))];
  if (!ids.length) {
    throw Object.assign(new Error("recordId is required for n8n"), { status: 400 });
  }

  const results = [];
  for (const recordId of ids) {
    results.push(await postWebhook(action, recordId));
  }

  return {
    ok: results.every((item) => item.ok || item.skipped),
    results,
  };
}

export { triggerN8n };
