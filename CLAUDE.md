# CLAUDE.md

## Directives for Claude Code from Aichaku

This configuration is dynamically assembled from YAML files in your ~/.claude/aichaku installation.

```yaml
application:
  name: Nagare
  type: cli-tool
  description: >-
    Deno-native release management library that automates version bumping, changelog generation, and
    GitHub releases using conventional commits and semantic versioning
  version: 2.18.0
  stack:
    language: typescript
    runtime: deno
    framework: custom
    shell_integration: true
    config_format: typescript
    database: none
    external_apis:
      - github
      - jsr
      - npm
    package_manager: deno
    distribution:
      - jsr
      - npm
      - direct-script
  architecture:
    pattern: multi-command
    components:
      - name: cli
        description: Command-line interface entry point
        location: /cli.ts
      - name: release-manager
        description: Orchestrates the entire release process
        location: /src/release-manager.ts
      - name: file-handlers
        description: Intelligent file update system with type detection
        location: /src/file-handlers.ts
      - name: git-operations
        description: Version analysis and git command execution
        location: /src/git-operations.ts
      - name: template-processor
        description: Vento template engine integration
        location: /src/template-processor.ts
      - name: github-integration
        description: GitHub release creation via gh CLI
        location: /src/github-integration.ts
      - name: i18n
        description: Multi-language support (English/Japanese)
        location: /src/i18n.ts
      - name: security-utils
        description: OWASP-compliant input validation and sanitization
        location: /src/security-utils.ts
      - name: auto-fixer
        description: AI-powered error resolution integration
        location: /src/auto-fixer.ts
  commands:
    structure:
      - name: init
        description: Initialize Nagare in a project
        flags: []
        interactive: true
      - name: release
        description: Create a new release (default command)
        flags:
          - "--dry-run"
          - "--skip-confirmation, -y"
          - "--config, -c"
          - "--log-level"
          - "--lang"
        subcommands:
          - patch
          - minor
          - major
        default: true
      - name: rollback
        description: Rollback a release to a previous version
        flags:
          - "--dry-run"
          - "--skip-confirmation, -y"
          - "--config, -c"
          - "--log-level"
          - "--lang"
        requires_arg: version
      - name: retry
        description: Retry a failed release after cleaning up
        flags:
          - "--dry-run"
          - "--skip-confirmation, -y"
          - "--config, -c"
          - "--log-level"
          - "--lang"
    global_flags:
      - "--help, -h: Show help"
      - "--version, -v: Show version"
      - "--version-detailed: Show detailed version info"
      - "--version-json: Output version as JSON"
      - "--config, -c: Custom config file path"
      - "--log-level: Set logging verbosity (DEBUG, INFO, WARN, ERROR)"
      - "--lang: Language (en/ja)"
      - "--dry-run: Preview changes without applying"
      - "--skip-confirmation, -y: Skip all confirmation prompts"
    interactive:
      prompts: true
      progress_bars: true
      spinners: true
      colors: true
  ui:
    output:
      format: pretty
      colors: auto
      unicode: true
    errors:
      format: friendly
      suggestions: true
      exit_codes: true
    help:
      auto_generated: true
      examples: true
      man_pages: false
  configuration:
    storage:
      location: ./nagare.config.ts
      format: typescript
    options:
      project: object
      versionFile: object
      updateFiles: array
      github: object
      release: object
      hooks: object
    env_vars:
      prefix: NAGARE_
      dotenv: false
      ci_detection: true
  plugins:
    enabled: false
  distribution:
    packages:
      - type: jsr
        registry: "https://jsr.io"
        scope: "@rick/nagare"
        primary: true
      - type: npm
        registry: "https://registry.npmjs.org"
        scope: "@rick"
        status: planned
      - type: direct
        method: deno run
        url: "jsr:@rick/nagare/cli"
    installation:
      init: "deno run -A jsr:@rick/nagare/cli init"
      deno_task: deno task nagare
      direct: deno run -A nagare-launcher.ts
    updates:
      check: false
      method: jsr upgrade
  integrations:
    services:
      - name: GitHub API
        purpose: "Create releases, manage tags"
        authentication: gh CLI tool
        required: true
      - name: JSR Registry
        purpose: Package publishing verification
        authentication: automatic
        required: true
      - name: Claude Code
        purpose: AI-powered error auto-fix
        authentication: system
        optional: true
      - name: GitHub Copilot
        purpose: AI-powered error auto-fix
        authentication: system
        optional: true
    shell:
      completions: []
      aliases: false
      launcher_script: true
  security:
    credentials:
      storage: system
      encryption: true
    operations:
      confirm_destructive: true
      audit_log: false
      input_validation: true
      template_sandboxing: true
  type_safety:
    validation:
      library: zod
      strategy: boundary
      schemas_location: /src/validators/
    compiler_options:
      strict: true
      no_implicit_any: true
      no_unchecked_indexed_access: false
      exact_optional_property_types: false
    patterns:
      result_types: true
      branded_types: true
      discriminated_unions: true
      type_guards: false
    metrics:
      any_types_allowed: 0
      non_null_assertions_allowed: 0
      type_coverage_target: 95%
  testing:
    frameworks:
      - deno-test
    types:
      unit: true
      integration: true
      security: true
      template: true
    cli_testing:
      mock_fs: true
      mock_git: true
      capture_output: true
  development:
    tools:
      repl: true
      debug_mode: true
      dev_commands: false
    docs:
      readme: true
      cli_reference: true
      api_docs: true
      changelog: true
  performance:
    startup:
      target: < 100ms
      lazy_loading: true
    runtime:
      async: true
      streaming: true
      parallel: true
    resources:
      memory_limit: 256MB
      cpu_cores: 1
  unique_features:
    - name: Intelligent File Handlers
      description: Auto-detects file types and applies appropriate update patterns
    - name: Marine-themed UX
      description: "Wave animations (\U0001F30A) and ocean metaphors throughout"
    - name: Bilingual Support
      description: Full English/Japanese interface with i18n system
    - name: AI-Powered Auto-Fix
      description: Optional Claude/Copilot integration for CI/CD error resolution
    - name: JSR-First Design
      description: Built specifically for Deno's JSR registry ecosystem
    - name: Vento Templates
      description: "Powerful, secure template engine for changelogs and version files"
    - name: OWASP Compliance
      description: Security-first design with input validation and sandboxing
    - name: Smart Version Detection
      description: Analyzes conventional commits to auto-determine version bumps
    - name: Runtime Validation with Zod
      description: Type-safe runtime validation for all external inputs using Zod schemas
    - name: TypeScript Safety Enforced
      description: 'Zero ''any'' types, Result types for errors, branded types for domain safety'
behavioral_directives:
  context_awareness:
    name: Context-First Development
    priority: HIGHEST
    mandatory: true
    description: Always read and understand all available context before any action
    implementation:
      - Read the main CLAUDE.md immediately to understand project configuration
      - Use Glob tool with pattern '**/CLAUDE.md' to find all context files
      - Read subfolder CLAUDE.md files before working in those areas
      - Prioritize local context over general patterns
    why: >-
      Context determines everything - the app type, selected methodologies, standards, and
      project-specific patterns
  respect_user_selection:
    name: Respect User Selections
    priority: CRITICAL
    description: "Users have explicitly chosen their methodologies, standards, and principles"
    implementation:
      - Check 'application' section first - understand what kind of app this is
      - Check 'methodologies' section - work within the selected approach
      - Check 'standards' section - follow the selected guidelines
      - Check 'principles' section - respect the chosen philosophies
      - NEVER suggest alternatives or try to detect different approaches
    triggers:
      - "When user mentions methodology concepts, respond within their selection"
      - Reference the methodology's specific triggers and templates
      - 'Guide using the patterns they''ve chosen, not what you think is best'
  project_creation:
    name: Project Creation Workflow
    description: "Simple two-step process: Discuss then Create"
    workflow:
      discuss:
        when: User mentions project ideas or methodology concepts
        do:
          - "Acknowledge their selected methodology: '\U0001FAB4 Aichaku: I see you're working with [methodology]'"
          - Ask clarifying questions to understand their goal
          - Help refine ideas using their methodology's principles
        dont:
          - Create any files or folders
          - Ask 'Would you like me to create...?'
          - Suggest different methodologies
      create:
        when: 'User explicitly says: ''create project'', ''let''s start'', ''set it up'''
        do:
          - "State what you're doing: '\U0001FAB4 Aichaku: Creating project: [descriptive-name]'"
          - "Create in: docs/projects/active/YYYY-MM-DD-{descriptive-name}/"
          - "Create STATUS.md first, then methodology-specific documents"
          - Use the templates from their selected methodology
        dont:
          - Ask for confirmation after they've signaled readiness
          - Create files in the root directory
          - Deviate from the selected methodology's structure
  automation:
    name: Automatic Behaviors
    description: Things that happen without asking
    behaviors:
      error_recovery:
        when: File created in wrong location
        do: Move it immediately to docs/projects/active/*/ and update STATUS.md
      git_operations:
        when: Work confirmed complete
        do: |
          git add docs/projects/active/[current-project]/
          git commit -m '[type]: [description]

          - [what was done]
          - [key changes]'
      progress_tracking:
        when: Working on any task
        do: Update STATUS.md with progress automatically
visual_identity:
  prefix:
    mandatory: true
    format: "\U0001FAB4 Aichaku:"
    usage: ALWAYS prefix Aichaku messages with this exact format
  growth_phases:
    description: Project lifecycle indicators
    phases:
      new:
        emoji: "\U0001F331"
        description: New project just started
      active:
        emoji: "\U0001F33F"
        description: Actively being worked on
      mature:
        emoji: "\U0001F333"
        description: In review or maturing
      complete:
        emoji: "\U0001F343"
        description: Completed and archived
    usage: Use these indicators to show project phase in status updates
  progress_display:
    format:
      phase_indicator: "[Phase] → [**Current**] → [Next]"
      arrow_position: Place ▲ under current phase
      progress_bar: "Week X/Y ████████░░░░░░░░░░░░ XX% [emoji]"
    example: "\U0001FAB4 Aichaku: Shape Up Progress\n[Shaping] → [**Betting**] → [Building] → [Cool-down]\n              ▲\nWeek 2/6 ████████░░░░░░░░░░░░ 33% \U0001F33F\n"
file_organization:
  root: docs/projects/
  description: All Aichaku projects live under this directory
  states:
    active:
      path: docs/projects/active/
      description: Currently active projects
      naming: "active-YYYY-MM-DD-{descriptive-kebab-case-name}"
      example: active-2025-07-15-security-workflow-modernization
    done:
      path: docs/projects/done/
      description: Completed projects
      naming: "done-YYYY-MM-DD-{descriptive-kebab-case-name}"
      example: done-2025-07-14-consistent-branding
      transition: Rename from active-* to done-* when complete
methodologies:
  shape-up:
    name: Shape Up
    triggers:
      - shape
      - pitch
      - appetite
      - betting
      - cool-down
    best_for: Complex features
    templates:
      pitch: templates/pitch.md
      cycle_plan: templates/cycle-plan.md
      execution_plan: templates/execution-plan.md
      hill_chart: templates/hill-chart.md
      change_summary: templates/change-summary.md
    phases: {}
    integration_url: "aichaku://methodology/shape-up/guide"
standards:
  owasp-web:
    name: OWASP Top 10 Web Application Security
    category: security
    summary:
      critical: |
        - A01: Broken Access Control - Validate authorization on EVERY request
        - A02: Cryptographic Failures - Use strong encryption, secure key management
        - A03: Injection - Parameterized queries, input validation, output encoding
        - A07: Authentication Failures - Strong auth, proper session management
        - A09: Logging Failures - Log security events WITHOUT sensitive data
      security_headers: "X-Content-Type-Options, X-Frame-Options, HSTS, CSP"
      input_validation: "Never trust user input - validate, sanitize, escape"
      error_handling: "Generic error messages, log details server-side only"
    integration_url: "aichaku://standard/security/owasp-web"
  nist-csf:
    name: NIST Cybersecurity Framework (CSF 2.0)
    category: security
    summary:
      critical: |
        - Govern: Establish cybersecurity governance and risk management
        - Identify: Understand risks to systems, people, assets, data
        - Protect: Implement safeguards for critical services
        - Detect: Identify occurrence of cybersecurity events
        - Respond: Take action on detected incidents
        - Recover: Restore capabilities after incidents
      risk_based: Focuses on risk management over compliance
      scalable: Applicable to organizations of all sizes
      implementation: Code-based policies and automated controls
    integration_url: "aichaku://standard/security/nist-csf"
  conventional-commits:
    name: Conventional Commits
    category: development
    summary:
      critical: |
        - Format: <type>[optional scope]: <description>
        - Primary types: feat, fix, docs, style, refactor, test, chore
        - Breaking changes: Use ! or BREAKING CHANGE footer
        - Imperative mood: "add feature" not "added feature"
        - 50 char subject limit, 72 char body line limit
      automation: Enables semantic versioning and changelog generation
      version_bumping: "fix=patch, feat=minor, breaking=major"
      infosec_comment: "Use InfoSec: prefix for security implications"
    integration_url: "aichaku://standard/development/conventional-commits"
  solid:
    name: SOLID Principles
    category: development
    summary:
      critical: |
        - S: Single Responsibility - One reason to change per class
        - O: Open/Closed - Open for extension, closed for modification
        - L: Liskov Substitution - Subtypes must be substitutable
        - I: Interface Segregation - Many specific interfaces > one general
        - D: Dependency Inversion - Depend on abstractions, not concretions
      object_oriented: Core principles for maintainable OOP design
      flexibility: Enables code extension without modification
      testability: Promotes dependency injection and mocking
    integration_url: "aichaku://standard/development/solid"
  tdd:
    name: Test-Driven Development
    category: development
    summary:
      critical: |
        - Write failing tests FIRST before any implementation
        - Follow Red-Green-Refactor cycle strictly
        - Test behavior, not implementation details
        - One assertion per test for clarity
        - Use dependency injection for testability
      test_structure: AAA (Arrange-Act-Assert) pattern
      naming: Descriptive test names that explain the behavior
      coverage: Aim for 80%+ coverage with meaningful tests
      mocking: "Mock external dependencies, not internal implementation"
      cycle_discipline: "Tests must fail initially, minimal implementation to pass, refactor without breaking"
      isolation_requirements: "Tests run independently, no shared state, any execution order"
      ci_integration: "All tests pass before merge, coverage reports generated, visible in PRs"
      test_naming_patterns: "should [behavior] when [condition], returns [result] for [scenario]"
    integration_url: "aichaku://standard/development/tdd"
  dora:
    name: DORA Metrics (DevOps Research and Assessment)
    category: devops
    summary:
      critical: |
        - Deployment Frequency: How often you deploy to production
        - Lead Time for Changes: Time from commit to production
        - Mean Time to Recovery (MTTR): Time to restore service after incident
        - Change Failure Rate: Percentage of deployments causing failures
      performance_levels: "Elite, High, Medium, Low performance categories"
      correlation: Strong correlation with organizational performance
      automation: Automated measurement through CI/CD and monitoring
    integration_url: "aichaku://standard/devops/dora"
  clean-arch:
    name: Clean Architecture
    category: architecture
    summary:
      critical: |
        - Dependency Rule: Dependencies point inward toward higher-level policies
        - Four layers: Entities, Use Cases, Interface Adapters, Frameworks/Drivers
        - Business logic independent of frameworks, UI, and databases
        - Testable without external dependencies
        - Enables flexible technology choices
      independence: "Framework, UI, Database, and External agency independence"
      testability: Business rules testable in isolation
      dependency_direction: Always inward toward business logic
    integration_url: "aichaku://standard/architecture/clean-arch"
principles:
  agile-manifesto:
    name: Agile Manifesto
    category: organizational
    summary:
      tagline: Individuals and interactions over processes and tools
      core_tenets:
        - text: Individuals and interactions over processes and tools
        - text: Working software over comprehensive documentation
        - text: Customer collaboration over contract negotiation
    integration_url: "aichaku://principle/organizational/agile-manifesto"
  dry:
    name: DRY (Don't Repeat Yourself)
    category: software-development
    summary:
      tagline: "Every piece of knowledge should have a single, authoritative representation"
      core_tenets:
        - text: Avoid code duplication
        - text: Single source of truth
        - text: Eliminate redundancy
    integration_url: "aichaku://principle/software-development/dry"
  solid:
    name: SOLID Principles
    category: software-development
    summary:
      tagline: "Five principles that make software designs more understandable, flexible, and maintainable"
      core_tenets:
        - text: Single Responsibility Principle
        - text: Open/Closed Principle
        - text: Liskov Substitution Principle
    integration_url: "aichaku://principle/software-development/solid"
aichaku:
  version: 0.46.0
  source: configuration-as-code
included:
  core: true
  methodologies:
    - shape-up
  standards:
    - owasp-web
    - nist-csf
    - conventional-commits
    - solid
    - tdd
    - dora
    - clean-arch
  principles:
    - agile-manifesto
    - dry
    - solid
  has_user_customizations: true
```
