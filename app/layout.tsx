import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title:"FoundAgain — Lost & Found for communities", description:"Search, report, and safely reconnect people with lost belongings. No account required.", icons:{icon:"/favicon.svg"} };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body>{children}</body></html>}
