const WORKER_PATH = '/functions/v1/scheduled_event_reminder_worker';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function safeSnippet(text) {
  if (!text) return '';
  return String(text).replace(/\s+/g, ' ').slice(0, 500);
}

exports.handler = async function scheduledEventReminder() {
  const projectUrl = (process.env.SUPABASE_PROJECT_URL || '').replace(/\/+$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!projectUrl) {
    return json(500, {
      ok: false,
      error: 'missing_supabase_project_url',
      message: 'SUPABASE_PROJECT_URL is required in the Netlify server-side environment.'
    });
  }

  if (!serviceRoleKey) {
    return json(500, {
      ok: false,
      error: 'missing_supabase_service_role_key',
      message: 'SUPABASE_SERVICE_ROLE_KEY is required in the Netlify server-side environment.'
    });
  }

  const workerUrl = `${projectUrl}${WORKER_PATH}`;

  try {
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const responseText = await response.text();
    let workerBody = null;
    try {
      workerBody = responseText ? JSON.parse(responseText) : null;
    } catch (_) {
      workerBody = null;
    }

    if (!response.ok) {
      console.error('Scheduled Spark reminder worker returned non-2xx', {
        status: response.status,
        responseSnippet: safeSnippet(responseText)
      });

      return json(502, {
        ok: false,
        error: 'worker_non_2xx',
        workerStatus: response.status,
        workerResponseSnippet: safeSnippet(responseText)
      });
    }

    return json(200, {
      ok: true,
      workerStatus: response.status,
      workerResponse: workerBody,
      invokedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Scheduled Spark reminder worker invocation failed', {
      message: error?.message || 'Unknown error'
    });

    return json(502, {
      ok: false,
      error: 'worker_invocation_failed',
      message: error?.message || 'Unknown error'
    });
  }
};
