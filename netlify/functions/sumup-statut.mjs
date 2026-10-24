// Vérifie auprès de SumUp qu'un paiement est réellement payé,
// puis envoie à Clem l'e-mail « PAYÉE » (formulaire Netlify) avec les données confirmées par SumUp.
export default async (req, context) => {
  const cle = Netlify.env.get("SUMUP_API_KEY")
  if (!cle) return Response.json({ erreur: "Paiement par carte non configuré" }, { status: 503 })
  const u = new URL(req.url)
  const id = u.searchParams.get("id") || ""
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) return Response.json({ erreur: "Identifiant invalide" }, { status: 400 })

  const r = await fetch(`https://api.sumup.com/v0.1/checkouts/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${cle}` },
  })
  const c = await r.json().catch(() => ({}))
  if (!r.ok) return Response.json({ erreur: "Paiement introuvable" }, { status: 404 })

  const statut = c.status || "INCONNU"
  const tx = (c.transactions || []).find((t) => t.status === "SUCCESSFUL") || (c.transactions || [])[0] || {}
  const montant = Number(c.amount || 0).toFixed(2).replace(".", ",") + " €"

  if (statut === "PAID" && u.searchParams.get("avertir") === "1") {
    const champs = {
      "form-name": "commande-boutique",
      statut: `PAYÉE ✔ par carte (SumUp) – ${montant} confirmés par SumUp`,
      nom: u.searchParams.get("nom") || "",
      email: u.searchParams.get("email") || "",
      total: montant,
      commande: `${c.checkout_reference || ""}\nPaiement par carte confirmé par SumUp (voir l'e-mail précédent pour le détail des articles).`,
      paypal: `SumUp · paiement ${c.id} · transaction ${tx.transaction_code || tx.id || "?"} · ${c.date || ""}`,
      message: "",
    }
    try {
      await fetch(`${u.origin}/`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(champs).toString(),
      })
    } catch (e) { console.error("Avis de paiement non envoyé", e) }
  }
  return Response.json({ statut, montant: c.amount, reference: c.checkout_reference, transaction: tx.transaction_code || null })
}
export const config = { path: "/api/sumup-statut", method: "GET" }
