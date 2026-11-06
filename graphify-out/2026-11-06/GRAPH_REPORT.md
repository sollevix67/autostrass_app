# Graph Report - autostrass_app  (2026-11-05)

## Corpus Check
- 288 files · ~350,467 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 63 file(s) not represented in the graph (top: .csv 53, .css 6, (none) 2)

## Summary
- 2685 nodes · 5439 edges · 179 communities (129 shown, 50 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 199 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `268387ab`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Shadcn Component Installer
- UI UX Search Engine
- validate_data.py
- Frontend API Hooks
- server/index.ts
- CaisseView.tsx
- Primitive Color Palette
- referentielRepositories.ts
- Cash Database Schema
- FormFields.tsx
- resourceRoutes.ts
- slide_search_core.py
- Document Data Repositories
- Design Skill References
- Business Form Schemas
- Design System Generation
- Primitive Spacing Tokens
- TestNativeDesktopStackFreshness
- Authentication Security Middleware
- Brand Asset Generators
- crud.ts
- contracts.ts
- Python Tooling Test Imports
- HTML Token Validation
- package.json
- validation.ts
- Cash Register Repository
- react
- Tailwind Configuration Tests
- test_data_contracts.py
- sanitize.ts
- TestTokenizer
- HTML Slide Deck Generation
- Slide Background Image Generation
- NPM Build And Database Scripts
- Project Handoff Documentation
- Application TypeScript Configuration
- color
- DesignSystemGenerator
- test-environment.ts
- venteSchema
- Brand And Design Guidelines
- test-stock-transfer-validation.ts
- Repository Guidelines
- Visual Design Skill Guides
- Cash Compliance Verification
- logo/core.py
- Node TypeScript Configuration
- CIP Mockup Generation
- Typography Scale Tokens
- API Security Integration Tests
- Brand Color Extraction
- Catalog Refresh Contract Tests
- Project Configuration — autostrass_app
- read_rows
- Asset Validation CLI
- cip/core.py
- Web Stack Freshness Tests
- App.tsx
- UI UX Search CLI
- test_design_system_mode.py
- seed.ts
- Application Feature Roadmap
- Server TypeScript Configuration
- design-tokens-starter.json
- _select_palette_for_mode
- Tailwind Breakpoint Tests
- Domain Routing Tests
- Search Domain Tests
- dependencies
- csv
- Design Token Embedding Script
- Design Token Validation CLI
- card
- render-html.py
- Brand Context Injection
- Slide Copywriting Formulas
- Motion Duration Tokens
- pdfInvoice.ts
- BM25
- Brand Token Synchronization
- CIP Style Taxonomy
- Design Token Code Generation
- Administration des paramètres
- Tailwind Font And Spacing Config
- Backend Zod Route Flow
- PdfmakeInstance
- createTestEnvironment
- PRODUCT.md — Module Stock (autostrass)
- TestBm25CoreBehavior
- Fiscal Archive Fingerprints
- Security Review Findings
- CIP Mockup Prompt Engineering
- HTML Slide Template
- search-slides.py
- Border Radius Tokens
- Zod Authentication Connections
- Protected Route Schema Flow
- Oxlint Rule Configuration
- logo/search.py
- Relevance Threshold Tests
- Application Architecture README
- sm
- TailwindConfigGenerator
- Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?
- TestFixtureValidation
- button
- settingsStore.ts
- BM25
- Large Font Size Tokens
- slides-create.md
- Drizzle Dependency Debugging
- Social Image Design Guidance
- _filter_anti_patterns_for_mode
- Extra Large Size Tokens
- toRepositoryError
- No Color Style Tokens
- articleRepository.ts
- Stock Location Design Specification
- TypeScript Build Error Report
- Autostrass Design System
- test-stock-transfers.ts
- Slide Visualization Guidelines
- UI Interaction State Tokens
- cip/search.py
- TestMetricMath
- input
- ErrorSummary.tsx
- $type
- radius
- UI Styling Dependencies
- TypeScript Project References
- Banner Design Guidelines
- Documentation Authoring Guide
- Code Review Security Guide
- Hypothesis Driven Debugging
- Full Stack Security Guidance
- Accessible React Development
- Testing Strategy Skill
- Type Safe API Design
- UI Design System Guidance
- Vite React HTML Entry
- Social Utility Icon Sprite
- Apache License Terms
- Favicon SVG Asset
- Abstract Purple Hero Artwork
- React Logo SVG
- Vite Logo SVG
- 3
- vite
- _palette_is_dark
- 8
- useAuth.ts
- read_rows
- _load_csv
- padding-y
- drizzle-kit
- split_values
- Revue CSS — 4 novembre 2026
- 16
- 1
- destructive
- destructive-foreground
- muted
- primary-foreground
- ring
- secondary-foreground
- toNullableNumber
- email

## God Nodes (most connected - your core abstractions)
1. `TailwindConfigGenerator` - 58 edges
2. `react` - 43 edges
3. `toErrorMessage()` - 41 edges
4. `PageLayout()` - 41 edges
5. `Icon()` - 40 edges
6. `AppContent()` - 36 edges
7. `FormInput()` - 35 edges
8. `TestTailwindConfigGenerator` - 35 edges
9. `DesignSystemGenerator` - 35 edges
10. `useToast()` - 35 edges

## Surprising Connections (you probably didn't know these)
- `Création de client en fenêtre contextuelle — 4 novembre 2026` --references--> `useResource()`  [INFERRED]
  specs/client-modal.md → src/hooks/useResource.ts
- `Stockage et sauvegarde` --references--> `updatedAt()`  [INFERRED]
  specs/parametres.md → server/db/schema.ts
- `handleSubmit()` --indirect_call--> `email()`  [INFERRED]
  src/views/LoginView.tsx → server/middleware/schemas.ts
- `archive()` --calls--> `verifyFingerprints()`  [EXTRACTED]
  scripts/archive-fiscal.ts → server/middleware/compliance.ts
- `verify()` --calls--> `verifyFingerprints()`  [EXTRACTED]
  scripts/archive-fiscal.ts → server/middleware/compliance.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three-Layer Design Token Architecture** — _github_prompts_design_system_references_primitive_tokens_primitive_tokens, _github_prompts_design_system_references_semantic_tokens_semantic_tokens, _github_prompts_design_system_references_component_tokens_component_tokens [EXTRACTED 1.00]
- **Strategic HTML Slide Authoring** — github_prompts_slides_skill_slides_skill, github_prompts_slides_references_copywriting_formulas_copywriting_formulas, github_prompts_slides_references_layout_patterns_slide_layout_patterns, github_prompts_slides_references_html_template_html_slide_template, github_prompts_slides_references_slide_strategies_slide_strategies [EXTRACTED 1.00]
- **Social Image HTML Design and Screenshot QA Workflow** — github_prompts_design_references_social_photos_design_social_photos_design_guide, github_prompts_design_references_social_photos_design_html_screenshot_workflow, github_prompts_design_references_social_photos_design_safe_zones_visual_qa, github_prompts_design_references_social_photos_design_platform_image_sizes [EXTRACTED 1.00]
- **UI Styling Component, Utility, and Canvas Layers** — github_prompts_ui_styling_skill_ui_styling_skill, github_prompts_ui_styling_skill_component_layer, github_prompts_ui_styling_skill_tailwind_styling_layer, github_prompts_ui_styling_skill_canvas_visual_layer [EXTRACTED 1.00]

## Communities (179 total, 50 thin omitted)

### Community 0 - "Shadcn Component Installer"
Cohesion: 0.05
Nodes (3): main(), ShadcnInstaller, TestShadcnInstaller

### Community 1 - "UI UX Search Engine"
Cohesion: 0.06
Nodes (31): BM25, _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature() (+23 more)

### Community 2 - "validate_data.py"
Cohesion: 0.08
Nodes (38): TestGeneratedCatalogContract, _catalog_date(), _check_app_interface_contract(), _check_catalog_contract(), _check_catalog_summary(), _check_chart_contract(), _check_color_contract(), _check_core_data_contract() (+30 more)

### Community 3 - "Frontend API Hooks"
Cohesion: 0.08
Nodes (36): EMPTY_ARTICLE, SEED_ARTICLES, upsertByReference(), useCatalogue(), UseCatalogueResult, INITIAL_DASHBOARD, mapDashboardPayload(), useDashboard() (+28 more)

### Community 4 - "server/index.ts"
Cohesion: 0.08
Nodes (20): dotenv@^18.0.1, dotenv, drizzle-orm, express, mysql2, normalized, raw, statements (+12 more)

### Community 5 - "CaisseView.tsx"
Cohesion: 0.06
Nodes (90): @hookform/resolvers, react-hook-form, ConfirmDialog(), ConfirmDialogProps, ColumnDef, compare(), DataTable(), DataTableProps (+82 more)

### Community 6 - "Primitive Color Palette"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 7 - "referentielRepositories.ts"
Cohesion: 0.07
Nodes (16): LivraisonRepository, mapLivraison(), ClientInput, ClientRepository, ClientRow, FournisseurInput, FournisseurRepository, FournisseurRow (+8 more)

### Community 8 - "Cash Database Schema"
Cohesion: 0.04
Nodes (64): ArticleRef, CASH_BREAK_DENOMINATIONS, CASH_MOVEMENT_TYPES, CASH_SESSION_STATUSES, CashBreakDenomination, cashMovements, cashMovementsRelations, CashMovementType (+56 more)

### Community 9 - "FormFields.tsx"
Cohesion: 0.17
Nodes (10): initial, levels, CheckboxProps, CommonProps, FieldRegistration, InputProps, RegisterOptions, SelectProps (+2 more)

### Community 10 - "resourceRoutes.ts"
Cohesion: 0.04
Nodes (64): RFC-5321, CLIENT_TYPES, DELIVERY_STATUSES, ORDER_STATUSES, PAYMENT_MODES, USER_ROLES, VEHICLE_STATUSES, VEHICLE_TYPES (+56 more)

### Community 11 - "slide_search_core.py"
Cohesion: 0.16
Nodes (9): calculate_pattern_break(), detect_domain(), get_background_config(), get_color_for_emotion(), get_layout_for_goal(), get_typography_for_slide(), _load_decision_csv(), search_with_context() (+1 more)

### Community 12 - "Document Data Repositories"
Cohesion: 0.09
Nodes (27): clients, commandes, leaked, livraisons, receptions, retours, users, vehicules (+19 more)

### Community 13 - "Design Skill References"
Cohesion: 0.06
Nodes (35): AIDA PAS and FAB Copywriting, Before-After-Bridge Formula, Slide Copywriting Formulas, Cost of Inaction Formula, Create Slide Prompt, HTML Slide Template, HTML Presentation Structure, Slide Layout Patterns (+27 more)

### Community 14 - "Business Form Schemas"
Cohesion: 0.04
Nodes (44): ArticleFormOutput, ArticleFormValues, articleSchema, CaisseClotureFormOutput, CaisseClotureFormValues, caisseClotureSchema, CaisseOuvertureFormOutput, CaisseOuvertureFormValues (+36 more)

### Community 15 - "Design System Generation"
Cohesion: 0.07
Nodes (15): ansi_ljust(), _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides() (+7 more)

### Community 16 - "Primitive Spacing Tokens"
Cohesion: 0.09
Nodes (22): $type, $value, $type, $value, $type, $value, $type, $value (+14 more)

### Community 18 - "Authentication Security Middleware"
Cohesion: 0.17
Nodes (15): Bucket, bucketKey(), buckets, clientKey(), CSRF_HEADER, generateCsrfToken(), issueCsrfCookie(), prune() (+7 more)

### Community 19 - "Brand Asset Generators"
Cohesion: 0.11
Nodes (13): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+5 more)

### Community 20 - "crud.ts"
Cohesion: 0.11
Nodes (38): zod, UserRole, AUTH_COOKIE, AuthenticatedRequest, AuthenticatedUser, AuthError, hashPassword(), issueToken() (+30 more)

### Community 21 - "contracts.ts"
Cohesion: 0.08
Nodes (31): CashState, useCashMovements(), useCashSession(), cache, CacheEntry, fetchOnce(), useClientOptions(), useCommandeOptions() (+23 more)

### Community 22 - "Python Tooling Test Imports"
Cohesion: 0.10
Nodes (6): test_sync_parses_bundled_starter_template(), main(), _run(), test_flags_hardcoded_hex_sharing_line_with_token(), test_token_only_line_reports_no_violation(), TestDiagnosticsContracts

### Community 23 - "HTML Token Validation"
Cohesion: 0.13
Nodes (12): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+4 more)

### Community 24 - "package.json"
Cohesion: 0.08
Nodes (31): allowScripts, esbuild@0.28.2, devDependencies, concurrently@^10.0.5, oxlint@^1.81.0, selfsigned@^5.5.0, tsx@^4.23.13, @types/bcryptjs@^2.4.6 (+23 more)

### Community 25 - "validation.ts"
Cohesion: 0.14
Nodes (18): ArticleBody, EmplacementBody, EmplacementPatch, MAX_LENGTHS, MAX_LENGTHS_EMPLACEMENT, Niveau, notFound(), readNiveau() (+10 more)

### Community 26 - "Cash Register Repository"
Cohesion: 0.15
Nodes (11): CashBreak, CashCountRow, CashMovementRow, CashRegisterRepository, CashSessionRow, round2(), Tables, toDecimal() (+3 more)

### Community 27 - "react"
Cohesion: 0.09
Nodes (40): react, EmplacementsManager(), remove(), save(), Toast, ToastApi, ToastContext, ToastTone (+32 more)

### Community 29 - "test_data_contracts.py"
Cohesion: 0.19
Nodes (5): apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action(), _check_reasoning_contract()

### Community 30 - "sanitize.ts"
Cohesion: 0.14
Nodes (14): findMarkupInjection(), INJECTION_COUNTS, INJECTION_PATTERNS, InjectionKind, normalizeText(), reportInjection(), sanitizeEnum(), SanitizeReport (+6 more)

### Community 32 - "HTML Slide Deck Generation"
Cohesion: 0.13
Nodes (11): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+3 more)

### Community 33 - "Slide Background Image Generation"
Cohesion: 0.16
Nodes (9): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+1 more)

### Community 34 - "NPM Build And Database Scripts"
Cohesion: 0.08
Nodes (24): scripts, build, caisse:diagnostic, db:generate, db:migrate, db:seed, db:studio, dev (+16 more)

### Community 35 - "Project Handoff Documentation"
Cohesion: 0.17
Nodes (20): API and Security Test Suites, Authentication and Role-Based Access Control, Autostrass Project Handoff, Autostrass Roadmap, Cash Session Management, Centralized HTTP Client, Customer and Supplier Address Books, Database Migrations (+12 more)

### Community 36 - "Application TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 37 - "color"
Cohesion: 0.11
Nodes (19): $type, $value, background, foreground, muted-foreground, primary, primary-hover, secondary (+11 more)

### Community 38 - "DesignSystemGenerator"
Cohesion: 0.13
Nodes (3): DesignSystemGenerator, _resolve_dial(), TestReasoningMatch

### Community 39 - "test-environment.ts"
Cohesion: 0.12
Nodes (6): findAvailablePort(), ManagedProcess, projectRoot, TestEnvironment, ApiParametres, Session

### Community 41 - "Brand And Design Guidelines"
Cohesion: 0.17
Nodes (15): Asset Approval Checklist, Asset Organization Guide, Brand Guidelines Template, Color Palette Management, Brand Consistency Checklist, Logo Usage Rules, Messaging Framework, Typography Specifications (+7 more)

### Community 42 - "test-stock-transfer-validation.ts"
Cohesion: 0.18
Nodes (10): alias, explicitDestination, explicitNull, invalidCurrentField, maximum, motif, noDestination, omittedSource (+2 more)

### Community 43 - "Repository Guidelines"
Cohesion: 0.22
Nodes (8): Build, Test, and Development Commands, Coding Style & Naming Conventions, Commit & Pull Request Guidelines, Langue des réponses, Project Structure & Module Organization, Repository Guidelines, Security & Configuration Tips, Testing Guidelines

### Community 44 - "Visual Design Skill Guides"
Cohesion: 0.13
Nodes (17): Banner Sizes and Styles, CIP Deliverable Guide, CIP Design, Design Routing, Icon Design, Logo Color Psychology, Logo Design, Logo Prompt Engineering (+9 more)

### Community 45 - "Cash Compliance Verification"
Cohesion: 0.12
Nodes (14): apres, avant, carte, CashSession, cloture, comptageExact, courante, login (+6 more)

### Community 46 - "logo/core.py"
Cohesion: 0.21
Nodes (5): detect_domain(), _load_csv(), search(), search_all(), _search_csv()

### Community 47 - "Node TypeScript Configuration"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 48 - "CIP Mockup Generation"
Cohesion: 0.19
Nodes (7): build_cip_prompt(), check_logo_required(), generate_cip_set(), generate_with_nano_banana(), load_env(), load_logo_image(), main()

### Community 49 - "Typography Scale Tokens"
Cohesion: 0.12
Nodes (16): $type, $value, $type, $value, $type, $value, $type, $value (+8 more)

### Community 51 - "API Security Integration Tests"
Cohesion: 0.13
Nodes (13): adminId, clientId, clientPourAvoir, csrfFromCookie(), fuite, login(), metiers, nouveauClient (+5 more)

### Community 52 - "Brand Color Extraction"
Cohesion: 0.27
Nodes (9): calculateCompliance(), colorDistance(), displayPalette(), extractHexColors(), findNearestBrandColor(), generateImageMagickCommand(), hexToRgb(), main() (+1 more)

### Community 54 - "Project Configuration — autostrass_app"
Cohesion: 0.22
Nodes (8): Configuration Precedence, Existing Custom Skills, Installation, npm Scripts, oh-my-claudecode Usage, Project, Project Configuration — autostrass_app, Project Structure

### Community 55 - "read_rows"
Cohesion: 0.19
Nodes (5): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors

### Community 56 - "Asset Validation CLI"
Cohesion: 0.32
Nodes (11): checkManifest(), formatBytes(), formatOutput(), main(), parseFilename(), RULES, suggestFilename(), validateAsset() (+3 more)

### Community 57 - "cip/core.py"
Cohesion: 0.12
Nodes (7): BM25, detect_domain(), get_cip_brief(), _load_csv(), search(), search_all(), _search_csv()

### Community 60 - "App.tsx"
Cohesion: 0.08
Nodes (38): react-router-dom, App(), AppContent(), getStoredTheme(), getSystemTheme(), initials(), navigation, roleLabel() (+30 more)

### Community 61 - "UI UX Search CLI"
Cohesion: 0.21
Nodes (11): args, DATA, domainIndex, DOMAINS, limitIndex, parseCsv(), results, ROOT (+3 more)

### Community 62 - "test_design_system_mode.py"
Cohesion: 0.11
Nodes (5): _query_wants_dark(), _resolve_color_mode(), _style_is_dark_primary(), TestModeResolution, TestStyleTaxonomy

### Community 63 - "seed.ts"
Cohesion: 0.22
Nodes (9): splitDrizzleKitStatements(), splitStatements(), applyFixture(), hasDatabaseConfig, list, SEED_FILES, SEEDED_TABLES, sql (+1 more)

### Community 64 - "Application Feature Roadmap"
Cohesion: 0.20
Nodes (14): Application Settings, Autostrass Initial Requirements, Cash Register, Customer Address Book, Customer Orders, Customer Returns, Deliveries, Personnel (+6 more)

### Community 65 - "Server TypeScript Configuration"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleResolution, noEmit, noUnusedLocals, noUnusedParameters, skipLibCheck (+5 more)

### Community 66 - "design-tokens-starter.json"
Cohesion: 0.15
Nodes (12): component, $type, $value, dark, semantic, $schema, $type, $value (+4 more)

### Community 67 - "_select_palette_for_mode"
Cohesion: 0.22
Nodes (4): _contrast_ratio(), _derive_dark_palette(), _select_palette_for_mode(), TestPaletteSelection

### Community 71 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, bcryptjs@^3.0.3, body-parser@^2.4.0, drizzle-orm@^0.45.3, express@^5.3.0, @hookform/resolvers@^5.9.1, jose@^6.2.12, mysql2@^3.24.4 (+11 more)

### Community 72 - "csv"
Cohesion: 0.09
Nodes (4): read_rows(), read_rows(), TestTextLayoutDataContracts, TestTextLayoutRetrieval

### Community 73 - "Design Token Embedding Script"
Cohesion: 0.20
Nodes (6): args, minimal, MINIMAL_TOKENS, projectRoot, tokensPath, wrapStyle

### Community 74 - "Design Token Validation CLI"
Cohesion: 0.31
Nodes (9): extensions, formatReport(), getFiles(), main(), parseArgs(), patterns, scanFile(), shouldSkip() (+1 more)

### Community 75 - "card"
Cohesion: 0.20
Nodes (12): $type, $value, bg, bg, padding, shadow, card, bg (+4 more)

### Community 76 - "render-html.py"
Cohesion: 0.23
Nodes (4): generate_html(), get_deliverable_info(), get_image_base64(), main()

### Community 77 - "Brand Context Injection"
Cohesion: 0.42
Nodes (8): extractColorsFromTable(), extractCoreAttributes(), extractHexColors(), extractImageStyle(), extractTypography(), extractVoice(), generatePromptAddition(), main()

### Community 78 - "Slide Copywriting Formulas"
Cohesion: 0.24
Nodes (11): AIDA, Before-After-Bridge, Contrast Patterns, Copywriting Formulas, Cost of Inaction, FAB, Formula-to-Slide Mapping, Headline Patterns (+3 more)

### Community 79 - "Motion Duration Tokens"
Cohesion: 0.20
Nodes (10): fast, normal, slow, $type, $value, $type, $value, duration (+2 more)

### Community 80 - "pdfInvoice.ts"
Cohesion: 0.28
Nodes (7): ClientForPdf, fontsDef, formatDate(), formatEuros(), generateVentePdf(), require_, VenteForPdf

### Community 83 - "Brand Token Synchronization"
Cohesion: 0.39
Nodes (5): adjustBrightness(), extractColorsFromMarkdown(), generateColorScale(), main(), updateDesignTokens()

### Community 84 - "CIP Style Taxonomy"
Cohesion: 0.27
Nodes (10): Bold Dynamic, CIP Design Style Guide, Classic Traditional, Color Psychology, Corporate Minimal, Fresh Modern, Luxury Premium, Modern Tech (+2 more)

### Community 85 - "Design Token Code Generation"
Cohesion: 0.50
Nodes (7): flattenTokens(), generateCSS(), generateTailwind(), main(), parseArgs(), resolveReference(), toCssVarName()

### Community 86 - "Administration des paramètres"
Cohesion: 0.12
Nodes (15): updatedAt(), Administration des paramètres, API, Cloudflare Turnstile, HTTPS et terminaux, Installation et mise à jour, Choix retenus et périmètre restant, Lots PARAM-01 à PARAM-07 (+7 more)

### Community 88 - "Backend Zod Route Flow"
Cohesion: 0.38
Nodes (10): How Backend Zod Schemas Connect to Protected Routes, Backend Zod Schemas, Body Parser, Create API Router, CRUD Routes, Document Routes, Resource Routes, Role Guard (+2 more)

### Community 89 - "PdfmakeInstance"
Cohesion: 0.22
Nodes (3): pdfmake, PdfmakeInstance, PdfmakeOutput

### Community 90 - "createTestEnvironment"
Cohesion: 0.67
Nodes (6): createTestEnvironment(), close(), restartApi(), runScript(), startProcess(), stopProcess()

### Community 91 - "PRODUCT.md — Module Stock (autostrass)"
Cohesion: 0.25
Nodes (7): Ce qui fonctionne bien (à conserver), Ce qui ne va pas / à améliorer, Contraintes techniques, Objectif produit, PRODUCT.md — Module Stock (autostrass), Surface visuelle, Utilisateurs cibles

### Community 93 - "Fiscal Archive Fingerprints"
Cohesion: 0.29
Nodes (6): archive(), hasConfig, verify(), fingerprintVente(), GENESIS_HASH, verifyFingerprints()

### Community 94 - "Security Review Findings"
Cohesion: 0.33
Nodes (9): Bootstrap and Migration Consistency, Cash Session Ownership Check, Concurrent Cash Closure, Hierarchical Location Mapping, Open Session Diagnostic, Security and Reliability Review, Seed Location Join Integrity, Test Database Verification (+1 more)

### Community 95 - "CIP Mockup Prompt Engineering"
Cohesion: 0.11
Nodes (17): Apparel (Polo/T-Shirt), Base Prompt Structure, Business Card, CIP Mockup Prompt Engineering, Context Modifiers, Corporate Minimal, Deliverable-Specific Modifiers, Letterhead (+9 more)

### Community 96 - "HTML Slide Template"
Cohesion: 0.32
Nodes (8): Chart.js Integration, Design Tokens, HTML Slide Template, Mobile Breakpoints, Progress Bar, Responsive 16:9 Slide Deck, Slide Content Wrapper, Slide Navigation

### Community 97 - "search-slides.py"
Cohesion: 0.27
Nodes (5): format_context(), format_result(), main(), search(), search_all()

### Community 98 - "Border Radius Tokens"
Cohesion: 0.19
Nodes (14): $type, $value, $type, $value, $type, $value, primitive, radius (+6 more)

### Community 101 - "Zod Authentication Connections"
Cohesion: 0.43
Nodes (8): API Authentication Middleware, Application Shell and Theme, Backend Validation Security, Frontend Form Schemas, Project Build Configuration, Shared Static Dependency, Why Zod Connects API Authentication Middleware to Other Areas, Zod Dependency

### Community 102 - "Protected Route Schema Flow"
Cohesion: 0.43
Nodes (8): Application Shell and Theme, Backend API Validation Schemas, Frontend Zod Form Schemas, Node Project Build Configuration, Protected Resource Roles, Shared Import Bridge, Zod Dependency, Why Zod Connects Protected Resource Roles to Backend and Frontend Components

### Community 103 - "Oxlint Rule Configuration"
Cohesion: 0.25
Nodes (7): ignorePatterns, plugins, rules, react/incompatible-library, react/only-export-components, react/rules-of-hooks, $schema

### Community 107 - "Application Architecture README"
Cohesion: 0.38
Nodes (7): Autostrass, Drizzle Migrations, Drizzle ORM, MariaDB, React and Express Application, REST API, Vite Development Proxy

### Community 108 - "sm"
Cohesion: 0.60
Nodes (5): sm, sm, sm, $type, $value

### Community 110 - "Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?, Source Nodes

### Community 113 - "button"
Cohesion: 0.20
Nodes (10): fg, font-size, hover-bg, button, $type, $value, $type, $value (+2 more)

### Community 114 - "settingsStore.ts"
Cohesion: 0.08
Nodes (37): rateLimit(), createSettingsRouter(), output(), testDatabase(), Input, listTva(), ParametreRepository, ReferentielKind (+29 more)

### Community 116 - "Large Font Size Tokens"
Cohesion: 0.60
Nodes (5): lg, $type, $value, lg, lg

### Community 119 - "Drizzle Dependency Debugging"
Cohesion: 0.50
Nodes (4): Drizzle Dependency Debug Log, drizzle-kit 0.18.1, Drizzle Kit Upgrade Notice, drizzle-orm 0.45.3

### Community 120 - "Social Image Design Guidance"
Cohesion: 0.50
Nodes (4): HTML Screenshot Production Workflow, Social Image Platform Sizes, Safe Zones and Visual QA, Social Photos Design Guide

### Community 122 - "Extra Large Size Tokens"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 123 - "toRepositoryError"
Cohesion: 0.09
Nodes (21): databaseUnavailable, authenticate(), errorHandler(), LivraisonInput, LivraisonRow, Tables, DATABASE_CONNECTION_ERROR_CODES, isDatabaseUnavailable() (+13 more)

### Community 124 - "No Color Style Tokens"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

### Community 125 - "articleRepository.ts"
Cohesion: 0.29
Nodes (3): ArticleRepository, mapRow(), toNumber()

### Community 126 - "Stock Location Design Specification"
Cohesion: 0.50
Nodes (4): Stock by Location Design Specification, Authenticated Read-Only Locations API, Aisle Shelf and Slot Hierarchy, Non-Blocking Stock Location View

### Community 127 - "TypeScript Build Error Report"
Cohesion: 0.67
Nodes (3): Recorded TypeScript Build Errors, Missing Form Types and Components, React Hook Form Resolver Type Mismatches

### Community 128 - "Autostrass Design System"
Cohesion: 0.67
Nodes (3): Autostrass Design System Master, Accessibility and Responsive UI Rules, Dense Blue and Amber Dashboard Design

### Community 129 - "test-stock-transfers.ts"
Cohesion: 0.20
Nodes (5): call(), Session, transfer(), ArticleRow, ApiArticleEmplacements

### Community 130 - "Slide Visualization Guidelines"
Cohesion: 0.67
Nodes (3): Slides Design Reference, Chart.js Data Visualization, Presentation Design Tokens

### Community 131 - "UI Interaction State Tokens"
Cohesion: 0.67
Nodes (3): Focus States, Loading States, State Priority

### Community 132 - "cip/search.py"
Cohesion: 0.32
Nodes (3): format_brief(), format_results(), main()

### Community 134 - "input"
Cohesion: 0.29
Nodes (8): padding-x, input, $type, $value, focus-ring, padding-x, $type, $value

### Community 135 - "ErrorSummary.tsx"
Cohesion: 0.40
Nodes (5): buildItems(), ErrorItem, ErrorRecord, ErrorSummaryProps, readMessage()

### Community 136 - "$type"
Cohesion: 0.60
Nodes (5): $type, $value, border, border, border

### Community 137 - "radius"
Cohesion: 0.60
Nodes (5): radius, radius, radius, $type, $value

### Community 138 - "UI Styling Dependencies"
Cohesion: 0.67
Nodes (3): UI Styling Test Dependencies, UI Styling Script Requirements, UI Styling Test Requirements

### Community 157 - "3"
Cohesion: 0.67
Nodes (3): $type, $value, 3

### Community 158 - "vite"
Cohesion: 0.40
Nodes (4): vite@^8.3.5, @vitejs/plugin-react@^6.1.1, vite, @vitejs/plugin-react

### Community 159 - "_palette_is_dark"
Cohesion: 0.18
Nodes (4): _palette_is_dark(), _relative_luminance(), TestEndToEndCoherence, TestLuminance

### Community 160 - "8"
Cohesion: 0.67
Nodes (3): $type, $value, 8

### Community 161 - "useAuth.ts"
Cohesion: 0.29
Nodes (9): AuthContext, AuthContextValue, AuthStatus, SessionUser, AuthProvider(), toAuthError(), setCsrfToken(), setSessionToken() (+1 more)

### Community 162 - "read_rows"
Cohesion: 0.20
Nodes (3): read_rows(), TestLandingAndStackContract, TestReasoningContract

### Community 164 - "padding-y"
Cohesion: 0.67
Nodes (4): padding-y, padding-y, $type, $value

### Community 167 - "split_values"
Cohesion: 0.47
Nodes (3): split_values(), style_identities(), TestStyleIdentityContract

### Community 168 - "Revue CSS — 4 novembre 2026"
Cohesion: 0.18
Nodes (9): Captures, Correction Échap dans l'aperçu intégré, Création de client en fenêtre contextuelle — 4 novembre 2026, Vérification, Captures, Graphify et points de suivi, Organisation, Revue CSS — 4 novembre 2026 (+1 more)

### Community 169 - "16"
Cohesion: 0.67
Nodes (3): $type, $value, 16

### Community 170 - "1"
Cohesion: 0.67
Nodes (3): $type, $value, 1

### Community 171 - "destructive"
Cohesion: 0.67
Nodes (3): destructive, $type, $value

### Community 172 - "destructive-foreground"
Cohesion: 0.67
Nodes (3): destructive-foreground, $type, $value

### Community 173 - "muted"
Cohesion: 0.67
Nodes (3): muted, $type, $value

### Community 174 - "primary-foreground"
Cohesion: 0.67
Nodes (3): primary-foreground, $type, $value

### Community 175 - "ring"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 176 - "secondary-foreground"
Cohesion: 0.67
Nodes (3): secondary-foreground, $type, $value

### Community 177 - "toNullableNumber"
Cohesion: 0.67
Nodes (3): optionalRef(), requiredRef(), toNullableNumber()

## Knowledge Gaps
- **101 isolated node(s):** `RFC-5321`, `drizzle-kit 0.18.1`, `Drizzle Kit Upgrade Notice`, `drizzle-orm 0.45.3`, `Banner Design Skill` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1159 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `schemas.ts` (3× useful, score=2.986118554) _(code changed — re-verify)_
- `package.json` (2× useful, score=1.986266859) _(code changed — re-verify)_
- `crud.ts` (2× useful, score=1.986266859) _(code changed — re-verify)_
- `documentRoutes.ts` (2× useful, score=1.986266859) _(code changed — re-verify)_
- `schemas/index.ts` (2× useful, score=1.986266859) _(code changed — re-verify)_
- `LoginView.tsx` (2× useful, score=1.986266859) _(code changed — re-verify)_

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `zod` connect `crud.ts` to `dependencies`, `resourceRoutes.ts`, `Business Form Schemas`, `settingsStore.ts`, `package.json`, `react`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `TestTailwindConfigGenerator`) actually correct?**
  _`TailwindConfigGenerator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-5321`, `drizzle-kit 0.18.1`, `Drizzle Kit Upgrade Notice` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shadcn Component Installer` be split into smaller, more focused modules?**
  _Cohesion score 0.053555750658472345 - nodes in this community are weakly interconnected._
- **Why does `drizzle-orm` connect `server/index.ts` to `test-environment.ts`, `Cash Database Schema`, `dependencies`, `resourceRoutes.ts`, `referentielRepositories.ts`, `Document Data Repositories`, `crud.ts`, `package.json`, `Cash Register Repository`, `toRepositoryError`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `UI UX Search Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.05563093622795115 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `useAuth.ts`, `Frontend API Hooks`, `CaisseView.tsx`, `dependencies`, `ErrorSummary.tsx`, `FormFields.tsx`, `contracts.ts`, `package.json`, `App.tsx`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._