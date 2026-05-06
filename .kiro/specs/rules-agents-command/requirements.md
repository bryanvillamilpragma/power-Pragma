# Requirements Document

## Introduction

This feature evolves the autoskills-pragma CLI to support three new capabilities:

1. **Automatic Rules** — `.md` rule files that install silently alongside skills without user interaction, providing coding standards and guidelines for detected technologies.
2. **Agent Artifacts** — `AGENT.md` files in the registry that install as first-class artifacts to IDEs, enabling reusable agent workflows.
3. **`npx autoskills-pragma agents` Subcommand** — A new CLI subcommand that lists available agents filtered by the detected stack and allows interactive selection and installation.

## Glossary

- **CLI**: The autoskills-pragma command-line interface invoked via `npx autoskills-pragma`
- **AutoRule**: A markdown rule file in `skills-registry/rules/` that installs automatically (without user confirmation) when its associated technology is detected
- **Agent**: A markdown agent file in `skills-registry/agents/` that provides reusable AI agent workflows for specific tasks (e.g., create-view)
- **Technology**: A detected framework or library in the user's project (e.g., Angular, React, Next.js, TypeScript)
- **IDE**: An AI-powered development environment (Claude Code, Kiro, Copilot, Windsurf, Cursor) where artifacts are installed
- **ArtifactType**: The category of installable content — one of "skill", "agent", "rule", or "prompt"
- **SkillEntry**: An internal data structure representing a single installable artifact with its path, sources, and installation status
- **DetectedIDE**: An IDE found on the user's system with its configuration and base path
- **skills-map.ts**: The declarative map file containing Technology entries with their `autoRules` and `agents` arrays
- **installSkillGlobal**: The installer function that downloads/copies an artifact and writes it to all selected IDEs

## Requirements

### Requirement 1: Automatic Rule Installation

**User Story:** As a developer, I want coding rules to install automatically when I run autoskills-pragma, so that my AI IDEs have the correct coding standards without me needing to manually select them.

#### Acceptance Criteria

1. WHEN the user runs the CLI and technologies are detected, THE CLI SHALL call `collectAutoRules` with the detected technologies and installed skill names to gather applicable rules
2. WHEN auto-rules are collected, THE CLI SHALL install each rule using `installSkillGlobal` with `artifactType` set to "rule" without presenting a selection prompt to the user
3. WHEN auto-rules are installed, THE CLI SHALL use the same set of selected IDEs (global and local) that were chosen for skill installation
4. WHEN an auto-rule installation fails, THE CLI SHALL log the failure in verbose mode but continue installing remaining rules without aborting
5. WHEN auto-rules are installed successfully, THE CLI SHALL display a summary count of installed rules (e.g., "4 rules installed automatically")
6. IF the `--dry-run` flag is active, THEN THE CLI SHALL display the list of auto-rules that would be installed without performing actual installation

### Requirement 2: Agent Artifact Installation via Agents Subcommand

**User Story:** As a developer, I want to browse and install AI agent workflows that match my project's stack, so that I can use pre-built agents for common tasks like creating views.

#### Acceptance Criteria

1. WHEN the user runs `npx autoskills-pragma agents`, THE CLI SHALL scan the project directory to detect technologies
2. WHEN technologies are detected, THE CLI SHALL collect available agents from the `agents` field of each matched Technology entry in skills-map
3. WHEN agents are collected, THE CLI SHALL display them in an interactive multi-select list showing agent name and source technology
4. WHEN the user confirms agent selection, THE CLI SHALL install each selected agent using `installSkillGlobal` with `artifactType` set to "agent"
5. WHEN agent installation completes, THE CLI SHALL display a summary of installed agents and their target IDEs
6. IF no agents are available for the detected stack, THEN THE CLI SHALL display a message indicating no agents are available and exit gracefully
7. WHEN the `-y` flag is provided with the agents subcommand, THE CLI SHALL install all available agents without showing the interactive selector

### Requirement 3: Agents Subcommand CLI Integration

**User Story:** As a developer, I want a dedicated `agents` subcommand in the CLI, so that I can manage agent installations separately from skill installations.

#### Acceptance Criteria

1. THE CLI SHALL recognize "agents" as a positional subcommand (e.g., `npx autoskills-pragma agents`)
2. WHEN the "agents" subcommand is invoked, THE CLI SHALL bypass the normal skill installation flow and execute the agent listing and installation flow instead
3. THE CLI SHALL display the agents subcommand in the help text with a description of its purpose
4. WHEN the agents subcommand is invoked, THE CLI SHALL require authentication before proceeding (same auth gate as the main flow)
5. WHEN the agents subcommand is invoked, THE CLI SHALL detect installed IDEs and allow the user to select target IDEs before installing agents

### Requirement 4: Rule Files Exist in Registry as Subdirectories

**User Story:** As a developer, I want rule files to be available in the skills-registry as subdirectories with SKILL.md, so that the installer can resolve them using the same directory-based pattern as skills.

#### Acceptance Criteria

1. THE skills-registry SHALL contain rule directories at `skills-registry/rules/<rule-name>/SKILL.md` for each rule referenced in skills-map technology entries
2. THE skills-registry SHALL contain rule directories for: clean-architecture, solid-clean, code-test, performance, and security
3. WHEN a rule is referenced in a Technology's `autoRules` array, THE corresponding `skills-registry/rules/<rule-name>/SKILL.md` file SHALL exist
4. THE existing flat rule files (`skills-registry/rules/<rule-name>.md`) SHALL be migrated to the subdirectory structure (`skills-registry/rules/<rule-name>/SKILL.md`)

### Requirement 5: Agent Files Exist in Registry

**User Story:** As a developer, I want agent files to be available in the skills-registry, so that the agent installation mechanism has content to install.

#### Acceptance Criteria

1. THE skills-registry SHALL contain agent directories at `skills-registry/agents/<agent-name>/SKILL.md` for each agent referenced in skills-map technology entries
2. THE skills-registry SHALL contain the `create-view` agent at `skills-registry/agents/create-view/SKILL.md`
3. WHEN an agent is referenced in a Technology's `agents` array, THE corresponding agent directory and SKILL.md file SHALL exist in `skills-registry/agents/`
4. THE agent file SHALL be named SKILL.md (not AGENT.md) for compatibility with the installer's file resolution logic

### Requirement 6: ParseSkillPath Support for Rules and Agents Paths

**User Story:** As a developer of the CLI, I want `parseSkillPath` to correctly parse rule and agent paths, so that the installer can resolve them to the correct registry locations.

#### Acceptance Criteria

1. WHEN a rule path like "pragma/autoskills/rules/solid-clean" is parsed, THE parseSkillPath function SHALL return a skillName of "rules/solid-clean"
2. WHEN an agent path like "pragma/autoskills/agents/create-view" is parsed, THE parseSkillPath function SHALL return a skillName of "agents/create-view"
3. FOR ALL rule and agent paths in skills-map technology entries, parsing then resolving against the registry directory SHALL locate the correct file or directory

### Requirement 7: collectAgents and collectAutoRules Functions in lib.ts

**User Story:** As a developer of the CLI, I want dedicated collection functions for agents and auto-rules, so that the main flow and the agents subcommand can gather the correct artifacts from detected technologies.

#### Acceptance Criteria

1. THE lib.ts module SHALL export a `collectAgents` function that accepts detected technologies and optional combos, returning deduplicated SkillEntry items from each Technology's `agents` array
2. THE lib.ts module SHALL export a `collectAutoRules` function that accepts detected technologies and an optional set of installed names, returning deduplicated SkillEntry items from each Technology's `autoRules` array
3. WHEN multiple technologies reference the same agent path, THE collectAgents function SHALL include the agent only once (deduplicated by skillName)
4. WHEN a rule's skillName is present in the installedNames set, THE collectAutoRules function SHALL exclude that rule from the result

### Requirement 8: Main Flow Integrates Auto-Rule Installation

**User Story:** As a developer, I want auto-rules to install as part of the normal `npx autoskills-pragma` flow, so that I get coding standards automatically after skill installation.

#### Acceptance Criteria

1. WHEN skills are installed in the normal flow, THE CLI SHALL call `collectAutoRules` with detected technologies and installed names
2. WHEN auto-rules are collected, THE CLI SHALL filter them to only those present in the local registry (rules directory with SKILL.md)
3. WHEN filtered auto-rules exist, THE CLI SHALL install each using `installSkillGlobal` with `artifactType` set to "rule" and the same selected IDEs
4. WHEN auto-rules are installed, THE CLI SHALL display a summary line (e.g., "+ 4 auto rules installed")
5. THE auto-rule installation SHALL occur after skill installation but before the final summary

### Requirement 9: CLI Subcommand Routing for "agents"

**User Story:** As a developer, I want the CLI to route the "agents" positional argument to a dedicated handler, so that agent management is separate from the skill flow.

#### Acceptance Criteria

1. THE parseArgs function SHALL detect "agents" as the first positional argument and set a `subcommand` field to "agents"
2. WHEN `subcommand` is "agents", THE main function SHALL call `handleAgentsSubcommand` and exit without entering the skill installation flow
3. THE showHelp function SHALL document the "agents" subcommand with usage example `npx autoskills-pragma agents`
4. THE agents subcommand handler SHALL perform technology detection, collect agents, show interactive selection, detect IDEs, and install selected agents using `installSkillGlobal` with `artifactType` set to "agent"
