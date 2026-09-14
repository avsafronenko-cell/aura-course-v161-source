import type { Metadata } from "next";
import "./globals.css";
import authorPortrait from "./assets/author-portrait.webp";
export const metadata: Metadata = {title:"Aura — від першого промпту до AI-агентів",description:"Практичний курс про AI, промпти, медіа, AI-асистентів і автоматизації в Make.com.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="uk"><head><link rel="preload" as="image" href={authorPortrait.src} fetchPriority="high" /></head><body>{children}</body></html>}
