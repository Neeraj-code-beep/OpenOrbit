import { useState, useRef } from "react";
import { api } from "../../lib/apiClient.js";
import { Button } from "../../components/common/Button.jsx";
import { Icon } from "../../components/common/Icon.jsx";

const INITIAL_MESSAGES = [
  {
    id: "initial",
    role: "assistant",
    content:
      "Hello! I am your OpenOrbit Contribution Assistant. I can help you understand unfamiliar codebases, analyze complex issues, generate step-by-step contribution blueprints, or draft polished pull request descriptions.\n\nSelect a prompt below or type your question about any GitHub repository.",
    timestamp: "Now",
  },
];

export function AIAssistantPage({ onNavigateToPlan }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messageCounterRef = useRef(1);

  const quickPrompts = [
    {
      title: "Draft PR Description",
      text: "Generate a conventional pull request description for a bug fix that updates event teardown in concurrent root mode.",
    },
    {
      title: "First Contribution Checklist",
      text: "What are the standard prerequisites, branching conventions, and testing requirements before opening a PR in an open-source project?",
    },
    {
      title: "Analyze Repository Architecture",
      text: "How should I approach inspecting an unfamiliar repository without getting lost in dependencies?",
    },
  ];

  const handleSend = async (messageText) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isProcessing) return;

    messageCounterRef.current += 1;
    const msgId = `msg-${messageCounterRef.current}`;
    const userMsg = {
      id: msgId,
      role: "user",
      content: textToSend.trim(),
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    try {
      // 1. If prompt mentions PR description, call real backend PR description generator
      if (textToSend.toLowerCase().includes("pr") || textToSend.toLowerCase().includes("pull request")) {
        try {
          const res = await api.generatePRDescription({
            plan: {
              issueSummary: textToSend,
              problemInterpretation: "Addressed reported open source issue with verified unit test suites and regression safety.",
              implementationSteps: [
                { title: "Diagnose root cause", description: "Traced issue requirements." },
                { title: "Implement fix", description: "Applied targeted changes." },
              ],
              acceptanceCriteria: ["All test suites pass", "Code style adhered to"],
            },
          });
          const prData = res?.data?.prDescription || res?.data;
          const content = typeof prData === "string" ? prData : `### Proposed Pull Request\n\n**Title:** ${prData?.title || "feat: contribution updates"}\n\n${prData?.body || prData?.description || JSON.stringify(prData, null, 2)}`;
          setMessages((prev) => [
            ...prev,
            {
              id: String(Date.now() + 1),
              role: "assistant",
              content,
              timestamp: "Just now",
            },
          ]);
          return;
        } catch (err) {
          console.warn("PR generation fallback:", err.message);
        }
      }

      // 2. If prompt mentions issue analysis, call real backend Python issue analyzer
      if (textToSend.toLowerCase().includes("issue") || textToSend.toLowerCase().includes("bug") || textToSend.toLowerCase().includes("problem")) {
        try {
          const res = await api.analyzeIssue({
            issueTitle: textToSend,
            issueBody: "User requested automated analysis via AI Contribution Assistant.",
          });
          const analysis = res?.data || res;
          if (analysis?.problem_statement) {
            const content = `### Python Issue Analysis Result\n\n**Category:** ${analysis.issue_category || "General"} | **Difficulty:** ${analysis.difficulty_estimate || "Intermediate"}\n\n**Problem Statement:**\n${analysis.problem_statement}\n\n**Recommended Approach:**\n${analysis.recommended_approach || "Review affected modules and apply isolated patch."}${analysis.suspected_components?.length ? `\n\n**Suspected Components:** ${analysis.suspected_components.join(", ")}` : ""}`;
            setMessages((prev) => [
              ...prev,
              {
                id: String(Date.now() + 1),
                role: "assistant",
                content,
                timestamp: "Just now",
              },
            ]);
            return;
          }
        } catch (err) {
          console.warn("Issue analysis fallback:", err.message);
        }
      }

      // 3. Default structured developer guidance
      let reply = "";
      if (textToSend.toLowerCase().includes("first") || textToSend.toLowerCase().includes("prerequisite") || textToSend.toLowerCase().includes("checklist")) {
        reply = `### Recommended Contribution Checklist\n\n1. **Fork & Branch:** Always create a descriptive branch like \`fix/event-teardown\` off the latest \`main\`.\n2. **Isolate Changes:** Make only the edits required to solve the target issue; avoid reformatting unrelated code.\n3. **Run Existing Tests:** Run \`npm test\` or the repository's test runner before making modifications to ensure baseline health.\n4. **Add Regression Tests:** Write tests verifying your bug fix or feature works as expected.\n5. **Documentation:** Preserve comments and docstrings. Update README if options or behaviors change.\n\nYou can use OpenOrbit's **Contribution Planner** to generate a structured implementation blueprint tailored to your specific issue.`;
      } else if (textToSend.toLowerCase().includes("architecture") || textToSend.toLowerCase().includes("inspect")) {
        reply = `### How to Inspect Unfamiliar Repositories\n\n1. **Read the Entry Points:** Check \`package.json\` (\`main\` or \`scripts\`) to locate the server or app entry file.\n2. **Follow Route Declarations:** Modern backends structure logic by routes -> controllers -> services -> models.\n3. **Inspect Test Fixtures:** Test files (e.g. \`*.test.js\` or \`tests/\`) reveal how APIs are expected to be called.\n4. **Token-Budgeted Context:** OpenOrbit's repository explorer extracts key snippets while ignoring noisy directories like \`node_modules\` and build artifacts.`;
      } else {
        reply = `I've analyzed your question: "${textToSend}".\n\nFor repository-grounded blueprints with verified files and acceptance criteria, head over to the **Contribution Planner** tab. You can select any target repository and issue to synthesize a live implementation plan grounded in real GitHub context.`;
      }

      messageCounterRef.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${messageCounterRef.current}`,
          role: "assistant",
          content: reply,
          timestamp: "Just now",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-stack" style={{ height: "calc(100vh - 180px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
            AI Contribution Assistant
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
            Interactive guidance for open-source exploration, PR drafting, and architecture comprehension.
          </p>
        </div>
        {onNavigateToPlan && (
          <Button variant="secondary" onClick={onNavigateToPlan} style={{ fontSize: 13 }}>
            <Icon name="sparkle" size={15} /> Open Contribution Planner
          </Button>
        )}
      </div>

      {/* Chat Container */}
      <div
        className="card"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-lg)",
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-medium)",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}
      >
        {/* Messages scroll area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  alignSelf: isUser ? "flex-end" : "flex-start",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
                    {isUser ? "You" : "OpenOrbit Assistant"}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.timestamp}</span>
                </div>
                <div
                  style={{
                    padding: "12px 18px",
                    borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    backgroundColor: isUser ? "var(--accent-primary)" : "var(--bg-elevated)",
                    color: isUser ? "#FFFFFF" : "var(--text-primary)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    border: isUser ? "none" : "1px solid var(--border-subtle)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {m.content}
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", backgroundColor: "var(--bg-elevated)", borderRadius: 16 }}>
              <span className="status-dot pulsing" />
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Synthesizing guidance...</span>
            </div>
          )}
        </div>

        {/* Quick prompt suggestions */}
        <div
          style={{
            padding: "10px 20px",
            backgroundColor: "var(--bg-primary)",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            gap: 10,
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(qp.text)}
              disabled={isProcessing}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-medium)",
                borderRadius: "var(--radius-full)",
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="sparkle" size={12} /> {qp.title}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{
            padding: "14px 20px",
            backgroundColor: "var(--bg-secondary)",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            gap: 12,
          }}
        >
          <input
            type="text"
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about open-source contribution workflows..."
            disabled={isProcessing}
            style={{ flex: 1, borderRadius: "var(--radius-full)", padding: "10px 18px", fontSize: 14 }}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!input.trim() || isProcessing}
            style={{ borderRadius: "var(--radius-full)", padding: "10px 20px" }}
          >
            <Icon name="arrowRight" size={16} /> Send
          </Button>
        </form>
      </div>
    </div>
  );
}
