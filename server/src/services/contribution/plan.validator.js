import { AppError } from '../../utils/app-error.js';

/**
 * Parses and strictly validates the raw JSON contribution plan from AI
 */
export function parseAndValidatePlan(rawOutput, { repoName = '', issueTitle = '' } = {}) {
  if (!rawOutput || typeof rawOutput !== 'string') {
    throw new AppError('AI provider returned empty plan output', 502, 'AI_EMPTY_PLAN');
  }

  // Strip markdown code fences if model returned ```json ... ```
  let cleanJson = rawOutput.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (err) {
    throw new AppError('AI provider output could not be parsed as valid JSON: ' + err.message, 502, 'AI_INVALID_JSON', { raw: rawOutput });
  }

  // Validate schema structure
  const validatedPlan = {
    issueSummary: typeof parsed.issueSummary === 'string' && parsed.issueSummary ? parsed.issueSummary : `Resolution plan for: ${issueTitle}`,
    problemInterpretation: typeof parsed.problemInterpretation === 'string' ? parsed.problemInterpretation : 'Technical investigation needed.',
    relevantFiles: Array.isArray(parsed.relevantFiles)
      ? parsed.relevantFiles.map((file) => ({
          filePath: typeof file === 'string' ? file : file.filePath || 'Unknown file',
          reason: typeof file === 'object' && file.reason ? file.reason : 'Suspected implementation location',
          isVerified: Boolean(typeof file === 'object' && file.isVerified === true),
        }))
      : [],
    implementationSteps: Array.isArray(parsed.implementationSteps) && parsed.implementationSteps.length > 0
      ? parsed.implementationSteps.map((step, idx) => ({
          stepNumber: typeof step === 'object' && step.stepNumber ? step.stepNumber : idx + 1,
          title: typeof step === 'object' && step.title ? step.title : typeof step === 'string' ? step : `Step ${idx + 1}`,
          description: typeof step === 'object' && step.description ? step.description : '',
          safetyNotes: typeof step === 'object' && step.safetyNotes ? step.safetyNotes : 'Verify tests pass before proceeding.',
        }))
      : [
          {
            stepNumber: 1,
            title: 'Analyze codebase and replicate issue',
            description: 'Locate relevant test cases and reproduce the reported behavior.',
            safetyNotes: 'Do not modify files until reproduction is confirmed.',
          },
        ],
    dependenciesAndRisks: Array.isArray(parsed.dependenciesAndRisks) ? parsed.dependenciesAndRisks : [],
    acceptanceCriteria: Array.isArray(parsed.acceptanceCriteria) ? parsed.acceptanceCriteria : ['Issue is resolved without regressions.'],
    testPlan: Array.isArray(parsed.testPlan) ? parsed.testPlan : ['Run existing test suite to verify no regressions.'],
    uncertaintiesAndQuestions: Array.isArray(parsed.uncertaintiesAndQuestions) ? parsed.uncertaintiesAndQuestions : [],
    suggestedPR: {
      title: parsed.suggestedPR?.title || `fix: address issue ${issueTitle.slice(0, 50)}`,
      description: parsed.suggestedPR?.description || '## Proposed Changes\n- Resolves reported behavior\n\n## Verification\n- Tests passing',
    },
    meta: {
      generatedAt: new Date().toISOString(),
      repoName,
      isAiGenerated: true,
      verifiedByHuman: false,
    },
  };

  return validatedPlan;
}
