# Graph Report - autostrass_app  (2026-10-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2093 nodes · 4051 edges · 142 communities (91 shown, 51 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 62 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e7f77de2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- contracts.ts
- resourceRoutes.ts
- scripts/core.py
- slide_search_core.py
- design_system.py
- gray
- pathlib
- schema.ts
- uipro-search.mjs
- VentesComptoirView.tsx
- validate_data.py
- LivraisonsView.tsx
- spacing
- App.tsx
- auth.ts
- referentielRepositories.ts
- html-token-validator.py
- TestTailwindConfigGenerator
- schemas/index.ts
- VehiculesView.tsx
- CatalogueView.tsx
- server/index.ts
- crud.ts
- test_core_data_quality.py
- generate-slide.py
- cashRegisterRepository.ts
- package.json
- TailwindConfigGenerator
- test_design_system_mode.py
- documentRepositories.ts
- test_style_taxonomy.py
- scripts
- RetoursView.tsx
- compilerOptions
- fetch-background.py
- color
- read_rows
- csrf.ts
- DesignSystemGenerator
- sanitize.ts
- cip/core.py
- verify-caisse.ts
- schema_step2.ts
- compilerOptions
- cip/generate.py
- fontSize
- test-api.ts
- extract-colors.cjs
- TestShadcnInstaller
- .generate
- CatalogRefreshTest
- verify-repositories.ts
- CashRegisterRepository
- validate-asset.cjs
- TestWebStackFreshness
- devDependencies
- livraisonRepository.ts
- compilerOptions
- generate_icon
- design-tokens-starter.json
- ShadcnInstaller
- TestDomainDetection
- TestSearchDomains
- dependencies
- toRepositoryError
- scripts/search.py
- test_text_layout_resilience.py
- embed-tokens.cjs
- validate-tokens.cjs
- card
- _select_palette_for_mode
- render-html.py
- inject-brand-context.cjs
- primitive
- TestNativeDesktopStackFreshness
- archive-fiscal.ts
- sync-brand-to-tokens.cjs
- generate-tokens.cjs
- button
- TestStyleTaxonomy
- TestGeneratedConfigIsValidJs
- _palette_is_dark
- input
- radius
- .oxlintrc.json
- _run
- generate_logo
- TestThresholdGate
- CommandesClientsView.tsx
- shadow
- TestTokenizer
- split_values
- TestLandingAndStackContract
- ErrorSummary.tsx
- $type
- radius
- lg
- TestBm25CoreBehavior
- padding-y
- xl
- md
- none
- TestFixtureValidation
- destructive
- destructive-foreground
- muted
- primary-foreground
- ring
- secondary-foreground
- TestDiagnosticsContracts
- tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `TailwindConfigGenerator` - 58 edges
2. `TestTailwindConfigGenerator` - 35 edges
3. `DesignSystemGenerator` - 35 edges
4. `ShadcnInstaller` - 34 edges
5. `Icon()` - 34 edges
6. `react` - 30 edges
7. `createApiRouter()` - 27 edges
8. `TestShadcnInstaller` - 26 edges
9. `VentesComptoirView()` - 25 edges
10. `DataTable()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `handleSubmit()` --indirect_call--> `email()`  [INFERRED]
  src/views/LoginView.tsx → server/middleware/schemas.ts
- `archive()` --calls--> `verifyFingerprints()`  [EXTRACTED]
  scripts/archive-fiscal.ts → server/middleware/compliance.ts
- `verify()` --calls--> `verifyFingerprints()`  [EXTRACTED]
  scripts/archive-fiscal.ts → server/middleware/compliance.ts
- `TestTailwindConfigGenerator` --uses--> `TailwindConfigGenerator`  [INFERRED]
  .github/prompts/ui-styling/scripts/tests/test_tailwind_config_gen.py → .github/prompts/ui-styling/scripts/tailwind_config_gen.py
- `TestGeneratedConfigIsValidJs` --uses--> `TailwindConfigGenerator`  [INFERRED]
  .github/prompts/ui-styling/scripts/tests/test_tailwind_config_gen.py → .github/prompts/ui-styling/scripts/tailwind_config_gen.py

## Import Cycles
- None detected.

## Communities (142 total, 51 thin omitted)

### Community 0 - "contracts.ts"
Cohesion: 0.05
Nodes (62): AuthContext, AuthContextValue, AuthStatus, SessionUser, AuthProvider(), toAuthError(), CashState, useCashMovements() (+54 more)

### Community 1 - "resourceRoutes.ts"
Cohesion: 0.05
Nodes (61): RFC-5321, CLIENT_TYPES, DELIVERY_STATUSES, ORDER_STATUSES, PAYMENT_MODES, USER_ROLES, VEHICLE_STATUSES, VEHICLE_TYPES (+53 more)

### Community 2 - "scripts/core.py"
Cohesion: 0.06
Nodes (31): BM25, _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature() (+23 more)

### Community 3 - "slide_search_core.py"
Cohesion: 0.06
Nodes (23): BM25, _load_csv(), _search_csv(), BM25, _load_csv(), _search_csv(), format_context(), format_result() (+15 more)

### Community 4 - "design_system.py"
Cohesion: 0.06
Nodes (19): ansi_ljust(), _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides() (+11 more)

### Community 5 - "gray"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 6 - "pathlib"
Cohesion: 0.07
Nodes (6): format_brief(), format_results(), main(), load_env(), load_env(), main()

### Community 7 - "schema.ts"
Cohesion: 0.04
Nodes (46): ArticleRef, CASH_BREAK_DENOMINATIONS, CASH_MOVEMENT_TYPES, CASH_SESSION_STATUSES, CashBreakDenomination, cashMovements, cashMovementsRelations, CashMovementType (+38 more)

### Community 8 - "uipro-search.mjs"
Cohesion: 0.06
Nodes (29): dotenv, mysql2, normalized, raw, statements, splitDrizzleKitStatements(), splitStatements(), hasDatabaseConfig (+21 more)

### Community 9 - "VentesComptoirView.tsx"
Cohesion: 0.19
Nodes (30): ConfirmDialog(), DataTable(), ErrorSummary(), FormInput(), FormSelect(), PageLayout(), ResourceBanners(), canWrite() (+22 more)

### Community 10 - "validate_data.py"
Cohesion: 0.10
Nodes (32): _catalog_date(), _check_app_interface_contract(), _check_catalog_contract(), _check_catalog_summary(), _check_chart_contract(), _check_color_contract(), _check_core_data_contract(), _check_file() (+24 more)

### Community 11 - "LivraisonsView.tsx"
Cohesion: 0.09
Nodes (25): react, ConfirmDialogProps, ColumnDef, compare(), DataTableProps, SortAccessor, PageLayoutProps, Toast (+17 more)

### Community 12 - "spacing"
Cohesion: 0.06
Nodes (34): $type, $value, $type, $value, $type, $value, $type, $value (+26 more)

### Community 13 - "App.tsx"
Cohesion: 0.11
Nodes (25): react-router-dom, App(), AppContent(), getStoredTheme(), getSystemTheme(), initials(), navigation, roleLabel() (+17 more)

### Community 14 - "auth.ts"
Cohesion: 0.12
Nodes (21): bcryptjs, jose, AUTH_COOKIE, authenticate(), AuthenticatedRequest, AuthenticatedUser, AuthError, hashPassword() (+13 more)

### Community 15 - "referentielRepositories.ts"
Cohesion: 0.09
Nodes (10): ClientInput, ClientRepository, ClientRow, mapClient(), mapVehicule(), Tables, VehiculeInput, VehiculeRepository (+2 more)

### Community 16 - "html-token-validator.py"
Cohesion: 0.12
Nodes (12): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+4 more)

### Community 18 - "schemas/index.ts"
Cohesion: 0.09
Nodes (20): formatDenomination(), CaisseClotureFormValues, caisseClotureSchema, CaisseOuvertureFormValues, caisseOuvertureSchema, CartLineFormValues, cartLineSchema, ComptageLineFormValues (+12 more)

### Community 19 - "VehiculesView.tsx"
Cohesion: 0.09
Nodes (24): CARRIER_OPTIONS, CASH_DENOMINATIONS, CASH_MOVEMENT_LABELS, CLIENT_TYPE_OPTIONS, DELIVERY_STATUS_OPTIONS, denomination, euros, formatInteger() (+16 more)

### Community 20 - "CatalogueView.tsx"
Cohesion: 0.10
Nodes (22): @hookform/resolvers, react-hook-form, CommonProps, FieldRegister, FieldRegistration, FormTextarea(), InputProps, RegisterOptions (+14 more)

### Community 21 - "server/index.ts"
Cohesion: 0.12
Nodes (17): express, app, emptyDashboard, hasDatabaseConfig, LowStockItem, port, errorHandler(), securityHeaders() (+9 more)

### Community 22 - "crud.ts"
Cohesion: 0.21
Nodes (19): zod, UserRole, requireRole(), CAISSE_WRITE, createComplianceRouter(), SaleForFingerprint, crudRoutes(), Db (+11 more)

### Community 23 - "test_core_data_quality.py"
Cohesion: 0.15
Nodes (10): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, _check_typography_contract(), _configured_font_names(), _declared_weights() (+2 more)

### Community 24 - "generate-slide.py"
Cohesion: 0.13
Nodes (11): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+3 more)

### Community 25 - "cashRegisterRepository.ts"
Cohesion: 0.12
Nodes (17): CashBreak, CashCountRow, CashMovementRow, CashSessionRow, Tables, Tx, toHttpError(), unwrap() (+9 more)

### Community 26 - "package.json"
Cohesion: 0.10
Nodes (18): name, private, type, version, concurrently, drizzle-kit, oxlint, react-dom (+10 more)

### Community 28 - "test_design_system_mode.py"
Cohesion: 0.14
Nodes (6): _filter_anti_patterns_for_mode(), _query_wants_dark(), _resolve_color_mode(), _style_is_dark_primary(), TestAntiPatternGating, TestModeResolution

### Community 29 - "documentRepositories.ts"
Cohesion: 0.18
Nodes (19): baseLine(), CommandeRow, createCommandeRepository(), createReceptionRepository(), createRetourRepository(), createVenteRepository(), DocumentLine, DocumentMapping (+11 more)

### Community 31 - "scripts"
Cohesion: 0.10
Nodes (20): scripts, build, caisse:fermer, db:generate, db:migrate, db:seed, db:studio, dev (+12 more)

### Community 32 - "RetoursView.tsx"
Cohesion: 0.11
Nodes (17): Options, ResourceState, shouldDegrade(), RETURN_REASON_OPTIONS, today(), DocumentLineFormValues, ReceptionFormValues, receptionSchema (+9 more)

### Community 33 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 34 - "fetch-background.py"
Cohesion: 0.16
Nodes (9): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+1 more)

### Community 35 - "color"
Cohesion: 0.11
Nodes (19): $type, $value, background, foreground, muted-foreground, primary, primary-hover, secondary (+11 more)

### Community 36 - "read_rows"
Cohesion: 0.16
Nodes (3): read_rows(), TestGeneratedCatalogContract, TestReasoningContract

### Community 37 - "csrf.ts"
Cohesion: 0.16
Nodes (16): Bucket, bucketKey(), buckets, clientKey(), CSRF_COOKIE_NAME, CSRF_HEADER, generateCsrfToken(), issueCsrfCookie() (+8 more)

### Community 38 - "DesignSystemGenerator"
Cohesion: 0.18
Nodes (3): DesignSystemGenerator, TestReasoningMatch, TestEndToEndCoherence

### Community 39 - "sanitize.ts"
Cohesion: 0.14
Nodes (14): findMarkupInjection(), INJECTION_COUNTS, INJECTION_PATTERNS, InjectionKind, normalizeText(), reportInjection(), sanitizeEnum(), SanitizeReport (+6 more)

### Community 40 - "cip/core.py"
Cohesion: 0.18
Nodes (7): detect_domain(), get_cip_brief(), search(), search_all(), detect_domain(), search(), search_all()

### Community 41 - "verify-caisse.ts"
Cohesion: 0.12
Nodes (14): apres, avant, carte, CashSession, cloture, comptageExact, courante, login (+6 more)

### Community 42 - "schema_step2.ts"
Cohesion: 0.12
Nodes (15): AUDIT_ACTIONS, AuditAction, commandeFournisseurLines, commandesFournisseurs, DELIVERY_MODES, DeliveryMode, emplacements, fournisseurs (+7 more)

### Community 43 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 44 - "cip/generate.py"
Cohesion: 0.19
Nodes (7): build_cip_prompt(), check_logo_required(), generate_cip_set(), generate_with_nano_banana(), load_env(), load_logo_image(), main()

### Community 45 - "fontSize"
Cohesion: 0.12
Nodes (16): $type, $value, $type, $value, $type, $value, $type, $value (+8 more)

### Community 46 - "test-api.ts"
Cohesion: 0.13
Nodes (13): adminId, clientId, clientPourAvoir, csrfFromCookie(), fuite, login(), metiers, nouveauClient (+5 more)

### Community 47 - "extract-colors.cjs"
Cohesion: 0.20
Nodes (11): calculateCompliance(), colorDistance(), displayPalette(), extractHexColors(), findNearestBrandColor(), fs, generateImageMagickCommand(), hexToRgb() (+3 more)

### Community 51 - "verify-repositories.ts"
Cohesion: 0.14
Nodes (13): drizzle-orm, clients, commandes, leaked, livraisons, receptions, retours, users (+5 more)

### Community 52 - "CashRegisterRepository"
Cohesion: 0.28
Nodes (3): CashRegisterRepository, round2(), toDecimal()

### Community 53 - "validate-asset.cjs"
Cohesion: 0.25
Nodes (13): checkManifest(), formatBytes(), formatOutput(), fs, main(), parseFilename(), path, RULES (+5 more)

### Community 55 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, concurrently, drizzle-kit, oxlint, tsx, @types/bcryptjs, @types/express, @types/node (+6 more)

### Community 56 - "livraisonRepository.ts"
Cohesion: 0.19
Nodes (5): LivraisonInput, LivraisonRepository, LivraisonRow, mapLivraison(), Tables

### Community 57 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleResolution, noEmit, noUnusedLocals, noUnusedParameters, skipLibCheck (+5 more)

### Community 58 - "generate_icon"
Cohesion: 0.19
Nodes (7): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), main()

### Community 59 - "design-tokens-starter.json"
Cohesion: 0.15
Nodes (12): component, $type, $value, dark, semantic, $schema, $type, $value (+4 more)

### Community 63 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, bcryptjs, dotenv, drizzle-orm, express, @hookform/resolvers, jose, mysql2 (+5 more)

### Community 64 - "toRepositoryError"
Cohesion: 0.24
Nodes (3): DocumentRepository, toLine(), toRepositoryError()

### Community 65 - "scripts/search.py"
Cohesion: 0.17
Nodes (3): format_output(), generate_design_brief(), format_output()

### Community 66 - "test_text_layout_resilience.py"
Cohesion: 0.18
Nodes (3): read_rows(), TestTextLayoutDataContracts, TestTextLayoutRetrieval

### Community 67 - "embed-tokens.cjs"
Cohesion: 0.17
Nodes (8): args, fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath, wrapStyle

### Community 68 - "validate-tokens.cjs"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 69 - "card"
Cohesion: 0.20
Nodes (12): $type, $value, bg, bg, padding, shadow, card, bg (+4 more)

### Community 72 - "_select_palette_for_mode"
Cohesion: 0.24
Nodes (4): _contrast_ratio(), _derive_dark_palette(), _select_palette_for_mode(), TestPaletteSelection

### Community 73 - "render-html.py"
Cohesion: 0.24
Nodes (4): generate_html(), get_deliverable_info(), get_image_base64(), main()

### Community 74 - "inject-brand-context.cjs"
Cohesion: 0.31
Nodes (10): extractColorsFromTable(), extractCoreAttributes(), extractHexColors(), extractImageStyle(), extractTypography(), extractVoice(), fs, generatePromptAddition() (+2 more)

### Community 75 - "primitive"
Cohesion: 0.18
Nodes (11): fast, normal, slow, $type, $value, $type, $value, primitive (+3 more)

### Community 77 - "archive-fiscal.ts"
Cohesion: 0.29
Nodes (6): archive(), hasConfig, verify(), fingerprintVente(), GENESIS_HASH, verifyFingerprints()

### Community 79 - "sync-brand-to-tokens.cjs"
Cohesion: 0.29
Nodes (8): adjustBrightness(), { execFileSync }, extractColorsFromMarkdown(), fs, generateColorScale(), main(), path, updateDesignTokens()

### Community 80 - "generate-tokens.cjs"
Cohesion: 0.36
Nodes (9): flattenTokens(), fs, generateCSS(), generateTailwind(), main(), parseArgs(), path, resolveReference() (+1 more)

### Community 81 - "button"
Cohesion: 0.20
Nodes (10): fg, font-size, hover-bg, button, $type, $value, $type, $value (+2 more)

### Community 85 - "_palette_is_dark"
Cohesion: 0.31
Nodes (3): _palette_is_dark(), _relative_luminance(), TestLuminance

### Community 86 - "input"
Cohesion: 0.29
Nodes (8): padding-x, input, $type, $value, focus-ring, padding-x, $type, $value

### Community 87 - "radius"
Cohesion: 0.29
Nodes (8): $type, $value, $type, $value, radius, default, full, default

### Community 88 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): ignorePatterns, plugins, rules, react/incompatible-library, react/only-export-components, react/rules-of-hooks, $schema

### Community 89 - "_run"
Cohesion: 0.29
Nodes (3): _run(), test_flags_hardcoded_hex_sharing_line_with_token(), test_token_only_line_reports_no_violation()

### Community 90 - "generate_logo"
Cohesion: 0.33
Nodes (4): enhance_prompt(), generate_batch(), generate_logo(), main()

### Community 92 - "CommandesClientsView.tsx"
Cohesion: 0.29
Nodes (6): ORDER_STATUS_OPTIONS, CommandeFormValues, commandeSchema, byDateDesc(), EMPTY_COMMANDE, EMPTY_LINE

### Community 93 - "shadow"
Cohesion: 0.47
Nodes (6): sm, shadow, sm, sm, $type, $value

### Community 95 - "split_values"
Cohesion: 0.47
Nodes (3): split_values(), style_identities(), TestStyleIdentityContract

### Community 97 - "ErrorSummary.tsx"
Cohesion: 0.40
Nodes (5): buildItems(), ErrorItem, ErrorRecord, ErrorSummaryProps, readMessage()

### Community 98 - "$type"
Cohesion: 0.60
Nodes (5): $type, $value, border, border, border

### Community 99 - "radius"
Cohesion: 0.60
Nodes (5): radius, radius, radius, $type, $value

### Community 100 - "lg"
Cohesion: 0.60
Nodes (5): lg, $type, $value, lg, lg

### Community 103 - "padding-y"
Cohesion: 0.67
Nodes (4): padding-y, padding-y, $type, $value

### Community 104 - "xl"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 105 - "md"
Cohesion: 0.67
Nodes (4): $type, $value, md, md

### Community 106 - "none"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

### Community 109 - "destructive"
Cohesion: 0.67
Nodes (3): destructive, $type, $value

### Community 110 - "destructive-foreground"
Cohesion: 0.67
Nodes (3): destructive-foreground, $type, $value

### Community 111 - "muted"
Cohesion: 0.67
Nodes (3): muted, $type, $value

### Community 112 - "primary-foreground"
Cohesion: 0.67
Nodes (3): primary-foreground, $type, $value

### Community 113 - "ring"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 114 - "secondary-foreground"
Cohesion: 0.67
Nodes (3): secondary-foreground, $type, $value

## Knowledge Gaps
- **484 isolated node(s):** `CashState`, `UseCatalogueResult`, `UseDashboardResult`, `CacheEntry`, `StockSortKey` (+479 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 918 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `zod` connect `crud.ts` to `resourceRoutes.ts`, `package.json`, `schemas/index.ts`, `App.tsx`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `TailwindConfigGenerator` connect `TailwindConfigGenerator` to `.test_recommend_plugins`, `.test_recommend_plugins_nextjs`, `.test_generate_typescript_config`, `.test_generate_javascript_config`, `.test_generate_config_with_colors`, `.test_validate_config_valid`, `pathlib`, `.test_validate_config_empty_theme`, `.test_validate_config_no_content`, `.test_full_configuration_typescript`, `.test_full_configuration_javascript`, `.test_default_content_paths_react`, `.test_default_content_paths_nextjs`, `.test_add_colors`, `.test_write_config_invalid_path`, `TestTailwindConfigGenerator`, `.generate_config_string`, `._base_config`, `TestGeneratedConfigIsValidJs`, `.test_add_fonts`, `.test_add_spacing`, `.test_add_breakpoints`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `drizzle-orm` connect `verify-repositories.ts` to `resourceRoutes.ts`, `schema.ts`, `schema_step2.ts`, `referentielRepositories.ts`, `crud.ts`, `livraisonRepository.ts`, `cashRegisterRepository.ts`, `package.json`, `documentRepositories.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `TestTailwindConfigGenerator`) actually correct?**
  _`TailwindConfigGenerator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `DesignSystemGenerator` (e.g. with `TestReasoningMatch` and `TestReasoningContract`) actually correct?**
  _`DesignSystemGenerator` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CashState`, `UseCatalogueResult`, `UseDashboardResult` to the rest of the system?**
  _484 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `contracts.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.051615051615051616 - nodes in this community are weakly interconnected._