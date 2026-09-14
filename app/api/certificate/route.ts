import { getD1 } from "../../../db";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

// Keep this list aligned with the current course curriculum, including Module 6.
const lessonCounts = [2, 6, 5, 4, 6, 3];
const allLessonKeys = lessonCounts.flatMap((count, moduleIndex) =>
  Array.from({ length: count }, (_, lessonIndex) => `${moduleIndex}-${lessonIndex}`),
);

const noStoreHeaders = { "Cache-Control": "no-store" };

async function findCertificate(userId: string) {
  return getD1()
    .prepare(
      "SELECT id, user_id AS userId, full_name AS fullName, gender, language, issued_at AS issuedAt FROM certificates WHERE user_id = ?1 LIMIT 1",
    )
    .bind(userId)
    .first<CertificateRecord>();
}

type CertificateRecord = {
  id: string;
  userId: string;
  fullName: string;
  gender: "male" | "female";
  language: "uk" | "en";
  issuedAt: string;
};

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ certificate: null }, { headers: noStoreHeaders });

  const certificate = await findCertificate(user.userId);
  return Response.json({ certificate }, { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401, headers: noStoreHeaders });

  const existing = await findCertificate(user.userId);

  let body: { fullName?: unknown; gender?: unknown; language?: unknown; completedLessonKeys?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const gender = body.gender === "female" || body.gender === "male" ? body.gender : "";
  const language = body.language === "en" || body.language === "uk" ? body.language : "";
  const completedLessonKeys = Array.isArray(body.completedLessonKeys)
    ? body.completedLessonKeys.filter((key): key is string => typeof key === "string")
    : [];

  if (!fullName || fullName.length > 120) {
    return Response.json({ error: "invalid_name" }, { status: 400, headers: noStoreHeaders });
  }
  if (!gender) {
    return Response.json({ error: "invalid_gender" }, { status: 400, headers: noStoreHeaders });
  }
  if (!language) {
    return Response.json({ error: "invalid_language" }, { status: 400, headers: noStoreHeaders });
  }
  if (!allLessonKeys.every((key) => completedLessonKeys.includes(key))) {
    return Response.json({ error: "course_incomplete" }, { status: 422, headers: noStoreHeaders });
  }

  const certificate = {
    id: existing?.id ?? crypto.randomUUID(),
    userId: user.userId,
    fullName,
    gender,
    language,
    issuedAt: new Date().toISOString(),
  };

  try {
    if (existing) {
      await getD1()
        .prepare("UPDATE certificates SET full_name = ?1, gender = ?2, language = ?3, issued_at = ?4 WHERE user_id = ?5")
        .bind(certificate.fullName, certificate.gender, certificate.language, certificate.issuedAt, certificate.userId)
        .run();
    } else {
      await getD1()
        .prepare(
          "INSERT INTO certificates (id, user_id, full_name, gender, language, issued_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        )
        .bind(certificate.id, certificate.userId, certificate.fullName, certificate.gender, certificate.language, certificate.issuedAt)
        .run();
    }
  } catch {
    const savedAfterRace = await findCertificate(user.userId);
    if (savedAfterRace) return Response.json({ certificate: savedAfterRace }, { headers: noStoreHeaders });
    throw new Error("Certificate could not be saved");
  }
  return Response.json({ certificate }, { headers: noStoreHeaders });
}
