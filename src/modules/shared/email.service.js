// Serviço compartilhado de e-mail.
//
// O resto da EasyFood só conhece a função sendEmail(). Tudo que é específico
// do provedor (MailerSend) fica isolado neste arquivo: se amanhã trocarmos por
// Resend, Brevo ou SendGrid, apenas a função deliver() precisa mudar.
//
// Este serviço NÃO conhece regra de negócio: ele recebe destinatário, assunto
// e conteúdo já prontos e apenas envia.

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml({ header, body, footer }) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${header}</h2>

      <div>${body}</div>

      <hr />

      <p style="color: #888; font-size: 12px;">
        ${footer}
      </p>
    </div>
  `;
}

// Versão em texto puro (clientes de e-mail que não exibem HTML).
function toPlainText({ header, body, footer }) {
  return [header, body, footer]
    .map((part) =>
      String(part ?? "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s+/g, "\n")
        .trim()
    )
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Integração com o provedor (MailerSend). É a única parte que muda ao trocar
// de provedor.
// ---------------------------------------------------------------------------

let mailerSendClient = null;

function getApiKey() {
  // MAILERSAND_KEY é o nome (com erro de digitação) usado em versões antigas do
  // .env. Aceitamos como alternativa, mas o nome correto é EMAIL_API_KEY.
  return process.env.EMAIL_API_KEY || process.env.MAILERSAND_KEY;
}

function getClient() {
  if (!mailerSendClient) {
    const apiKey = getApiKey();

    if (!apiKey) {
      throw new Error("EMAIL_API_KEY não configurada no .env");
    }

    const { MailerSend } = require("mailersend");
    mailerSendClient = new MailerSend({ apiKey });
  }

  return mailerSendClient;
}

async function deliver({ to, toName, subject, html, text }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("EMAIL_API_KEY não configurada no .env");
  }

  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const fromName = process.env.EMAIL_FROM_NAME || "EasyFood";

  // Se a chave começar com "re_", envia via API do Resend (funciona com onboarding@resend.dev sem precisar de domínio!)
  if (apiKey.startsWith("re_")) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
        text
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Erro HTTP ${response.status} no Resend`);
    }
    return;
  }

  // Caso contrário, envia via MailerSend
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM não configurado no .env");
  }

  const { EmailParams, Sender, Recipient } = require("mailersend");
  const sentFrom = new Sender(fromEmail, fromName);

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo([new Recipient(to, toName || to)])
    .setReplyTo(sentFrom)
    .setSubject(subject)
    .setHtml(html)
    .setText(text);

  try {
    await getClient().email.send(emailParams);
  } catch (err) {
    const detail =
      err?.body?.message ||
      err?.message ||
      "Domínio remetente não verificado no MailerSend";
    throw new Error(detail);
  }
}

// ---------------------------------------------------------------------------
// API pública do serviço
// ---------------------------------------------------------------------------

async function sendEmail({
  to,
  toName,
  subject,
  header,
  body,
  footer
}) {
  if (!to) {
    throw new Error("Destinatário (to) não informado");
  }

  const html = buildHtml({
    header,
    body,
    footer
  });

  const text = toPlainText({ header, body, footer });

  await deliver({ to, toName, subject, html, text });

  console.log(
    `[EMAIL] Enviado para ${to} - "${subject}"`
  );
}

module.exports = {
  sendEmail,
  escapeHtml
};
