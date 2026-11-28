# Graph Report - OpenStrass  (2026-11-28)

## Corpus Check
- 430 files · ~491,660 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 63 file(s) not represented in the graph (top: .csv 53, .css 5, (none) 3)

Les quatre feuilles CSS modifiées sont rattachées aux imports vérifiés de l’application. Le parseur natif ne traite pas leurs règles.

## Summary
- 3643 nodes · 7959 edges · 182 communities (142 shown, 40 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 255 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5a5fbbb3`
- [Compétences Obsidian et find-skills du 28 novembre 2026](../passation.md#compétences-obsidian-et-find-skills-du-28-novembre-2026)
- [Reprise des contrôles PDF du 28 novembre 2026](../passation.md#reprise-des-contrôles-pdf-du-28-novembre-2026)
- [Consultation des PDF dans l’application — 28 novembre 2026](../passation.md#consultation-des-pdf-dans-lapplication--28-novembre-2026)
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Shadcn Component Installer
- scripts/core.py
- validate_data.py
- CaisseView.tsx
- toErrorMessage
- contracts.ts
- Primitive Color Palette
- CaisseView.tsx
- Cash Database Schema
- Accessibility (a11y)
- schemas.ts
- slide_search_core.py
- test-documents-pdf-unit.ts
- Design Skill References
- schemas/index.ts
- test_core.py
- Primitive Spacing Tokens
- sanitize.ts
- WCAG 2.2 Quick Reference
- Brand Asset Generators
- Accessibility Code Patterns
- csrf.ts
- json
- HTML Token Validation
- package.json
- validation.ts
- Cash Register Repository
- referentielRepositories.ts
- Tailwind Configuration Tests
- RepositoryError
- documentsPdfSettings.ts
- evaluate-relevance.py
- HTML Slide Deck Generation
- test-environment.ts
- NPM Build And Database Scripts
- Project Handoff Documentation
- Application TypeScript Configuration
- color
- toErrorMessage
- refresh-google-fonts.py
- test_design_system_mode.py
- Brand And Design Guidelines
- react
- Repository Guidelines
- Visual Design Skill Guides
- Cash Compliance Verification
- Operable
- Node TypeScript Configuration
- uipro-search.mjs
- Typography Scale Tokens
- API Security Integration Tests
- Brand Color Extraction
- Catalog Refresh Contract Tests
- test-devis-ui.mjs
- frenchValidation.ts
- Asset Validation CLI
- cip/core.py
- Tailwind Theme Validation
- Web Stack Freshness Tests
- App.tsx
- test-fiscal-integrity.ts
- schema_step2.ts
- Revue WCAG 2.2 — 13 novembre 2026
- DocumentsPdfForm.tsx
- Server TypeScript Configuration
- design-tokens-starter.json
- test-inventaires.ts
- Tailwind Breakpoint Tests
- TestDomainDetection
- simpleRepositories.ts
- dependencies
- OpenStrass Initial Requirements
- Design Token Embedding Script
- Design Token Validation CLI
- button
- ref_node_fs
- Brand Context Injection
- Slide Copywriting Formulas
- Motion Duration Tokens
- test-pdf-commercial.ts
- DevisView.tsx
- Brand Token Synchronization
- CIP Style Taxonomy
- Design Token Code Generation
- dev-processes.mjs
- Backend Zod Route Flow
- PdfmakeInstance
- ArticleRepository
- PRODUCT.md — Module Stock (OpenStrass)
- test-parametres.ts
- SimpleRepository
- Security Review Findings
- CIP Mockup Prompt Engineering
- HTML Slide Template
- test-devis.ts
- Border Radius Tokens
- parametreRepository.ts
- Zod Authentication Connections
- Protected Route Schema Flow
- Oxlint Rule Configuration
- Common ARIA patterns
- Understandable
- OpenStrass
- refresh-icon-catalog.py
- Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?
- documentRepositories.ts
- Audit des fichiers inutiles — 13 novembre 2026
- test-documents-pdf-ui.mjs
- schemas/parametres.ts
- test-stock-transfers.ts
- devisRepository.ts
- slides-create.md
- PdfReader.tsx
- Social Image Design Guidance
- BM25
- Extra Large Size Tokens
- server/index.ts
- No Color Style Tokens
- Common issues by impact
- TestNativeDesktopStackFreshness
- Testing checklist
- seed.ts
- venteTotals
- Slide Visualization Guidelines
- UI Interaction State Tokens
- primary-hover
- BM25
- TestSearchDomains
- test-caisse-ui.mjs
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
- test-vente-totals-ui.mjs
- Apache License Terms
- Favicon SVG Asset
- Correctifs de la revue intégrale — 14 novembre 2026
- Analyse de Microsoft TokenEconomizer
- test_style_taxonomy.py
- logo/search.py
- toRepositoryError
- mapping.ts
- pdfCommercial.ts
- Inventaire physique par référence
- test-client-siret.ts
- Création et modification des clients — 6 novembre 2026
- TestFixtureValidation
- parametres.md
- DesignSystemGenerator
- ring
- Clôture de caisse — 10 novembre 2026
- pdfDevis.ts
- TestThresholdGate
- Création et modification des fournisseurs — 6 novembre 2026
- Administration des paramètres
- TestTokenAncestorLookup
- fondsCaisseSchema
- mysql2
- Consultation des PDF dans l’application — 28 novembre 2026
- toNullableNumber
- RAPPORT.md
- venteSchema
- @vitejs/plugin-react
- Constats prioritaires
- Autres défauts confirmés

## God Nodes (most connected - your core abstractions)
1. `TailwindConfigGenerator` - 58 edges
2. `toErrorMessage()` - 58 edges
3. `Icon()` - 58 edges
4. `react` - 56 edges
5. `PageLayout()` - 48 edges
6. `OpenStrass Project Handoff` - 48 edges
7. `FormInput()` - 45 edges
8. `FormDialog()` - 43 edges
9. `useToast()` - 41 edges
10. `AppContent()` - 40 edges

## Surprising Connections (you probably didn't know these)
- `Stockage et sauvegarde` --references--> `updatedAt()`  [INFERRED]
  specs/parametres.md → server/db/schema.ts
- `Améliorations complémentaires` --references--> `readMessage()`  [INFERRED]
  specs/accessibilite-wcag-review.md → src/components/forms/ErrorSummary.tsx
- `R12 — P2 — Une panne SQL est renvoyée comme une authentification invalide` --references--> `requireAuth()`  [INFERRED]
  specs/revue-code-2026-11-14.md → server/middleware/auth.ts
- `Création et modification des clients — 6 novembre 2026` --references--> `useResource()`  [INFERRED]
  specs/client-modal.md → src/hooks/useResource.ts
- `Reprise des contrôles PDF du 28 novembre 2026` --references--> `renderedPdfPages()`  [INFERRED]
  passation.md → scripts/lib/pdf-assertions.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three-Layer Design Token Architecture** — _github_prompts_design_system_references_primitive_tokens_primitive_tokens, _github_prompts_design_system_references_semantic_tokens_semantic_tokens, _github_prompts_design_system_references_component_tokens_component_tokens [EXTRACTED 1.00]
- **Strategic HTML Slide Authoring** — github_prompts_slides_skill_slides_skill, github_prompts_slides_references_copywriting_formulas_copywriting_formulas, github_prompts_slides_references_layout_patterns_slide_layout_patterns, github_prompts_slides_references_html_template_html_slide_template, github_prompts_slides_references_slide_strategies_slide_strategies [EXTRACTED 1.00]
- **Social Image HTML Design and Screenshot QA Workflow** — github_prompts_design_references_social_photos_design_social_photos_design_guide, github_prompts_design_references_social_photos_design_html_screenshot_workflow, github_prompts_design_references_social_photos_design_safe_zones_visual_qa, github_prompts_design_references_social_photos_design_platform_image_sizes [EXTRACTED 1.00]
- **UI Styling Component, Utility, and Canvas Layers** — github_prompts_ui_styling_skill_ui_styling_skill, github_prompts_ui_styling_skill_component_layer, github_prompts_ui_styling_skill_tailwind_styling_layer, github_prompts_ui_styling_skill_canvas_visual_layer [EXTRACTED 1.00]

## Communities (182 total, 40 thin omitted)

### Community 0 - "Shadcn Component Installer"
Cohesion: 0.05
Nodes (3): main(), ShadcnInstaller, TestShadcnInstaller

### Community 1 - "scripts/core.py"
Cohesion: 0.06
Nodes (31): BM25, _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature() (+23 more)

### Community 2 - "validate_data.py"
Cohesion: 0.06
Nodes (44): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, TestGeneratedCatalogContract, _catalog_date(), _check_app_interface_contract() (+36 more)

### Community 3 - "CaisseView.tsx"
Cohesion: 0.07
Nodes (35): CashCountFields(), CashCountFieldsProps, CheckboxProps, CommonProps, FieldRegistration, FormTextarea(), InputProps, RegisterOptions (+27 more)

### Community 4 - "toErrorMessage"
Cohesion: 0.05
Nodes (55): AuthContext, AuthContextValue, AuthStatus, SessionUser, AuthProvider(), toAuthError(), CashState, useCashMovements() (+47 more)

### Community 5 - "contracts.ts"
Cohesion: 0.08
Nodes (27): cache, CacheEntry, fetchOnce(), useClientOptions(), useCommandeOptions(), useReferential(), useVenteOptions(), ApiArticleACommander (+19 more)

### Community 6 - "Primitive Color Palette"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 7 - "CaisseView.tsx"
Cohesion: 0.08
Nodes (77): @hookform/resolvers, react-hook-form, ConfirmDialog(), ConfirmDialogProps, ColumnDef, compare(), DataTable(), DataTableProps (+69 more)

### Community 8 - "Cash Database Schema"
Cohesion: 0.04
Nodes (55): ArticleRef, articlesACommander, CASH_BREAK_DENOMINATIONS, CASH_MOVEMENT_TYPES, CASH_SESSION_STATUSES, CashBreakDenomination, cashMovements, cashMovementsRelations (+47 more)

### Community 9 - "Accessibility (a11y)"
Cohesion: 0.17
Nodes (12): Accessibility (a11y), ARIA usage (4.1.2), Color contrast (1.4.3, 1.4.6), Conformance levels, Evidence-led audit workflow, Live regions (4.1.3), Media alternatives (1.2), Perceivable (+4 more)

### Community 10 - "schemas.ts"
Cohesion: 0.03
Nodes (80): RFC-5321, empty, full, optionalFields, Session, CLIENT_TYPES, DELIVERY_STATUSES, ORDER_STATUSES (+72 more)

### Community 11 - "slide_search_core.py"
Cohesion: 0.08
Nodes (17): format_context(), format_result(), main(), BM25, calculate_pattern_break(), detect_domain(), get_background_config(), get_color_for_emotion() (+9 more)

### Community 12 - "test-documents-pdf-unit.ts"
Cohesion: 0.08
Nodes (29): jpeg-js, makeJpegLogo(), makePalettePng(), makePng(), makePngLogo(), pngAtByteLength(), pngChunk(), pngCrc32() (+21 more)

### Community 13 - "Design Skill References"
Cohesion: 0.06
Nodes (35): AIDA PAS and FAB Copywriting, Before-After-Bridge Formula, Slide Copywriting Formulas, Cost of Inaction Formula, Create Slide Prompt, HTML Slide Template, HTML Presentation Structure, Slide Layout Patterns (+27 more)

### Community 14 - "schemas/index.ts"
Cohesion: 0.04
Nodes (41): ArticleFormOutput, ArticleFormValues, articleSchema, CaisseClotureFormOutput, CaisseClotureFormValues, caisseClotureSchema, CaisseOuvertureFormOutput, CaisseOuvertureFormValues (+33 more)

### Community 15 - "test_core.py"
Cohesion: 0.10
Nodes (5): format_markdown(), generate_design_system(), TestDiagnosticsContracts, TestPersistence, TestTokenizer

### Community 16 - "Primitive Spacing Tokens"
Cohesion: 0.06
Nodes (34): $type, $value, $type, $value, $type, $value, $type, $value (+26 more)

### Community 17 - "sanitize.ts"
Cohesion: 0.10
Nodes (17): devisConversionSchema, devisCreateSchema, devisPdfQuerySchema, devisUpdateSchema, fields, line, notes, version (+9 more)

### Community 18 - "WCAG 2.2 Quick Reference"
Cohesion: 0.18
Nodes (8): Level A (minimum), Level AA (standard), Level AAA (enhanced), Sources, Success criteria by level, Testing tools, WCAG 2.2 Quick Reference, What changed from 2.1 to 2.2

### Community 19 - "Brand Asset Generators"
Cohesion: 0.07
Nodes (17): generate_html(), get_deliverable_info(), get_image_base64(), main(), apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch() (+9 more)

### Community 20 - "Accessibility Code Patterns"
Cohesion: 0.22
Nodes (9): Accessibility Code Patterns, ARIA tabs, Dragging movements, Error handling, Form labels, Live regions and notifications, Modal focus trap, Screen reader commands (+1 more)

### Community 21 - "csrf.ts"
Cohesion: 0.13
Nodes (18): AUTH_COOKIE, cookieOptions, Bucket, bucketKey(), buckets, clientKey(), CSRF_COOKIE_NAME, CSRF_HEADER (+10 more)

### Community 22 - "json"
Cohesion: 0.05
Nodes (18): test_sync_parses_bundled_starter_template(), build_cip_prompt(), check_logo_required(), generate_cip_set(), generate_with_nano_banana(), load_env(), load_logo_image(), main() (+10 more)

### Community 23 - "HTML Token Validation"
Cohesion: 0.13
Nodes (12): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+4 more)

### Community 24 - "package.json"
Cohesion: 0.07
Nodes (36): allowScripts, esbuild@0.28.2, description, devDependencies, concurrently@^10.0.5, drizzle-kit@^0.31.11, oxlint@^1.81.0, playwright@^1.65.0 (+28 more)

### Community 25 - "validation.ts"
Cohesion: 0.08
Nodes (30): alias, explicitDestination, explicitNull, invalidCurrentField, maximum, motif, noDestination, omittedSource (+22 more)

### Community 26 - "Cash Register Repository"
Cohesion: 0.16
Nodes (10): CashBreak, CashCountRow, CashMovementRow, CashRegisterRepository, CashSessionRow, round2(), Tables, toDecimal() (+2 more)

### Community 27 - "referentielRepositories.ts"
Cohesion: 0.18
Nodes (10): ClientInput, ClientRepository, ClientRow, clientWriteError(), FournisseurInput, FournisseurRow, mapClient(), Tables (+2 more)

### Community 29 - "RepositoryError"
Cohesion: 0.19
Nodes (5): DevisRepository, mapProcurement(), parseSnapshot(), RepositoryError, generateDocumentNumber()

### Community 30 - "documentsPdfSettings.ts"
Cohesion: 0.19
Nodes (17): checkDimensions(), crc32(), crcTable, DocumentsPdfLogoError, invalidLogo(), jpegLogo(), jpegOrientation(), pngChunk() (+9 more)

### Community 31 - "evaluate-relevance.py"
Cohesion: 0.10
Nodes (22): _palette_is_dark(), _relative_luminance(), _design_coherence(), evaluate(), load_json(), main(), _mean(), oracle_fingerprint() (+14 more)

### Community 32 - "HTML Slide Deck Generation"
Cohesion: 0.13
Nodes (11): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+3 more)

### Community 33 - "test-environment.ts"
Cohesion: 0.15
Nodes (13): createTestEnvironment(), close(), restartApi(), runScript(), startProcess(), stopProcess(), findAvailablePort(), ManagedProcess (+5 more)

### Community 34 - "NPM Build And Database Scripts"
Cohesion: 0.06
Nodes (40): scripts, build, caisse:diagnostic, db:admin, db:generate, db:migrate, db:seed, db:studio (+32 more)

### Community 35 - "Project Handoff Documentation"
Cohesion: 0.13
Nodes (23): Analyse du dépôt du 27 novembre 2026, API and Security Test Suites, Authentication and Role-Based Access Control, OpenStrass Project Handoff, OpenStrass Roadmap, Cash Session Management, Centralized HTTP Client, Customer and Supplier Address Books (+15 more)

### Community 36 - "Application TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 37 - "color"
Cohesion: 0.06
Nodes (31): $type, $value, background, destructive, destructive-foreground, foreground, muted, muted-foreground (+23 more)

### Community 38 - "toErrorMessage"
Cohesion: 0.09
Nodes (43): remove(), save(), PageLayout(), PageLayoutProps, useEmplacements(), useRemoteValue(), Referentiel, toErrorMessage() (+35 more)

### Community 39 - "refresh-google-fonts.py"
Cohesion: 0.19
Nodes (18): change_report(), checked_date(), fail(), fetch_live_catalog(), load_existing(), load_overrides(), main(), metadata_from_repository() (+10 more)

### Community 40 - "test_design_system_mode.py"
Cohesion: 0.05
Nodes (22): ansi_ljust(), _contrast_ratio(), _derive_dark_palette(), _detect_page_type(), _filter_anti_patterns_for_mode(), format_ascii_box(), format_master_md(), format_page_override_md() (+14 more)

### Community 41 - "Brand And Design Guidelines"
Cohesion: 0.17
Nodes (15): Asset Approval Checklist, Asset Organization Guide, Brand Guidelines Template, Color Palette Management, Brand Consistency Checklist, Logo Usage Rules, Messaging Framework, Typography Specifications (+7 more)

### Community 42 - "react"
Cohesion: 0.12
Nodes (19): react, APP_MONOGRAM, buildItems(), ErrorItem, ErrorRecord, ErrorSummaryProps, Toast, ToastApi (+11 more)

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

### Community 48 - "uipro-search.mjs"
Cohesion: 0.23
Nodes (11): args, DATA, domainIndex, DOMAINS, limitIndex, parseCsv(), results, ROOT (+3 more)

### Community 49 - "Typography Scale Tokens"
Cohesion: 0.12
Nodes (16): $type, $value, $type, $value, $type, $value, $type, $value (+8 more)

### Community 51 - "API Security Integration Tests"
Cohesion: 0.12
Nodes (15): adminId, alerts, catalogue, clientId, clientPourAvoir, csrfFromCookie(), fuite, login() (+7 more)

### Community 52 - "Brand Color Extraction"
Cohesion: 0.20
Nodes (11): calculateCompliance(), colorDistance(), displayPalette(), extractHexColors(), findNearestBrandColor(), fs, generateImageMagickCommand(), hexToRgb() (+3 more)

### Community 54 - "test-devis-ui.mjs"
Cohesion: 0.06
Nodes (30): article, category, client, collections, commande, dialogs, emplacement, line (+22 more)

### Community 55 - "frenchValidation.ts"
Cohesion: 0.23
Nodes (10): react-dom@^19.2.8, react-dom, removeFrenchValidation, FormControl, installFrenchValidation(), clear(), clearForm(), translate() (+2 more)

### Community 56 - "Asset Validation CLI"
Cohesion: 0.25
Nodes (13): checkManifest(), formatBytes(), formatOutput(), fs, main(), parseFilename(), path, RULES (+5 more)

### Community 57 - "cip/core.py"
Cohesion: 0.05
Nodes (22): detect_domain(), get_cip_brief(), _load_csv(), search(), search_all(), _search_csv(), detect_domain(), _load_csv() (+14 more)

### Community 60 - "App.tsx"
Cohesion: 0.09
Nodes (32): react-router-dom, App(), AppContent(), getStoredTheme(), getSystemTheme(), initials(), navigation, roleLabel() (+24 more)

### Community 61 - "test-fiscal-integrity.ts"
Cohesion: 0.08
Nodes (32): Anchor, archive(), ArchivedSale, ArchiveHeader, ArchiveRecord, FiscalArchiveBuilder, saleSchema, saleYear() (+24 more)

### Community 62 - "schema_step2.ts"
Cohesion: 0.12
Nodes (15): AUDIT_ACTIONS, AuditAction, commandeFournisseurLines, commandesFournisseurs, DELIVERY_MODES, DeliveryMode, emplacements, fournisseurs (+7 more)

### Community 63 - "Revue WCAG 2.2 — 13 novembre 2026"
Cohesion: 0.09
Nodes (21): A11Y-01 — Le résumé d'erreurs reprend le focus pendant la saisie, A11Y-02 — Le tri des tableaux est inaccessible au clavier, A11Y-03 — Le toast d'erreur est exclu de l'arbre d'accessibilité, A11Y-04 — Le menu mobile masque le focus, A11Y-05 — Les erreurs de référentiels perdent l'identité du champ, A11Y-06 — Les données du compte connecté manquent de finalité déclarée, A11Y-07 — Le titre du document reste identique sur toutes les vues, Améliorations complémentaires (+13 more)

### Community 64 - "DocumentsPdfForm.tsx"
Cohesion: 0.19
Nodes (11): decodedDimensions(), headerDimensions(), pdfLogoSource(), readPdfLogo(), validDimensions(), DocumentsPdfForm(), previewDraft(), save() (+3 more)

### Community 65 - "Server TypeScript Configuration"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleResolution, noEmit, noUnusedLocals, noUnusedParameters, skipLibCheck (+5 more)

### Community 66 - "design-tokens-starter.json"
Cohesion: 0.15
Nodes (12): $type, $value, dark, semantic, primitive, $schema, $type, $value (+4 more)

### Community 67 - "test-inventaires.ts"
Cohesion: 0.18
Nodes (11): zod, AuthenticatedRequest, AuthenticatedUser, bodySchema, querySchema, InventaireRepository, mapInventaire(), InventaireInput (+3 more)

### Community 70 - "simpleRepositories.ts"
Cohesion: 0.08
Nodes (25): drizzle-orm, createdAt, db, repository, storedUser, authenticate(), AuthError, hashPassword() (+17 more)

### Community 71 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, bcryptjs@^3.0.3, body-parser@^2.4.0, dotenv@^18.0.1, drizzle-orm@^0.45.3, express@^5.3.0, @hookform/resolvers@^5.9.1, jose@^6.2.12 (+10 more)

### Community 72 - "OpenStrass Initial Requirements"
Cohesion: 0.20
Nodes (14): Application Settings, OpenStrass Initial Requirements, Cash Register, Customer Address Book, Customer Orders, Customer Returns, Deliveries, Personnel (+6 more)

### Community 73 - "Design Token Embedding Script"
Cohesion: 0.17
Nodes (8): args, fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath, wrapStyle

### Community 74 - "Design Token Validation CLI"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 75 - "button"
Cohesion: 0.06
Nodes (45): $type, $value, $type, $value, bg, fg, font-size, hover-bg (+37 more)

### Community 76 - "ref_node_fs"
Cohesion: 0.04
Nodes (37): vite@^8.3.5, vite, checks, errors, fields, initial, output, checks (+29 more)

### Community 77 - "Brand Context Injection"
Cohesion: 0.31
Nodes (10): extractColorsFromTable(), extractCoreAttributes(), extractHexColors(), extractImageStyle(), extractTypography(), extractVoice(), fs, generatePromptAddition() (+2 more)

### Community 78 - "Slide Copywriting Formulas"
Cohesion: 0.24
Nodes (11): AIDA, Before-After-Bridge, Contrast Patterns, Copywriting Formulas, Cost of Inaction, FAB, Formula-to-Slide Mapping, Headline Patterns (+3 more)

### Community 79 - "Motion Duration Tokens"
Cohesion: 0.20
Nodes (10): fast, normal, slow, $type, $value, $type, $value, duration (+2 more)

### Community 80 - "test-pdf-commercial.ts"
Cohesion: 0.09
Nodes (32): Reprise des contrôles PDF du 28 novembre 2026, pdfmake, assertLabeledPdfValue(), capturePdfDefinitions(), evaluatePdfCallback(), InspectablePdfOutput, PdfTable, pdfTables() (+24 more)

### Community 81 - "DevisView.tsx"
Cohesion: 0.09
Nodes (40): FormDialog(), FormDialogProps, Icon(), PdfPreviewDialog(), PdfPreviewProps, PdfPreviewRequest, PdfResult, PdfSource (+32 more)

### Community 83 - "Brand Token Synchronization"
Cohesion: 0.29
Nodes (8): adjustBrightness(), { execFileSync }, extractColorsFromMarkdown(), fs, generateColorScale(), main(), path, updateDesignTokens()

### Community 84 - "CIP Style Taxonomy"
Cohesion: 0.27
Nodes (10): Bold Dynamic, CIP Design Style Guide, Classic Traditional, Color Psychology, Corporate Minimal, Fresh Modern, Luxury Premium, Modern Tech (+2 more)

### Community 85 - "Design Token Code Generation"
Cohesion: 0.36
Nodes (9): flattenTokens(), fs, generateCSS(), generateTailwind(), main(), parseArgs(), path, resolveReference() (+1 more)

### Community 86 - "dev-processes.mjs"
Cohesion: 0.14
Nodes (17): argumentsOf(), descendantsOf(), findDevProcesses(), isDevProcess(), isEvaluationOption(), listProcesses(), nodeScriptIndex(), pathsFor() (+9 more)

### Community 88 - "Backend Zod Route Flow"
Cohesion: 0.38
Nodes (10): How Backend Zod Schemas Connect to Protected Routes, Backend Zod Schemas, Body Parser, Create API Router, CRUD Routes, Document Routes, Resource Routes, Role Guard (+2 more)

### Community 89 - "PdfmakeInstance"
Cohesion: 0.20
Nodes (4): Compétences Obsidian et find-skills du 28 novembre 2026, pdfmake, PdfmakeInstance, PdfmakeOutput

### Community 90 - "ArticleRepository"
Cohesion: 0.18
Nodes (8): ArticleInput, ArticleRepository, ArticleRow, ArticleRowPacket, lockArticleStock(), mapRow(), toNumber(), MAX_STOCK

### Community 91 - "PRODUCT.md — Module Stock (OpenStrass)"
Cohesion: 0.25
Nodes (7): Ce qui fonctionne bien (à conserver), Ce qui ne va pas / à améliorer, Contraintes techniques, Objectif produit, PRODUCT.md — Module Stock (OpenStrass), Surface visuelle, Utilisateurs cibles

### Community 92 - "test-parametres.ts"
Cohesion: 0.17
Nodes (3): root, ApiParametres, Session

### Community 93 - "SimpleRepository"
Cohesion: 0.08
Nodes (10): LivraisonInput, LivraisonRepository, LivraisonRow, mapLivraison(), Tables, FournisseurRepository, mapFournisseur(), mapVehicule() (+2 more)

### Community 94 - "Security Review Findings"
Cohesion: 0.33
Nodes (9): Bootstrap and Migration Consistency, Cash Session Ownership Check, Concurrent Cash Closure, Hierarchical Location Mapping, Open Session Diagnostic, Security and Reliability Review, Seed Location Join Integrity, Test Database Verification (+1 more)

### Community 95 - "CIP Mockup Prompt Engineering"
Cohesion: 0.11
Nodes (17): Apparel (Polo/T-Shirt), Base Prompt Structure, Business Card, CIP Mockup Prompt Engineering, Context Modifiers, Corporate Minimal, Deliverable-Specific Modifiers, Letterhead (+9 more)

### Community 96 - "HTML Slide Template"
Cohesion: 0.32
Nodes (8): Chart.js Integration, Design Tokens, HTML Slide Template, Mobile Breakpoints, Progress Bar, Responsive 16:9 Slide Deck, Slide Content Wrapper, Slide Navigation

### Community 97 - "test-devis.ts"
Cohesion: 0.18
Nodes (8): businessCounts(), dateDevis, fiscalSnapshot(), QuoteInput, rows(), Session, stockSnapshot(), validUntil

### Community 98 - "Border Radius Tokens"
Cohesion: 0.12
Nodes (23): $type, $value, lg, sm, $type, $value, $type, $value (+15 more)

### Community 100 - "parametreRepository.ts"
Cohesion: 0.18
Nodes (6): Input, listTva(), ParametreRepository, ReferentielKind, tables, SousCategorie

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

### Community 107 - "OpenStrass"
Cohesion: 0.11
Nodes (18): OpenStrass Design System Master, Accessibility and Responsive UI Rules, Dense Blue and Amber Dashboard Design, test:installation, Reprise des cinq correctifs du 27 novembre 2026, OpenStrass, Drizzle Migrations, Drizzle ORM (+10 more)

### Community 108 - "refresh-icon-catalog.py"
Cohesion: 0.17
Nodes (12): checked_date(), fail(), main(), normalize_alias(), normalize_catalog(), read_json(), string_list(), validate_curated() (+4 more)

### Community 110 - "Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?, Source Nodes

### Community 111 - "documentRepositories.ts"
Cohesion: 0.10
Nodes (27): clients, commandes, leaked, livraisons, receptions, retours, users, vehicules (+19 more)

### Community 112 - "Audit des fichiers inutiles — 13 novembre 2026"
Cohesion: 0.25
Nodes (7): Archivage et suppression, Audit des fichiers inutiles — 13 novembre 2026, Fichiers archivés puis supprimés, Fichiers locaux hors Git, Sauvegardes et artefacts à rationaliser, Vérifications, À conserver ou à confirmer

### Community 113 - "test-documents-pdf-ui.mjs"
Cohesion: 0.15
Nodes (8): captures, checks, contexts, draft, errors, original, output, states

### Community 114 - "schemas/parametres.ts"
Cohesion: 0.09
Nodes (36): express, ValidationError, rateLimit(), createSettingsRouter(), output(), parseDocumentsPdfSettings(), testDatabase(), publicHttpsSettings() (+28 more)

### Community 115 - "test-stock-transfers.ts"
Cohesion: 0.24
Nodes (5): adjust(), call(), editQuantity(), Session, transfer()

### Community 116 - "devisRepository.ts"
Cohesion: 0.13
Nodes (14): DevisStatus, Actor, ArticleACommanderRow, ConversionResult, DevisClientSnapshot, DevisConversionInput, DevisInput, DevisLine (+6 more)

### Community 119 - "PdfReader.tsx"
Cohesion: 0.27
Nodes (6): pdfjs-dist@^6.5.438, pdfjs-dist, PdfPage(), PdfPages(), PdfReader(), open()

### Community 120 - "Social Image Design Guidance"
Cohesion: 0.50
Nodes (4): HTML Screenshot Production Workflow, Social Image Platform Sizes, Safe Zones and Visual QA, Social Photos Design Guide

### Community 122 - "Extra Large Size Tokens"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 123 - "server/index.ts"
Cohesion: 0.11
Nodes (37): databaseSettings, db, hasDatabaseConfig, pool, UserRole, app, frontendPath, port (+29 more)

### Community 124 - "No Color Style Tokens"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

### Community 125 - "Common issues by impact"
Cohesion: 0.50
Nodes (4): Common issues by impact, Critical (fix immediately), Moderate (fix soon), Serious (fix before launch)

### Community 126 - "TestNativeDesktopStackFreshness"
Cohesion: 0.13
Nodes (3): TestBm25CoreBehavior, _rows(), TestNativeDesktopStackFreshness

### Community 127 - "Testing checklist"
Cohesion: 0.67
Nodes (3): Automated testing, Manual testing, Testing checklist

### Community 128 - "seed.ts"
Cohesion: 0.39
Nodes (5): withInstallationConnection(), splitDrizzleKitStatements(), splitStatements(), SEED_FILES, SEEDED_TABLES

### Community 129 - "venteTotals"
Cohesion: 0.24
Nodes (7): body, line, user, hasCentPrecision(), MAX_AMOUNT_CENTS, ventePayment(), venteTotals()

### Community 130 - "Slide Visualization Guidelines"
Cohesion: 0.67
Nodes (3): Slides Design Reference, Chart.js Data Visualization, Presentation Design Tokens

### Community 131 - "UI Interaction State Tokens"
Cohesion: 0.67
Nodes (3): Focus States, Loading States, State Priority

### Community 132 - "primary-hover"
Cohesion: 0.67
Nodes (3): primary-hover, $type, $value

### Community 136 - "test-caisse-ui.mjs"
Cohesion: 0.12
Nodes (9): checks, denominations, errors, openingOutput, openingWrites, output, settingsOutput, settingsWrites (+1 more)

### Community 138 - "UI Styling Dependencies"
Cohesion: 0.67
Nodes (3): UI Styling Test Dependencies, UI Styling Script Requirements, UI Styling Test Requirements

### Community 151 - "test-vente-totals-ui.mjs"
Cohesion: 0.28
Nodes (7): check(), checks, errors, euro(), output, totals(), writes

### Community 156 - "Correctifs de la revue intégrale — 14 novembre 2026"
Cohesion: 0.18
Nodes (10): Outils UI-Pro restaurés — 14 novembre 2026, settings(), createdAt(), updatedAt(), Application locale du 14 novembre, Contrat de vente et migration, Correctifs de la revue intégrale — 14 novembre 2026, Validations reproductibles (+2 more)

### Community 157 - "Analyse de Microsoft TokenEconomizer"
Cohesion: 0.13
Nodes (13): Analyse de Microsoft TokenEconomizer, Avis, Compatibilité et limites utiles à Autostrass, Données et appels externes, Fonctionnement constaté, Résultats : ce qu'ils permettent de conclure, Vérification et proposition d'essai, Commandes de contrôle (+5 more)

### Community 160 - "toRepositoryError"
Cohesion: 0.33
Nodes (3): CommandeRepository, toLine(), toRepositoryError()

### Community 161 - "mapping.ts"
Cohesion: 0.43
Nodes (5): databaseUnavailable, DATABASE_CONNECTION_ERROR_CODES, isDatabaseUnavailable(), toHttpError(), unwrap()

### Community 162 - "pdfCommercial.ts"
Cohesion: 0.07
Nodes (43): capture, client, devis, output, palette, reports, settings, vente (+35 more)

### Community 166 - "Inventaire physique par référence"
Cohesion: 0.17
Nodes (11): API, Concurrence et intégrité, Inventaire physique par référence, Migration et sauvegarde, Utilisation, Vérification reproductible, Stock by Location Design Specification, Authenticated Read-Only Locations API (+3 more)

### Community 167 - "test-client-siret.ts"
Cohesion: 0.08
Nodes (10): client, Session, client, Session, input(), Session, clientPatchSchema, clientSchema (+2 more)

### Community 168 - "Création et modification des clients — 6 novembre 2026"
Cohesion: 0.15
Nodes (11): Captures, Correction Échap dans l'aperçu intégré, Création et modification des clients — 6 novembre 2026, Numéro de client, SIRET des professionnels, Vérification, Captures, Graphify et points de suivi (+3 more)

### Community 172 - "parametres.md"
Cohesion: 0.40
Nodes (5): Choix retenus et périmètre restant, Lots PARAM-01 à PARAM-07, Paramètres — feuille de route et état livré, Vérifications, État des huit exigences

### Community 174 - "DesignSystemGenerator"
Cohesion: 0.06
Nodes (13): DesignSystemGenerator, apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action(), TestReasoningMatch, read_rows(), split_values() (+5 more)

### Community 175 - "ring"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 176 - "Clôture de caisse — 10 novembre 2026"
Cohesion: 0.50
Nodes (3): Clôture de caisse — 10 novembre 2026, Utilisation, Vérification reproductible

### Community 177 - "pdfDevis.ts"
Cohesion: 0.08
Nodes (22): statusLabels, Bon de livraison — modèle photographique, Champs et sources actuelles, Présentation retenue, Repères pour la suite, Règles à préserver lors de l'implémentation, API et persistance, Conversion et articles à commander (+14 more)

### Community 181 - "Création et modification des fournisseurs — 6 novembre 2026"
Cohesion: 0.40
Nodes (4): Captures, Contrat, Création et modification des fournisseurs — 6 novembre 2026, Vérification reproductible

### Community 191 - "Administration des paramètres"
Cohesion: 0.25
Nodes (8): Administration des paramètres, API, Cloudflare Turnstile, HTTPS et terminaux, Installation et mise à jour, Rubriques et règles, Récupération hors interface, Validation reproductible

### Community 194 - "fondsCaisseSchema"
Cohesion: 0.67
Nodes (4): caisseOuvertureComptageSchema(), caisseOuvertureSchema(), optionalText(), fondsCaisseSchema()

### Community 195 - "mysql2"
Cohesion: 0.18
Nodes (6): dotenv, mysql2, normalized, raw, statements, today

### Community 196 - "Consultation des PDF dans l’application — 28 novembre 2026"
Cohesion: 0.20
Nodes (7): test:errors, test:pdf, Consultation des PDF dans l’application — 28 novembre 2026, Documents et rendu natif, Interface, Preuves de personnalisation des documents PDF, Reproduction

### Community 198 - "toNullableNumber"
Cohesion: 0.67
Nodes (3): optionalRef(), requiredRef(), toNullableNumber()

### Community 204 - "Constats prioritaires"
Cohesion: 0.18
Nodes (11): Constats prioritaires, Périmètre et méthode, R01 — P1 — Le comptoir encaisse le HT alors que la facture réclame le TTC, R02 — P1 — Une monnaie arbitraire permet une recette nulle ou négative, R03 — P1 — Un prix accepté peut rompre sa propre empreinte après stockage, R04 — P1 — Le contrôle fiscal déclare intact un préfixe seulement, R05 — P1 — Deux ouvertures peuvent créer deux caisses pour le même compte, R06 — P1 — L'archive annuelle refuse une chaîne intacte entre deux années (+3 more)

### Community 206 - "Autres défauts confirmés"
Cohesion: 0.25
Nodes (8): Autres défauts confirmés, R08 — P2 — Le journal soustrait deux fois la monnaie rendue, R09 — P2 — Une empreinte manquante récente est qualifiée d'historique ancien, R10 — P2 — StrictMode laisse des référentiels vides dans les formulaires, R11 — P2 — Actualiser Caisse ne recharge pas son journal, R13 — P2 — La recherche de tokens boucle sans fin à la racine Windows, R14 — P2 — Trois scripts absents empêchent la suite d'outils de se charger, R16 — P2 — Le générateur de design ignore la couleur de texte contrastée

## Knowledge Gaps
- **92 isolated node(s):** `RFC-5321`, `./server/services/settingsStore.ts`, `Banner Design Skill`, `Documentation Workflow and Formats`, `Code Documenter Skill` (+87 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1628 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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

- **Why does `OpenStrass Project Handoff` connect `Project Handoff Documentation` to `NPM Build And Database Scripts`, `toErrorMessage`, `Consultation des PDF dans l’application — 28 novembre 2026`, `Inventaire physique par référence`, `OpenStrass Initial Requirements`, `Création et modification des clients — 6 novembre 2026`, `OpenStrass`, `Clôture de caisse — 10 novembre 2026`, `pdfDevis.ts`, `Audit des fichiers inutiles — 13 novembre 2026`, `test-pdf-commercial.ts`, `Création et modification des fournisseurs — 6 novembre 2026`, `PdfmakeInstance`, `Correctifs de la revue intégrale — 14 novembre 2026`, `Analyse de Microsoft TokenEconomizer`, `Security Review Findings`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `TestTailwindConfigGenerator`) actually correct?**
  _`TailwindConfigGenerator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-5321`, `./server/services/settingsStore.ts`, `Banner Design Skill` to the rest of the system?**
  _92 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shadcn Component Installer` be split into smaller, more focused modules?**
  _Cohesion score 0.053555750658472345 - nodes in this community are weakly interconnected._
- **Why does `TailwindConfigGenerator` connect `Tailwind Theme Validation` to `.write_config`, `Tailwind Breakpoint Tests`, `Tailwind Plugin Configuration`, `.add_colors`, `.recommend_plugins`, `.generate_config_string`, `Tailwind Generator Defaults`, `json`, `Tailwind Font And Spacing Config`, `Tailwind Configuration Tests`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `scripts/core.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05563093622795115 - nodes in this community are weakly interconnected._
- **Should `validate_data.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06398390342052314 - nodes in this community are weakly interconnected._