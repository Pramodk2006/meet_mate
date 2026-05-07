"""
Email service — sends task assignment emails via SendGrid HTTP API.
Works on any network (uses HTTPS port 443 — no SMTP ports required).

Setup (one-time, ~3 minutes):
  1. Sign up free at https://sendgrid.com  (100 emails/day free forever)
  2. Settings → API Keys → Create API Key (Full Access) → copy key
  3. Settings → Sender Authentication → Single Sender Verification
     → verify meetmate83@gmail.com (click the confirmation link they email you)
  4. Paste key into .env:  SENDGRID_API_KEY=SG.xxxxxxxxxxxx
"""
import logging
import httpx
from typing import List, Dict

from backend.core.config import settings

logger = logging.getLogger(__name__)

SENDGRID_SEND_URL = "https://api.sendgrid.com/v3/mail/send"


def _build_email_html(assignee_name: str, meeting_title: str, tasks: List[Dict]) -> str:
    task_rows = ""
    for t in tasks:
        priority_color = {"high": "#dc2626", "medium": "#d97706", "low": "#16a34a"}.get(
            (t.get("priority") or "medium").lower(), "#6b7280"
        )
        deadline = t.get("deadline") or "—"
        status = (t.get("status") or "pending").replace("_", " ").title()
        task_rows += f"""
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;">
            {t.get("description", "")}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;">
            <span style="background:#f1f5f9;border-radius:4px;padding:2px 8px;color:#64748b;">{status}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;">
            <span style="color:{priority_color};font-weight:600;">{(t.get("priority") or "medium").title()}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;color:#64748b;">
            {deadline}
          </td>
        </tr>
        """

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:28px 36px;">
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">MeetMate</span>
            <span style="color:#64748b;font-size:13px;margin-left:12px;">· Task Assignment</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px 24px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
              Hi {assignee_name} 👋
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
              You have been assigned the following action item(s) from the meeting
              <strong style="color:#0f172a;">{meeting_title}</strong>.
              Please review and complete them by their due dates.
            </p>

            <!-- Tasks Table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid #e2e8f0;">Task</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid #e2e8f0;">Status</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid #e2e8f0;">Priority</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid #e2e8f0;">Deadline</th>
                </tr>
              </thead>
              <tbody>{task_rows}</tbody>
            </table>

            <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
              Log in to <a href="http://localhost:3000" style="color:#3b82f6;text-decoration:none;">MeetMate</a>
              to update the status of your tasks or view the full meeting details.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 36px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              Sent by MeetMate · AI Meeting Intelligence &nbsp;|&nbsp;
              This is an automated notification.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""


async def send_task_emails(
    meeting_title: str,
    task_assignments: Dict[str, Dict],  # { email: { name, tasks: [task_dict] } }
) -> Dict[str, str]:
    """
    Send one email per assignee via SendGrid HTTP API (HTTPS port 443).
    Returns { email: "ok" | error_message }
    """
    api_key = settings.SENDGRID_API_KEY
    from_email = settings.SMTP_USER or "matemeet83@gmail.com"
    from_name = settings.SMTP_FROM_NAME or "MeetMate"

    if not api_key or api_key == "your_sendgrid_api_key_here":
        raise ValueError(
            "SendGrid API key not configured. "
            "Sign up free at https://sendgrid.com, create an API key, "
            "verify meetmate83@gmail.com as a sender, then set SENDGRID_API_KEY in .env"
        )

    results: Dict[str, str] = {}

    async with httpx.AsyncClient(timeout=15.0) as client:
        for email, data in task_assignments.items():
            name = data.get("name") or email.split("@")[0]
            tasks = data.get("tasks") or []
            if not tasks:
                continue

            html_body = _build_email_html(name, meeting_title, tasks)

            payload = {
                "personalizations": [{"to": [{"email": email, "name": name}]}],
                "from": {"email": from_email, "name": from_name},
                "subject": f"[MeetMate] Your action items from: {meeting_title}",
                "content": [{"type": "text/html", "value": html_body}],
            }

            try:
                resp = await client.post(
                    SENDGRID_SEND_URL,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                )
                if resp.status_code in (200, 202):
                    results[email] = "ok"
                    logger.info(f"Task email sent to {email}")
                else:
                    err = resp.text
                    results[email] = f"HTTP {resp.status_code}: {err}"
                    logger.error(f"SendGrid error for {email}: {err}")
            except Exception as e:
                results[email] = str(e)
                logger.error(f"Failed to send email to {email}: {e}")

    return results
