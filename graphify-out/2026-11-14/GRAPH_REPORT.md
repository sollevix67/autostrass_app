# Graph Report - autostrass_app  (2026-11-14)

## Corpus Check
- 344 files · ~409,904 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 64 file(s) not represented in the graph (top: .csv 53, .css 7, (none) 2)

## Summary
- 3006 nodes · 6087 edges · 188 communities (145 shown, 43 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 210 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e5f19075`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Shadcn Component Installer
- scripts/core.py
- validate_data.py
- InventaireView.tsx
- StockView.tsx
- test_core_data_quality.py
- Primitive Color Palette
- referentielRepositories.ts
- Cash Database Schema
- Accessibility (a11y)
- resourceRoutes.ts
- slide_search_core.py
- Document Data Repositories
- Design Skill References
- Business Form Schemas
- design_system.py
- Primitive Spacing Tokens
- UtilisateurRepository
- WCAG 2.2 Quick Reference
- Brand Asset Generators
- Accessibility Code Patterns
- csrf.ts
- Python Tooling Test Imports
- HTML Token Validation
- package.json
- server/index.ts
- Cash Register Repository
- CaisseView.tsx
- Tailwind Configuration Tests
- csv
- cip/generate.py
- complianceRoutes.ts
- HTML Slide Deck Generation
- Slide Background Image Generation
- NPM Build And Database Scripts
- Project Handoff Documentation
- Application TypeScript Configuration
- color
- test-caisse-ui.mjs
- sanitize.ts
- test_design_system_mode.py
- Brand And Design Guidelines
- ref_node_assert
- Repository Guidelines
- Visual Design Skill Guides
- Cash Compliance Verification
- Operable
- Node TypeScript Configuration
- referentielSettingsRoutes.ts
- Typography Scale Tokens
- API Security Integration Tests
- Brand Color Extraction
- Catalog Refresh Contract Tests
- Project Configuration — autostrass_app
- main.tsx
- Asset Validation CLI
- cip/core.py
- Web Stack Freshness Tests
- App.tsx
- UI UX Search CLI
- _style_is_dark_primary
- test_data_contracts.py
- Application Feature Roadmap
- Server TypeScript Configuration
- design-tokens-starter.json
- test-inventaires.ts
- Tailwind Breakpoint Tests
- TestDomainDetection
- Search Domain Tests
- dependencies
- Revue WCAG 2.2 — 13 novembre 2026
- Design Token Embedding Script
- Design Token Validation CLI
- card
- test-environment.ts
- Brand Context Injection
- Slide Copywriting Formulas
- Motion Duration Tokens
- pdfInvoice.ts
- contracts.ts
- Brand Token Synchronization
- CIP Style Taxonomy
- Design Token Code Generation
- test-caisse-ui.mjs
- Tailwind Font And Spacing Config
- Backend Zod Route Flow
- PdfmakeInstance
- test-stock-transfers.ts
- PRODUCT.md — Module Stock (autostrass)
- test-fournisseurs.ts
- logo/core.py
- Security Review Findings
- CIP Mockup Prompt Engineering
- HTML Slide Template
- FournisseursView.tsx
- Border Radius Tokens
- Zod Authentication Connections
- Protected Route Schema Flow
- Oxlint Rule Configuration
- Common ARIA patterns
- Understandable
- Application Architecture README
- react
- TailwindConfigGenerator
- Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?
- test-client-siret.ts
- Audit des fichiers inutiles — 13 novembre 2026
- _select_palette_for_mode
- settingsStore.ts
- review-accessibility-ui.mjs
- TestNativeDesktopStackFreshness
- slides-create.md
- button
- Social Image Design Guidance
- BM25
- Extra Large Size Tokens
- server/index.ts
- No Color Style Tokens
- Common issues by impact
- render-html.py
- Testing checklist
- Autostrass Design System Master
- search-slides.py
- Slide Visualization Guidelines
- UI Interaction State Tokens
- TestBm25CoreBehavior
- BM25
- mysql2
- BM25
- test-form-dialogs-ui.mjs
- test_design_system_mode.py
- UI Styling Dependencies
- input
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
- TestFixtureValidation
- Apache License Terms
- Favicon SVG Asset
- @vitejs/plugin-react
- parse_decision_rules
- CashCountFields.tsx
- Analyse de Microsoft TokenEconomizer
- overrides
- fondsCaisseSchema
- $type
- radius
- lg
- Inventaire physique par référence
- Revue CSS — 4 novembre 2026
- LivraisonsView.tsx
- sm
- TestTokenizer
- padding-y
- DesignSystemGenerator
- ring
- Clôture de caisse — 10 novembre 2026
- read_rows
- toNullableNumber
- 16
- 1
- Création et modification des fournisseurs — 6 novembre 2026
- 3
- 8
- destructive
- destructive-foreground
- muted
- primary-foreground
- secondary-foreground
- Comptage du fond de caisse à l'ouverture — 10 novembre 2026
- test-utilisateurs-ui.mjs
- venteSchema

## God Nodes (most connected - your core abstractions)
1. `TailwindConfigGenerator` - 58 edges
2. `react` - 47 edges
3. `toErrorMessage()` - 44 edges
4. `PageLayout()` - 43 edges
5. `Icon()` - 42 edges
6. `FormInput()` - 39 edges
7. `AppContent()` - 38 edges
8. `useToast()` - 37 edges
9. `useAuth()` - 36 edges
10. `TestTailwindConfigGenerator` - 35 edges

## Surprising Connections (you probably didn't know these)
- `Améliorations complémentaires` --references--> `readMessage()`  [INFERRED]
  specs/accessibilite-wcag-review.md → src/components/forms/ErrorSummary.tsx
- `Création et modification des clients — 6 novembre 2026` --references--> `useResource()`  [INFERRED]
  specs/client-modal.md → src/hooks/useResource.ts
- `Stockage et sauvegarde` --references--> `updatedAt()`  [INFERRED]
  specs/parametres.md → server/db/schema.ts
- `verify()` --calls--> `verifyFingerprints()`  [EXTRACTED]
  scripts/archive-fiscal.ts → server/middleware/compliance.ts
- `archive()` --calls--> `verifyFingerprints()`  [EXTRACTED]
  scripts/archive-fiscal.ts → server/middleware/compliance.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three-Layer Design Token Architecture** — _github_prompts_design_system_references_primitive_tokens_primitive_tokens, _github_prompts_design_system_references_semantic_tokens_semantic_tokens, _github_prompts_design_system_references_component_tokens_component_tokens [EXTRACTED 1.00]
- **Strategic HTML Slide Authoring** — github_prompts_slides_skill_slides_skill, github_prompts_slides_references_copywriting_formulas_copywriting_formulas, github_prompts_slides_references_layout_patterns_slide_layout_patterns, github_prompts_slides_references_html_template_html_slide_template, github_prompts_slides_references_slide_strategies_slide_strategies [EXTRACTED 1.00]
- **Social Image HTML Design and Screenshot QA Workflow** — github_prompts_design_references_social_photos_design_social_photos_design_guide, github_prompts_design_references_social_photos_design_html_screenshot_workflow, github_prompts_design_references_social_photos_design_safe_zones_visual_qa, github_prompts_design_references_social_photos_design_platform_image_sizes [EXTRACTED 1.00]
- **UI Styling Component, Utility, and Canvas Layers** — github_prompts_ui_styling_skill_ui_styling_skill, github_prompts_ui_styling_skill_component_layer, github_prompts_ui_styling_skill_tailwind_styling_layer, github_prompts_ui_styling_skill_canvas_visual_layer [EXTRACTED 1.00]

## Communities (188 total, 43 thin omitted)

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
Cohesion: 0.12
Nodes (31): remove(), save(), useEmplacements(), useRemoteValue(), Referentiel, toErrorMessage(), Comptage(), ComptageForm() (+23 more)

### Community 4 - "StockView.tsx"
Cohesion: 0.07
Nodes (46): AuthContext, AuthContextValue, AuthStatus, SessionUser, AuthProvider(), toAuthError(), EMPTY_ARTICLE, SEED_ARTICLES (+38 more)

### Community 5 - "test_core_data_quality.py"
Cohesion: 0.13
Nodes (11): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, _check_typography_contract(), _configured_font_names(), contrast_ratio() (+3 more)

### Community 6 - "Primitive Color Palette"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 7 - "referentielRepositories.ts"
Cohesion: 0.05
Nodes (35): errorHandler(), LivraisonInput, LivraisonRepository, LivraisonRow, mapLivraison(), Tables, DATABASE_CONNECTION_ERROR_CODES, isDatabaseUnavailable() (+27 more)

### Community 8 - "Cash Database Schema"
Cohesion: 0.04
Nodes (65): ArticleRef, CASH_BREAK_DENOMINATIONS, CASH_MOVEMENT_TYPES, CASH_SESSION_STATUSES, CashBreakDenomination, cashMovements, cashMovementsRelations, CashMovementType (+57 more)

### Community 9 - "Accessibility (a11y)"
Cohesion: 0.17
Nodes (12): Accessibility (a11y), ARIA usage (4.1.2), Color contrast (1.4.3, 1.4.6), Conformance levels, Evidence-led audit workflow, Live regions (4.1.3), Media alternatives (1.2), Perceivable (+4 more)

### Community 10 - "resourceRoutes.ts"
Cohesion: 0.05
Nodes (57): RFC-5321, CLIENT_TYPES, DELIVERY_STATUSES, ORDER_STATUSES, PAYMENT_MODES, USER_ROLES, VEHICLE_STATUSES, VEHICLE_TYPES (+49 more)

### Community 11 - "slide_search_core.py"
Cohesion: 0.13
Nodes (11): calculate_pattern_break(), detect_domain(), get_background_config(), get_color_for_emotion(), get_layout_for_goal(), get_typography_for_slide(), _load_csv(), _load_decision_csv() (+3 more)

### Community 12 - "Document Data Repositories"
Cohesion: 0.09
Nodes (27): clients, commandes, leaked, livraisons, receptions, retours, users, vehicules (+19 more)

### Community 13 - "Design Skill References"
Cohesion: 0.06
Nodes (35): AIDA PAS and FAB Copywriting, Before-After-Bridge Formula, Slide Copywriting Formulas, Cost of Inaction Formula, Create Slide Prompt, HTML Slide Template, HTML Presentation Structure, Slide Layout Patterns (+27 more)

### Community 14 - "Business Form Schemas"
Cohesion: 0.04
Nodes (40): ArticleFormOutput, ArticleFormValues, articleSchema, CaisseClotureFormOutput, caisseClotureSchema, CaisseOuvertureFormOutput, CaisseOuvertureFormValues, CartLineFormOutput (+32 more)

### Community 15 - "design_system.py"
Cohesion: 0.07
Nodes (15): ansi_ljust(), _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides() (+7 more)

### Community 16 - "Primitive Spacing Tokens"
Cohesion: 0.09
Nodes (22): $type, $value, $type, $value, $type, $value, $type, $value (+14 more)

### Community 18 - "WCAG 2.2 Quick Reference"
Cohesion: 0.18
Nodes (8): Level A (minimum), Level AA (standard), Level AAA (enhanced), Sources, Success criteria by level, Testing tools, WCAG 2.2 Quick Reference, What changed from 2.1 to 2.2

### Community 19 - "Brand Asset Generators"
Cohesion: 0.10
Nodes (13): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+5 more)

### Community 20 - "Accessibility Code Patterns"
Cohesion: 0.22
Nodes (9): Accessibility Code Patterns, ARIA tabs, Dragging movements, Error handling, Form labels, Live regions and notifications, Modal focus trap, Screen reader commands (+1 more)

### Community 21 - "csrf.ts"
Cohesion: 0.17
Nodes (14): Bucket, bucketKey(), buckets, clientKey(), CSRF_HEADER, generateCsrfToken(), issueCsrfCookie(), prune() (+6 more)

### Community 22 - "Python Tooling Test Imports"
Cohesion: 0.10
Nodes (6): test_sync_parses_bundled_starter_template(), main(), _run(), test_flags_hardcoded_hex_sharing_line_with_token(), test_token_only_line_reports_no_violation(), TestDiagnosticsContracts

### Community 23 - "HTML Token Validation"
Cohesion: 0.13
Nodes (12): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+4 more)

### Community 24 - "package.json"
Cohesion: 0.08
Nodes (33): allowScripts, esbuild@0.28.2, devDependencies, concurrently@^10.0.5, drizzle-kit@^0.31.11, oxlint@^1.81.0, playwright@^1.65.0, selfsigned@^5.5.0 (+25 more)

### Community 25 - "server/index.ts"
Cohesion: 0.09
Nodes (26): express, app, emptyDashboard, frontendPath, LowStockItem, port, rateLimit(), securityHeaders() (+18 more)

### Community 26 - "Cash Register Repository"
Cohesion: 0.16
Nodes (10): CashBreak, CashCountRow, CashMovementRow, CashRegisterRepository, CashSessionRow, round2(), Tables, toDecimal() (+2 more)

### Community 27 - "CaisseView.tsx"
Cohesion: 0.10
Nodes (25): CashCountFields(), FormTextarea(), useCashMovements(), CARRIER_OPTIONS, CASH_DENOMINATIONS, CASH_MOVEMENT_LABELS, CLIENT_TYPE_OPTIONS, DELIVERY_STATUS_OPTIONS (+17 more)

### Community 29 - "csv"
Cohesion: 0.06
Nodes (6): TestMetricMath, TestThresholdGate, read_rows(), read_rows(), TestTextLayoutDataContracts, TestTextLayoutRetrieval

### Community 30 - "cip/generate.py"
Cohesion: 0.18
Nodes (7): build_cip_prompt(), check_logo_required(), generate_cip_set(), generate_with_nano_banana(), load_env(), load_logo_image(), main()

### Community 31 - "complianceRoutes.ts"
Cohesion: 0.29
Nodes (6): archive(), hasConfig, verify(), fingerprintVente(), GENESIS_HASH, verifyFingerprints()

### Community 32 - "HTML Slide Deck Generation"
Cohesion: 0.13
Nodes (11): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+3 more)

### Community 33 - "Slide Background Image Generation"
Cohesion: 0.16
Nodes (9): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+1 more)

### Community 34 - "NPM Build And Database Scripts"
Cohesion: 0.07
Nodes (29): scripts, build, caisse:diagnostic, db:generate, db:migrate, db:seed, db:studio, dev (+21 more)

### Community 35 - "Project Handoff Documentation"
Cohesion: 0.17
Nodes (20): API and Security Test Suites, Authentication and Role-Based Access Control, Autostrass Project Handoff, Autostrass Roadmap, Cash Session Management, Centralized HTTP Client, Customer and Supplier Address Books, Database Migrations (+12 more)

### Community 36 - "Application TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 37 - "color"
Cohesion: 0.11
Nodes (19): $type, $value, background, foreground, muted-foreground, primary, primary-hover, secondary (+11 more)

### Community 38 - "test-caisse-ui.mjs"
Cohesion: 0.12
Nodes (9): checks, denominations, errors, openingOutput, openingWrites, output, settingsOutput, settingsWrites (+1 more)

### Community 39 - "sanitize.ts"
Cohesion: 0.10
Nodes (19): bodySchema, findMarkupInjection(), INJECTION_COUNTS, INJECTION_PATTERNS, InjectionKind, normalizeText(), reportInjection(), sanitizeEnum() (+11 more)

### Community 40 - "test_design_system_mode.py"
Cohesion: 0.18
Nodes (4): _palette_is_dark(), _relative_luminance(), TestEndToEndCoherence, TestLuminance

### Community 41 - "Brand And Design Guidelines"
Cohesion: 0.17
Nodes (15): Asset Approval Checklist, Asset Organization Guide, Brand Guidelines Template, Color Palette Management, Brand Consistency Checklist, Logo Usage Rules, Messaging Framework, Typography Specifications (+7 more)

### Community 42 - "ref_node_assert"
Cohesion: 0.06
Nodes (23): vite@^8.3.5, vite, checks, errors, fields, initial, output, databaseUnavailable (+15 more)

### Community 43 - "Repository Guidelines"
Cohesion: 0.22
Nodes (8): Build, Test, and Development Commands, Coding Style & Naming Conventions, Commit & Pull Request Guidelines, Langue des réponses, Project Structure & Module Organization, Repository Guidelines, Security & Configuration Tips, Testing Guidelines

### Community 44 - "Visual Design Skill Guides"
Cohesion: 0.13
Nodes (17): Banner Sizes and Styles, CIP Deliverable Guide, CIP Design, Design Routing, Icon Design, Logo Color Psychology, Logo Design, Logo Prompt Engineering (+9 more)

### Community 45 - "Cash Compliance Verification"
Cohesion: 0.12
Nodes (14): apres, avant, carte, CashSession, cloture, comptageExact, courante, login (+6 more)

### Community 46 - "Operable"
Cohesion: 0.22
Nodes (9): Dragging movements (2.5.7) — new in 2.2, Focus not obscured (2.4.11) — new in 2.2, Focus visible (2.4.7), Keyboard accessible (2.1), Motion (2.3), Operable, Skip links (2.4.1), Target size (2.5.8) — new in 2.2 (+1 more)

### Community 47 - "Node TypeScript Configuration"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 48 - "referentielSettingsRoutes.ts"
Cohesion: 0.13
Nodes (12): drizzle-orm, databaseSettings, db, hasDatabaseConfig, pool, Input, listTva(), ParametreRepository (+4 more)

### Community 49 - "Typography Scale Tokens"
Cohesion: 0.12
Nodes (16): $type, $value, $type, $value, $type, $value, $type, $value (+8 more)

### Community 51 - "API Security Integration Tests"
Cohesion: 0.13
Nodes (13): adminId, clientId, clientPourAvoir, csrfFromCookie(), fuite, login(), metiers, nouveauClient (+5 more)

### Community 52 - "Brand Color Extraction"
Cohesion: 0.20
Nodes (11): calculateCompliance(), colorDistance(), displayPalette(), extractHexColors(), findNearestBrandColor(), fs, generateImageMagickCommand(), hexToRgb() (+3 more)

### Community 54 - "Project Configuration — autostrass_app"
Cohesion: 0.22
Nodes (8): Configuration Precedence, Existing Custom Skills, Installation, npm Scripts, oh-my-claudecode Usage, Project, Project Configuration — autostrass_app, Project Structure

### Community 55 - "main.tsx"
Cohesion: 0.23
Nodes (10): react-dom@^19.2.8, react-dom, removeFrenchValidation, FormControl, installFrenchValidation(), clear(), clearForm(), translate() (+2 more)

### Community 56 - "Asset Validation CLI"
Cohesion: 0.25
Nodes (13): checkManifest(), formatBytes(), formatOutput(), fs, main(), parseFilename(), path, RULES (+5 more)

### Community 57 - "cip/core.py"
Cohesion: 0.18
Nodes (6): detect_domain(), get_cip_brief(), _load_csv(), search(), search_all(), _search_csv()

### Community 60 - "App.tsx"
Cohesion: 0.08
Nodes (46): react-router-dom, App(), AppContent(), getStoredTheme(), getSystemTheme(), initials(), navigation, roleLabel() (+38 more)

### Community 61 - "UI UX Search CLI"
Cohesion: 0.21
Nodes (11): args, DATA, domainIndex, DOMAINS, limitIndex, parseCsv(), results, ROOT (+3 more)

### Community 62 - "_style_is_dark_primary"
Cohesion: 0.12
Nodes (5): _query_wants_dark(), _resolve_color_mode(), _style_is_dark_primary(), TestModeResolution, TestStyleTaxonomy

### Community 63 - "test_data_contracts.py"
Cohesion: 0.47
Nodes (3): split_values(), style_identities(), TestStyleIdentityContract

### Community 64 - "Application Feature Roadmap"
Cohesion: 0.20
Nodes (14): Application Settings, Autostrass Initial Requirements, Cash Register, Customer Address Book, Customer Orders, Customer Returns, Deliveries, Personnel (+6 more)

### Community 65 - "Server TypeScript Configuration"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleResolution, noEmit, noUnusedLocals, noUnusedParameters, skipLibCheck (+5 more)

### Community 66 - "design-tokens-starter.json"
Cohesion: 0.15
Nodes (12): component, $type, $value, dark, semantic, $schema, $type, $value (+4 more)

### Community 67 - "test-inventaires.ts"
Cohesion: 0.13
Nodes (10): Session, AuthenticatedUser, InventaireRepository, mapInventaire(), InventaireInput, inventaireSchema, MAX_STOCK, quantite (+2 more)

### Community 71 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, bcryptjs@^3.0.3, body-parser@^2.4.0, dotenv@^18.0.1, drizzle-orm@^0.45.3, express@^5.3.0, @hookform/resolvers@^5.9.1, jose@^6.2.12 (+8 more)

### Community 72 - "Revue WCAG 2.2 — 13 novembre 2026"
Cohesion: 0.14
Nodes (13): A11Y-01 — Le résumé d'erreurs reprend le focus pendant la saisie, A11Y-02 — Le tri des tableaux est inaccessible au clavier, A11Y-03 — Le toast d'erreur est exclu de l'arbre d'accessibilité, A11Y-04 — Le menu mobile masque le focus, A11Y-05 — Les erreurs de référentiels perdent l'identité du champ, A11Y-06 — Les données du compte connecté manquent de finalité déclarée, A11Y-07 — Le titre du document reste identique sur toutes les vues, Améliorations complémentaires (+5 more)

### Community 73 - "Design Token Embedding Script"
Cohesion: 0.17
Nodes (8): args, fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath, wrapStyle

### Community 74 - "Design Token Validation CLI"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 75 - "card"
Cohesion: 0.20
Nodes (12): $type, $value, bg, bg, padding, shadow, card, bg (+4 more)

### Community 76 - "test-environment.ts"
Cohesion: 0.18
Nodes (13): splitDrizzleKitStatements(), splitStatements(), createTestEnvironment(), applyFixture(), close(), restartApi(), runScript(), startProcess() (+5 more)

### Community 77 - "Brand Context Injection"
Cohesion: 0.31
Nodes (10): extractColorsFromTable(), extractCoreAttributes(), extractHexColors(), extractImageStyle(), extractTypography(), extractVoice(), fs, generatePromptAddition() (+2 more)

### Community 78 - "Slide Copywriting Formulas"
Cohesion: 0.24
Nodes (11): AIDA, Before-After-Bridge, Contrast Patterns, Copywriting Formulas, Cost of Inaction, FAB, Formula-to-Slide Mapping, Headline Patterns (+3 more)

### Community 79 - "Motion Duration Tokens"
Cohesion: 0.20
Nodes (10): fast, normal, slow, $type, $value, $type, $value, duration (+2 more)

### Community 80 - "pdfInvoice.ts"
Cohesion: 0.14
Nodes (13): pdfmake@^0.3.11, pdfmake, server, vente, warnings, allowedFontFiles, ClientForPdf, fontsDef (+5 more)

### Community 81 - "contracts.ts"
Cohesion: 0.08
Nodes (32): CashState, useCashSession(), cache, CacheEntry, fetchOnce(), useClientOptions(), useCommandeOptions(), useReferential() (+24 more)

### Community 83 - "Brand Token Synchronization"
Cohesion: 0.29
Nodes (8): adjustBrightness(), { execFileSync }, extractColorsFromMarkdown(), fs, generateColorScale(), main(), path, updateDesignTokens()

### Community 84 - "CIP Style Taxonomy"
Cohesion: 0.27
Nodes (10): Bold Dynamic, CIP Design Style Guide, Classic Traditional, Color Psychology, Corporate Minimal, Fresh Modern, Luxury Premium, Modern Tech (+2 more)

### Community 85 - "Design Token Code Generation"
Cohesion: 0.36
Nodes (9): flattenTokens(), fs, generateCSS(), generateTailwind(), main(), parseArgs(), path, resolveReference() (+1 more)

### Community 86 - "test-caisse-ui.mjs"
Cohesion: 0.08
Nodes (21): settings(), updatedAt(), Comportement, Formulaires en fenêtres contextuelles — 10 novembre 2026, Validation reproductible, Administration des paramètres, API, Cloudflare Turnstile (+13 more)

### Community 88 - "Backend Zod Route Flow"
Cohesion: 0.38
Nodes (10): How Backend Zod Schemas Connect to Protected Routes, Backend Zod Schemas, Body Parser, Create API Router, CRUD Routes, Document Routes, Resource Routes, Role Guard (+2 more)

### Community 89 - "PdfmakeInstance"
Cohesion: 0.22
Nodes (3): pdfmake, PdfmakeInstance, PdfmakeOutput

### Community 90 - "test-stock-transfers.ts"
Cohesion: 0.07
Nodes (20): alias, explicitDestination, explicitNull, invalidCurrentField, maximum, motif, noDestination, omittedSource (+12 more)

### Community 91 - "PRODUCT.md — Module Stock (autostrass)"
Cohesion: 0.25
Nodes (7): Ce qui fonctionne bien (à conserver), Ce qui ne va pas / à améliorer, Contraintes techniques, Objectif produit, PRODUCT.md — Module Stock (autostrass), Surface visuelle, Utilisateurs cibles

### Community 92 - "test-fournisseurs.ts"
Cohesion: 0.13
Nodes (12): empty, full, optionalFields, Session, sanitizeCode(), clientBodySchema, fournisseurBodySchema, fournisseurPatchSchema (+4 more)

### Community 93 - "logo/core.py"
Cohesion: 0.23
Nodes (5): detect_domain(), _load_csv(), search(), search_all(), _search_csv()

### Community 94 - "Security Review Findings"
Cohesion: 0.33
Nodes (9): Bootstrap and Migration Consistency, Cash Session Ownership Check, Concurrent Cash Closure, Hierarchical Location Mapping, Open Session Diagnostic, Security and Reliability Review, Seed Location Join Integrity, Test Database Verification (+1 more)

### Community 95 - "CIP Mockup Prompt Engineering"
Cohesion: 0.11
Nodes (17): Apparel (Polo/T-Shirt), Base Prompt Structure, Business Card, CIP Mockup Prompt Engineering, Context Modifiers, Corporate Minimal, Deliverable-Specific Modifiers, Letterhead (+9 more)

### Community 96 - "HTML Slide Template"
Cohesion: 0.32
Nodes (8): Chart.js Integration, Design Tokens, HTML Slide Template, Mobile Breakpoints, Progress Bar, Responsive 16:9 Slide Deck, Slide Content Wrapper, Slide Navigation

### Community 97 - "FournisseursView.tsx"
Cohesion: 0.18
Nodes (12): buildItems(), ErrorItem, ErrorRecord, ErrorSummary(), ErrorSummaryProps, FormCheckbox(), byNom(), EMPTY_FOURNISSEUR (+4 more)

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

### Community 105 - "Common ARIA patterns"
Cohesion: 0.25
Nodes (8): Buttons, Common ARIA patterns, Error states, Form fields, Links, Live regions, Modals, Navigation

### Community 106 - "Understandable"
Cohesion: 0.25
Nodes (8): Accessible authentication (3.3.8) — new in 2.2, Consistent help (3.2.6) — new in 2.2, Consistent navigation (3.2.3), Error handling (3.3.1, 3.3.3), Form labels (3.3.2), Page language (3.1.1), Redundant entry (3.3.7) — new in 2.2, Understandable

### Community 107 - "Application Architecture README"
Cohesion: 0.38
Nodes (7): Autostrass, Drizzle Migrations, Drizzle ORM, MariaDB, React and Express Application, REST API, Vite Development Proxy

### Community 108 - "react"
Cohesion: 0.09
Nodes (25): react, initial, levels, CheckboxProps, CommonProps, FieldRegistration, InputProps, RegisterOptions (+17 more)

### Community 110 - "Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?, Source Nodes

### Community 111 - "test-client-siret.ts"
Cohesion: 0.12
Nodes (8): client, Session, client, Session, input(), clientPatchSchema, clientSchema, clientUpdateSchema

### Community 112 - "Audit des fichiers inutiles — 13 novembre 2026"
Cohesion: 0.25
Nodes (7): Archivage et suppression, Audit des fichiers inutiles — 13 novembre 2026, Fichiers archivés puis supprimés, Fichiers locaux hors Git, Sauvegardes et artefacts à rationaliser, Vérifications, À conserver ou à confirmer

### Community 113 - "_select_palette_for_mode"
Cohesion: 0.22
Nodes (4): _contrast_ratio(), _derive_dark_palette(), _select_palette_for_mode(), TestPaletteSelection

### Community 114 - "settingsStore.ts"
Cohesion: 0.09
Nodes (31): ApiParametres, Session, createSettingsRouter(), output(), testDatabase(), publicHttpsSettings(), validateCertificate(), current (+23 more)

### Community 115 - "review-accessibility-ui.mjs"
Cohesion: 0.11
Nodes (14): article, category, client, collections, commande, dialogs, emplacement, line (+6 more)

### Community 119 - "button"
Cohesion: 0.20
Nodes (10): fg, font-size, hover-bg, button, $type, $value, $type, $value (+2 more)

### Community 120 - "Social Image Design Guidance"
Cohesion: 0.50
Nodes (4): HTML Screenshot Production Workflow, Social Image Platform Sizes, Safe Zones and Visual QA, Social Photos Design Guide

### Community 122 - "Extra Large Size Tokens"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 123 - "server/index.ts"
Cohesion: 0.12
Nodes (39): zod, UserRole, AUTH_COOKIE, authenticate(), AuthenticatedRequest, AuthError, hashPassword(), issueToken() (+31 more)

### Community 124 - "No Color Style Tokens"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

### Community 125 - "Common issues by impact"
Cohesion: 0.50
Nodes (4): Common issues by impact, Critical (fix immediately), Moderate (fix soon), Serious (fix before launch)

### Community 126 - "render-html.py"
Cohesion: 0.10
Nodes (9): generate_html(), get_deliverable_info(), get_image_base64(), main(), format_brief(), format_results(), main(), format_output() (+1 more)

### Community 127 - "Testing checklist"
Cohesion: 0.67
Nodes (3): Automated testing, Manual testing, Testing checklist

### Community 128 - "Autostrass Design System Master"
Cohesion: 0.67
Nodes (3): Autostrass Design System Master, Accessibility and Responsive UI Rules, Dense Blue and Amber Dashboard Design

### Community 129 - "search-slides.py"
Cohesion: 0.27
Nodes (5): format_context(), format_result(), main(), search(), search_all()

### Community 130 - "Slide Visualization Guidelines"
Cohesion: 0.67
Nodes (3): Slides Design Reference, Chart.js Data Visualization, Presentation Design Tokens

### Community 131 - "UI Interaction State Tokens"
Cohesion: 0.67
Nodes (3): Focus States, Loading States, State Priority

### Community 134 - "mysql2"
Cohesion: 0.16
Nodes (11): dotenv, mysql2, normalized, raw, statements, hasDatabaseConfig, list, SEED_FILES (+3 more)

### Community 136 - "test-form-dialogs-ui.mjs"
Cohesion: 0.25
Nodes (4): checks, errors, output, scenarios

### Community 138 - "UI Styling Dependencies"
Cohesion: 0.67
Nodes (3): UI Styling Test Dependencies, UI Styling Script Requirements, UI Styling Test Requirements

### Community 139 - "input"
Cohesion: 0.29
Nodes (8): padding-x, input, $type, $value, focus-ring, padding-x, $type, $value

### Community 155 - "parse_decision_rules"
Cohesion: 0.20
Nodes (4): apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action()

### Community 156 - "CashCountFields.tsx"
Cohesion: 0.33
Nodes (5): CashCountFieldsProps, formatDenomination(), CaisseClotureFormValues, comptageLineSchema, CashCountLine

### Community 157 - "Analyse de Microsoft TokenEconomizer"
Cohesion: 0.13
Nodes (13): Analyse de Microsoft TokenEconomizer, Avis, Compatibilité et limites utiles à Autostrass, Données et appels externes, Fonctionnement constaté, Résultats : ce qu'ils permettent de conclure, Vérification et proposition d'essai, Commandes de contrôle (+5 more)

### Community 162 - "fondsCaisseSchema"
Cohesion: 0.50
Nodes (5): caisseOuvertureComptageSchema(), caisseOuvertureSchema(), optionalText(), fondsCaisseSchema(), totalCashCount()

### Community 163 - "$type"
Cohesion: 0.60
Nodes (5): $type, $value, border, border, border

### Community 164 - "radius"
Cohesion: 0.60
Nodes (5): radius, radius, radius, $type, $value

### Community 165 - "lg"
Cohesion: 0.60
Nodes (5): lg, $type, $value, lg, lg

### Community 166 - "Inventaire physique par référence"
Cohesion: 0.18
Nodes (10): API, Concurrence et intégrité, Inventaire physique par référence, Migration et sauvegarde, Utilisation, Vérification reproductible, Stock by Location Design Specification, Authenticated Read-Only Locations API (+2 more)

### Community 168 - "Revue CSS — 4 novembre 2026"
Cohesion: 0.15
Nodes (11): Captures, Correction Échap dans l'aperçu intégré, Création et modification des clients — 6 novembre 2026, Numéro de client, SIRET des professionnels, Vérification, Captures, Graphify et points de suivi (+3 more)

### Community 169 - "LivraisonsView.tsx"
Cohesion: 0.09
Nodes (67): @hookform/resolvers, react-hook-form, ConfirmDialog(), ConfirmDialogProps, ColumnDef, compare(), DataTable(), DataTableProps (+59 more)

### Community 170 - "sm"
Cohesion: 0.60
Nodes (5): sm, sm, sm, $type, $value

### Community 173 - "padding-y"
Cohesion: 0.67
Nodes (4): padding-y, padding-y, $type, $value

### Community 174 - "DesignSystemGenerator"
Cohesion: 0.13
Nodes (3): DesignSystemGenerator, _resolve_dial(), TestReasoningMatch

### Community 175 - "ring"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 176 - "Clôture de caisse — 10 novembre 2026"
Cohesion: 0.50
Nodes (3): Clôture de caisse — 10 novembre 2026, Utilisation, Vérification reproductible

### Community 177 - "read_rows"
Cohesion: 0.20
Nodes (3): read_rows(), TestLandingAndStackContract, TestReasoningContract

### Community 178 - "toNullableNumber"
Cohesion: 0.67
Nodes (3): optionalRef(), requiredRef(), toNullableNumber()

### Community 179 - "16"
Cohesion: 0.67
Nodes (3): $type, $value, 16

### Community 180 - "1"
Cohesion: 0.67
Nodes (3): $type, $value, 1

### Community 181 - "Création et modification des fournisseurs — 6 novembre 2026"
Cohesion: 0.40
Nodes (4): Captures, Contrat, Création et modification des fournisseurs — 6 novembre 2026, Vérification reproductible

### Community 182 - "3"
Cohesion: 0.67
Nodes (3): $type, $value, 3

### Community 183 - "8"
Cohesion: 0.67
Nodes (3): $type, $value, 8

### Community 184 - "destructive"
Cohesion: 0.67
Nodes (3): destructive, $type, $value

### Community 185 - "destructive-foreground"
Cohesion: 0.67
Nodes (3): destructive-foreground, $type, $value

### Community 186 - "muted"
Cohesion: 0.67
Nodes (3): muted, $type, $value

### Community 187 - "primary-foreground"
Cohesion: 0.67
Nodes (3): primary-foreground, $type, $value

### Community 188 - "secondary-foreground"
Cohesion: 0.67
Nodes (3): secondary-foreground, $type, $value

### Community 190 - "test-utilisateurs-ui.mjs"
Cohesion: 0.20
Nodes (5): checks, errors, output, email(), handleSubmit()

## Knowledge Gaps
- **91 isolated node(s):** `RFC-5321`, `Banner Design Skill`, `Documentation Workflow and Formats`, `Code Documenter Skill`, `Structured Code Review and OWASP Top 10` (+86 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1366 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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

- **Why does `zod` connect `server/index.ts` to `test-inventaires.ts`, `dependencies`, `resourceRoutes.ts`, `react`, `Business Form Schemas`, `settingsStore.ts`, `main.tsx`, `package.json`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `TestTailwindConfigGenerator`) actually correct?**
  _`TailwindConfigGenerator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-5321`, `Banner Design Skill`, `Documentation Workflow and Formats` to the rest of the system?**
  _91 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shadcn Component Installer` be split into smaller, more focused modules?**
  _Cohesion score 0.053555750658472345 - nodes in this community are weakly interconnected._
- **Why does `ShadcnInstaller` connect `Shadcn Component Installer` to `Python Tooling Test Imports`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Should `scripts/core.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05563093622795115 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `NPM Build And Database Scripts` to `package.json`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._