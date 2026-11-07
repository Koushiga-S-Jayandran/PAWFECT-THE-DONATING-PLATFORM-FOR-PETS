/**
 * Password Security Rules & Evaluation
 * Enforces length (10-128), character diversity, email-similarity guards,
 * and a 100-entry top common password blocklist.
 */

export const TOP_100_COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  '1234567890',
  '123456789',
  'password123',
  'password1234',
  '12345678901',
  'qwertyuiop',
  '1234567890a',
  'iloveyou123',
  'admin12345',
  'welcome1234',
  'monkey1234',
  'dragon1234',
  'master1234',
  'football123',
  'baseball123',
  'superman123',
  'trustno1123',
  'shadow1234',
  'sunshine123',
  'princess123',
  'solo123456',
  'starwars123',
  'chocolate123',
  'mustang1234',
  'computer123',
  'secret1234',
  'killer1234',
  'whatever123',
  'jordan1234',
  'harley1234',
  'ranger1234',
  'chelsea123',
  'arsenal123',
  'liverpool12',
  'barcelona12',
  'charlie123',
  'bailey1234',
  'buster1234',
  'thomas1234',
  'hockey1234',
  'soccer1234',
  'robert1234',
  'george1234',
  'daniel1234',
  'william123',
  'jessica123',
  'ashley1234',
  'amanda1234',
  'nicole1234',
  'stephanie1',
  'samantha12',
  'elizabeth1',
  'andrea1234',
  'anthony123',
  'andrew1234',
  'matthew123',
  'joshua1234',
  'nicholas12',
  'brandon123',
  'justin1234',
  'austin1234',
  'taylor1234',
  'jordan1234',
  'morgan1234',
  'alyssa1234',
  'hannah1234',
  'alexis1234',
  'madison123',
  'olivia1234',
  'emily12345',
  'chloe12345',
  'sophie1234',
  'isabella12',
  'victoria12',
  'natalie123',
  'rachel1234',
  'rebecca123',
  'lauren1234',
  'kayla12345',
  'amber12345',
  'megan12345',
  'brittany12',
  'danielle12',
  'courtney12',
  'heather123',
  'melissa123',
  'sarah12345',
  'kelsey1234',
  'whitney123',
  'shelby1234',
  'autumn1234',
  'destiny123',
  'diamond123',
  'emerald123',
  'jasmine123',
  'tiffany123',
  'crystal123',
  'vanessa123',
  'monica1234',
  'veronica12',
]);

export interface PasswordCheckResult {
  isValid: boolean;
  score: number; // 0 - 4
  strengthLabel: 'Too weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong';
  errors: string[];
}

export function validatePasswordStrength(
  password: string,
  email?: string
): PasswordCheckResult {
  const errors: string[] = [];

  if (!password || password.length < 10) {
    errors.push('Password must be at least 10 characters long.');
  }
  if (password.length > 128) {
    errors.push('Password must be at most 128 characters long.');
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Password must contain at least one letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number.');
  }

  const lowerPass = password.toLowerCase();

  // Check 100 common passwords
  if (TOP_100_COMMON_PASSWORDS.has(lowerPass)) {
    errors.push('This password is too common and easily guessed.');
  }

  // Check against email local part
  if (email && email.includes('@')) {
    const localPart = email.split('@')[0].toLowerCase().trim();
    if (localPart.length >= 3 && lowerPass.includes(localPart)) {
      errors.push('Password must not contain your email username.');
    }
  }

  // Calculate score (0-4)
  let score = 0;
  if (password.length >= 10) score += 1;
  if (password.length >= 14) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (errors.length > 0 && score > 2) {
    score = 1;
  }

  const strengthLabels: Array<PasswordCheckResult['strengthLabel']> = [
    'Too weak',
    'Weak',
    'Fair',
    'Strong',
    'Very strong',
  ];

  return {
    isValid: errors.length === 0,
    score: errors.length > 0 ? Math.min(score, 1) : score,
    strengthLabel: strengthLabels[score] || 'Too weak',
    errors,
  };
}
