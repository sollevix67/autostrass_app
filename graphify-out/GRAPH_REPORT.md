# Graph Report - autostrass_app  (2026-11-21)

## Corpus Check
- Large corpus: 545 files · ~460,011 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 3389 nodes · 7172 edges · 207 communities (164 shown, 43 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 246 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a7c539dc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- FiscalArchiveBuilder
- referentielRepositories.ts
- SimpleRepository
- toRepositoryError
- schemas/parametres.ts
- RepositoryError
- test-inventaires.ts
- ArticleRepository
- Shadcn Component Installer
- scripts/core.py
- schemas.ts
- schema_step2.ts
- test-client-siret.ts
- _select_palette_for_mode
- devisRepository.ts
- Document Data Repositories
- BM25
- auth.ts
- TestNativeDesktopStackFreshness
- test-vente-validation.ts
- test_core.py
- BM25
- test-devis.ts
- TestSearchDomains
- schemas/index.ts
- design_system.py
- test_text_layout_resilience.py
- _check_font_catalog
- test_style_taxonomy.py
- TurnstileForm.tsx
- archive-fiscal.ts
- test-stock-transfers.ts
- sanitize.ts
- read_rows
- FingerprintVerifier
- test_relevance_evaluator.py
- TestTokenizer
- DesignSystemGenerator
- TestTokenAncestorLookup
- BM25
- split_values
- TestLandingAndStackContract
- Toast.tsx
- csrf.ts
- HTML Token Validation
- validation.ts
- Cash Register Repository
- Tailwind Configuration Tests
- InventaireView.tsx
- toErrorMessage
- _palette_is_dark
- test_core_data_quality.py
- Cash Compliance Verification
- contracts.ts
- Catalog Refresh Contract Tests
- frenchValidation.ts
- Tailwind Theme Validation
- Web Stack Freshness Tests
- App.tsx
- VentesComptoirView.tsx
- server/index.ts
- Tailwind Breakpoint Tests
- TestDomainDetection
- react
- simpleRepositories.ts
- pdfInvoice.ts
- test-environment.ts
- Cash Database Schema
- DevisView.tsx
- PdfmakeInstance
- test-fournisseurs.ts
- CaisseView.tsx
- Python Tooling Test Imports
- refresh-icon-catalog.py
- slide_search_core.py
- test-dev-processes.mjs
- ref_node_assert
- logo/search.py
- Correctifs de la revue intégrale — 14 novembre 2026
- search-slides.py
- Brand Asset Generators
- fondsCaisseSchema
- parse_decision_rules
- email
- validate_data.py
- _load_csv
- cip/generate.py
- evaluate-relevance.py
- HTML Slide Deck Generation
- Slide Background Image Generation
- test-caisse-ui.mjs
- refresh-google-fonts.py
- uipro-search.mjs
- API Security Integration Tests
- Brand Color Extraction
- review-accessibility-ui.mjs
- Asset Validation CLI
- logo/core.py
- test-fiscal-integrity.ts
- Design Token Embedding Script
- Design Token Validation CLI
- Brand Context Injection
- pdfDevis.ts
- Brand Token Synchronization
- Design Token Code Generation
- dev-processes.mjs
- Application Architecture README
- Project Handoff Documentation
- Application Feature Roadmap
- Slide Copywriting Formulas
- CIP Style Taxonomy
- Security Review Findings
- HTML Slide Template
- Zod Authentication Connections
- Protected Route Schema Flow
- Backend Zod Route Flow
- Oxlint Rule Configuration
- Common ARIA patterns
- Understandable
- Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?
- Audit des fichiers inutiles — 13 novembre 2026
- slides-create.md
- button
- Extra Large Size Tokens
- No Color Style Tokens
- Common issues by impact
- Testing checklist
- formulaires-modaux.md
- input
- TypeScript Project References
- Analyse de Microsoft TokenEconomizer
- Primitive Spacing Tokens
- Constats prioritaires
- $type
- radius
- lg
- Inventaire physique par référence
- Création et modification des clients — 6 novembre 2026
- sm
- Administration des paramètres
- padding-y
- ring
- Clôture de caisse — 10 novembre 2026
- 16
- WCAG 2.2 Quick Reference
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
- test-stock-transfer-validation.ts
- Autres défauts confirmés
- Accessibility Code Patterns
- package.json
- NPM Build And Database Scripts
- Application TypeScript Configuration
- color
- Repository Guidelines
- Operable
- Node TypeScript Configuration
- Typography Scale Tokens
- Primitive Color Palette
- Server TypeScript Configuration
- design-tokens-starter.json
- dependencies
- card
- Motion Duration Tokens
- Accessibility (a11y)
- PRODUCT.md — Module Stock (autostrass)
- CIP Mockup Prompt Engineering
- Border Radius Tokens
- Design Skill References
- Banner Design Guidelines
- Brand And Design Guidelines
- Visual Design Skill Guides
- Documentation Authoring Guide
- Code Review Security Guide
- Hypothesis Driven Debugging
- Full Stack Security Guidance
- Accessible React Development
- Testing Strategy Skill
- Type Safe API Design
- Social Image Design Guidance
- Autostrass Design System Master
- Slide Visualization Guidelines
- UI Interaction State Tokens
- UI Styling Dependencies
- UI Design System Guidance
- Vite React HTML Entry
- Apache License Terms
- Favicon SVG Asset
- Bon de livraison — modèle photographique

## God Nodes (most connected - your core abstractions)
1. `TailwindConfigGenerator` - 58 edges
2. `toErrorMessage()` - 52 edges
3. `react` - 52 edges
4. `Icon()` - 50 edges
5. `PageLayout()` - 46 edges
6. `FormInput()` - 43 edges
7. `AppContent()` - 39 edges
8. `useToast()` - 39 edges
9. `FormDialog()` - 39 edges
10. `DesignSystemGenerator` - 38 edges

## Surprising Connections (you probably didn't know these)
- `Stockage et sauvegarde` --references--> `updatedAt()`  [INFERRED]
  specs/parametres.md → server/db/schema.ts
- `Améliorations complémentaires` --references--> `readMessage()`  [INFERRED]
  specs/accessibilite-wcag-review.md → src/components/forms/ErrorSummary.tsx
- `Création et modification des clients — 6 novembre 2026` --references--> `useResource()`  [INFERRED]
  specs/client-modal.md → src/hooks/useResource.ts
- `R12 — P2 — Une panne SQL est renvoyée comme une authentification invalide` --references--> `AuthError`  [INFERRED]
  specs/revue-code-2026-11-14.md → server/middleware/auth.ts
- `R12 — P2 — Une panne SQL est renvoyée comme une authentification invalide` --references--> `requireAuth()`  [INFERRED]
  specs/revue-code-2026-11-14.md → server/middleware/auth.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three-Layer Design Token Architecture** — _github_prompts_design_system_references_primitive_tokens_primitive_tokens, _github_prompts_design_system_references_semantic_tokens_semantic_tokens, _github_prompts_design_system_references_component_tokens_component_tokens [EXTRACTED 1.00]
- **Strategic HTML Slide Authoring** — github_prompts_slides_skill_slides_skill, github_prompts_slides_references_copywriting_formulas_copywriting_formulas, github_prompts_slides_references_layout_patterns_slide_layout_patterns, github_prompts_slides_references_html_template_html_slide_template, github_prompts_slides_references_slide_strategies_slide_strategies [EXTRACTED 1.00]
- **Social Image HTML Design and Screenshot QA Workflow** — github_prompts_design_references_social_photos_design_social_photos_design_guide, github_prompts_design_references_social_photos_design_html_screenshot_workflow, github_prompts_design_references_social_photos_design_safe_zones_visual_qa, github_prompts_design_references_social_photos_design_platform_image_sizes [EXTRACTED 1.00]
- **UI Styling Component, Utility, and Canvas Layers** — github_prompts_ui_styling_skill_ui_styling_skill, github_prompts_ui_styling_skill_component_layer, github_prompts_ui_styling_skill_tailwind_styling_layer, github_prompts_ui_styling_skill_canvas_visual_layer [EXTRACTED 1.00]

## Communities (207 total, 43 thin omitted)

### Community 202 - "FiscalArchiveBuilder"
Cohesion: 0.60
Nodes (3): FiscalArchiveBuilder, archive(), archive()

### Community 27 - "referentielRepositories.ts"
Cohesion: 0.18
Nodes (10): ClientRepository, ClientInput, ClientRow, FournisseurInput, FournisseurRow, Tables, VehiculeInput, VehiculeRow (+2 more)

### Community 93 - "SimpleRepository"
Cohesion: 0.08
Nodes (10): LivraisonRepository, FournisseurRepository, VehiculeRepository, SimpleRepository, LivraisonInput, LivraisonRow, Tables, mapLivraison() (+2 more)

### Community 160 - "toRepositoryError"
Cohesion: 0.23
Nodes (4): DocumentRepository, CommandeRepository, toLine(), toRepositoryError()

### Community 114 - "schemas/parametres.ts"
Cohesion: 0.08
Nodes (38): ParametreRepository, Input, ReferentielKind, Settings, ApiLimits, DatabaseSettings, HttpsSettings, LoginLimits (+30 more)

### Community 29 - "RepositoryError"
Cohesion: 0.17
Nodes (7): DevisRepository, RepositoryError, mapLine(), mapProcurement(), parseSnapshot(), generateDocumentNumber(), venteTotals()

### Community 67 - "test-inventaires.ts"
Cohesion: 0.12
Nodes (10): InventaireRepository, Session, AuthenticatedUser, InventaireInput, ApiInventaire, ApiInventairePreparation, mapInventaire(), inventaireSchema (+2 more)

### Community 90 - "ArticleRepository"
Cohesion: 0.29
Nodes (3): ArticleRepository, mapRow(), toNumber()

### Community 0 - "Shadcn Component Installer"
Cohesion: 0.05
Nodes (3): ShadcnInstaller, TestShadcnInstaller, main()

### Community 1 - "scripts/core.py"
Cohesion: 0.06
Nodes (31): BM25, _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature() (+23 more)

### Community 10 - "schemas.ts"
Cohesion: 0.05
Nodes (61): CrudRepository, LinePayload, CaisseCloture, CaisseOuverture, ClientInput, ClientPatch, CommandeInput, CommandePatch (+53 more)

### Community 100 - "schema_step2.ts"
Cohesion: 0.12
Nodes (15): AuditAction, DeliveryMode, LocationLevel, SupplierOrderStatus, AUDIT_ACTIONS, commandeFournisseurLines, commandesFournisseurs, DELIVERY_MODES (+7 more)

### Community 111 - "test-client-siret.ts"
Cohesion: 0.12
Nodes (8): Session, Session, input(), client, client, clientPatchSchema, clientSchema, clientUpdateSchema

### Community 113 - "_select_palette_for_mode"
Cohesion: 0.29
Nodes (3): TestPaletteSelection, _derive_dark_palette(), _select_palette_for_mode()

### Community 116 - "devisRepository.ts"
Cohesion: 0.08
Nodes (21): DevisStatus, Actor, ArticleACommanderRow, ConversionResult, DevisClientSnapshot, DevisConversionInput, DevisInput, DevisLine (+13 more)

### Community 12 - "Document Data Repositories"
Cohesion: 0.12
Nodes (27): CommandeRow, DocumentLine, DocumentMapping, LineInput, ReceptionRow, RetourRow, Tables, Transaction (+19 more)

### Community 123 - "auth.ts"
Cohesion: 0.13
Nodes (40): UserRole, AuthenticatedRequest, AuthError, TokenPayload, SaleForFingerprint, Db, ValidationError, DocumentValue (+32 more)

### Community 129 - "test-vente-validation.ts"
Cohesion: 0.11
Nodes (16): TaxedLine, hasCentPrecision(), ventePayment(), body, line, user, devisConversionSchema, devisCreateSchema (+8 more)

### Community 132 - "test_core.py"
Cohesion: 0.09
Nodes (6): TestBm25CoreBehavior, TestDiagnosticsContracts, TestPersistence, format_markdown(), generate_design_system(), format_output()

### Community 134 - "test-devis.ts"
Cohesion: 0.18
Nodes (8): QuoteInput, Session, businessCounts(), fiscalSnapshot(), rows(), stockSnapshot(), dateDevis, validUntil

### Community 14 - "schemas/index.ts"
Cohesion: 0.04
Nodes (46): ArticleFormOutput, ArticleFormValues, CaisseClotureFormOutput, CaisseClotureFormValues, CaisseOuvertureFormOutput, CaisseOuvertureFormValues, CartLineFormOutput, CartLineFormValues (+38 more)

### Community 15 - "design_system.py"
Cohesion: 0.06
Nodes (17): TestAntiPatternGating, TestModeResolution, ansi_ljust(), _detect_page_type(), _filter_anti_patterns_for_mode(), format_ascii_box(), format_master_md(), format_page_override_md() (+9 more)

### Community 151 - "test_text_layout_resilience.py"
Cohesion: 0.18
Nodes (3): TestTextLayoutDataContracts, TestTextLayoutRetrieval, read_rows()

### Community 155 - "_check_font_catalog"
Cohesion: 0.23
Nodes (9): TestGeneratedCatalogContract, _catalog_date(), _check_catalog_contract(), _check_catalog_summary(), _check_font_catalog(), _check_phosphor_catalog(), _imported_weights(), _load_catalog_json() (+1 more)

### Community 159 - "TurnstileForm.tsx"
Cohesion: 0.23
Nodes (9): Turnstile, Window, FieldErrors, loadTurnstile(), TurnstileWidget(), TurnstileForm(), save(), DEMO_ACCOUNTS (+1 more)

### Community 162 - "archive-fiscal.ts"
Cohesion: 0.21
Nodes (10): Anchor, ArchivedSale, ArchiveHeader, ArchiveRecord, FingerprintedSale, FingerprintResult, saleYear(), verify() (+2 more)

### Community 167 - "test-stock-transfers.ts"
Cohesion: 0.18
Nodes (6): Session, ArticleInput, ArticleRow, ArticleRowPacket, call(), transfer()

### Community 17 - "sanitize.ts"
Cohesion: 0.10
Nodes (20): InjectionKind, SanitizeReport, findMarkupInjection(), normalizeText(), reportInjection(), sanitizeEnum(), sanitizeText(), guarded() (+12 more)

### Community 174 - "read_rows"
Cohesion: 0.17
Nodes (3): TestReasoningContract, _resolve_dial(), read_rows()

### Community 177 - "FingerprintVerifier"
Cohesion: 0.31
Nodes (4): FingerprintVerifier, verifyFiscalArchive(), scanFingerprints(), verifyFingerprints()

### Community 178 - "test_relevance_evaluator.py"
Cohesion: 0.12
Nodes (3): TestFixtureValidation, TestMetricMath, TestThresholdGate

### Community 192 - "DesignSystemGenerator"
Cohesion: 0.13
Nodes (4): DesignSystemGenerator, TestReasoningMatch, TestEndToEndCoherence, _contrast_ratio()

### Community 200 - "split_values"
Cohesion: 0.47
Nodes (3): TestStyleIdentityContract, split_values(), style_identities()

### Community 203 - "Toast.tsx"
Cohesion: 0.53
Nodes (4): Toast, ToastApi, ToastTone, ToastContext

### Community 21 - "csrf.ts"
Cohesion: 0.17
Nodes (14): Bucket, bucketKey(), clientKey(), generateCsrfToken(), issueCsrfCookie(), prune(), registerFailure(), rateLimitState() (+6 more)

### Community 23 - "HTML Token Validation"
Cohesion: 0.13
Nodes (12): ValidationResult, validate_file(), validate_html(), get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables() (+4 more)

### Community 25 - "validation.ts"
Cohesion: 0.14
Nodes (18): ArticleBody, EmplacementBody, EmplacementPatch, Niveau, TransfertBody, ValidationResult, notFound(), readNiveau() (+10 more)

### Community 26 - "Cash Register Repository"
Cohesion: 0.16
Nodes (10): CashBreak, CashCountRow, CashMovementRow, CashRegisterRepository, CashSessionRow, Tables, Tx, round2() (+2 more)

### Community 3 - "InventaireView.tsx"
Cohesion: 0.32
Nodes (10): ComptageProps, Comptage(), ComptageForm(), review(), save(), dateLabel(), formatDelta(), Historique() (+2 more)

### Community 4 - "toErrorMessage"
Cohesion: 0.08
Nodes (42): CashState, UseCatalogueResult, Options, ResourceState, StockFilter, StockSortKey, UseStockResult, ApiError (+34 more)

### Community 40 - "_palette_is_dark"
Cohesion: 0.24
Nodes (4): TestLuminance, _palette_is_dark(), _relative_luminance(), _design_coherence()

### Community 42 - "test_core_data_quality.py"
Cohesion: 0.15
Nodes (10): TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, read_rows(), _check_chart_contract(), _check_typography_contract(), _configured_font_names() (+2 more)

### Community 45 - "Cash Compliance Verification"
Cohesion: 0.12
Nodes (14): CashSession, Session, apres, avant, carte, cloture, comptageExact, courante (+6 more)

### Community 5 - "contracts.ts"
Cohesion: 0.06
Nodes (40): AuthContextValue, AuthStatus, SessionUser, UseDashboardResult, ApiArticle, ApiArticleACommander, ApiArticleEmplacements, ApiCashCountLine (+32 more)

### Community 55 - "frenchValidation.ts"
Cohesion: 0.43
Nodes (7): FormControl, installFrenchValidation(), clear(), clearForm(), translate(), isFormControl(), validationMessage()

### Community 60 - "App.tsx"
Cohesion: 0.08
Nodes (48): ThemeMode, IconName, PageLayoutProps, ParametreSlug, Referentiel, ApiClient, ApiParametres, ConfigurationField (+40 more)

### Community 62 - "VentesComptoirView.tsx"
Cohesion: 0.15
Nodes (16): CacheEntry, ApiCommande, ApiVente, CartLine, useCashSession(), fetchOnce(), useClientOptions(), useCommandeOptions() (+8 more)

### Community 63 - "server/index.ts"
Cohesion: 0.14
Nodes (8): LowStockItem, rateLimit(), securityHeaders(), app, emptyDashboard, frontendPath, port, startupSettings

### Community 7 - "react"
Cohesion: 0.06
Nodes (89): ConfirmDialogProps, ColumnDef, DataTableProps, SortAccessor, FormDialogProps, ErrorItem, ErrorRecord, ErrorSummaryProps (+81 more)

### Community 70 - "simpleRepositories.ts"
Cohesion: 0.09
Nodes (19): AnyIdColumn, AnyTable, Tables, Tables, UtilisateurAuth, UtilisateurInput, UtilisateurRepository, UtilisateurRow (+11 more)

### Community 72 - "pdfInvoice.ts"
Cohesion: 0.17
Nodes (12): ClientForPdf, VenteForPdf, formatDate(), formatEuros(), generateVentePdf(), definitions, server, vente (+4 more)

### Community 76 - "test-environment.ts"
Cohesion: 0.06
Nodes (29): ManagedProcess, TestEnvironment, ApiParametres, Session, splitDrizzleKitStatements(), splitStatements(), createTestEnvironment(), applyFixture() (+21 more)

### Community 8 - "Cash Database Schema"
Cohesion: 0.04
Nodes (55): ArticleRef, CashBreakDenomination, CashMovementType, CashSessionStatus, ClientType, DeliveryStatus, OrderStatus, PaymentMode (+47 more)

### Community 81 - "DevisView.tsx"
Cohesion: 0.11
Nodes (35): IconSize, DevisConversionValues, DevisFormValues, ApiDevis, ApiDevisConversion, DevisInput, DevisUpdateInput, Props (+27 more)

### Community 89 - "PdfmakeInstance"
Cohesion: 0.22
Nodes (3): PdfmakeInstance, PdfmakeOutput, pdfmake

### Community 92 - "test-fournisseurs.ts"
Cohesion: 0.20
Nodes (6): Session, empty, full, optionalFields, fournisseurPatchSchema, fournisseurSchema

### Community 97 - "CaisseView.tsx"
Cohesion: 0.09
Nodes (28): CashCountFieldsProps, SelectOption, CaisseSettings, CashCountLine, CashCountFields(), FormTextarea(), formatDenomination(), totalCashCount() (+20 more)

### Community 22 - "Python Tooling Test Imports"
Cohesion: 0.08
Nodes (6): _run(), test_sync_parses_bundled_starter_template(), main(), test_flags_hardcoded_hex_sharing_line_with_token(), test_token_only_line_reports_no_violation(), main()

### Community 108 - "refresh-icon-catalog.py"
Cohesion: 0.35
Nodes (11): checked_date(), fail(), main(), normalize_alias(), normalize_catalog(), read_json(), string_list(), validate_curated() (+3 more)

### Community 11 - "slide_search_core.py"
Cohesion: 0.16
Nodes (9): calculate_pattern_break(), detect_domain(), get_background_config(), get_color_for_emotion(), get_layout_for_goal(), get_typography_for_slide(), _load_decision_csv(), search_with_context() (+1 more)

### Community 115 - "test-dev-processes.mjs"
Cohesion: 0.17
Nodes (5): findDevProcesses(), match(), children, foreignRoot, ownedRoot

### Community 136 - "ref_node_assert"
Cohesion: 0.04
Nodes (43): check(), invalid(), check(), euro(), totals(), vite@^8.3.5, normalized, raw (+35 more)

### Community 156 - "Correctifs de la revue intégrale — 14 novembre 2026"
Cohesion: 0.18
Nodes (10): settings(), createdAt(), updatedAt(), Outils UI-Pro restaurés — 14 novembre 2026, Application locale du 14 novembre, Contrat de vente et migration, Correctifs de la revue intégrale — 14 novembre 2026, Validations reproductibles (+2 more)

### Community 171 - "search-slides.py"
Cohesion: 0.27
Nodes (5): format_context(), format_result(), main(), search(), search_all()

### Community 19 - "Brand Asset Generators"
Cohesion: 0.10
Nodes (13): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+5 more)

### Community 194 - "fondsCaisseSchema"
Cohesion: 0.40
Nodes (6): caisseOuvertureSchema(), optionalText(), caisseOuvertureComptageSchema(), caisseOuvertureSchema(), optionalText(), fondsCaisseSchema()

### Community 195 - "parse_decision_rules"
Cohesion: 0.27
Nodes (4): apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action()

### Community 2 - "validate_data.py"
Cohesion: 0.13
Nodes (25): _check_app_interface_contract(), _check_color_contract(), _check_core_data_contract(), _check_file(), _check_icon_contract(), _check_landing_claims(), _check_motion_contract(), _check_provenance() (+17 more)

### Community 30 - "cip/generate.py"
Cohesion: 0.19
Nodes (7): build_cip_prompt(), check_logo_required(), generate_cip_set(), generate_with_nano_banana(), load_env(), load_logo_image(), main()

### Community 31 - "evaluate-relevance.py"
Cohesion: 0.15
Nodes (18): evaluate(), load_json(), main(), _mean(), oracle_fingerprint(), _result_identity(), runtime_fingerprint(), _stats() (+10 more)

### Community 32 - "HTML Slide Deck Generation"
Cohesion: 0.08
Nodes (15): generate_html(), get_deliverable_info(), get_image_base64(), main(), _e(), generate_chart_slide(), generate_cta_slide(), generate_deck() (+7 more)

### Community 33 - "Slide Background Image Generation"
Cohesion: 0.11
Nodes (12): format_brief(), format_results(), main(), generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url() (+4 more)

### Community 38 - "test-caisse-ui.mjs"
Cohesion: 0.12
Nodes (9): checks, denominations, errors, openingOutput, openingWrites, output, settingsOutput, settingsWrites (+1 more)

### Community 39 - "refresh-google-fonts.py"
Cohesion: 0.10
Nodes (24): detect_domain(), get_cip_brief(), _load_csv(), search(), search_all(), _search_csv(), change_report(), checked_date() (+16 more)

### Community 48 - "uipro-search.mjs"
Cohesion: 0.23
Nodes (11): parseCsv(), score(), search(), tokenize(), args, DATA, domainIndex, DOMAINS (+3 more)

### Community 51 - "API Security Integration Tests"
Cohesion: 0.13
Nodes (13): csrfFromCookie(), login(), adminId, clientId, clientPourAvoir, fuite, metiers, nouveauClient (+5 more)

### Community 52 - "Brand Color Extraction"
Cohesion: 0.20
Nodes (11): calculateCompliance(), colorDistance(), displayPalette(), extractHexColors(), findNearestBrandColor(), generateImageMagickCommand(), hexToRgb(), main() (+3 more)

### Community 54 - "review-accessibility-ui.mjs"
Cohesion: 0.04
Nodes (43): scan(), document(), setup(), readMessage(), article, category, client, collections (+35 more)

### Community 56 - "Asset Validation CLI"
Cohesion: 0.25
Nodes (13): checkManifest(), formatBytes(), formatOutput(), main(), parseFilename(), suggestFilename(), validateAsset(), validateFilename() (+5 more)

### Community 57 - "logo/core.py"
Cohesion: 0.21
Nodes (5): detect_domain(), _load_csv(), search(), search_all(), _search_csv()

### Community 61 - "test-fiscal-integrity.ts"
Cohesion: 0.10
Nodes (15): sale(), sealedChain(), fingerprintVente(), annual, historic, historicAnchor, interleaved, many (+7 more)

### Community 73 - "Design Token Embedding Script"
Cohesion: 0.17
Nodes (8): args, fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath, wrapStyle

### Community 74 - "Design Token Validation CLI"
Cohesion: 0.24
Nodes (11): formatReport(), getFiles(), main(), parseArgs(), scanFile(), shouldSkip(), extensions, fs (+3 more)

### Community 77 - "Brand Context Injection"
Cohesion: 0.31
Nodes (10): extractColorsFromTable(), extractCoreAttributes(), extractHexColors(), extractImageStyle(), extractTypography(), extractVoice(), generatePromptAddition(), main() (+2 more)

### Community 80 - "pdfDevis.ts"
Cohesion: 0.15
Nodes (12): dateFr(), euros(), generateDevisPdf(), pdfmake@^0.3.11, definitions, devis, server, allowedFontFiles (+4 more)

### Community 83 - "Brand Token Synchronization"
Cohesion: 0.29
Nodes (8): adjustBrightness(), extractColorsFromMarkdown(), generateColorScale(), main(), updateDesignTokens(), { execFileSync }, fs, path

### Community 85 - "Design Token Code Generation"
Cohesion: 0.36
Nodes (9): flattenTokens(), generateCSS(), generateTailwind(), main(), parseArgs(), resolveReference(), toCssVarName(), fs (+1 more)

### Community 86 - "dev-processes.mjs"
Cohesion: 0.32
Nodes (12): argumentsOf(), descendantsOf(), isDevProcess(), isEvaluationOption(), listProcesses(), nodeScriptIndex(), pathsFor(), sameProcess() (+4 more)

### Community 107 - "Application Architecture README"
Cohesion: 0.38
Nodes (7): Autostrass, Drizzle Migrations, Drizzle ORM, MariaDB, React and Express Application, REST API, Vite Development Proxy

### Community 35 - "Project Handoff Documentation"
Cohesion: 0.17
Nodes (20): Autostrass Project Handoff, API and Security Test Suites, Authentication and Role-Based Access Control, Autostrass Roadmap, Cash Session Management, Centralized HTTP Client, Customer and Supplier Address Books, Database Migrations (+12 more)

### Community 64 - "Application Feature Roadmap"
Cohesion: 0.20
Nodes (14): Autostrass Initial Requirements, Application Settings, Cash Register, Customer Address Book, Customer Orders, Customer Returns, Deliveries, Personnel (+6 more)

### Community 78 - "Slide Copywriting Formulas"
Cohesion: 0.24
Nodes (11): Copywriting Formulas, AIDA, Before-After-Bridge, Contrast Patterns, Cost of Inaction, FAB, Formula-to-Slide Mapping, Headline Patterns (+3 more)

### Community 84 - "CIP Style Taxonomy"
Cohesion: 0.27
Nodes (10): CIP Design Style Guide, Bold Dynamic, Classic Traditional, Color Psychology, Corporate Minimal, Fresh Modern, Luxury Premium, Modern Tech (+2 more)

### Community 94 - "Security Review Findings"
Cohesion: 0.33
Nodes (9): Security and Reliability Review, Bootstrap and Migration Consistency, Cash Session Ownership Check, Concurrent Cash Closure, Hierarchical Location Mapping, Open Session Diagnostic, Seed Location Join Integrity, Test Database Verification (+1 more)

### Community 96 - "HTML Slide Template"
Cohesion: 0.32
Nodes (8): HTML Slide Template, Chart.js Integration, Design Tokens, Mobile Breakpoints, Progress Bar, Responsive 16:9 Slide Deck, Slide Content Wrapper, Slide Navigation

### Community 101 - "Zod Authentication Connections"
Cohesion: 0.43
Nodes (8): Why Zod Connects API Authentication Middleware to Other Areas, API Authentication Middleware, Application Shell and Theme, Backend Validation Security, Frontend Form Schemas, Project Build Configuration, Shared Static Dependency, Zod Dependency

### Community 102 - "Protected Route Schema Flow"
Cohesion: 0.43
Nodes (8): Why Zod Connects Protected Resource Roles to Backend and Frontend Components, Application Shell and Theme, Backend API Validation Schemas, Frontend Zod Form Schemas, Node Project Build Configuration, Protected Resource Roles, Shared Import Bridge, Zod Dependency

### Community 88 - "Backend Zod Route Flow"
Cohesion: 0.38
Nodes (10): How Backend Zod Schemas Connect to Protected Routes, Backend Zod Schemas, Body Parser, Create API Router, CRUD Routes, Document Routes, Resource Routes, Role Guard (+2 more)

### Community 103 - "Oxlint Rule Configuration"
Cohesion: 0.25
Nodes (7): ignorePatterns, plugins, rules, react/incompatible-library, react/only-export-components, react/rules-of-hooks, $schema

### Community 105 - "Common ARIA patterns"
Cohesion: 0.25
Nodes (8): Buttons, Common ARIA patterns, Error states, Form fields, Links, Live regions, Modals, Navigation

### Community 106 - "Understandable"
Cohesion: 0.25
Nodes (8): Accessible authentication (3.3.8) — new in 2.2, Consistent help (3.2.6) — new in 2.2, Consistent navigation (3.2.3), Error handling (3.3.1, 3.3.3), Form labels (3.3.2), Page language (3.1.1), Redundant entry (3.3.7) — new in 2.2, Understandable

### Community 110 - "Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does zod connect Authenticated Resource Routes to Node Package Overrides, Backend Request Schemas, Application Shell Components, Business Form Schemas?, Source Nodes

### Community 112 - "Audit des fichiers inutiles — 13 novembre 2026"
Cohesion: 0.25
Nodes (7): Archivage et suppression, Audit des fichiers inutiles — 13 novembre 2026, Fichiers archivés puis supprimés, Fichiers locaux hors Git, Sauvegardes et artefacts à rationaliser, Vérifications, À conserver ou à confirmer

### Community 119 - "button"
Cohesion: 0.20
Nodes (10): fg, font-size, hover-bg, button, $type, $value, $type, $value (+2 more)

### Community 122 - "Extra Large Size Tokens"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 124 - "No Color Style Tokens"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

### Community 125 - "Common issues by impact"
Cohesion: 0.50
Nodes (4): Common issues by impact, Critical (fix immediately), Moderate (fix soon), Serious (fix before launch)

### Community 127 - "Testing checklist"
Cohesion: 0.67
Nodes (3): Automated testing, Manual testing, Testing checklist

### Community 137 - "formulaires-modaux.md"
Cohesion: 0.29
Nodes (5): Comportement, Formulaires en fenêtres contextuelles — 10 novembre 2026, Validation reproductible, Modification des utilisateurs, Recette

### Community 139 - "input"
Cohesion: 0.29
Nodes (8): padding-x, input, $type, $value, focus-ring, padding-x, $type, $value

### Community 157 - "Analyse de Microsoft TokenEconomizer"
Cohesion: 0.13
Nodes (13): Analyse de Microsoft TokenEconomizer, Avis, Compatibilité et limites utiles à Autostrass, Données et appels externes, Fonctionnement constaté, Résultats : ce qu'ils permettent de conclure, Vérification et proposition d'essai, Commandes de contrôle (+5 more)

### Community 16 - "Primitive Spacing Tokens"
Cohesion: 0.09
Nodes (22): $type, $value, $type, $value, $type, $value, $type, $value (+14 more)

### Community 161 - "Constats prioritaires"
Cohesion: 0.18
Nodes (11): Constats prioritaires, Périmètre et méthode, R01 — P1 — Le comptoir encaisse le HT alors que la facture réclame le TTC, R02 — P1 — Une monnaie arbitraire permet une recette nulle ou négative, R03 — P1 — Un prix accepté peut rompre sa propre empreinte après stockage, R04 — P1 — Le contrôle fiscal déclare intact un préfixe seulement, R05 — P1 — Deux ouvertures peuvent créer deux caisses pour le même compte, R06 — P1 — L'archive annuelle refuse une chaîne intacte entre deux années (+3 more)

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
Nodes (10): API, Concurrence et intégrité, Inventaire physique par référence, Migration et sauvegarde, Utilisation, Vérification reproductible, Authenticated Read-Only Locations API, Aisle Shelf and Slot Hierarchy (+2 more)

### Community 168 - "Création et modification des clients — 6 novembre 2026"
Cohesion: 0.15
Nodes (11): Captures, Correction Échap dans l'aperçu intégré, Création et modification des clients — 6 novembre 2026, Numéro de client, SIRET des professionnels, Vérification, Captures, Graphify et points de suivi (+3 more)

### Community 170 - "sm"
Cohesion: 0.60
Nodes (5): sm, sm, sm, $type, $value

### Community 172 - "Administration des paramètres"
Cohesion: 0.13
Nodes (13): Administration des paramètres, API, Cloudflare Turnstile, HTTPS et terminaux, Installation et mise à jour, Choix retenus et périmètre restant, Lots PARAM-01 à PARAM-07, Paramètres — feuille de route et état livré (+5 more)

### Community 173 - "padding-y"
Cohesion: 0.67
Nodes (4): padding-y, padding-y, $type, $value

### Community 175 - "ring"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 176 - "Clôture de caisse — 10 novembre 2026"
Cohesion: 0.50
Nodes (3): Clôture de caisse — 10 novembre 2026, Utilisation, Vérification reproductible

### Community 179 - "16"
Cohesion: 0.67
Nodes (3): $type, $value, 16

### Community 18 - "WCAG 2.2 Quick Reference"
Cohesion: 0.18
Nodes (8): Level A (minimum), Level AA (standard), Level AAA (enhanced), Sources, Success criteria by level, Testing tools, WCAG 2.2 Quick Reference, What changed from 2.1 to 2.2

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

### Community 191 - "test-stock-transfer-validation.ts"
Cohesion: 0.18
Nodes (10): alias, explicitDestination, explicitNull, invalidCurrentField, maximum, motif, noDestination, omittedSource (+2 more)

### Community 199 - "Autres défauts confirmés"
Cohesion: 0.25
Nodes (8): Autres défauts confirmés, R08 — P2 — Le journal soustrait deux fois la monnaie rendue, R09 — P2 — Une empreinte manquante récente est qualifiée d'historique ancien, R10 — P2 — StrictMode laisse des référentiels vides dans les formulaires, R11 — P2 — Actualiser Caisse ne recharge pas son journal, R13 — P2 — La recherche de tokens boucle sans fin à la racine Windows, R14 — P2 — Trois scripts absents empêchent la suite d'outils de se charger, R16 — P2 — Le générateur de design ignore la couleur de texte contrastée

### Community 20 - "Accessibility Code Patterns"
Cohesion: 0.22
Nodes (9): Accessibility Code Patterns, ARIA tabs, Dragging movements, Error handling, Form labels, Live regions and notifications, Modal focus trap, Screen reader commands (+1 more)

### Community 24 - "package.json"
Cohesion: 0.07
Nodes (37): allowScripts, esbuild@0.28.2, devDependencies, concurrently@^10.0.5, drizzle-kit@^0.31.11, oxlint@^1.81.0, playwright@^1.65.0, selfsigned@^5.5.0 (+29 more)

### Community 34 - "NPM Build And Database Scripts"
Cohesion: 0.06
Nodes (34): scripts, build, caisse:diagnostic, db:generate, db:migrate, db:seed, db:studio, dev (+26 more)

### Community 36 - "Application TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 37 - "color"
Cohesion: 0.11
Nodes (19): $type, $value, background, foreground, muted-foreground, primary, primary-hover, secondary (+11 more)

### Community 43 - "Repository Guidelines"
Cohesion: 0.22
Nodes (8): Build, Test, and Development Commands, Coding Style & Naming Conventions, Commit & Pull Request Guidelines, Langue des réponses, Project Structure & Module Organization, Repository Guidelines, Security & Configuration Tips, Testing Guidelines

### Community 46 - "Operable"
Cohesion: 0.22
Nodes (9): Dragging movements (2.5.7) — new in 2.2, Focus not obscured (2.4.11) — new in 2.2, Focus visible (2.4.7), Keyboard accessible (2.1), Motion (2.3), Operable, Skip links (2.4.1), Target size (2.5.8) — new in 2.2 (+1 more)

### Community 47 - "Node TypeScript Configuration"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 49 - "Typography Scale Tokens"
Cohesion: 0.12
Nodes (16): $type, $value, $type, $value, $type, $value, $type, $value (+8 more)

### Community 6 - "Primitive Color Palette"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 65 - "Server TypeScript Configuration"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleResolution, noEmit, noUnusedLocals, noUnusedParameters, skipLibCheck (+5 more)

### Community 66 - "design-tokens-starter.json"
Cohesion: 0.15
Nodes (12): component, $type, $value, dark, semantic, $schema, $type, $value (+4 more)

### Community 71 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, bcryptjs@^3.0.3, body-parser@^2.4.0, dotenv@^18.0.1, drizzle-orm@^0.45.3, express@^5.3.0, @hookform/resolvers@^5.9.1, jose@^6.2.12 (+10 more)

### Community 75 - "card"
Cohesion: 0.20
Nodes (12): $type, $value, bg, bg, padding, shadow, card, bg (+4 more)

### Community 79 - "Motion Duration Tokens"
Cohesion: 0.20
Nodes (10): fast, normal, slow, $type, $value, $type, $value, duration (+2 more)

### Community 9 - "Accessibility (a11y)"
Cohesion: 0.17
Nodes (12): Accessibility (a11y), ARIA usage (4.1.2), Color contrast (1.4.3, 1.4.6), Conformance levels, Evidence-led audit workflow, Live regions (4.1.3), Media alternatives (1.2), Perceivable (+4 more)

### Community 91 - "PRODUCT.md — Module Stock (autostrass)"
Cohesion: 0.25
Nodes (7): Ce qui fonctionne bien (à conserver), Ce qui ne va pas / à améliorer, Contraintes techniques, Objectif produit, PRODUCT.md — Module Stock (autostrass), Surface visuelle, Utilisateurs cibles

### Community 95 - "CIP Mockup Prompt Engineering"
Cohesion: 0.11
Nodes (17): Apparel (Polo/T-Shirt), Base Prompt Structure, Business Card, CIP Mockup Prompt Engineering, Context Modifiers, Corporate Minimal, Deliverable-Specific Modifiers, Letterhead (+9 more)

### Community 98 - "Border Radius Tokens"
Cohesion: 0.19
Nodes (14): $type, $value, $type, $value, $type, $value, primitive, radius (+6 more)

### Community 13 - "Design Skill References"
Cohesion: 0.06
Nodes (35): Slides Skill, UI Styling Skill, AIDA PAS and FAB Copywriting, Before-After-Bridge Formula, Cost of Inaction Formula, HTML Presentation Structure, Slide Layout Patterns, Responsive Slide Grids (+27 more)

### Community 41 - "Brand And Design Guidelines"
Cohesion: 0.17
Nodes (15): Brand Framework Skill, Design System Skill, Asset Approval Checklist, Asset Organization Guide, Brand Guidelines Template, Color Palette Management, Brand Consistency Checklist, Logo Usage Rules (+7 more)

### Community 44 - "Visual Design Skill Guides"
Cohesion: 0.13
Nodes (17): Design Skill, Banner Sizes and Styles, CIP Deliverable Guide, CIP Design, Design Routing, Icon Design, Logo Color Psychology, Logo Design (+9 more)

### Community 120 - "Social Image Design Guidance"
Cohesion: 0.50
Nodes (4): HTML Screenshot Production Workflow, Social Image Platform Sizes, Safe Zones and Visual QA, Social Photos Design Guide

### Community 128 - "Autostrass Design System Master"
Cohesion: 0.67
Nodes (3): Accessibility and Responsive UI Rules, Dense Blue and Amber Dashboard Design, Autostrass Design System Master

### Community 130 - "Slide Visualization Guidelines"
Cohesion: 0.67
Nodes (3): Chart.js Data Visualization, Presentation Design Tokens, Slides Design Reference

### Community 131 - "UI Interaction State Tokens"
Cohesion: 0.67
Nodes (3): Focus States, Loading States, State Priority

### Community 138 - "UI Styling Dependencies"
Cohesion: 0.67
Nodes (3): UI Styling Test Dependencies, UI Styling Script Requirements, UI Styling Test Requirements

### Community 206 - "Bon de livraison — modèle photographique"
Cohesion: 0.33
Nodes (5): Bon de livraison — modèle photographique, Présentation retenue, Champs et sources actuelles, Règles à préserver lors de l'implémentation, Repères pour la suite

## Knowledge Gaps
- **91 isolated node(s):** `RFC-5321`, `Banner Design Skill`, `Documentation Workflow and Formats`, `Code Documenter Skill`, `Structured Code Review and OWASP Top 10` (+86 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1526 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
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

- **Why does `TailwindConfigGenerator` connect `Tailwind Theme Validation` to `.write_config`, `Tailwind Breakpoint Tests`, `Tailwind Plugin Configuration`, `.add_colors`, `.recommend_plugins`, `.generate_config_string`, `Tailwind Generator Defaults`, `Python Tooling Test Imports`, `Tailwind Font And Spacing Config`, `Tailwind Configuration Tests`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `TestTailwindConfigGenerator`) actually correct?**
  _`TailwindConfigGenerator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-5321`, `Banner Design Skill`, `Documentation Workflow and Formats` to the rest of the system?**
  _91 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SimpleRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.07897793263646923 - nodes in this community are weakly interconnected._
- **Why does `ShadcnInstaller` connect `Shadcn Component Installer` to `Python Tooling Test Imports`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `schemas/parametres.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08245981830887492 - nodes in this community are weakly interconnected._
- **Why does `main()` connect `Python Tooling Test Imports` to `HTML Slide Deck Generation`, `.write_config`, `Tailwind Breakpoint Tests`, `Tailwind Plugin Configuration`, `.add_colors`, `.recommend_plugins`, `.generate_config_string`, `Tailwind Font And Spacing Config`, `Tailwind Theme Validation`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
## Maintenance documentaire — 21 novembre 2026

Le modèle de bon de livraison `specs/bon-livraison-modele.md` est indexé par six nœuds Markdown (page, titre et sections) et dix citations locales explicites. La passation le référence et son repère global couvre le document final. Les coordonnées de la photo originale et ses pixels ne sont pas indexés ; les citations ne prouvent aucun câblage runtime.

Les anciens IDs, repères de sections, groupes et relations restent conservés. Un groupe documentaire est ajouté pour ce modèle. La base de documentation est `a7c539d` ; les 221 empreintes de code sont inchangées. Aucun appel API, aucune extraction sémantique ni installation n’a été effectué. Limites conservées : huit CSS non indexés et 17 SQL sans parseur.
