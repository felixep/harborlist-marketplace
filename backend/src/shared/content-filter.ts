/**
 * Content Moderation Filter
 * 
 * Automated content filtering system that scans listing content for inappropriate,
 * offensive, or policy-violating terms. Supports multiple categories and severity levels.
 * 
 * Categories:
 * - Profanity: Offensive language
 * - Discriminatory: Hate speech, discriminatory language
 * - Sexual: Sexually explicit content
 * - Violence: Violent or threatening language
 * - Scam: Common scam indicators
 * - Spam: Spam patterns (excessive caps, repetition)
 */

export interface ContentFilterResult {
  isClean: boolean;
  violations: ContentViolation[];
  severity: 'low' | 'medium' | 'high';
  autoFlag: boolean;
}

export interface ContentViolation {
  category: 'profanity' | 'discriminatory' | 'sexual' | 'violence' | 'scam' | 'spam';
  matchedTerm: string;
  location: 'title' | 'description' | 'both';
  severity: 'low' | 'medium' | 'high';
  context?: string;
}

/**
 * Inappropriate terms database organized by category and severity
 */
const FILTER_LISTS = {
  profanity: {
    high: [
      'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'crap',
      'motherfucker', 'cunt', 'douchebag', 'dickhead', 'prick', 'bullshit'
    ],
    medium: [
      'hell', 'piss', 'dick', 'cock', 'ass', 'butt', 'balls',
      'jackass', 'jerk', 'screw', 'suck', 'bloody'
    ],
    low: ['frick', 'freakin', 'dang', 'shoot', 'crud']
  },

  discriminatory: {
    high: [
      'nigger', 'nigga', 'faggot', 'retard', 'chink', 'spic', 'kike',
      'towelhead', 'sandnigger', 'coon', 'wetback', 'gook', 'raghead'
    ],
    medium: [
      'gay', 'homo', 'queer', 'tranny', 'redneck', 'hillbilly',
      'cracker', 'immigrant scum', 'illegal alien'
    ],
    low: [
      'blonde jokes', 'old hag', 'fatso', 'skinny', 'nerd', 'geek'
    ]
  },

  sexual: {
    high: [
      'porn', 'xxx', 'sex', 'nude', 'naked', 'nsfw', 'escort', 'hooker',
      'camgirl', 'onlyfans', 'blowjob', 'handjob', 'masturbate', 'stripper',
      'anal', 'oral', 'cum', 'ejaculate', 'penetration', 'tits'
    ],
    medium: [
      'sexy', 'hot', 'booty', 'boobs', 'penis', 'vagina',
      'thong', 'lingerie', 'fetish', 'kiss', 'bedroom', 'date night'
    ],
    low: ['flirt', 'romantic', 'adult', 'dating']
  },

  violence: {
    high: [
      'kill', 'murder', 'terrorist', 'bomb', 'weapon', 'gun', 'massacre',
      'slaughter', 'shooting', 'execute', 'stab', 'bloodbath'
    ],
    medium: [
      'attack', 'fight', 'punch', 'shoot', 'beat', 'hit', 'hurt', 'smash'
    ],
    low: ['threaten', 'rough', 'aggressive']
  },

  scam: {
    high: [
      'nigerian prince', 'wire transfer', 'western union', 'moneygram',
      'bitcoin payment only', 'send money first', 'no refunds', 'act now',
      'limited time', 'too good to be true', 'advance fee', 'prepayment required',
      'investment opportunity', 'guaranteed profit', 'double your money',
      'free giveaway', 'unclaimed funds', 'inheritance offer'
    ],
    medium: [
      'cash only', 'no inspection', 'sold as is no returns', 'must buy today',
      'price firm no negotiation', 'quick sale', 'no time wasters', 'deposit first'
    ],
    low: ['special offer', 'exclusive deal', 'bonus item']
  },

  spam: {
    high: [
      'visit my profile', 'click link below', 'subscribe now', 'free gift card',
      'win a prize', 'join group chat', 'referral code', 'click here', 'check my bio'
    ],
    medium: [
      'follow me', 'dm for details', 'contact via whatsapp', 'telegram me',
      'text for price', 'fast delivery', 'bulk discount'
    ],
    low: [
      'share this', 'check out', 'promo', 'new listing', 'advertisement'
    ]
  },

  drugs: {
    high: [
      'cocaine', 'heroin', 'meth', 'weed', 'marijuana', 'ecstasy',
      'lsd', 'ketamine', 'crack', 'opioid'
    ],
    medium: ['joint', 'bong', 'blunt', 'stoned', 'high'],
    low: ['smoke', 'weed-friendly']
  },

  fraud: {
    high: [
      'identity theft', 'fake id', 'counterfeit', 'stolen', 'credit card fraud',
      'hacked account', 'phishing', 'spoofing'
    ],
    medium: ['duplicate listing', 'fake profile', 'suspicious payment'],
    low: ['too cheap', 'unverified seller']
  }
};


/**
 * Check if text contains excessive capitalization (spam indicator)
 */
function hasExcessiveCaps(text: string): boolean {
  if (text.length < 20) return false;
  const capsCount = (text.match(/[A-Z]/g) || []).length;
  const ratio = capsCount / text.length;
  return ratio > 0.5; // More than 50% caps
}

/**
 * Check if text contains excessive repetition (spam indicator)
 */
function hasExcessiveRepetition(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  const wordCounts: { [key: string]: number } = {};
  
  words.forEach(word => {
    if (word.length > 3) { // Only check words longer than 3 chars
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  });
  
  // If any word appears more than 5 times, it's spam
  return Object.values(wordCounts).some(count => count > 5);
}

/**
 * Normalize text for filtering (lowercase, remove special chars)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace special chars with space
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check text against a list of terms
 */
function checkAgainstList(
  text: string,
  terms: string[],
  category: ContentViolation['category'],
  severity: ContentViolation['severity'],
  location: ContentViolation['location']
): ContentViolation[] {
  const violations: ContentViolation[] = [];
  const normalized = normalizeText(text);
  
  for (const term of terms) {
    const normalizedTerm = normalizeText(term);
    
    // Word boundary check for single words
    if (!term.includes(' ')) {
      const regex = new RegExp(`\\b${normalizedTerm}\\b`, 'i');
      if (regex.test(normalized)) {
        violations.push({
          category,
          matchedTerm: term,
          location,
          severity,
          context: extractContext(text, term)
        });
      }
    } else {
      // Phrase check for multi-word terms
      if (normalized.includes(normalizedTerm)) {
        violations.push({
          category,
          matchedTerm: term,
          location,
          severity,
          context: extractContext(text, term)
        });
      }
    }
  }
  
  return violations;
}

/**
 * Extract context around matched term
 */
function extractContext(text: string, term: string, contextLength: number = 50): string {
  const normalized = normalizeText(text);
  const normalizedTerm = normalizeText(term);
  const index = normalized.indexOf(normalizedTerm);
  
  if (index === -1) return '';
  
  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + term.length + contextLength);
  
  return '...' + text.substring(start, end) + '...';
}

/**
 * Main content filtering function
 */
export function filterContent(title: string, description: string): ContentFilterResult {
  const violations: ContentViolation[] = [];
  
  // Check title and description against all filter lists
  Object.entries(FILTER_LISTS).forEach(([category, severityLists]) => {
    Object.entries(severityLists).forEach(([severity, terms]) => {
      if (terms.length === 0) return;
      
      // Check title
      const titleViolations = checkAgainstList(
        title,
        terms,
        category as ContentViolation['category'],
        severity as ContentViolation['severity'],
        'title'
      );
      violations.push(...titleViolations);
      
      // Check description
      const descViolations = checkAgainstList(
        description,
        terms,
        category as ContentViolation['category'],
        severity as ContentViolation['severity'],
        'description'
      );
      violations.push(...descViolations);
    });
  });
  
  // Check for spam patterns
  if (hasExcessiveCaps(title) || hasExcessiveCaps(description)) {
    violations.push({
      category: 'spam',
      matchedTerm: 'EXCESSIVE CAPITALIZATION',
      location: hasExcessiveCaps(title) ? 'title' : 'description',
      severity: 'medium'
    });
  }
  
  if (hasExcessiveRepetition(description)) {
    violations.push({
      category: 'spam',
      matchedTerm: 'Excessive word repetition detected',
      location: 'description',
      severity: 'medium'
    });
  }
  
  // Determine overall severity
  let overallSeverity: 'low' | 'medium' | 'high' = 'low';
  if (violations.some(v => v.severity === 'high')) {
    overallSeverity = 'high';
  } else if (violations.some(v => v.severity === 'medium')) {
    overallSeverity = 'medium';
  }
  
  // Auto-flag if high severity or multiple violations
  const autoFlag = overallSeverity === 'high' || violations.length >= 3;
  
  return {
    isClean: violations.length === 0,
    violations,
    severity: overallSeverity,
    autoFlag
  };
}

/**
 * Generate flag reason from violations
 */
export function generateFlagReason(violations: ContentViolation[]): string {
  if (violations.length === 0) return '';
  
  const categories = [...new Set(violations.map(v => v.category))];
  const highSeverity = violations.filter(v => v.severity === 'high');
  
  if (highSeverity.length > 0) {
    return `Listing contains ${highSeverity.length} high-severity content violation(s) in categories: ${categories.join(', ')}`;
  }
  
  return `Listing flagged for potential ${categories.join(', ')} content violations`;
}

/**
 * Get detailed violation summary for moderator notes
 */
export function getViolationSummary(violations: ContentViolation[]): string {
  const summary: string[] = [
    `Content Filter Report - ${violations.length} violation(s) detected:\n`
  ];
  
  violations.forEach((v, i) => {
    summary.push(`${i + 1}. ${v.category.toUpperCase()} (${v.severity} severity)`);
    summary.push(`   Term: "${v.matchedTerm}"`);
    summary.push(`   Location: ${v.location}`);
    if (v.context) {
      summary.push(`   Context: ${v.context}`);
    }
    summary.push('');
  });
  
  return summary.join('\n');
}
