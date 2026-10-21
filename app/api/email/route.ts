import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

interface ArticlePayload {
  designation: string;
  quantite: number;
  prixPresume?: number;
  prixNegocie?: number;
}

interface EmailRequestPayload {
  to: string[];
  subject: string;
  eventLabel: string;
  numero: string;
  date: string;
  demandeur: string;
  service: string;
  priorite: string;
  statut: string;
  motif: string;
  fournisseurRetenu: string;
  fournisseursConsultes: string[];
  montantTotal: string;
  decisionMotif?: string;
  articles: ArticlePayload[];
  appUrl?: string;
}

function escHtml(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)
  );
}

function fmtFcfa(n: number | undefined): string {
  const val = Math.round(Number(n) || 0);
  return val > 0 ? val.toLocaleString("fr-FR") + " FCFA" : "—";
}

function buildHtmlEmail(p: EmailRequestPayload): string {
  const siteUrl = p.appUrl || process.env.NEXT_PUBLIC_APP_URL || "https://voomnetachat.vercel.app";
  const rows = (p.articles || [])
    .map((a) => {
      const q = Number(a.quantite) || 0;
      const pu = Number(a.prixNegocie) || Number(a.prixPresume) || 0;
      const tot = pu > 0 ? pu * q : 0;
      return `<tr>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;font-weight:600;color:#0f172a">${escHtml(a.designation)}</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:center;color:#0f172a">${q}</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:right;color:#64748b">${fmtFcfa(a.prixPresume)}</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:right;color:#0f172a">${fmtFcfa(a.prixNegocie)}</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:right;font-weight:700;color:#500070">${fmtFcfa(tot)}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:20px;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#000060,#500070);color:#ffffff;padding:20px 24px">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:0.85">VOOMNET TECHNOLOGY — GESTION DES ACHATS</div>
      <h1 style="margin:6px 0 0;font-size:20px">${escHtml(p.eventLabel)}</h1>
    </div>
    <div style="padding:22px 24px">
      <table style="width:100%;border-collapse:collapse;font-size:13.5px;margin-bottom:16px">
        <tr>
          <td style="padding:6px 0;color:#64748b;width:38%">Numéro de demande</td>
          <td style="padding:6px 0;font-weight:700;color:#500070">${escHtml(p.numero)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b">Date</td>
          <td style="padding:6px 0;font-weight:600">${escHtml(p.date)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b">Demandeur / Service</td>
          <td style="padding:6px 0;font-weight:600">${escHtml(p.demandeur)}${p.service ? " — " + escHtml(p.service) : ""}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b">Priorité / Statut</td>
          <td style="padding:6px 0;font-weight:700">${escHtml(p.priorite)} · ${escHtml(p.statut)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b">Fournisseur retenu</td>
          <td style="padding:6px 0;font-weight:600">${escHtml(p.fournisseurRetenu || "—")}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b">Fournisseurs consultés</td>
          <td style="padding:6px 0;color:#334155">${p.fournisseursConsultes?.length ? escHtml(p.fournisseursConsultes.join(", ")) : "—"}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b">Motif du besoin</td>
          <td style="padding:6px 0;color:#0f172a">${escHtml(p.motif || "—")}</td>
        </tr>
        ${
          p.decisionMotif
            ? `<tr>
          <td style="padding:6px 0;color:#b45309;font-weight:700">Motif / Consigne</td>
          <td style="padding:6px 0;color:#b45309;font-weight:700">${escHtml(p.decisionMotif)}</td>
        </tr>`
            : ""
        }
      </table>

      <h3 style="font-size:14px;margin:18px 0 8px;color:#000060">Articles demandés</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead>
          <tr style="background:#f5e9fb;color:#3b0053">
            <th style="padding:8px 10px;border:1px solid #cbd5e1;text-align:left">Désignation</th>
            <th style="padding:8px 10px;border:1px solid #cbd5e1;text-align:center">Qté</th>
            <th style="padding:8px 10px;border:1px solid #cbd5e1;text-align:right">Coût présumé</th>
            <th style="padding:8px 10px;border:1px solid #cbd5e1;text-align:right">Prix négocié</th>
            <th style="padding:8px 10px;border:1px solid #cbd5e1;text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="5" style="padding:10px;text-align:center;color:#64748b">Aucun article</td></tr>`}
          <tr style="background:#f8fafc">
            <td colspan="4" style="padding:9px 10px;border:1px solid #cbd5e1;text-align:right;font-weight:800">MONTANT TOTAL</td>
            <td style="padding:9px 10px;border:1px solid #cbd5e1;text-align:right;font-weight:800;color:#500070">${escHtml(p.montantTotal || "—")}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:22px;text-align:center">
        <a href="${escHtml(siteUrl)}" style="display:inline-block;background:#500070;color:#ffffff;text-decoration:none;font-weight:700;font-size:13.5px;padding:11px 22px;border-radius:9px">
          Ouvrir la demande dans VOOMNET
        </a>
      </div>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 24px;font-size:11.5px;color:#64748b;text-align:center">
      VOOMNET TECHNOLOGY — Notification automatique de gestion des achats
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EmailRequestPayload;
    const recipients = Array.from(
      new Set(
        (body.to || [])
          .map((e) => String(e || "").trim())
          .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      )
    );

    if (!recipients.length) {
      return NextResponse.json(
        { ok: false, configured: true, error: "Aucune adresse e-mail destinataire valide." },
        { status: 400 }
      );
    }

    const host = process.env.SMTP_HOST || "smtp.office365.com";
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASS || "";
    const from = process.env.SMTP_FROM || user;

    if (!user || !pass) {
      return NextResponse.json({
        ok: false,
        configured: false,
        error:
          "Serveur SMTP non configuré (variables SMTP_USER et SMTP_PASS manquantes sur Vercel).",
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { ciphers: "SSLv3", rejectUnauthorized: false },
    });

    const html = buildHtmlEmail(body);
    await transporter.sendMail({
      from: `"VOOMNET — Gestion des Achats" <${from}>`,
      to: recipients.join(", "),
      subject: body.subject || `[VOOMNET] Demande d'achat ${body.numero}`,
      html,
    });

    return NextResponse.json({ ok: true, configured: true, sentTo: recipients });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur d'envoi SMTP";
    return NextResponse.json({ ok: false, configured: true, error: msg }, { status: 500 });
  }
}
