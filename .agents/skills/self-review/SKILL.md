---
name: self-review
description: Critically review and improve recent code changes before committing. Detect defects, prevent technical debt, enforce repository conventions, and verify correctness.
disable-model-invocation: true
---

# Self-review before commit

Perform a critical review of the work completed in the current task.

Your goal is not to approve your own implementation. Challenge it, identify defects, remove unnecessary complexity, and ensure the changes are correct, maintainable, and consistent with the existing codebase.

Prefer simple, explicit, and well-tested solutions over clever abstractions or unnecessary refactoring.

## 1. Understand the changes

- Run `git status` to identify staged, unstaged, and untracked files.
- Inspect `git diff` and `git diff --cached`.
- Read new untracked files and relevant surrounding code.
- Identify changes associated with the current task.
- Distinguish your changes from pre-existing or unrelated user changes.
- Understand the intended behavior before evaluating the implementation.

Do not modify, revert, stage, or overwrite unrelated changes.

## 2. Follow repository conventions

Read applicable project guidance when available:

- `AGENTS.md` and relevant nested `AGENTS.md` files.
- `CLAUDE.md` and applicable project-specific instructions.
- `.claude/rules/` and other relevant coding guidelines.
- Existing architecture, implementation patterns, and test conventions.

If explicit documentation is unavailable, infer conventions from nearby production code and existing tests.

Respect established patterns unless there is a concrete reason to deviate.

Do not introduce new architectural patterns, libraries, or abstractions merely because they seem preferable.

## 3. Review correctness and reliability

Critically examine the changes for:

- Incorrect business logic or unmet requirements.
- Missing edge cases and boundary conditions.
- Incomplete error handling or misleading error messages.
- Nullability, validation, and unexpected inputs.
- Race conditions, concurrency issues, and transaction safety.
- Resource leaks and improper cleanup.
- Breaking changes to existing interfaces or behavior.
- Missing or insufficient tests.

Where relevant, also examine security boundaries, authorization, tenant isolation, data integrity, idempotency, and backward compatibility.

Prioritize real defects and realistic failure scenarios over speculative concerns.

## 4. Review code quality and maintainability

Look for:

- Unnecessary complexity or overengineering.
- Duplicated logic that should be consolidated.
- Poor naming or unclear intent.
- Functions or classes with mixed responsibilities.
- Excessive coupling or unnecessary abstractions.
- Dead code, unused imports, and obsolete comments.
- Inconsistent error-handling patterns.
- Misleading documentation or unexplained decisions.

Favor readability and consistency.

Every abstraction should solve a concrete problem. Avoid introducing abstractions solely to reduce line count or anticipate hypothetical future requirements.

## 5. Fight entropy without expanding scope

Examine whether the changes leave the affected code easier or harder to maintain.

- Fix technical debt introduced by the current work.
- Improve nearby code when the improvement is small, directly related, and low-risk.
- Remove unnecessary complexity introduced during implementation.
- Preserve behavior when performing structural refactoring.
- Avoid unrelated cleanup, broad rewrites, or speculative optimization.

Do not turn a focused self-review into a repository-wide refactoring effort.

If a valuable improvement requires substantial changes, report it separately rather than expanding the task without justification.

## 6. Review performance where relevant

Consider performance implications of the changed execution paths:

- Unnecessary database queries or N+1 patterns.
- Inefficient algorithms or repeated computations.
- Avoidable allocations or expensive operations.
- Blocking operations in concurrent or asynchronous flows.
- Missing pagination, batching, or resource limits.
- Scalability issues introduced by the changes.

Optimize only when there is a plausible bottleneck or measurable benefit.

Do not sacrifice maintainability for speculative performance gains.

## 7. Fix actionable findings

For every issue identified:

1. Confirm it is a real problem.
2. Determine its severity and impact.
3. Fix it when it is within scope and reasonably safe.
4. Add or update tests when appropriate.
5. Verify that the correction does not introduce regressions.

Prioritize correctness, security, and data integrity before stylistic improvements.

If a fix is too risky, requires a design decision, or exceeds the current scope, document it explicitly instead of silently ignoring it.

Do not repeatedly rewrite working code without a clear reason.

## 8. Verify the result

Run relevant checks supported by the repository:

- Formatting and linting.
- Static analysis or type checking.
- Targeted unit and integration tests.
- Build or compilation checks when appropriate.
- `git diff --check`.

Prefer targeted checks first. Expand verification when the change has a broader impact.

Inspect the final diff after corrections to detect unintended changes.

Never claim that tests passed unless they were actually executed successfully.

If verification cannot be completed, explain what was not verified and why.

Do not stage files, create commits, or push changes unless explicitly requested.

## 9. Report findings

Provide a concise summary covering:

### Fixed
Issues detected and corrected, with relevant file references.

### Remaining concerns
Unresolved issues, their impact, and why they were not fixed.

### Verification
Checks executed and their results, including failures or limitations.

### Verdict
State one of:

- **Ready:** No known blocking issues; relevant verification passed.
- **Ready with caveats:** No known blocking issues, but minor concerns or verification gaps remain.
- **Not ready:** Blocking defects or unresolved critical risks remain.

Do not report hypothetical issues as confirmed defects.

## Final quality gate

Before finishing, ask:

1. Does the implementation satisfy the original requirements?
2. Did I introduce unnecessary complexity or technical debt?
3. Does the code follow established repository conventions?
4. Are failures, edge cases, and relevant security concerns handled?
5. Is the behavior adequately tested or otherwise verified?
6. Will another developer understand and maintain this code?

If a significant problem remains, fix it when safe and within scope. Otherwise, flag it clearly.

The objective is not perfect code. It is correct, understandable, maintainable code with no avoidable debt introduced by the current task.
