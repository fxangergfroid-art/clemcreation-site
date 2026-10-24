// Crée un paiement SumUp pour une commande déjà transmise à Clem
const API = "https://api.sumup.com/v0.1/checkouts"

export default async (req, context) => {
  const cle = Netlify.env.get("SUMUP_API_KEY")
  const marchand = Netlify.env.get("SUMUP_MERCHANT_CODE")
  if (!cle || !marchand) return Response.json({ erreur: "Paiement par carte non configuré" }, { status: 503 })

  let d
  try { d = await req.json() } catch { return Response.json({ erreur: "Requête invalide" }, { status: 400 }) }
  const reference = String(d.reference || "")
  const montant = Math.round(Number(d.montant) * 100) / 100
  if (!/^CC-\d{4}-\d{4}$/.test(reference)) return Response.json({ erreur: "Référence invalide" }, { status: 400 })
  if (!(montant >= 1 && montant <= 3000)) return Response.json({ erreur: "Montant invalide" }, { status: 400 })

  const site = new URL(req.url).origin
  const r = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      checkout_reference: reference,
      amount: montant,
      currency: "EUR",
      merchant_code: marchand,
      description: `Clem Création – commande ${reference}`.slice(0, 120),
      redirect_url: `${site}/?paiement=${encodeURIComponent(reference)}`,
    }),
  })
  const corps = await r.json().catch(() => ({}))
  if (!r.ok || !corps.id) {
    console.error("SumUp création refusée", r.status, JSON.stringify(corps))
    return Response.json({ erreur: "SumUp n'a pas pu ouvrir le paiement" }, { status: 502 })
  }
  return Response.json({ id: corps.id, montant: corps.amount, reference })
}
export const config = { path: "/api/sumup-checkout", method: "POST" }
