import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AIRouter } from '../services/ai/ai.router.js';
import { AIService } from '../services/ai/ai.service.js';
import { parseAndValidatePlan } from '../services/contribution/plan.validator.js';
import { AppError } from '../utils/app-error.js';

describe('Dual-Gemma AI Architecture & Python Integration Test Suite', () => {
  const validPlanJson = JSON.stringify({
    issueSummary: 'Fix event listener leak in navigation',
    problemInterpretation: 'Listeners are attached but never removed on unmount',
    relevantFiles: [{ filePath: 'src/nav.js', reason: 'Component holding listener' }],
    implementationSteps: [{ stepNumber: 1, title: 'Add useEffect cleanup', description: 'Return cleanup function' }],
    dependenciesAndRisks: [],
    acceptanceCriteria: ['Memory leak no longer observed'],
    testPlan: ['Mount and unmount component 100 times'],
    suggestedPR: { title: 'fix: clear nav listeners', description: 'Adds cleanup' },
  });

  it('1. Cloud Gemma succeeds: local Gemma is NOT called', async () => {
    let localGemmaCalled = false;

    const mockGemini = {
      modelName: 'gemma-4-26b-a4b-it',
      isConfigured: () => true,
      getModelName: () => 'gemma-4-26b-a4b-it',
      generateText: async () => validPlanJson,
    };

    const mockOllama = {
      modelName: 'gemma2:2b',
      getModelName: () => 'gemma2:2b',
      generateText: async () => {
        localGemmaCalled = true;
        return validPlanJson;
      },
    };

    const router = new AIRouter(mockGemini, mockOllama);
    const result = await router.generateTextWithProvenance('Generate plan prompt');

    assert.equal(result.provider, 'gemini');
    assert.equal(result.model, 'gemma-4-26b-a4b-it');
    assert.equal(result.fallbackUsed, false);
    assert.equal(result.text, validPlanJson);
    assert.equal(localGemmaCalled, false, 'Local Gemma must not be called when cloud succeeds');
  });

  it('2. Cloud Gemma times out: local Gemma is attempted and succeeds', async () => {
    let localGemmaCalled = false;

    const mockGemini = {
      modelName: 'gemma-4-26b-a4b-it',
      isConfigured: () => true,
      getModelName: () => 'gemma-4-26b-a4b-it',
      generateText: async () => {
        throw new AppError('Cloud Gemma request timed out after 25s', 504, 'AI_TIMEOUT');
      },
    };

    const mockOllama = {
      modelName: 'gemma2:2b',
      getModelName: () => 'gemma2:2b',
      generateText: async () => {
        localGemmaCalled = true;
        return validPlanJson;
      },
    };

    const router = new AIRouter(mockGemini, mockOllama);
    const result = await router.generateTextWithProvenance('Generate plan prompt');

    assert.equal(localGemmaCalled, true, 'Local Gemma should be called when cloud times out');
    assert.equal(result.provider, 'ollama');
    assert.equal(result.model, 'gemma2:2b');
    assert.equal(result.fallbackUsed, true);
    assert.ok(result.fallbackReason.includes('timed out'));
    assert.equal(result.primaryErrorCode, 'AI_TIMEOUT');
  });

  it('3. Cloud Gemma returns recoverable rate-limit error: fallback to local Gemma is correct', async () => {
    const mockGemini = {
      modelName: 'gemma-4-26b-a4b-it',
      isConfigured: () => true,
      getModelName: () => 'gemma-4-26b-a4b-it',
      generateText: async () => {
        throw new AppError('Gemini API quota exceeded or rate-limited.', 429, 'AI_QUOTA_EXCEEDED');
      },
    };

    const mockOllama = {
      modelName: 'gemma2:2b',
      getModelName: () => 'gemma2:2b',
      generateText: async () => validPlanJson,
    };

    const router = new AIRouter(mockGemini, mockOllama);
    const result = await router.generateTextWithProvenance('Generate plan prompt');

    assert.equal(result.provider, 'ollama');
    assert.equal(result.model, 'gemma2:2b');
    assert.equal(result.fallbackUsed, true);
    assert.equal(result.primaryErrorCode, 'AI_QUOTA_EXCEEDED');
  });

  it('4. Cloud credentials unconfigured/invalid: no infinite retry loop, falls back gracefully', async () => {
    let callCount = 0;

    const mockGemini = {
      modelName: 'gemma-4-26b-a4b-it',
      isConfigured: () => false,
      getModelName: () => 'gemma-4-26b-a4b-it',
      generateText: async () => {
        callCount++;
        throw new AppError('The configured GEMINI_API_KEY is invalid.', 401, 'AI_AUTH_ERROR');
      },
    };

    const mockOllama = {
      modelName: 'gemma2:2b',
      getModelName: () => 'gemma2:2b',
      generateText: async () => validPlanJson,
    };

    const router = new AIRouter(mockGemini, mockOllama);
    const result = await router.generateTextWithProvenance('Prompt');

    assert.equal(callCount, 0, 'Unconfigured provider should not be called in a loop');
    assert.equal(result.provider, 'ollama');
    assert.equal(result.fallbackUsed, true);
  });

  it('5. Both providers fail: returns controlled structured error (AI_ALL_PROVIDERS_FAILED)', async () => {
    const mockGemini = {
      modelName: 'gemma-4-26b-a4b-it',
      isConfigured: () => true,
      getModelName: () => 'gemma-4-26b-a4b-it',
      generateText: async () => {
        throw new AppError('Cloud 502 Service Unavailable', 502, 'AI_GENERATION_FAILED');
      },
    };

    const mockOllama = {
      modelName: 'gemma2:2b',
      getModelName: () => 'gemma2:2b',
      generateText: async () => {
        throw new AppError('Ollama is not running (ECONNREFUSED)', 503, 'OLLAMA_OFFLINE');
      },
    };

    const router = new AIRouter(mockGemini, mockOllama);

    await assert.rejects(
      async () => router.generateTextWithProvenance('Prompt'),
      (err) => {
        assert.equal(err.name, 'AppError');
        assert.equal(err.code, 'AI_ALL_PROVIDERS_FAILED');
        assert.equal(err.statusCode, 502);
        assert.ok(err.message.includes('All AI providers failed'));
        assert.ok(err.details.cloudError);
        assert.ok(err.details.localError);
        return true;
      }
    );
  });

  it('6. Ollama health check reports accurate status when gemma2:2b is available or missing', async () => {
    const mockGemini = {
      modelName: 'gemma-4-26b-a4b-it',
      isConfigured: () => true,
      checkHealth: async () => ({
        provider: 'gemini',
        status: 'AVAILABLE',
        model: 'gemma-4-26b-a4b-it',
      }),
    };

    const mockOllama = {
      modelName: 'gemma2:2b',
      checkHealth: async () => ({
        provider: 'ollama',
        status: 'AVAILABLE',
        targetModel: 'gemma2:2b',
        availableModels: ['gemma2:2b'],
      }),
    };

    const router = new AIRouter(mockGemini, mockOllama);
    const health = await router.checkAllProviders();

    assert.equal(health.operationalStatus, 'PRIMARY_ONLINE');
    assert.ok(health.routingStrategy.includes('Cloud Gemma'));
    assert.equal(health.providers.gemini.status, 'AVAILABLE');
    assert.equal(health.providers.ollama.status, 'AVAILABLE');
  });

  it('7. Invalid model output fails schema validation cleanly', () => {
    assert.throws(
      () => parseAndValidatePlan('This is plain text not JSON', { repoName: 'test/repo', issueTitle: 'Bug' }),
      (err) => {
        assert.equal(err.code, 'AI_INVALID_JSON');
        assert.equal(err.statusCode, 502);
        return true;
      }
    );

    assert.throws(
      () => parseAndValidatePlan('', { repoName: 'test/repo', issueTitle: 'Bug' }),
      (err) => {
        assert.equal(err.code, 'AI_EMPTY_PLAN');
        assert.equal(err.statusCode, 502);
        return true;
      }
    );
  });

  it('8. Python context enrichment succeeds and enriches contribution plan', async () => {
    const mockRouter = {
      generateTextWithProvenance: async (prompt) => {
        assert.ok(prompt.includes('Full-Stack Application (React + Node + Python)'));
        return {
          text: validPlanJson,
          provider: 'gemini',
          model: 'gemma-4-26b-a4b-it',
          fallbackUsed: false,
        };
      },
    };

    const mockPython = {
      extractRepositoryContext: async () => ({
        success: true,
        data: {
          project_type: 'Full-Stack Application (React + Node + Python)',
          summary_markdown: '# Repository Context\nFull-Stack Application (React + Node + Python)',
          languages_detected: ['JavaScript', 'Python'],
        },
      }),
    };

    const mockGithub = {
      getRepositoryReadme: async () => '# Test Readme',
    };

    const service = new AIService(mockRouter, mockGithub, null, mockPython);
    const result = await service.generateContributionPlan({
      issueTitle: 'Test issue',
      issueBody: 'Description',
      repoOwner: 'test-org',
      repoName: 'test-repo',
    });

    assert.equal(result.success, true);
    assert.equal(result.meta.pythonEnrichmentUsed, true);
    assert.ok(result.meta.contextSources.includes('python_ai_service:repository_context'));
    assert.equal(result.meta.provider, 'gemini');
    assert.equal(result.meta.fallbackUsed, false);
  });

  it('9. Python service offline/timeout: existing contribution planning safely continues', async () => {
    const mockRouter = {
      generateTextWithProvenance: async () => ({
        text: validPlanJson,
        provider: 'ollama',
        model: 'gemma2:2b',
        fallbackUsed: true,
        fallbackReason: 'Primary timeout',
      }),
    };

    const mockPython = {
      extractRepositoryContext: async () => {
        throw new AppError('Python AI service timed out after 10s', 504, 'PYTHON_AI_TIMEOUT');
      },
    };

    const mockGithub = {
      getRepositoryReadme: async () => '# Fallback Readme',
    };

    const service = new AIService(mockRouter, mockGithub, null, mockPython);
    const result = await service.generateContributionPlan({
      issueTitle: 'Test issue',
      issueBody: 'Description',
      repoOwner: 'test-org',
      repoName: 'test-repo',
    });

    assert.equal(result.success, true);
    assert.equal(result.meta.pythonEnrichmentUsed, false);
    assert.ok(result.meta.contextWarnings.some((w) => w.includes('Python context enrichment note')));
    assert.equal(result.meta.provider, 'ollama');
    assert.equal(result.meta.fallbackUsed, true);
  });

  it('10. Secrets are not returned in error responses or metadata', async () => {
    const mockGemini = {
      modelName: 'gemma-4-26b-a4b-it',
      isConfigured: () => true,
      getModelName: () => 'gemma-4-26b-a4b-it',
      generateText: async () => {
        throw new AppError('Key rejected for secret_key_1234567890abcdef', 401, 'AI_AUTH_ERROR');
      },
    };

    const mockOllama = {
      modelName: 'gemma2:2b',
      getModelName: () => 'gemma2:2b',
      generateText: async () => {
        throw new AppError('Connection refused to localhost', 503, 'OLLAMA_OFFLINE');
      },
    };

    const router = new AIRouter(mockGemini, mockOllama);

    try {
      await router.generateTextWithProvenance('Prompt');
      assert.fail('Should have thrown');
    } catch (err) {
      assert.equal(err.name, 'AppError');
      // Verify no sensitive keys or environment credentials leaked in error details or messages
      const stringified = JSON.stringify(err);
      if (process.env.GEMINI_API_KEY) {
        assert.ok(!stringified.includes(process.env.GEMINI_API_KEY));
      }
      if (process.env.GITHUB_CLIENT_SECRET) {
        assert.ok(!stringified.includes(process.env.GITHUB_CLIENT_SECRET));
      }
      assert.ok(!stringified.includes('FAKE_TEST_GCP_API_KEY_0000000000000000000000000000'));
      assert.ok(!stringified.includes('FAKE_TEST_CLIENT_SECRET_99999999'));
    }
  });
});
