// Indique au site si le paiement par carte SumUp est configuré (sans rien révéler de la clé)
export default async () => {
  const actif = Boolean(Netlify.env.get("SUMUP_API_KEY") && Netlify.env.get("SUMUP_MERCHANT_CODE"))
  return Response.json({ actif })
}
export const config = { path: "/api/sumup-config", method: "GET" }
