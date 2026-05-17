export type PatchSiteSmtpSettingsDto = {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean;
  smtpUser?: string | null;
  /** Leeg weglaten = wachtwoord ongewijzigd */
  smtpPass?: string | null;
  mailFrom?: string | null;
};

export type SiteSmtpTestDto = {
  to: string;
};
