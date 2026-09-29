import "./globals.css";

export const metadata = {
  title: "SimpleStorage DApp — Ethereum Sepolia",
  description:
    "A minimal decentralized app: connect MetaMask in Microsoft Edge and read or update a value stored in a Solidity contract on the Ethereum Sepolia testnet.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
