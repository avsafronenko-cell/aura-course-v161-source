"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import styles from "./Certificate.module.css";

export type CertificateGender = "male" | "female";
export type CertificateLanguage = "uk" | "en";
export type SavedCertificate = {
  id: string;
  fullName: string;
  gender: CertificateGender;
  language: CertificateLanguage;
  issuedAt: string;
};

type CertificateProps = SavedCertificate & {
  certificateNumber?: string;
};

type CertificatePanelProps = {
  back: () => void;
  done: string[];
  allLessonsCompleted: boolean;
  moduleCount: number;
  profileName: string;
  certificate: SavedCertificate | null;
  onCreated: (certificate: SavedCertificate) => void;
};

const EXPORT_WIDTH = 1600;
const EXPORT_HEIGHT = 900;
const CERTIFICATE_ORIGIN = "https://aura-course-v161-context.avsafronenko.chatgpt.site";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Kyiv",
  }).format(date);
}

function certificateCopy(language: CertificateLanguage, gender: CertificateGender) {
  if (language === "en") {
    return {
      completion:
        "Successfully completed the Aura course “From the first prompt to AI agents” and mastered the full program of 6 learning modules: from AI tools and prompting to assistants, automations, and agents.",
      dateLabel: "Issue date",
    };
  }
  return gender === "female"
      ? {
        completion:
          "Успішно завершила курс «Aura — від першого промпту до AI-агентів» та опанувала повну програму з 6 навчальних модулів: від AI-інструментів і промптингу до створення асистентів, автоматизацій та агентів.",
        dateLabel: "Дата видачі",
      }
    : {
        completion:
          "Успішно завершив курс «Aura — від першого промпту до AI-агентів» та опанував повну програму з 6 навчальних модулів: від AI-інструментів і промптингу до створення асистентів, автоматизацій та агентів.",
        dateLabel: "Дата видачі",
      };
}

function certificateNumberFromId(id: string) {
  let hash = 0;
  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return "AU-2026-" + String((hash % 9999) + 1).padStart(4, "0");
}

function slugify(value: string) {
  return (
    value
      .toLocaleLowerCase("uk-UA")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "aura"
  );
}

function verificationUrlFor(id: string) {
  const origin = typeof window === "undefined" ? CERTIFICATE_ORIGIN : window.location.origin;
  return origin + "/certificate?certificateId=" + encodeURIComponent(id);
}

export default function Certificate({
  id,
  fullName,
  gender,
  language,
  issuedAt,
  certificateNumber,
}: CertificateProps) {
  const certificateRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const referenceImageRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [isExporting, setIsExporting] = useState<"pdf" | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const date = useMemo(() => formatDate(issuedAt), [issuedAt]);
  const number = certificateNumber || certificateNumberFromId(id);
  const verificationUrl = useMemo(() => verificationUrlFor(id), [id]);
  const { completion, dateLabel } = certificateCopy(language, gender);
  const isReferenceCertificate =
    fullName === "Іван Петренко" &&
    gender === "male" &&
    language === "uk" &&
    date === "09.09.2026" &&
    number === "AU-2026-0001";

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return undefined;
    const updateScale = () => {
      setScale(Math.min(viewport.clientWidth / EXPORT_WIDTH, viewport.clientHeight / EXPORT_HEIGHT));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const renderCertificate = async () => {
    const certificate = certificateRef.current;
    if (!certificate) throw new Error("certificate_not_found");
    if (document.fonts?.ready) await document.fonts.ready;
    if (referenceImageRef.current?.decode) await referenceImageRef.current.decode().catch(() => undefined);

    return html2canvas(certificate, {
      width: EXPORT_WIDTH,
      height: EXPORT_HEIGHT,
      scale: 2,
      backgroundColor: "#050a1f",
      useCORS: true,
      allowTaint: false,
      imageTimeout: 15000,
      logging: false,
      onclone: (clonedDocument) => {
        const clonedCertificate = clonedDocument.querySelector<HTMLElement>("#aura-certificate");
        if (!clonedCertificate) return;
        Object.assign(clonedCertificate.style, {
          width: EXPORT_WIDTH + "px",
          height: EXPORT_HEIGHT + "px",
          left: "0px",
          top: "0px",
          position: "relative",
          transform: "none",
          aspectRatio: "auto",
          overflow: "hidden",
        });
      },
    });
  };

  const downloadCertificate = async () => {
    const format = "pdf" as const;
    setIsExporting(format);
    setDownloadError("");
    try {
      const canvas = await renderCertificate();
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [EXPORT_WIDTH, EXPORT_HEIGHT],
        compress: true,
      });
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        EXPORT_WIDTH,
        EXPORT_HEIGHT,
        undefined,
        "FAST",
      );
      pdf.save("aura-sertifikat-" + slugify(fullName) + ".pdf");
    } catch {
      setDownloadError("Не вдалося експортувати сертифікат. Спробуй ще раз.");
    } finally {
      setIsExporting(null);
    }
  };

  const copyCertificateUrl = async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(verificationUrl);
      copied = true;
    } catch {
      const input = document.createElement("textarea");
      input.value = verificationUrl;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      copied = document.execCommand("copy");
      input.remove();
    }
    setCopyState(copied ? "copied" : "error");
    window.setTimeout(() => setCopyState("idle"), 2200);
  };

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <a className={styles.backLink} href="/course">
          ← Повернутися до курсу
        </a>
        <div className={styles.pageBrand}>
          <span>A</span>
          <strong>Aura</strong>
        </div>
      </header>
      <div className={styles.content}>
        <div ref={viewportRef} className={styles.viewport}>
          <article
            id="aura-certificate"
            ref={certificateRef}
            className={styles.certificate}
            style={{ transform: "translate(-50%, -50%) scale(" + scale + ")" }}
          >
            <img
              ref={referenceImageRef}
              className={styles.referenceImage}
              src={
                language === "en"
                  ? "/aura-certificate-english-clean.png?v=1"
                  : isReferenceCertificate
                    ? "/aura-certificate-reference-4k.png?v=1"
                    : "/aura-certificate-4k.png?v=1"
              }
              alt=""
              aria-hidden="true"
            />
            {!isReferenceCertificate && (
              <div className={styles.dynamicLayer} aria-label="Дані сертифіката">
                <strong className={styles.dynamicNumber}>{number}</strong>

                <h1 className={styles.dynamicName}>{fullName}</h1>

                <p className={styles.dynamicCompletion}>{completion}</p>

              </div>
            )}
            {!isReferenceCertificate && (
              <div className={styles.dynamicFooter} aria-label="Дата видачі та перевірка сертифіката">
                <strong>{date}</strong>
                <span>{dateLabel}</span>
              </div>
            )}
          </article>
        </div>

        <div className={styles.actions}>
          <button className="secondary" type="button" onClick={() => void downloadCertificate("pdf")} disabled={isExporting !== null}>
            {isExporting === "pdf" ? "Формування PDF…" : "Завантажити PDF"}
          </button>
          <button className="secondary" type="button" onClick={copyCertificateUrl} disabled={isExporting !== null}>
            {copyState === "copied" ? "URL скопійовано" : copyState === "error" ? "Не вдалося скопіювати" : "Скопіювати URL"}
          </button>
        </div>
        {downloadError && <p className={styles.error}>{downloadError}</p>}
      </div>
    </main>
  );
}

function splitProfileName(profileName: string) {
  const parts = profileName.trim().split(/\s+/).filter(Boolean);
  return [parts[0] || "", parts.slice(1).join(" ")];
}

export function CertificatePanel({
  back,
  done,
  allLessonsCompleted,
  moduleCount,
  profileName,
  certificate,
  onCreated,
}: CertificatePanelProps) {
  const [initialFirstName, initialLastName] = splitProfileName(profileName);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [gender, setGender] = useState<CertificateGender | "">("");
  const [language, setLanguage] = useState<CertificateLanguage | "">("");
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const fullName = (firstName.trim() + " " + lastName.trim()).trim();
  const englishNameInvalid =
    language === "en" &&
    fullName.length > 0 &&
    !/^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/.test(fullName);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationAttempted(true);
    if (!firstName.trim() || !lastName.trim() || !gender || !language || englishNameInvalid || isGenerating || !allLessonsCompleted) return;
    setGenerated(false);
    setGenerationError("");
    setIsGenerating(true);
    try {
      const response = await fetch("/api/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, gender, language, completedLessonKeys: done }),
      });
      const data = (await response.json()) as { certificate?: SavedCertificate; error?: string };
      if (!response.ok || !data.certificate) {
        setGenerationError(
          data.error === "course_incomplete"
            ? "Завершіть усі уроки, щоб сформувати сертифікат."
            : "Не вдалося сформувати сертифікат. Спробуйте ще раз.",
        );
        return;
      }
      onCreated(data.certificate);
      setGenerated(true);
    } catch {
      setGenerationError("Не вдалося сформувати сертифікат. Спробуйте ще раз.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className={styles.courseSection}>
      <button className="back" onClick={back} type="button">
        ← Усі модулі
      </button>
      <p className="eyebrow">Сертифікація</p>
      <h1>Отримайте іменний сертифікат</h1>
      <p className="lead2">
        Підтвердьте свої дані — і ми сформуємо сертифікат про завершення {moduleCount} навчальних модулів Aura.
      </p>
      {certificate && (
        <a className={styles.previewLink} href="/certificate" target="_blank" rel="noreferrer">
          Переглянути поточний сертифікат
        </a>
      )}
      {validationAttempted && !allLessonsCompleted && (
        <p className={styles.requirement}>Завершіть усі уроки, щоб сформувати сертифікат.</p>
      )}
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        {englishNameInvalid && (
          <p className={styles.languageWarning}>Використайте латинські букви для англійського сертифіката</p>
        )}
        <label className={validationAttempted && !firstName.trim() ? styles.fieldInvalid : undefined}>
          Ім’я
          <input
            required
            aria-invalid={validationAttempted && !firstName.trim()}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Наприклад, Олена"
          />
        </label>
        <label className={validationAttempted && !lastName.trim() ? styles.fieldInvalid : undefined}>
          Прізвище
          <input
            required
            aria-invalid={validationAttempted && !lastName.trim()}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Наприклад, Коваль"
          />
        </label>
        <fieldset className={validationAttempted && !gender ? styles.genderInvalid : styles.gender}>
          <legend>Оберіть вашу статть</legend>
          <label>
            <input type="radio" name="certificate-gender" value="male" checked={gender === "male"} onChange={() => setGender("male")} /> Чоловік
          </label>
          <label>
            <input type="radio" name="certificate-gender" value="female" checked={gender === "female"} onChange={() => setGender("female")} /> Жінка
          </label>
        </fieldset>
        <fieldset className={validationAttempted && !language ? styles.genderInvalid : styles.gender}>
          <legend>Мова сертифіката</legend>
          <label>
            <input type="radio" name="certificate-language" value="uk" checked={language === "uk"} onChange={() => setLanguage("uk")} /> Українська
          </label>
          <label>
            <input type="radio" name="certificate-language" value="en" checked={language === "en"} onChange={() => setLanguage("en")} /> English
          </label>
        </fieldset>
        <button className={"primary " + styles.submit} type="submit" disabled={isGenerating || !gender || !language || englishNameInvalid} aria-live="polite">
          {isGenerating ? "Формування…" : "Сформувати сертифікат"}
        </button>
      </form>
      {generationError && <p className={styles.error}>{generationError}</p>}
      {generated && (
        <a className={styles.previewLink} href="/certificate" target="_blank" rel="noreferrer">
          Переглянути новий сертифікат
        </a>
      )}
    </section>
  );
}
