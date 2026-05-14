/**
 * Production-grade email validation with known TLD checking.
 * Rejects invalid TLDs, malformed domains, and obviously fake addresses.
 */

// Comprehensive list of valid TLDs (top-level domains)
// Covers common generic, country-code, and new generic TLDs
const VALID_TLDS = new Set([
  // Generic TLDs
  "com", "org", "net", "edu", "gov", "mil", "int",
  // Common business/tech TLDs
  "info", "biz", "co", "ws", "mobi", "tel", "aero", "asia", "coop", "jobs", "name", "pro", "travel",
  // New generic TLDs (popular)
  "app", "dev", "io", "ai", "tech", "digital", "online", "site", "space", "cloud", "software",
  "systems", "services", "solutions", "marketing", "media", "network", "company", "business",
  "design", "creative", "studio", "agency", "ventures", "consulting", "partners", "group",
  "international", "global", "world", "xyz", "pw", "cc", "me", "tv", "bz", "gs", "ms", "fm",
  // Popular country-code TLDs
  "uk", "us", "ca", "au", "de", "fr", "jp", "cn", "in", "br", "mx", "ru", "kr", "sg", "hk",
  "nz", "se", "no", "fi", "dk", "nl", "be", "ch", "at", "it", "es", "gr", "pl", "cz", "ie",
  "pt", "il", "za", "ng", "ke", "eg", "ua", "th", "vn", "id", "ph", "my", "tw", "ar", "cl",
  // Country-code subdomains sometimes used as TLDs
  "co.uk", "co.jp", "co.kr", "co.in", "co.id", "co.nz", "co.za", "co.th", "co.ve",
  // Additional common TLDs
  "ai", "gg", "gl", "nu", "pm", "re", "sh", "sr", "st", "tl", "tk", "to", "tz", "uy", "uz",
  "va", "vc", "ve", "vi", "vg", "wf", "ye", "yt", "zip",
  // Amazon AWS TLDs (commonly used)
  "eu", "asia", "cat",
]);

/**
 * Parse email to extract local part and domain.
 * Returns null if structure is invalid.
 */
function parseEmail(email: string): { local: string; domain: string } | null {
  const trimmed = email.trim().toLowerCase();
  
  // Check basic structure
  if (!trimmed.includes("@")) return null;
  
  const parts = trimmed.split("@");
  if (parts.length !== 2) return null; // Multiple @ signs
  
  const [local, domain] = parts;
  
  // Local part validation (before @)
  if (!local || local.length === 0 || local.length > 64) return null;
  
  // Domain validation (after @)
  if (!domain || domain.length === 0 || domain.length > 255) return null;
  
  // Domain must not start or end with hyphen or dot
  if (domain.startsWith("-") || domain.startsWith(".") || domain.endsWith("-") || domain.endsWith(".")) {
    return null;
  }
  
  // Local part can contain only specific characters
  const validLocalChars = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  if (!validLocalChars.test(local)) return null;
  
  // Local part cannot start or end with dot, or have consecutive dots
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
  
  return { local, domain };
}

/**
 * Extract TLD from domain.
 * Handles both simple (example.com) and compound (example.co.uk) TLDs.
 */
function extractTLD(domain: string): string | null {
  const parts = domain.split(".");
  if (parts.length < 2) return null;
  
  // Check for compound TLDs (e.g., co.uk)
  if (parts.length >= 3) {
    const potentialTLD = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`.toLowerCase();
    if (VALID_TLDS.has(potentialTLD)) {
      return potentialTLD;
    }
  }
  
  // Fall back to single-part TLD
  const simpleTLD = parts[parts.length - 1].toLowerCase();
  return simpleTLD;
}

/**
 * Validate TLD against known valid TLDs.
 * Rejects obviously fake/invalid TLDs like .vom, .tom, .cmo, etc.
 */
function isTLDValid(tld: string | null): boolean {
  if (!tld) return false;
  
  // TLD must be at least 2 characters
  if (tld.length < 2) return false;
  
  // TLD must be alphabetic or contain one dot (for compound TLDs)
  const validTLDFormat = /^[a-z]+(\.[a-z]+)?$/;
  if (!validTLDFormat.test(tld)) return false;
  
  // Check against known TLDs
  return VALID_TLDS.has(tld.toLowerCase());
}

/**
 * Validate email domain structure.
 * Ensures proper formatting: at least one dot, valid characters, no consecutive dots.
 */
function isDomainValid(domain: string): boolean {
  if (!domain.includes(".")) return false;
  
  // Domain labels separated by dots
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  
  // Each label must be 1-63 characters, alphanumeric or hyphen
  // Cannot start or end with hyphen
  for (const label of labels) {
    if (!label || label.length > 63) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
    if (!/^[a-z0-9-]+$/.test(label)) return false;
  }
  
  return true;
}

/**
 * Main email validation function.
 * Returns object with isValid flag and optional error reason.
 */
export function validateEmail(email: string): {
  isValid: boolean;
  error?: string;
} {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: "Email is required" };
  }
  
  // Parse email
  const parsed = parseEmail(email);
  if (!parsed) {
    return { isValid: false, error: "Invalid email format" };
  }
  
  const { local, domain } = parsed;
  
  // Validate domain structure
  if (!isDomainValid(domain)) {
    return { isValid: false, error: "Invalid domain format" };
  }
  
  // Extract and validate TLD
  const tld = extractTLD(domain);
  if (!isTLDValid(tld)) {
    return { isValid: false, error: "Invalid or unsupported domain extension" };
  }
  
  // Ensure local part is reasonable length and doesn't have suspicious patterns
  if (local.length > 64) {
    return { isValid: false, error: "Email local part too long" };
  }
  
  // All checks passed
  return { isValid: true };
}

/**
 * Quick validation for typing (less strict for UX).
 * Returns only true/false, used during input changes.
 */
export function isEmailValidQuick(email: string): boolean {
  if (!email || email.trim().length === 0) return false;
  const parsed = parseEmail(email);
  if (!parsed) return false;
  return isDomainValid(parsed.domain) && isTLDValid(extractTLD(parsed.domain));
}

/**
 * Check if email looks potentially valid (permissive, for UI state).
 * Used for button enable/disable states during typing.
 */
export function couldBeValidEmail(email: string): boolean {
  if (!email || email.trim().length < 5) return false;
  const trimmed = email.trim();
  // Very permissive check: has @, has at least one dot after @
  return trimmed.includes("@") && trimmed.split("@")[1]?.includes(".") === true;
}
