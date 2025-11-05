"use client";

import { useLang } from "@/components/providers/LangProvider";

export default function Footer() {
  const { lang, setLang, t } = useLang();

  return (
    <footer className="mt-16 pb-10">
      <div className="mx-auto max-w-7xl px-5">
        <div className="neon-ring glass rounded-xl2 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/60 text-sm">
            © {new Date().getFullYear()} VTRQX Trading. All rights reserved.
          </p>

          <div className="text-xs text-white/60 flex items-center gap-6">
            <a href="/terms" className="hover:text-primary">{t("footer.terms", "Terms")}</a>
            <a href="/privacy" className="hover:text-primary">{t("footer.privacy", "Privacy")}</a>
            <a href="/contact" className="hover:text-primary">{t("footer.contact", "Contact")}</a>

            <span className="mx-2 text-white/40">|</span>

            <div className="flex items-center gap-2">
              <span className="text-white/60">{t("footer.language", "Language")}:</span>
              <button
                className={`px-2 py-1 rounded ${lang === "en" ? "bg-blue/20 text-blue" : "hover:text-primary"}`}
                onClick={() => setLang("en")}
              >
                {t("footer.en", "English")}
              </button>
              <button
                className={`px-2 py-1 rounded ${lang === "fr" ? "bg-blue/20 text-blue" : "hover:text-primary"}`}
                onClick={() => setLang("fr")}
              >
                {t("footer.fr", "French")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
