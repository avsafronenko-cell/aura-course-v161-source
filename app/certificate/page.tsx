import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getD1 } from "../../db";
import { requireChatGPTUser } from "../chatgpt-auth";
import Certificate from "./Certificate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Сертифікат Aura" };

export default async function CertificatePage() {
  const user = await requireChatGPTUser("/certificate");
  const certificate = await getD1()
    .prepare(
      "SELECT id, user_id AS userId, full_name AS fullName, gender, language, issued_at AS issuedAt FROM certificates WHERE user_id = ?1 LIMIT 1",
    )
    .bind(user.userId)
    .first<{ id: string; userId: string; fullName: string; gender: "male" | "female"; language: "uk" | "en"; issuedAt: string }>();

  if (!certificate) redirect("/course");

  return <Certificate {...certificate} />;
}
