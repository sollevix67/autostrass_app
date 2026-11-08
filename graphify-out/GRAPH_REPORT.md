# Graph Report - autostrass_app  (2026-11-08)

## Corpus Check
- 319 files · ~379,342 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 64 file(s) not represented in the graph (top: .csv 53, .css 7, (none) 2)

## Summary
- 2827 nodes · 5759 edges · 168 communities (116 shown, 52 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 202 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `37ac9167`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Shadcn Component Installer
- scripts/core.py
- validate_data.py
- InventaireView.tsx
- VentesComptoirView.tsx
- contracts.ts
- Primitive Color Palette
- referentielRepositories.ts
- Cash Database Schema
- test-parametres.ts
- resourceRoutes.ts
- slide_search_core.py
- Document Data Repositories
- Design Skill References
- Business Form Schemas
- design_system.py
- Primitive Spacing Tokens
- FournisseurRepository
- csrf.ts
- Brand Asset Generators
- types/index.ts
- test-stock-transfers.ts
- Python Tooling Test Imports
- HTML Token Validation
- package.json
- validation.ts
- Cash Register Repository
- StockView.tsx
- Tailwind Configuration Tests
- csv
- email
- DocumentRepository
- HTML Slide Deck Generation
- Slide Background Image Generation
- NPM Build And Database Scripts
- Project Handoff Documentation
- Application TypeScript Configuration
- color
- DesignSystemGenerator
- sanitize.ts
- ArticleRepository
- Brand And Design Guidelines
- test-clients-ui.mjs
- Repository Guidelines
- Visual Design Skill Guides
- Cash Compliance Verification
- _select_palette_for_mode
- Node TypeScript Configuration
- argparse
- Typography Scale Tokens
- API Security Integration Tests
- Brand Color Extraction
- Catalog Refresh Contract Tests
- Project Configuration — autostrass_app
- main.tsx
- Asset Validation CLI
- cip/core.py
- Tailwind Theme Validation
- Web Stack Freshness Tests
- App.tsx
- UI UX Search CLI
- test_design_system_mode.py
- LivraisonsView.tsx
- Application Feature Roadmap
- Server TypeScript Configuration
- design-tokens-starter.json
- test-inventaires.ts
- Tailwind Breakpoint Tests
- TestDomainDetection
- Search Domain Tests
- dependencies
- TestThresholdGate
- Design Token Embedding Script
- Design Token Validation CLI
- button
- test-environment.ts
- Brand Context Injection
- Slide Copywriting Formulas
- Motion Duration Tokens
- pdfInvoice.ts
- UtilisateursView.tsx
- Brand Token Synchronization
- CIP Style Taxonomy
- Design Token Code Generation
- Administration des paramètres
- Backend Zod Route Flow
- PdfmakeInstance
- test_core_data_quality.py
- PRODUCT.md — Module Stock (autostrass)
- test-fournisseurs.ts
- .generate
- Security Review Findings
- CIP Mockup Prompt Engineering
- HTML Slide Template
- archive-fiscal.ts
- Border Radius Tokens
- Zod Authentication Connections
- Protected Route Schema Flow
- Oxlint Rule Configuration
- VehiculeRepository
- SimpleRepository
- Application Architecture README
- BM25
- Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?
- parse_decision_rules
- logo/search.py
- settingsStore.ts
- toNullableNumber
- TestTokenizer
- slides-create.md
- Drizzle Dependency Debugging
- Social Image Design Guidance
- venteSchema
- Extra Large Size Tokens
- auth.ts
- No Color Style Tokens
- TestNativeDesktopStackFreshness
- Stock Location Design Specification
- TypeScript Build Error Report
- Bibliothèque Figma Autostrass — découverte
- test-stock-transfer-validation.ts
- Slide Visualization Guidelines
- UI Interaction State Tokens
- BM25
- TestStyleTaxonomy
- TestMetricMath
- simpleRepositories.ts
- TestFixtureValidation
- primary-hover
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
- test-french-validation-ui.mjs
- _palette_is_dark
- ref_node_assert
- read_rows
- test-client-numbers.ts
- Inventaire physique par référence
- Revue CSS — 4 novembre 2026
- ring
- split_values
- TestBm25CoreBehavior
- Création et modification des fournisseurs — 6 novembre 2026

## God Nodes (most connected - your core abstractions)
1. `TailwindConfigGenerator` - 58 edges
2. `react` - 45 edges
3. `toErrorMessage()` - 44 edges
4. `PageLayout()` - 43 edges
5. `Icon()` - 40 edges
6. `FormInput()` - 39 edges
7. `useToast()` - 37 edges
8. `AppContent()` - 37 edges
9. `useAuth()` - 36 edges
10. `TestTailwindConfigGenerator` - 35 edges

## Surprising Connections (you probably didn't know these)
- `Création et modification des clients — 6 novembre 2026` --references--> `useResource()`  [INFERRED]
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

## Communities (168 total, 52 thin omitted)

### Community 0 - "Shadcn Component Installer"
Cohesion: 0.05
Nodes (3): main(), ShadcnInstaller, TestShadcnInstaller

### Community 1 - "scripts/core.py"
Cohesion: 0.06
Nodes (31): BM25, _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature() (+23 more)

### Community 2 - "validate_data.py"
Cohesion: 0.09
Nodes (33): TestGeneratedCatalogContract, _catalog_date(), _check_app_interface_contract(), _check_catalog_contract(), _check_catalog_summary(), _check_chart_contract(), _check_color_contract(), _check_core_data_contract() (+25 more)

### Community 3 - "InventaireView.tsx"
Cohesion: 0.17
Nodes (16): buildItems(), ErrorItem, ErrorRecord, ErrorSummaryProps, readMessage(), ApiArticle, Comptage(), ComptageForm() (+8 more)

### Community 4 - "VentesComptoirView.tsx"
Cohesion: 0.17
Nodes (13): cache, CacheEntry, fetchOnce(), useClientOptions(), useCommandeOptions(), useReferential(), useVenteOptions(), PAYMENT_MODE_OPTIONS (+5 more)

### Community 5 - "contracts.ts"
Cohesion: 0.09
Nodes (28): react, Toast, ToastApi, ToastContext, ToastTone, loadTurnstile(), Turnstile, TurnstileWidget() (+20 more)

### Community 6 - "Primitive Color Palette"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 7 - "referentielRepositories.ts"
Cohesion: 0.18
Nodes (10): ClientInput, ClientRepository, ClientRow, clientWriteError(), FournisseurInput, FournisseurRow, mapClient(), Tables (+2 more)

### Community 8 - "Cash Database Schema"
Cohesion: 0.04
Nodes (65): ArticleRef, CASH_BREAK_DENOMINATIONS, CASH_MOVEMENT_TYPES, CASH_SESSION_STATUSES, CashBreakDenomination, cashMovements, cashMovementsRelations, CashMovementType (+57 more)

### Community 9 - "test-parametres.ts"
Cohesion: 0.20
Nodes (5): Input, ParametreRepository, ReferentielKind, tables, SousCategorie

### Community 10 - "resourceRoutes.ts"
Cohesion: 0.05
Nodes (56): RFC-5321, CLIENT_TYPES, DELIVERY_STATUSES, ORDER_STATUSES, PAYMENT_MODES, USER_ROLES, VEHICLE_STATUSES, VEHICLE_TYPES (+48 more)

### Community 11 - "slide_search_core.py"
Cohesion: 0.08
Nodes (17): format_context(), format_result(), main(), BM25, calculate_pattern_break(), detect_domain(), get_background_config(), get_color_for_emotion() (+9 more)

### Community 12 - "Document Data Repositories"
Cohesion: 0.11
Nodes (27): clients, commandes, leaked, livraisons, receptions, retours, users, vehicules (+19 more)

### Community 13 - "Design Skill References"
Cohesion: 0.06
Nodes (35): AIDA PAS and FAB Copywriting, Before-After-Bridge Formula, Slide Copywriting Formulas, Cost of Inaction Formula, Create Slide Prompt, HTML Slide Template, HTML Presentation Structure, Slide Layout Patterns (+27 more)

### Community 14 - "Business Form Schemas"
Cohesion: 0.04
Nodes (42): ArticleFormOutput, ArticleFormValues, articleSchema, CaisseClotureFormOutput, CaisseClotureFormValues, caisseClotureSchema, CaisseOuvertureFormOutput, CaisseOuvertureFormValues (+34 more)

### Community 15 - "design_system.py"
Cohesion: 0.06
Nodes (16): ansi_ljust(), _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides() (+8 more)

### Community 16 - "Primitive Spacing Tokens"
Cohesion: 0.06
Nodes (34): $type, $value, $type, $value, $type, $value, $type, $value (+26 more)

### Community 18 - "csrf.ts"
Cohesion: 0.12
Nodes (24): AUTH_COOKIE, authenticate(), AuthError, issueToken(), signingKey(), verifyToken(), cookieOptions, createAuthRouter() (+16 more)

### Community 19 - "Brand Asset Generators"
Cohesion: 0.11
Nodes (13): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+5 more)

### Community 20 - "types/index.ts"
Cohesion: 0.10
Nodes (25): AuthContext, AuthContextValue, AuthStatus, SessionUser, AuthProvider(), toAuthError(), INITIAL_DASHBOARD, mapDashboardPayload() (+17 more)

### Community 21 - "test-stock-transfers.ts"
Cohesion: 0.16
Nodes (7): call(), Session, transfer(), ArticleInput, ArticleRow, ArticleRowPacket, ApiArticleEmplacements

### Community 22 - "Python Tooling Test Imports"
Cohesion: 0.09
Nodes (5): test_sync_parses_bundled_starter_template(), main(), _run(), test_flags_hardcoded_hex_sharing_line_with_token(), test_token_only_line_reports_no_violation()

### Community 23 - "HTML Token Validation"
Cohesion: 0.13
Nodes (12): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+4 more)

### Community 24 - "package.json"
Cohesion: 0.08
Nodes (33): allowScripts, esbuild@0.28.2, devDependencies, concurrently@^10.0.5, drizzle-kit@^0.31.11, oxlint@^1.81.0, selfsigned@^5.5.0, tsx@^4.23.13 (+25 more)

### Community 25 - "validation.ts"
Cohesion: 0.14
Nodes (18): ArticleBody, EmplacementBody, EmplacementPatch, MAX_LENGTHS, MAX_LENGTHS_EMPLACEMENT, Niveau, notFound(), readNiveau() (+10 more)

### Community 26 - "Cash Register Repository"
Cohesion: 0.16
Nodes (10): CashBreak, CashCountRow, CashMovementRow, CashRegisterRepository, CashSessionRow, round2(), Tables, toDecimal() (+2 more)

### Community 27 - "StockView.tsx"
Cohesion: 0.07
Nodes (51): ColumnDef, EmplacementsManager(), remove(), save(), initial, levels, CashState, useCashMovements() (+43 more)

### Community 29 - "csv"
Cohesion: 0.09
Nodes (9): detect_domain(), _load_csv(), search(), search_all(), _search_csv(), read_rows(), read_rows(), TestTextLayoutDataContracts (+1 more)

### Community 32 - "HTML Slide Deck Generation"
Cohesion: 0.13
Nodes (11): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+3 more)

### Community 33 - "Slide Background Image Generation"
Cohesion: 0.11
Nodes (12): format_brief(), format_results(), main(), generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url() (+4 more)

### Community 34 - "NPM Build And Database Scripts"
Cohesion: 0.08
Nodes (26): scripts, build, caisse:diagnostic, db:generate, db:migrate, db:seed, db:studio, dev (+18 more)

### Community 35 - "Project Handoff Documentation"
Cohesion: 0.17
Nodes (20): API and Security Test Suites, Authentication and Role-Based Access Control, Autostrass Project Handoff, Autostrass Roadmap, Cash Session Management, Centralized HTTP Client, Customer and Supplier Address Books, Database Migrations (+12 more)

### Community 36 - "Application TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 37 - "color"
Cohesion: 0.06
Nodes (31): $type, $value, background, destructive, destructive-foreground, foreground, muted, muted-foreground (+23 more)

### Community 39 - "sanitize.ts"
Cohesion: 0.10
Nodes (20): bodySchema, findMarkupInjection(), INJECTION_COUNTS, INJECTION_PATTERNS, InjectionKind, normalizeText(), reportInjection(), sanitizeEnum() (+12 more)

### Community 40 - "ArticleRepository"
Cohesion: 0.29
Nodes (3): ArticleRepository, mapRow(), toNumber()

### Community 41 - "Brand And Design Guidelines"
Cohesion: 0.17
Nodes (15): Asset Approval Checklist, Asset Organization Guide, Brand Guidelines Template, Color Palette Management, Brand Consistency Checklist, Logo Usage Rules, Messaging Framework, Typography Specifications (+7 more)

### Community 42 - "test-clients-ui.mjs"
Cohesion: 0.25
Nodes (5): checks, errors, fields, initial, output

### Community 43 - "Repository Guidelines"
Cohesion: 0.22
Nodes (8): Build, Test, and Development Commands, Coding Style & Naming Conventions, Commit & Pull Request Guidelines, Langue des réponses, Project Structure & Module Organization, Repository Guidelines, Security & Configuration Tips, Testing Guidelines

### Community 44 - "Visual Design Skill Guides"
Cohesion: 0.13
Nodes (17): Banner Sizes and Styles, CIP Deliverable Guide, CIP Design, Design Routing, Icon Design, Logo Color Psychology, Logo Design, Logo Prompt Engineering (+9 more)

### Community 45 - "Cash Compliance Verification"
Cohesion: 0.12
Nodes (14): apres, avant, carte, CashSession, cloture, comptageExact, courante, login (+6 more)

### Community 46 - "_select_palette_for_mode"
Cohesion: 0.22
Nodes (4): _contrast_ratio(), _derive_dark_palette(), _select_palette_for_mode(), TestPaletteSelection

### Community 47 - "Node TypeScript Configuration"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 48 - "argparse"
Cohesion: 0.09
Nodes (12): build_cip_prompt(), check_logo_required(), generate_cip_set(), generate_with_nano_banana(), load_env(), load_logo_image(), main(), generate_html() (+4 more)

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

### Community 55 - "main.tsx"
Cohesion: 0.23
Nodes (10): react-dom@^19.2.8, react-dom, removeFrenchValidation, FormControl, installFrenchValidation(), clear(), clearForm(), translate() (+2 more)

### Community 56 - "Asset Validation CLI"
Cohesion: 0.32
Nodes (11): checkManifest(), formatBytes(), formatOutput(), main(), parseFilename(), RULES, suggestFilename(), validateAsset() (+3 more)

### Community 57 - "cip/core.py"
Cohesion: 0.20
Nodes (6): detect_domain(), get_cip_brief(), _load_csv(), search(), search_all(), _search_csv()

### Community 60 - "App.tsx"
Cohesion: 0.10
Nodes (30): react-router-dom, App(), AppContent(), getStoredTheme(), getSystemTheme(), initials(), navigation, roleLabel() (+22 more)

### Community 61 - "UI UX Search CLI"
Cohesion: 0.21
Nodes (11): args, DATA, domainIndex, DOMAINS, limitIndex, parseCsv(), results, ROOT (+3 more)

### Community 62 - "test_design_system_mode.py"
Cohesion: 0.14
Nodes (6): _filter_anti_patterns_for_mode(), _query_wants_dark(), _resolve_color_mode(), _style_is_dark_primary(), TestAntiPatternGating, TestModeResolution

### Community 63 - "LivraisonsView.tsx"
Cohesion: 0.04
Nodes (58): ConfirmDialogProps, compare(), DataTableProps, SortAccessor, CheckboxProps, CommonProps, FieldRegister, FieldRegistration (+50 more)

### Community 64 - "Application Feature Roadmap"
Cohesion: 0.20
Nodes (14): Application Settings, Autostrass Initial Requirements, Cash Register, Customer Address Book, Customer Orders, Customer Returns, Deliveries, Personnel (+6 more)

### Community 65 - "Server TypeScript Configuration"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleResolution, noEmit, noUnusedLocals, noUnusedParameters, skipLibCheck (+5 more)

### Community 66 - "design-tokens-starter.json"
Cohesion: 0.15
Nodes (12): $type, $value, dark, semantic, primitive, $schema, $type, $value (+4 more)

### Community 67 - "test-inventaires.ts"
Cohesion: 0.12
Nodes (11): Session, AuthenticatedUser, InventaireRepository, mapInventaire(), RepositoryError, InventaireInput, inventaireSchema, MAX_STOCK (+3 more)

### Community 71 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, bcryptjs@^3.0.3, body-parser@^2.4.0, dotenv@^18.0.1, drizzle-orm@^0.45.3, express@^5.3.0, @hookform/resolvers@^5.9.1, jose@^6.2.12 (+8 more)

### Community 73 - "Design Token Embedding Script"
Cohesion: 0.20
Nodes (6): args, minimal, MINIMAL_TOKENS, projectRoot, tokensPath, wrapStyle

### Community 74 - "Design Token Validation CLI"
Cohesion: 0.31
Nodes (9): extensions, formatReport(), getFiles(), main(), parseArgs(), patterns, scanFile(), shouldSkip() (+1 more)

### Community 75 - "button"
Cohesion: 0.06
Nodes (45): $type, $value, $type, $value, bg, fg, font-size, hover-bg (+37 more)

### Community 76 - "test-environment.ts"
Cohesion: 0.06
Nodes (30): dotenv, mysql2, normalized, raw, statements, splitDrizzleKitStatements(), splitStatements(), createTestEnvironment() (+22 more)

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
Cohesion: 0.14
Nodes (13): pdfmake@^0.3.11, pdfmake, server, vente, warnings, allowedFontFiles, ClientForPdf, fontsDef (+5 more)

### Community 81 - "UtilisateursView.tsx"
Cohesion: 0.11
Nodes (50): @hookform/resolvers, react-hook-form, ConfirmDialog(), DataTable(), ErrorSummary(), FormCheckbox(), FormInput(), FormSelect() (+42 more)

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

### Community 90 - "test_core_data_quality.py"
Cohesion: 0.15
Nodes (10): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, _check_typography_contract(), _configured_font_names(), _declared_weights() (+2 more)

### Community 91 - "PRODUCT.md — Module Stock (autostrass)"
Cohesion: 0.25
Nodes (7): Ce qui fonctionne bien (à conserver), Ce qui ne va pas / à améliorer, Contraintes techniques, Objectif produit, PRODUCT.md — Module Stock (autostrass), Surface visuelle, Utilisateurs cibles

### Community 92 - "test-fournisseurs.ts"
Cohesion: 0.13
Nodes (12): empty, full, optionalFields, Session, sanitizeCode(), clientBodySchema, fournisseurBodySchema, fournisseurPatchSchema (+4 more)

### Community 94 - "Security Review Findings"
Cohesion: 0.33
Nodes (9): Bootstrap and Migration Consistency, Cash Session Ownership Check, Concurrent Cash Closure, Hierarchical Location Mapping, Open Session Diagnostic, Security and Reliability Review, Seed Location Join Integrity, Test Database Verification (+1 more)

### Community 95 - "CIP Mockup Prompt Engineering"
Cohesion: 0.11
Nodes (17): Apparel (Polo/T-Shirt), Base Prompt Structure, Business Card, CIP Mockup Prompt Engineering, Context Modifiers, Corporate Minimal, Deliverable-Specific Modifiers, Letterhead (+9 more)

### Community 96 - "HTML Slide Template"
Cohesion: 0.32
Nodes (8): Chart.js Integration, Design Tokens, HTML Slide Template, Mobile Breakpoints, Progress Bar, Responsive 16:9 Slide Deck, Slide Content Wrapper, Slide Navigation

### Community 97 - "archive-fiscal.ts"
Cohesion: 0.29
Nodes (6): archive(), hasConfig, verify(), fingerprintVente(), GENESIS_HASH, verifyFingerprints()

### Community 98 - "Border Radius Tokens"
Cohesion: 0.12
Nodes (23): $type, $value, lg, sm, $type, $value, $type, $value (+15 more)

### Community 101 - "Zod Authentication Connections"
Cohesion: 0.43
Nodes (8): API Authentication Middleware, Application Shell and Theme, Backend Validation Security, Frontend Form Schemas, Project Build Configuration, Shared Static Dependency, Why Zod Connects API Authentication Middleware to Other Areas, Zod Dependency

### Community 102 - "Protected Route Schema Flow"
Cohesion: 0.43
Nodes (8): Application Shell and Theme, Backend API Validation Schemas, Frontend Zod Form Schemas, Node Project Build Configuration, Protected Resource Roles, Shared Import Bridge, Zod Dependency, Why Zod Connects Protected Resource Roles to Backend and Frontend Components

### Community 103 - "Oxlint Rule Configuration"
Cohesion: 0.25
Nodes (7): ignorePatterns, plugins, rules, react/incompatible-library, react/only-export-components, react/rules-of-hooks, $schema

### Community 106 - "SimpleRepository"
Cohesion: 0.16
Nodes (6): LivraisonInput, LivraisonRepository, LivraisonRow, mapLivraison(), Tables, SimpleRepository

### Community 107 - "Application Architecture README"
Cohesion: 0.38
Nodes (7): Autostrass, Drizzle Migrations, Drizzle ORM, MariaDB, React and Express Application, REST API, Vite Development Proxy

### Community 110 - "Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?, Source Nodes

### Community 111 - "parse_decision_rules"
Cohesion: 0.21
Nodes (5): apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action(), _check_reasoning_contract()

### Community 114 - "settingsStore.ts"
Cohesion: 0.10
Nodes (34): rateLimit(), createSettingsRouter(), output(), testDatabase(), publicHttpsSettings(), validateCertificate(), current, effectiveDatabaseSettings() (+26 more)

### Community 115 - "toNullableNumber"
Cohesion: 0.67
Nodes (3): optionalRef(), requiredRef(), toNullableNumber()

### Community 119 - "Drizzle Dependency Debugging"
Cohesion: 0.50
Nodes (4): Drizzle Dependency Debug Log, drizzle-kit 0.18.1, Drizzle Kit Upgrade Notice, drizzle-orm 0.45.3

### Community 120 - "Social Image Design Guidance"
Cohesion: 0.50
Nodes (4): HTML Screenshot Production Workflow, Social Image Platform Sizes, Safe Zones and Visual QA, Social Photos Design Guide

### Community 122 - "Extra Large Size Tokens"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 123 - "auth.ts"
Cohesion: 0.10
Nodes (41): drizzle-orm, express, zod, databaseSettings, db, hasDatabaseConfig, pool, UserRole (+33 more)

### Community 124 - "No Color Style Tokens"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

### Community 126 - "Stock Location Design Specification"
Cohesion: 0.50
Nodes (4): Stock by Location Design Specification, Authenticated Read-Only Locations API, Aisle Shelf and Slot Hierarchy, Non-Blocking Stock Location View

### Community 127 - "TypeScript Build Error Report"
Cohesion: 0.67
Nodes (3): Recorded TypeScript Build Errors, Missing Form Types and Components, React Hook Form Resolver Type Mismatches

### Community 128 - "Bibliothèque Figma Autostrass — découverte"
Cohesion: 0.20
Nodes (9): Bibliothèque Figma Autostrass — découverte, P0.a — Composants et conventions, P0.a — Sources et tokens, P0.a — Typographie et dimensions à préserver, P0.b–P0.f — Inspections et décisions en attente, Reprise et vérifications, Autostrass Design System Master, Accessibility and Responsive UI Rules (+1 more)

### Community 129 - "test-stock-transfer-validation.ts"
Cohesion: 0.18
Nodes (10): alias, explicitDestination, explicitNull, invalidCurrentField, maximum, motif, noDestination, omittedSource (+2 more)

### Community 130 - "Slide Visualization Guidelines"
Cohesion: 0.67
Nodes (3): Slides Design Reference, Chart.js Data Visualization, Presentation Design Tokens

### Community 131 - "UI Interaction State Tokens"
Cohesion: 0.67
Nodes (3): Focus States, Loading States, State Priority

### Community 135 - "simpleRepositories.ts"
Cohesion: 0.12
Nodes (16): errorHandler(), DATABASE_CONNECTION_ERROR_CODES, isDatabaseUnavailable(), toHttpError(), unwrap(), AnyIdColumn, AnyTable, Tables (+8 more)

### Community 137 - "primary-hover"
Cohesion: 0.67
Nodes (3): primary-hover, $type, $value

### Community 138 - "UI Styling Dependencies"
Cohesion: 0.67
Nodes (3): UI Styling Test Dependencies, UI Styling Script Requirements, UI Styling Test Requirements

### Community 158 - "test-french-validation-ui.mjs"
Cohesion: 0.25
Nodes (7): check(), checks, errors, invalid(), output, rows, writes

### Community 159 - "_palette_is_dark"
Cohesion: 0.18
Nodes (4): _palette_is_dark(), _relative_luminance(), TestEndToEndCoherence, TestLuminance

### Community 161 - "ref_node_assert"
Cohesion: 0.15
Nodes (9): vite@^8.3.5, @vitejs/plugin-react@^6.1.1, vite, @vitejs/plugin-react, checks, errors, fields, full (+1 more)

### Community 162 - "read_rows"
Cohesion: 0.19
Nodes (3): read_rows(), TestLandingAndStackContract, TestReasoningContract

### Community 163 - "test-client-numbers.ts"
Cohesion: 0.13
Nodes (8): client, Session, client, Session, clientPatchSchema, clientSchema, clientUpdateSchema, ApiClient

### Community 166 - "Inventaire physique par référence"
Cohesion: 0.29
Nodes (6): API, Concurrence et intégrité, Inventaire physique par référence, Migration et sauvegarde, Utilisation, Vérification reproductible

### Community 168 - "Revue CSS — 4 novembre 2026"
Cohesion: 0.15
Nodes (11): Captures, Correction Échap dans l'aperçu intégré, Création et modification des clients — 6 novembre 2026, Numéro de client, SIRET des professionnels, Vérification, Captures, Graphify et points de suivi (+3 more)

### Community 175 - "ring"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 177 - "split_values"
Cohesion: 0.47
Nodes (3): split_values(), style_identities(), TestStyleIdentityContract

### Community 181 - "Création et modification des fournisseurs — 6 novembre 2026"
Cohesion: 0.40
Nodes (4): Captures, Contrat, Création et modification des fournisseurs — 6 novembre 2026, Vérification reproductible

## Knowledge Gaps
- **101 isolated node(s):** `drizzle-kit 0.18.1`, `Drizzle Kit Upgrade Notice`, `drizzle-orm 0.45.3`, `RFC-5321`, `Banner Design Skill` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1239 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **52 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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

- **Why does `zod` connect `auth.ts` to `test-inventaires.ts`, `contracts.ts`, `dependencies`, `resourceRoutes.ts`, `Business Form Schemas`, `settingsStore.ts`, `main.tsx`, `package.json`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `TestTailwindConfigGenerator`) actually correct?**
  _`TailwindConfigGenerator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `drizzle-kit 0.18.1`, `Drizzle Kit Upgrade Notice`, `drizzle-orm 0.45.3` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shadcn Component Installer` be split into smaller, more focused modules?**
  _Cohesion score 0.053555750658472345 - nodes in this community are weakly interconnected._
- **Why does `mysql2` connect `test-environment.ts` to `archive-fiscal.ts`, `test-client-numbers.ts`, `test-inventaires.ts`, `dependencies`, `test-parametres.ts`, `settingsStore.ts`, `test-stock-transfers.ts`, `package.json`, `auth.ts`, `test-fournisseurs.ts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `scripts/core.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05563093622795115 - nodes in this community are weakly interconnected._
- **Why does `TailwindConfigGenerator` connect `Tailwind Theme Validation` to `Tailwind Config Write Tests`, `Tailwind Color Configuration`, `Tailwind Breakpoint Tests`, `Tailwind Plugin Configuration`, `.recommend_plugins`, `argparse`, `Tailwind Generator Defaults`, `.generate_config_string`, `Python Tooling Test Imports`, `Tailwind Font And Spacing Config`, `Tailwind Configuration Tests`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._