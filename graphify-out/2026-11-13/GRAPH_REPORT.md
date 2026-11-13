# Graph Report - autostrass_app  (2026-11-10)

## Corpus Check
- 339 files · ~410,974 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 64 file(s) not represented in the graph (top: .csv 53, .css 7, (none) 2)

## Summary
- 2918 nodes · 5990 edges · 172 communities (127 shown, 45 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 211 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f1d4b3a2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Shadcn Component Installer
- scripts/core.py
- validate_data.py
- InventaireView.tsx
- toRepositoryError
- test-inventaire-ui.mjs
- Primitive Color Palette
- referentielRepositories.ts
- Cash Database Schema
- schemas/parametres.ts
- resourceRoutes.ts
- slide_search_core.py
- Document Data Repositories
- Design Skill References
- Business Form Schemas
- design_system.py
- Primitive Spacing Tokens
- SimpleRepository
- test_text_layout_resilience.py
- Brand Asset Generators
- seed.ts
- Python Tooling Test Imports
- HTML Token Validation
- package.json
- server/index.ts
- Cash Register Repository
- toErrorMessage
- Tailwind Configuration Tests
- test_relevance_evaluator.py
- react
- test-environment.ts
- HTML Slide Deck Generation
- Slide Background Image Generation
- NPM Build And Database Scripts
- Project Handoff Documentation
- Application TypeScript Configuration
- color
- TestNativeDesktopStackFreshness
- sanitize.ts
- Brand And Design Guidelines
- test-french-validation-ui.mjs
- Repository Guidelines
- Visual Design Skill Guides
- Cash Compliance Verification
- CaisseView.tsx
- Node TypeScript Configuration
- cip/generate.py
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
- drizzle-kit
- Design Token Embedding Script
- Design Token Validation CLI
- button
- createTestEnvironment
- Brand Context Injection
- Slide Copywriting Formulas
- Motion Duration Tokens
- pdfInvoice.ts
- LivraisonsView.tsx
- Brand Token Synchronization
- CIP Style Taxonomy
- Design Token Code Generation
- test-caisse-ui.mjs
- Backend Zod Route Flow
- PdfmakeInstance
- render-html.py
- PRODUCT.md — Module Stock (autostrass)
- test-fournisseurs.ts
- logo/core.py
- Security Review Findings
- CIP Mockup Prompt Engineering
- HTML Slide Template
- contracts.ts
- Border Radius Tokens
- Zod Authentication Connections
- Protected Route Schema Flow
- Oxlint Rule Configuration
- primary-hover
- test-fournisseurs-ui.mjs
- Application Architecture README
- InventaireView.tsx
- Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?
- test-client-siret.ts
- matches
- settingsStore.ts
- _resolve_dial
- _filter_anti_patterns_for_mode
- slides-create.md
- Drizzle Dependency Debugging
- Social Image Design Guidance
- Extra Large Size Tokens
- auth.ts
- No Color Style Tokens
- verify-repositories.ts
- TypeScript Build Error Report
- Bibliothèque Figma Autostrass — découverte
- test-caisse-ui.mjs
- Slide Visualization Guidelines
- UI Interaction State Tokens
- TestStyleTaxonomy
- auth.ts
- simpleRepositories.ts
- test-stock-transfers.ts
- read_rows
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
- ref_node_assert
- test-utilisateurs-ui.mjs
- test_design_system_mode.py
- test_data_contracts.py
- read_rows
- test-clients-ui.mjs
- Inventaire physique par référence
- logo/search.py
- Revue CSS — 4 novembre 2026
- FournisseursView.tsx
- test_core.py
- ring
- Clôture de caisse — 10 novembre 2026
- fondsCaisseSchema
- Création et modification des fournisseurs — 6 novembre 2026
- Comptage du fond de caisse à l'ouverture — 10 novembre 2026
- toNullableNumber
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
- `Comportement` --references--> `FormDialog()`  [INFERRED]
  specs/formulaires-modaux.md → src/components/FormDialog.tsx
- `Création et modification des clients — 6 novembre 2026` --references--> `useResource()`  [INFERRED]
  specs/client-modal.md → src/hooks/useResource.ts
- `Cloudflare Turnstile` --references--> `settings()`  [INFERRED]
  specs/parametres.md → scripts/test-caisse-ui.mjs
- `Stockage et sauvegarde` --references--> `updatedAt()`  [INFERRED]
  specs/parametres.md → server/db/schema.ts
- `verify()` --calls--> `verifyFingerprints()`  [EXTRACTED]
  scripts/archive-fiscal.ts → server/middleware/compliance.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three-Layer Design Token Architecture** — _github_prompts_design_system_references_primitive_tokens_primitive_tokens, _github_prompts_design_system_references_semantic_tokens_semantic_tokens, _github_prompts_design_system_references_component_tokens_component_tokens [EXTRACTED 1.00]
- **Strategic HTML Slide Authoring** — github_prompts_slides_skill_slides_skill, github_prompts_slides_references_copywriting_formulas_copywriting_formulas, github_prompts_slides_references_layout_patterns_slide_layout_patterns, github_prompts_slides_references_html_template_html_slide_template, github_prompts_slides_references_slide_strategies_slide_strategies [EXTRACTED 1.00]
- **Social Image HTML Design and Screenshot QA Workflow** — github_prompts_design_references_social_photos_design_social_photos_design_guide, github_prompts_design_references_social_photos_design_html_screenshot_workflow, github_prompts_design_references_social_photos_design_safe_zones_visual_qa, github_prompts_design_references_social_photos_design_platform_image_sizes [EXTRACTED 1.00]
- **UI Styling Component, Utility, and Canvas Layers** — github_prompts_ui_styling_skill_ui_styling_skill, github_prompts_ui_styling_skill_component_layer, github_prompts_ui_styling_skill_tailwind_styling_layer, github_prompts_ui_styling_skill_canvas_visual_layer [EXTRACTED 1.00]

## Communities (172 total, 45 thin omitted)

### Community 0 - "Shadcn Component Installer"
Cohesion: 0.05
Nodes (3): main(), ShadcnInstaller, TestShadcnInstaller

### Community 1 - "scripts/core.py"
Cohesion: 0.06
Nodes (31): BM25, _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature() (+23 more)

### Community 2 - "validate_data.py"
Cohesion: 0.11
Nodes (30): _catalog_date(), _check_app_interface_contract(), _check_catalog_contract(), _check_catalog_summary(), _check_chart_contract(), _check_color_contract(), _check_core_data_contract(), _check_file() (+22 more)

### Community 3 - "InventaireView.tsx"
Cohesion: 0.18
Nodes (21): compare(), DataTable(), FormTextarea(), PageLayout(), PageLayoutProps, useRemoteValue(), Referentiel, ApiParametres (+13 more)

### Community 4 - "toRepositoryError"
Cohesion: 0.17
Nodes (8): toRepositoryError(), mapUtilisateur(), PUBLIC_COLUMNS, Tables, UtilisateurAuth, UtilisateurInput, UtilisateurRepository, UtilisateurRow

### Community 5 - "test-inventaire-ui.mjs"
Cohesion: 0.22
Nodes (4): databaseUnavailable, checks, errors, output

### Community 6 - "Primitive Color Palette"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 7 - "referentielRepositories.ts"
Cohesion: 0.18
Nodes (10): ClientInput, ClientRepository, ClientRow, clientWriteError(), FournisseurInput, FournisseurRow, mapClient(), Tables (+2 more)

### Community 8 - "Cash Database Schema"
Cohesion: 0.04
Nodes (65): ArticleRef, CASH_BREAK_DENOMINATIONS, CASH_MOVEMENT_TYPES, CASH_SESSION_STATUSES, CashBreakDenomination, cashMovements, cashMovementsRelations, CashMovementType (+57 more)

### Community 9 - "schemas/parametres.ts"
Cohesion: 0.11
Nodes (7): ApiParametres, Session, Input, ParametreRepository, ReferentielKind, tables, SousCategorie

### Community 10 - "resourceRoutes.ts"
Cohesion: 0.05
Nodes (57): RFC-5321, CLIENT_TYPES, DELIVERY_STATUSES, ORDER_STATUSES, PAYMENT_MODES, USER_ROLES, VEHICLE_STATUSES, VEHICLE_TYPES (+49 more)

### Community 11 - "slide_search_core.py"
Cohesion: 0.08
Nodes (17): format_context(), format_result(), main(), BM25, calculate_pattern_break(), detect_domain(), get_background_config(), get_color_for_emotion() (+9 more)

### Community 12 - "Document Data Repositories"
Cohesion: 0.13
Nodes (20): baseLine(), CommandeRow, createCommandeRepository(), createReceptionRepository(), createRetourRepository(), createVenteRepository(), DocumentLine, DocumentMapping (+12 more)

### Community 13 - "Design Skill References"
Cohesion: 0.06
Nodes (35): AIDA PAS and FAB Copywriting, Before-After-Bridge Formula, Slide Copywriting Formulas, Cost of Inaction Formula, Create Slide Prompt, HTML Slide Template, HTML Presentation Structure, Slide Layout Patterns (+27 more)

### Community 14 - "Business Form Schemas"
Cohesion: 0.04
Nodes (42): ArticleFormOutput, ArticleFormValues, articleSchema, CaisseClotureFormOutput, CaisseClotureFormValues, caisseClotureSchema, CaisseOuvertureFormOutput, CaisseOuvertureFormValues (+34 more)

### Community 15 - "design_system.py"
Cohesion: 0.08
Nodes (12): ansi_ljust(), _detect_page_type(), format_ascii_box(), format_master_md(), format_page_override_md(), _generate_intelligent_overrides(), hex_to_ansi(), persist_design_system() (+4 more)

### Community 16 - "Primitive Spacing Tokens"
Cohesion: 0.06
Nodes (34): $type, $value, $type, $value, $type, $value, $type, $value (+26 more)

### Community 17 - "SimpleRepository"
Cohesion: 0.09
Nodes (8): LivraisonInput, LivraisonRepository, LivraisonRow, mapLivraison(), Tables, FournisseurRepository, mapFournisseur(), SimpleRepository

### Community 18 - "test_text_layout_resilience.py"
Cohesion: 0.18
Nodes (3): read_rows(), TestTextLayoutDataContracts, TestTextLayoutRetrieval

### Community 19 - "Brand Asset Generators"
Cohesion: 0.10
Nodes (13): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+5 more)

### Community 20 - "seed.ts"
Cohesion: 0.22
Nodes (9): splitDrizzleKitStatements(), splitStatements(), applyFixture(), hasDatabaseConfig, list, SEED_FILES, SEEDED_TABLES, sql (+1 more)

### Community 22 - "Python Tooling Test Imports"
Cohesion: 0.13
Nodes (5): test_sync_parses_bundled_starter_template(), main(), _run(), test_flags_hardcoded_hex_sharing_line_with_token(), test_token_only_line_reports_no_violation()

### Community 23 - "HTML Token Validation"
Cohesion: 0.13
Nodes (12): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+4 more)

### Community 24 - "package.json"
Cohesion: 0.08
Nodes (33): allowScripts, esbuild@0.28.2, devDependencies, concurrently@^10.0.5, oxlint@^1.81.0, playwright@^1.65.0, selfsigned@^5.5.0, tsx@^4.23.13 (+25 more)

### Community 25 - "server/index.ts"
Cohesion: 0.06
Nodes (35): alias, explicitDestination, explicitNull, invalidCurrentField, maximum, motif, noDestination, omittedSource (+27 more)

### Community 26 - "Cash Register Repository"
Cohesion: 0.16
Nodes (10): CashBreak, CashCountRow, CashMovementRow, CashRegisterRepository, CashSessionRow, round2(), Tables, toDecimal() (+2 more)

### Community 27 - "toErrorMessage"
Cohesion: 0.07
Nodes (43): EmplacementsManager(), remove(), save(), useCashMovements(), EMPTY_ARTICLE, SEED_ARTICLES, upsertByReference(), useCatalogue() (+35 more)

### Community 29 - "test_relevance_evaluator.py"
Cohesion: 0.12
Nodes (3): TestFixtureValidation, TestMetricMath, TestThresholdGate

### Community 30 - "react"
Cohesion: 0.10
Nodes (29): react, ConfirmDialogProps, ColumnDef, DataTableProps, SortAccessor, initial, levels, FormDialogProps (+21 more)

### Community 31 - "test-environment.ts"
Cohesion: 0.08
Nodes (21): mysql2@^3.24.4, dotenv, drizzle-orm, mysql2, normalized, raw, statements, archive() (+13 more)

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
Cohesion: 0.06
Nodes (31): $type, $value, background, destructive, destructive-foreground, foreground, muted, muted-foreground (+23 more)

### Community 39 - "sanitize.ts"
Cohesion: 0.10
Nodes (19): bodySchema, findMarkupInjection(), INJECTION_COUNTS, INJECTION_PATTERNS, InjectionKind, normalizeText(), reportInjection(), sanitizeEnum() (+11 more)

### Community 41 - "Brand And Design Guidelines"
Cohesion: 0.17
Nodes (15): Asset Approval Checklist, Asset Organization Guide, Brand Guidelines Template, Color Palette Management, Brand Consistency Checklist, Logo Usage Rules, Messaging Framework, Typography Specifications (+7 more)

### Community 42 - "test-french-validation-ui.mjs"
Cohesion: 0.25
Nodes (7): check(), checks, errors, invalid(), output, rows, writes

### Community 43 - "Repository Guidelines"
Cohesion: 0.22
Nodes (8): Build, Test, and Development Commands, Coding Style & Naming Conventions, Commit & Pull Request Guidelines, Langue des réponses, Project Structure & Module Organization, Repository Guidelines, Security & Configuration Tips, Testing Guidelines

### Community 44 - "Visual Design Skill Guides"
Cohesion: 0.13
Nodes (17): Banner Sizes and Styles, CIP Deliverable Guide, CIP Design, Design Routing, Icon Design, Logo Color Psychology, Logo Design, Logo Prompt Engineering (+9 more)

### Community 45 - "Cash Compliance Verification"
Cohesion: 0.12
Nodes (14): apres, avant, carte, CashSession, cloture, comptageExact, courante, login (+6 more)

### Community 46 - "CaisseView.tsx"
Cohesion: 0.11
Nodes (25): react-hook-form, CashCountFields(), CashCountFieldsProps, FieldRegister, CashState, useCashSession(), CASH_DENOMINATIONS, CASH_MOVEMENT_LABELS (+17 more)

### Community 47 - "Node TypeScript Configuration"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 48 - "cip/generate.py"
Cohesion: 0.11
Nodes (11): build_cip_prompt(), check_logo_required(), generate_cip_set(), generate_with_nano_banana(), load_env(), load_logo_image(), main(), format_brief() (+3 more)

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
Cohesion: 0.43
Nodes (7): FormControl, installFrenchValidation(), clear(), clearForm(), translate(), isFormControl(), validationMessage()

### Community 56 - "Asset Validation CLI"
Cohesion: 0.25
Nodes (13): checkManifest(), formatBytes(), formatOutput(), fs, main(), parseFilename(), path, RULES (+5 more)

### Community 57 - "cip/core.py"
Cohesion: 0.12
Nodes (7): BM25, detect_domain(), get_cip_brief(), _load_csv(), search(), search_all(), _search_csv()

### Community 60 - "App.tsx"
Cohesion: 0.08
Nodes (39): react-router-dom, App(), AppContent(), getStoredTheme(), getSystemTheme(), initials(), navigation, roleLabel() (+31 more)

### Community 61 - "UI UX Search CLI"
Cohesion: 0.21
Nodes (11): args, DATA, domainIndex, DOMAINS, limitIndex, parseCsv(), results, ROOT (+3 more)

### Community 62 - "_style_is_dark_primary"
Cohesion: 0.21
Nodes (4): _query_wants_dark(), _resolve_color_mode(), _style_is_dark_primary(), TestModeResolution

### Community 63 - "test_data_contracts.py"
Cohesion: 0.21
Nodes (5): apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action(), _check_reasoning_contract()

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
Nodes (12): input(), Session, AuthenticatedUser, InventaireRepository, mapInventaire(), RepositoryError, InventaireInput, inventaireSchema (+4 more)

### Community 71 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, bcryptjs@^3.0.3, body-parser@^2.4.0, dotenv@^18.0.1, drizzle-orm@^0.45.3, express@^5.3.0, @hookform/resolvers@^5.9.1, jose@^6.2.12 (+9 more)

### Community 72 - "drizzle-kit"
Cohesion: 0.30
Nodes (4): drizzle-kit@^0.31.11, overrides, esbuild, drizzle-kit

### Community 73 - "Design Token Embedding Script"
Cohesion: 0.17
Nodes (8): args, fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath, wrapStyle

### Community 74 - "Design Token Validation CLI"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 75 - "button"
Cohesion: 0.06
Nodes (45): $type, $value, $type, $value, bg, fg, font-size, hover-bg (+37 more)

### Community 76 - "createTestEnvironment"
Cohesion: 0.67
Nodes (6): createTestEnvironment(), close(), restartApi(), runScript(), startProcess(), stopProcess()

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

### Community 81 - "LivraisonsView.tsx"
Cohesion: 0.07
Nodes (69): @hookform/resolvers, ConfirmDialog(), FormDialog(), FormSelect(), Icon(), EditableCard(), EditableCardProps, ResourceBanners() (+61 more)

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

### Community 90 - "render-html.py"
Cohesion: 0.23
Nodes (4): generate_html(), get_deliverable_info(), get_image_base64(), main()

### Community 91 - "PRODUCT.md — Module Stock (autostrass)"
Cohesion: 0.25
Nodes (7): Ce qui fonctionne bien (à conserver), Ce qui ne va pas / à améliorer, Contraintes techniques, Objectif produit, PRODUCT.md — Module Stock (autostrass), Surface visuelle, Utilisateurs cibles

### Community 92 - "test-fournisseurs.ts"
Cohesion: 0.14
Nodes (11): empty, full, optionalFields, Session, sanitizeCode(), clientBodySchema, fournisseurBodySchema, fournisseurPatchSchema (+3 more)

### Community 93 - "logo/core.py"
Cohesion: 0.11
Nodes (7): BM25, detect_domain(), _load_csv(), search(), search_all(), _search_csv(), _valid_confidence()

### Community 94 - "Security Review Findings"
Cohesion: 0.33
Nodes (9): Bootstrap and Migration Consistency, Cash Session Ownership Check, Concurrent Cash Closure, Hierarchical Location Mapping, Open Session Diagnostic, Security and Reliability Review, Seed Location Join Integrity, Test Database Verification (+1 more)

### Community 95 - "CIP Mockup Prompt Engineering"
Cohesion: 0.11
Nodes (17): Apparel (Polo/T-Shirt), Base Prompt Structure, Business Card, CIP Mockup Prompt Engineering, Context Modifiers, Corporate Minimal, Deliverable-Specific Modifiers, Letterhead (+9 more)

### Community 96 - "HTML Slide Template"
Cohesion: 0.32
Nodes (8): Chart.js Integration, Design Tokens, HTML Slide Template, Mobile Breakpoints, Progress Bar, Responsive 16:9 Slide Deck, Slide Content Wrapper, Slide Navigation

### Community 97 - "contracts.ts"
Cohesion: 0.08
Nodes (29): AuthContext, AuthContextValue, AuthStatus, SessionUser, AuthProvider(), toAuthError(), cache, CacheEntry (+21 more)

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

### Community 105 - "primary-hover"
Cohesion: 0.67
Nodes (3): primary-hover, $type, $value

### Community 106 - "test-fournisseurs-ui.mjs"
Cohesion: 0.25
Nodes (5): checks, errors, fields, full, output

### Community 107 - "Application Architecture README"
Cohesion: 0.38
Nodes (7): Autostrass, Drizzle Migrations, Drizzle ORM, MariaDB, React and Express Application, REST API, Vite Development Proxy

### Community 108 - "InventaireView.tsx"
Cohesion: 0.30
Nodes (12): FormInput(), Comptage(), ComptageForm(), review(), save(), ComptageProps, dateLabel(), formatDelta() (+4 more)

### Community 110 - "Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?, Source Nodes

### Community 111 - "test-client-siret.ts"
Cohesion: 0.13
Nodes (7): client, Session, client, Session, clientPatchSchema, clientSchema, clientUpdateSchema

### Community 114 - "settingsStore.ts"
Cohesion: 0.10
Nodes (34): rateLimit(), createSettingsRouter(), output(), testDatabase(), publicHttpsSettings(), validateCertificate(), current, effectiveDatabaseSettings() (+26 more)

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
Cohesion: 0.19
Nodes (24): express, zod, UserRole, requireRole(), CAISSE_WRITE, createComplianceRouter(), SaleForFingerprint, crudRoutes() (+16 more)

### Community 124 - "No Color Style Tokens"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

### Community 125 - "verify-repositories.ts"
Cohesion: 0.13
Nodes (11): clients, commandes, leaked, livraisons, receptions, retours, users, vehicules (+3 more)

### Community 127 - "TypeScript Build Error Report"
Cohesion: 0.67
Nodes (3): Recorded TypeScript Build Errors, Missing Form Types and Components, React Hook Form Resolver Type Mismatches

### Community 128 - "Bibliothèque Figma Autostrass — découverte"
Cohesion: 0.17
Nodes (11): Bibliothèque Figma Autostrass — découverte, P0.a — Composants et conventions, P0.a — Sources et tokens, P0.a — Typographie et dimensions à préserver, P0.b–P0.f — Découverte distante et périmètre proposé, P1.a — Refus du second mode et possibilités de reprise, P1.b–P1.h — Fondations créées et contrôle final en attente, Reprise et vérifications (+3 more)

### Community 129 - "test-caisse-ui.mjs"
Cohesion: 0.12
Nodes (9): checks, denominations, errors, openingOutput, openingWrites, output, settingsOutput, settingsWrites (+1 more)

### Community 130 - "Slide Visualization Guidelines"
Cohesion: 0.67
Nodes (3): Slides Design Reference, Chart.js Data Visualization, Presentation Design Tokens

### Community 131 - "UI Interaction State Tokens"
Cohesion: 0.67
Nodes (3): Focus States, Loading States, State Priority

### Community 134 - "auth.ts"
Cohesion: 0.10
Nodes (29): AUTH_COOKIE, authenticate(), AuthenticatedRequest, AuthError, hashPassword(), issueToken(), readToken(), requireAuth() (+21 more)

### Community 135 - "simpleRepositories.ts"
Cohesion: 0.31
Nodes (7): DATABASE_CONNECTION_ERROR_CODES, isDatabaseUnavailable(), toHttpError(), unwrap(), AnyIdColumn, AnyTable, Tables

### Community 136 - "test-stock-transfers.ts"
Cohesion: 0.12
Nodes (9): call(), Session, transfer(), ArticleInput, ArticleRepository, ArticleRow, ArticleRowPacket, mapRow() (+1 more)

### Community 137 - "read_rows"
Cohesion: 0.13
Nodes (11): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, _check_typography_contract(), _configured_font_names(), contrast_ratio() (+3 more)

### Community 138 - "UI Styling Dependencies"
Cohesion: 0.67
Nodes (3): UI Styling Test Dependencies, UI Styling Script Requirements, UI Styling Test Requirements

### Community 157 - "ref_node_assert"
Cohesion: 0.20
Nodes (6): vite@^8.3.5, vite, checks, errors, output, scenarios

### Community 158 - "test-utilisateurs-ui.mjs"
Cohesion: 0.20
Nodes (5): checks, errors, output, email(), handleSubmit()

### Community 159 - "test_design_system_mode.py"
Cohesion: 0.11
Nodes (8): _contrast_ratio(), _derive_dark_palette(), _palette_is_dark(), _relative_luminance(), _select_palette_for_mode(), TestEndToEndCoherence, TestLuminance, TestPaletteSelection

### Community 161 - "test_data_contracts.py"
Cohesion: 0.16
Nodes (6): read_rows(), split_values(), style_identities(), TestGeneratedCatalogContract, TestLandingAndStackContract, TestStyleIdentityContract

### Community 162 - "read_rows"
Cohesion: 0.13
Nodes (3): DesignSystemGenerator, TestReasoningMatch, TestReasoningContract

### Community 165 - "test-clients-ui.mjs"
Cohesion: 0.25
Nodes (5): checks, errors, fields, initial, output

### Community 166 - "Inventaire physique par référence"
Cohesion: 0.18
Nodes (10): API, Concurrence et intégrité, Inventaire physique par référence, Migration et sauvegarde, Utilisation, Vérification reproductible, Stock by Location Design Specification, Authenticated Read-Only Locations API (+2 more)

### Community 168 - "Revue CSS — 4 novembre 2026"
Cohesion: 0.15
Nodes (11): Captures, Correction Échap dans l'aperçu intégré, Création et modification des clients — 6 novembre 2026, Numéro de client, SIRET des professionnels, Vérification, Captures, Graphify et points de suivi (+3 more)

### Community 169 - "FournisseursView.tsx"
Cohesion: 0.10
Nodes (22): buildItems(), ErrorItem, ErrorRecord, ErrorSummary(), ErrorSummaryProps, readMessage(), FormCheckbox(), loadTurnstile() (+14 more)

### Community 171 - "test_core.py"
Cohesion: 0.08
Nodes (6): format_markdown(), generate_design_system(), TestBm25CoreBehavior, TestDiagnosticsContracts, TestPersistence, TestTokenizer

### Community 175 - "ring"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 176 - "Clôture de caisse — 10 novembre 2026"
Cohesion: 0.50
Nodes (3): Clôture de caisse — 10 novembre 2026, Utilisation, Vérification reproductible

### Community 178 - "fondsCaisseSchema"
Cohesion: 0.67
Nodes (4): caisseOuvertureComptageSchema(), caisseOuvertureSchema(), optionalText(), fondsCaisseSchema()

### Community 181 - "Création et modification des fournisseurs — 6 novembre 2026"
Cohesion: 0.40
Nodes (4): Captures, Contrat, Création et modification des fournisseurs — 6 novembre 2026, Vérification reproductible

### Community 190 - "toNullableNumber"
Cohesion: 0.67
Nodes (3): optionalRef(), requiredRef(), toNullableNumber()

## Knowledge Gaps
- **101 isolated node(s):** `RFC-5321`, `drizzle-kit 0.18.1`, `Drizzle Kit Upgrade Notice`, `drizzle-orm 0.45.3`, `Banner Design Skill` (+96 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1292 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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

- **Why does `ShadcnInstaller` connect `Shadcn Component Installer` to `Python Tooling Test Imports`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `TestTailwindConfigGenerator`) actually correct?**
  _`TailwindConfigGenerator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-5321`, `drizzle-kit 0.18.1`, `Drizzle Kit Upgrade Notice` to the rest of the system?**
  _101 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shadcn Component Installer` be split into smaller, more focused modules?**
  _Cohesion score 0.053555750658472345 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `NPM Build And Database Scripts` to `package.json`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Should `scripts/core.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05563093622795115 - nodes in this community are weakly interconnected._
- **Why does `TailwindConfigGenerator` connect `Tailwind Theme Validation` to `Tailwind Config Write Tests`, `Tailwind Color Configuration`, `Tailwind Breakpoint Tests`, `Tailwind Plugin Configuration`, `.recommend_plugins`, `cip/generate.py`, `Tailwind Generator Defaults`, `.generate_config_string`, `Python Tooling Test Imports`, `Tailwind Font And Spacing Config`, `Tailwind Configuration Tests`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._