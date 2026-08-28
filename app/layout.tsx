import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VOOMNET — Gestion des Achats",
  description:
    "VOOMNET TECHNOLOGY — Application de gestion des achats : demandes, comparaison des offres fournisseurs, validation, commandes et réceptions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
