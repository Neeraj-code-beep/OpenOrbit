import { githubService } from '../services/github/github.service.js';
import { getUserGitHubToken } from '../services/github/github-oauth.service.js';
import { SavedIssue } from '../models/saved-issue.model.js';
import { AppError } from '../utils/app-error.js';

/**
 * GET /api/v1/recommendations/issues
 *
 * Suggests beginner-friendly GitHub issues based on the authenticated user's
 * saved issues (languages, repositories, labels) or explicit query parameters.
 *
 * Query params:
 *   language (string)  – Override detected language preference
 *   label    (string)  – Override label filter (default: good-first-issue)
 *   page     (integer) – Pagination page (default: 1)
 *   per_page (integer) – Page size (default: 15, max: 50)
 */
export async function getRecommendedIssues(req, res) {
  const userId = req.user.id;
  const token = await getUserGitHubToken(userId).catch(() => null);

  const {
    language: explicitLanguage,
    label = 'good-first-issue',
    page = 1,
    per_page = 15,
  } = req.query;

  const safePage = Math.max(1, Number(page) || 1);
  const safePerPage = Math.min(50, Math.max(1, Number(per_page) || 15));

  // Derive preferences from user's saved issues if no explicit language provided
  let languages = [];
  let excludeRepos = [];

  try {
    const savedIssues = await SavedIssue.find({ userId })
      .select('repository.fullName labels')
      .limit(100)
      .lean();

    if (savedIssues.length > 0) {
      // Collect unique repo names to diversify recommendations (exclude repos user already works on)
      excludeRepos = [...new Set(savedIssues.map((s) => s.repository?.fullName).filter(Boolean))];

      // Extract language-like signals from labels (e.g., "javascript", "python")
      const languageLabels = new Set();
      for (const issue of savedIssues) {
        if (Array.isArray(issue.labels)) {
          for (const l of issue.labels) {
            const name = (l.name || '').toLowerCase().trim();
            if (KNOWN_LANGUAGES.has(name)) {
              languageLabels.add(name);
            }
          }
        }
      }

      languages = [...languageLabels];
    }
  } catch {
    // Gracefully degrade if DB is unavailable — still return GitHub search results
  }

  // Determine search language: explicit param > saved-issue derived > empty (any)
  const searchLanguage = explicitLanguage || (languages.length > 0 ? languages[0] : '');

  const result = await githubService.searchIssues({
    query: '',
    label: label || 'good-first-issue',
    language: searchLanguage,
    page: safePage,
    per_page: safePerPage,
    token,
  });

  // Filter out issues from repositories the user already has saved issues in
  const excludeSet = new Set(excludeRepos.map((r) => r.toLowerCase()));
  const filtered = result.issues.filter((issue) => {
    const fullName = issue.repository?.fullName?.toLowerCase();
    return !fullName || !excludeSet.has(fullName);
  });

  res.status(200).json({
    success: true,
    data: filtered,
    pagination: {
      totalCount: result.totalCount,
      page: safePage,
      perPage: safePerPage,
    },
    rateLimit: result.rateLimit,
    meta: {
      derivedLanguage: searchLanguage || null,
      derivedLanguages: languages,
      excludedRepos: excludeRepos,
    },
  });
}

/**
 * Common programming languages recognized from issue labels
 * for preference derivation. Kept lightweight — extend as needed.
 */
const KNOWN_LANGUAGES = new Set([
  'javascript', 'typescript', 'python', 'java', 'go', 'golang',
  'rust', 'ruby', 'c', 'c++', 'cpp', 'c#', 'csharp', 'swift',
  'kotlin', 'scala', 'php', 'perl', 'lua', 'dart', 'elixir',
  'haskell', 'clojure', 'r', 'julia', 'zig', 'nim', 'ocaml',
  'html', 'css', 'shell', 'bash', 'powershell', 'sql',
]);
