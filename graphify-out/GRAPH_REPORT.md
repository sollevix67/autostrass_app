# Graph Report - autostrass_app  (2026-10-10)

## Corpus Check
- 247 files · ~310,360 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 60 file(s) not represented in the graph (top: .csv 53, .css 3, (none) 2)

## Summary
- 2374 nodes · 4513 edges · 157 communities (112 shown, 45 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 169 edges (avg confidence: 0.86)
- Token cost: unavailable (agent token usage was not provided; this is not zero).

## Community Hubs (Navigation)
- Shadcn Component Installer
- UI UX Search Engine
- UI UX Data Quality Validation
- Frontend API Hooks
- Authenticated Resource Routes
- Application Shell Components
- Primitive Color Palette
- Business Data Repositories
- Cash Database Schema
- Business Operations Views
- Backend Request Schemas
- Slide Search Engine
- Document Data Repositories
- Design Skill References
- Business Form Schemas
- Design System Generation
- Primitive Spacing Tokens
- Search Quality Test Suite
- Authentication Security Middleware
- Brand Asset Generators
- Dark Mode Color Resolution
- Frontend Referential Hooks
- Python Tooling Test Imports
- HTML Token Validation
- Node Package Overrides
- Express Server Validation
- Cash Register Repository
- Cash And Delivery Views
- Tailwind Configuration Tests
- Design Reasoning Contract Tests
- Search And Generator CLIs
- Design System Core Tests
- HTML Slide Deck Generation
- Slide Background Image Generation
- NPM Build And Database Scripts
- Project Handoff Documentation
- Application TypeScript Configuration
- Semantic Color Tokens
- Design System Generator
- Database Migration Utilities
- Vehicle Form Feedback
- Brand And Design Guidelines
- Stock Toast Notifications
- API Input Sanitization
- Visual Design Skill Guides
- Cash Compliance Verification
- Business Data Schema
- Node TypeScript Configuration
- CIP Mockup Generation
- Typography Scale Tokens
- API Security Integration Tests
- Brand Color Extraction
- Catalog Refresh Contract Tests
- Counter Sales Interface
- Decision Rule Contracts
- Asset Validation CLI
- CIP Search Engine
- Tailwind Theme Validation
- Web Stack Freshness Tests
- Frontend Package Dependencies
- UI UX Search CLI
- Article Inventory Repository
- Shared Icons And API Banners
- Application Feature Roadmap
- Server TypeScript Configuration
- Logo Search Engine
- Design Token Catalog
- Tailwind Breakpoint Tests
- Domain Routing Tests
- Search Domain Tests
- Backend Package Dependencies
- HTML Document Rendering
- Design Token Embedding Script
- Design Token Validation CLI
- Component Design Tokens
- Dark Mode Resolution Tests
- Brand Context Injection
- Slide Copywriting Formulas
- Motion Duration Tokens
- Native Stack Freshness Tests
- User Repository Authentication
- Brand Token Synchronization
- CIP Style Taxonomy
- Design Token Code Generation
- Button Interaction Tokens
- Backend Zod Route Flow
- Vehicle Directory Repository
- CIP Search Ranking
- Logo Search Ranking
- Style Taxonomy Tests
- Fiscal Archive Fingerprints
- Security Review Findings
- CIP Mockup Prompt Engineering
- HTML Slide Template
- Input And Focus Tokens
- Border Radius Tokens
- Zod Authentication Connections
- Protected Route Schema Flow
- Oxlint Rule Configuration
- Dark Mode Advice Filtering
- Relevance Threshold Tests
- Application Architecture README
- Shadow Size Tokens
- Style Identity Tests
- Generated Catalog Contract Tests
- Landing Page Data Contracts
- Database Connection Setup
- Border Color Tokens
- Radius Scale Tokens
- Large Font Size Tokens
- BM25 Search Tests
- Drizzle Dependency Debugging
- Social Image Design Guidance
- Vertical Padding Tokens
- Extra Large Size Tokens
- Medium Size Tokens
- No Color Style Tokens
- Relevance Evaluator Tests
- Stock Location Design Specification
- TypeScript Build Error Report
- Autostrass Design System
- Persuasive Slide Design Guide
- Slide Visualization Guidelines
- UI Interaction State Tokens
- Destructive Color Tokens
- Destructive Text Color Tokens
- Muted Color Tokens
- Primary Text Color Tokens
- Focus Ring Color Tokens
- Secondary Text Color Tokens
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

## God Nodes (most connected - your core abstractions)
1. `TailwindConfigGenerator` - 58 edges
2. `TestTailwindConfigGenerator` - 35 edges
3. `DesignSystemGenerator` - 35 edges
4. `ShadcnInstaller` - 34 edges
5. `Icon()` - 34 edges
6. `react` - 31 edges
7. `createApiRouter()` - 28 edges
8. `TestShadcnInstaller` - 26 edges
9. `VentesComptoirView()` - 25 edges
10. `DataTable()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `verify()` --calls--> `verifyFingerprints()`  [EXTRACTED]
  scripts/archive-fiscal.ts → server/middleware/compliance.ts
- `archive()` --calls--> `verifyFingerprints()`  [EXTRACTED]
  scripts/archive-fiscal.ts → server/middleware/compliance.ts
- `handleSubmit()` --indirect_call--> `email()`  [INFERRED]
  src/views/LoginView.tsx → server/middleware/schemas.ts
- `TestGeneratedConfigIsValidJs` --uses--> `TailwindConfigGenerator`  [INFERRED]
  .github/prompts/ui-styling/scripts/tests/test_tailwind_config_gen.py → .github/prompts/ui-styling/scripts/tailwind_config_gen.py
- `TestTailwindConfigGenerator` --uses--> `TailwindConfigGenerator`  [INFERRED]
  .github/prompts/ui-styling/scripts/tests/test_tailwind_config_gen.py → .github/prompts/ui-styling/scripts/tailwind_config_gen.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three-Layer Design Token Architecture** — _github_prompts_design_system_references_primitive_tokens_primitive_tokens, _github_prompts_design_system_references_semantic_tokens_semantic_tokens, _github_prompts_design_system_references_component_tokens_component_tokens [EXTRACTED 1.00]
- **Strategic HTML Slide Authoring** — github_prompts_slides_skill_slides_skill, github_prompts_slides_references_copywriting_formulas_copywriting_formulas, github_prompts_slides_references_layout_patterns_slide_layout_patterns, github_prompts_slides_references_html_template_html_slide_template, github_prompts_slides_references_slide_strategies_slide_strategies [EXTRACTED 1.00]
- **Social Image HTML Design and Screenshot QA Workflow** — github_prompts_design_references_social_photos_design_social_photos_design_guide, github_prompts_design_references_social_photos_design_html_screenshot_workflow, github_prompts_design_references_social_photos_design_safe_zones_visual_qa, github_prompts_design_references_social_photos_design_platform_image_sizes [EXTRACTED 1.00]
- **UI Styling Component, Utility, and Canvas Layers** — github_prompts_ui_styling_skill_ui_styling_skill, github_prompts_ui_styling_skill_component_layer, github_prompts_ui_styling_skill_tailwind_styling_layer, github_prompts_ui_styling_skill_canvas_visual_layer [EXTRACTED 1.00]

## Communities (157 total, 45 thin omitted)

### Community 0 - "Shadcn Component Installer"
Cohesion: 0.05
Nodes (3): main(), ShadcnInstaller, TestShadcnInstaller

### Community 1 - "UI UX Search Engine"
Cohesion: 0.06
Nodes (31): BM25, _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature() (+23 more)

### Community 2 - "UI UX Data Quality Validation"
Cohesion: 0.07
Nodes (43): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, _catalog_date(), _check_app_interface_contract(), _check_catalog_contract() (+35 more)

### Community 3 - "Frontend API Hooks"
Cohesion: 0.08
Nodes (44): AuthContext, AuthContextValue, AuthStatus, SessionUser, AuthProvider(), toAuthError(), CashState, useCashMovements() (+36 more)

### Community 4 - "Authenticated Resource Routes"
Cohesion: 0.08
Nodes (47): zod, UserRole, AuthError, hashPassword(), requireAuth(), requireRole(), validatePasswordStrength(), fingerprintVente() (+39 more)

### Community 5 - "Application Shell Components"
Cohesion: 0.13
Nodes (42): App(), AppContent(), getStoredTheme(), getSystemTheme(), initials(), navigation, roleLabel(), ThemeMode (+34 more)

### Community 6 - "Primitive Color Palette"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 7 - "Business Data Repositories"
Cohesion: 0.06
Nodes (25): LivraisonInput, LivraisonRepository, LivraisonRow, mapLivraison(), Tables, toHttpError(), unwrap(), ClientInput (+17 more)

### Community 8 - "Cash Database Schema"
Cohesion: 0.04
Nodes (46): ArticleRef, CASH_BREAK_DENOMINATIONS, CASH_MOVEMENT_TYPES, CASH_SESSION_STATUSES, CashBreakDenomination, cashMovements, cashMovementsRelations, CashMovementType (+38 more)

### Community 9 - "Business Operations Views"
Cohesion: 0.07
Nodes (38): @hookform/resolvers, react-hook-form, ConfirmDialogProps, ColumnDef, compare(), DataTableProps, SortAccessor, CommonProps (+30 more)

### Community 10 - "Backend Request Schemas"
Cohesion: 0.05
Nodes (41): RFC-5321, CLIENT_TYPES, DELIVERY_STATUSES, ORDER_STATUSES, PAYMENT_MODES, USER_ROLES, VEHICLE_STATUSES, VEHICLE_TYPES (+33 more)

### Community 11 - "Slide Search Engine"
Cohesion: 0.08
Nodes (17): format_context(), format_result(), main(), BM25, calculate_pattern_break(), detect_domain(), get_background_config(), get_color_for_emotion() (+9 more)

### Community 12 - "Document Data Repositories"
Cohesion: 0.10
Nodes (27): clients, commandes, leaked, livraisons, receptions, retours, users, vehicules (+19 more)

### Community 13 - "Design Skill References"
Cohesion: 0.06
Nodes (35): AIDA PAS and FAB Copywriting, Before-After-Bridge Formula, Slide Copywriting Formulas, Cost of Inaction Formula, Create Slide Prompt, HTML Slide Template, HTML Presentation Structure, Slide Layout Patterns (+27 more)

### Community 14 - "Business Form Schemas"
Cohesion: 0.06
Nodes (29): ArticleFormOutput, ArticleFormValues, CaisseClotureFormOutput, CaisseClotureFormValues, CaisseOuvertureFormOutput, CaisseOuvertureFormValues, CartLineFormOutput, CartLineFormValues (+21 more)

### Community 15 - "Design System Generation"
Cohesion: 0.08
Nodes (12): ansi_ljust(), _detect_page_type(), format_ascii_box(), format_master_md(), format_page_override_md(), _generate_intelligent_overrides(), hex_to_ansi(), persist_design_system() (+4 more)

### Community 16 - "Primitive Spacing Tokens"
Cohesion: 0.06
Nodes (34): $type, $value, $type, $value, $type, $value, $type, $value (+26 more)

### Community 17 - "Search Quality Test Suite"
Cohesion: 0.07
Nodes (5): TestMetricMath, read_rows(), read_rows(), TestTextLayoutDataContracts, TestTextLayoutRetrieval

### Community 18 - "Authentication Security Middleware"
Cohesion: 0.10
Nodes (27): AUTH_COOKIE, AuthenticatedRequest, AuthenticatedUser, issueToken(), readToken(), signingKey(), TokenPayload, verifyToken() (+19 more)

### Community 19 - "Brand Asset Generators"
Cohesion: 0.11
Nodes (13): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+5 more)

### Community 20 - "Dark Mode Color Resolution"
Cohesion: 0.11
Nodes (8): _contrast_ratio(), _derive_dark_palette(), _palette_is_dark(), _relative_luminance(), _select_palette_for_mode(), TestEndToEndCoherence, TestLuminance, TestPaletteSelection

### Community 21 - "Frontend Referential Hooks"
Cohesion: 0.09
Nodes (26): cache, CacheEntry, fetchOnce(), useClientOptions(), useCommandeOptions(), useReferential(), useVenteOptions(), RETURN_REASON_OPTIONS (+18 more)

### Community 22 - "Python Tooling Test Imports"
Cohesion: 0.13
Nodes (5): test_sync_parses_bundled_starter_template(), main(), _run(), test_flags_hardcoded_hex_sharing_line_with_token(), test_token_only_line_reports_no_violation()

### Community 23 - "HTML Token Validation"
Cohesion: 0.13
Nodes (12): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+4 more)

### Community 24 - "Node Package Overrides"
Cohesion: 0.08
Nodes (22): name, overrides, esbuild, private, type, version, bcryptjs, concurrently (+14 more)

### Community 25 - "Express Server Validation"
Cohesion: 0.12
Nodes (17): express, app, emptyDashboard, hasDatabaseConfig, LowStockItem, port, errorHandler(), securityHeaders() (+9 more)

### Community 26 - "Cash Register Repository"
Cohesion: 0.16
Nodes (10): CashBreak, CashCountRow, CashMovementRow, CashRegisterRepository, CashSessionRow, round2(), Tables, toDecimal() (+2 more)

### Community 27 - "Cash And Delivery Views"
Cohesion: 0.11
Nodes (21): CARRIER_OPTIONS, CASH_DENOMINATIONS, CASH_MOVEMENT_LABELS, CLIENT_TYPE_OPTIONS, DELIVERY_STATUS_OPTIONS, denomination, euros, formatDenomination() (+13 more)

### Community 29 - "Design Reasoning Contract Tests"
Cohesion: 0.16
Nodes (3): _resolve_dial(), read_rows(), TestReasoningContract

### Community 30 - "Search And Generator CLIs"
Cohesion: 0.11
Nodes (7): format_brief(), format_results(), main(), format_output(), generate_design_brief(), main(), main()

### Community 31 - "Design System Core Tests"
Cohesion: 0.10
Nodes (5): format_markdown(), generate_design_system(), TestDiagnosticsContracts, TestPersistence, TestTokenizer

### Community 32 - "HTML Slide Deck Generation"
Cohesion: 0.13
Nodes (10): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+2 more)

### Community 33 - "Slide Background Image Generation"
Cohesion: 0.16
Nodes (9): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+1 more)

### Community 34 - "NPM Build And Database Scripts"
Cohesion: 0.10
Nodes (20): scripts, build, caisse:diagnostic, db:generate, db:migrate, db:seed, db:studio, dev (+12 more)

### Community 35 - "Project Handoff Documentation"
Cohesion: 0.17
Nodes (20): API and Security Test Suites, Authentication and Role-Based Access Control, Autostrass Project Handoff, Autostrass Roadmap, Cash Session Management, Centralized HTTP Client, Customer and Supplier Address Books, Database Migrations (+12 more)

### Community 36 - "Application TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 37 - "Semantic Color Tokens"
Cohesion: 0.11
Nodes (19): $type, $value, background, foreground, muted-foreground, primary, primary-hover, secondary (+11 more)

### Community 39 - "Database Migration Utilities"
Cohesion: 0.14
Nodes (13): dotenv, mysql2, normalized, raw, statements, splitDrizzleKitStatements(), splitStatements(), hasDatabaseConfig (+5 more)

### Community 40 - "Vehicle Form Feedback"
Cohesion: 0.11
Nodes (17): buildItems(), ErrorItem, ErrorRecord, ErrorSummaryProps, readMessage(), formatInteger(), VEHICLE_STATUS_OPTIONS, VEHICLE_TYPE_OPTIONS (+9 more)

### Community 41 - "Brand And Design Guidelines"
Cohesion: 0.17
Nodes (15): Asset Approval Checklist, Asset Organization Guide, Brand Guidelines Template, Color Palette Management, Brand Consistency Checklist, Logo Usage Rules, Messaging Framework, Typography Specifications (+7 more)

### Community 42 - "Stock Toast Notifications"
Cohesion: 0.18
Nodes (11): react, Toast, ToastApi, ToastContext, ToastTone, CONSOLE_FALLBACK, StockFilter, ApiStockEmplacement (+3 more)

### Community 43 - "API Input Sanitization"
Cohesion: 0.14
Nodes (14): findMarkupInjection(), INJECTION_COUNTS, INJECTION_PATTERNS, InjectionKind, normalizeText(), reportInjection(), sanitizeEnum(), SanitizeReport (+6 more)

### Community 44 - "Visual Design Skill Guides"
Cohesion: 0.13
Nodes (17): Banner Sizes and Styles, CIP Deliverable Guide, CIP Design, Design Routing, Icon Design, Logo Color Psychology, Logo Design, Logo Prompt Engineering (+9 more)

### Community 45 - "Cash Compliance Verification"
Cohesion: 0.12
Nodes (14): apres, avant, carte, CashSession, cloture, comptageExact, courante, login (+6 more)

### Community 46 - "Business Data Schema"
Cohesion: 0.12
Nodes (15): AUDIT_ACTIONS, AuditAction, commandeFournisseurLines, commandesFournisseurs, DELIVERY_MODES, DeliveryMode, emplacements, fournisseurs (+7 more)

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
Cohesion: 0.20
Nodes (11): calculateCompliance(), colorDistance(), displayPalette(), extractHexColors(), findNearestBrandColor(), fs, generateImageMagickCommand(), hexToRgb() (+3 more)

### Community 54 - "Counter Sales Interface"
Cohesion: 0.18
Nodes (10): react-router-dom, PageLayoutProps, PAYMENT_MODE_OPTIONS, venteContext(), venteSchema(), byDateDesc(), CartLine, todayIso() (+2 more)

### Community 55 - "Decision Rule Contracts"
Cohesion: 0.20
Nodes (4): apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action()

### Community 56 - "Asset Validation CLI"
Cohesion: 0.25
Nodes (13): checkManifest(), formatBytes(), formatOutput(), fs, main(), parseFilename(), path, RULES (+5 more)

### Community 57 - "CIP Search Engine"
Cohesion: 0.20
Nodes (6): detect_domain(), get_cip_brief(), _load_csv(), search(), search_all(), _search_csv()

### Community 60 - "Frontend Package Dependencies"
Cohesion: 0.14
Nodes (14): devDependencies, concurrently, drizzle-kit, oxlint, tsx, @types/bcryptjs, @types/express, @types/node (+6 more)

### Community 61 - "UI UX Search CLI"
Cohesion: 0.19
Nodes (11): args, DATA, domainIndex, DOMAINS, limitIndex, parseCsv(), results, ROOT (+3 more)

### Community 62 - "Article Inventory Repository"
Cohesion: 0.21
Nodes (6): ArticleInput, ArticleRepository, ArticleRow, ArticleRowPacket, mapRow(), toNumber()

### Community 63 - "Shared Icons And API Banners"
Cohesion: 0.15
Nodes (11): IconName, IconSize, PATHS, SIZES, EditableCard(), EditableCardProps, ResourceBannersProps, ApiMode (+3 more)

### Community 64 - "Application Feature Roadmap"
Cohesion: 0.20
Nodes (14): Application Settings, Autostrass Initial Requirements, Cash Register, Customer Address Book, Customer Orders, Customer Returns, Deliveries, Personnel (+6 more)

### Community 65 - "Server TypeScript Configuration"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleResolution, noEmit, noUnusedLocals, noUnusedParameters, skipLibCheck (+5 more)

### Community 66 - "Logo Search Engine"
Cohesion: 0.21
Nodes (5): detect_domain(), _load_csv(), search(), search_all(), _search_csv()

### Community 67 - "Design Token Catalog"
Cohesion: 0.15
Nodes (12): component, $type, $value, dark, semantic, $schema, $type, $value (+4 more)

### Community 71 - "Backend Package Dependencies"
Cohesion: 0.15
Nodes (13): dependencies, bcryptjs, dotenv, drizzle-orm, express, @hookform/resolvers, jose, mysql2 (+5 more)

### Community 72 - "HTML Document Rendering"
Cohesion: 0.23
Nodes (4): generate_html(), get_deliverable_info(), get_image_base64(), main()

### Community 73 - "Design Token Embedding Script"
Cohesion: 0.17
Nodes (8): args, fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath, wrapStyle

### Community 74 - "Design Token Validation CLI"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 75 - "Component Design Tokens"
Cohesion: 0.20
Nodes (12): $type, $value, bg, bg, padding, shadow, card, bg (+4 more)

### Community 76 - "Dark Mode Resolution Tests"
Cohesion: 0.21
Nodes (4): _query_wants_dark(), _resolve_color_mode(), _style_is_dark_primary(), TestModeResolution

### Community 77 - "Brand Context Injection"
Cohesion: 0.31
Nodes (10): extractColorsFromTable(), extractCoreAttributes(), extractHexColors(), extractImageStyle(), extractTypography(), extractVoice(), fs, generatePromptAddition() (+2 more)

### Community 78 - "Slide Copywriting Formulas"
Cohesion: 0.24
Nodes (11): AIDA, Before-After-Bridge, Contrast Patterns, Copywriting Formulas, Cost of Inaction, FAB, Formula-to-Slide Mapping, Headline Patterns (+3 more)

### Community 79 - "Motion Duration Tokens"
Cohesion: 0.18
Nodes (11): fast, normal, slow, $type, $value, $type, $value, primitive (+3 more)

### Community 81 - "User Repository Authentication"
Cohesion: 0.29
Nodes (3): authenticate(), mapUtilisateur(), UtilisateurRepository

### Community 83 - "Brand Token Synchronization"
Cohesion: 0.29
Nodes (8): adjustBrightness(), { execFileSync }, extractColorsFromMarkdown(), fs, generateColorScale(), main(), path, updateDesignTokens()

### Community 84 - "CIP Style Taxonomy"
Cohesion: 0.27
Nodes (10): Bold Dynamic, CIP Design Style Guide, Classic Traditional, Color Psychology, Corporate Minimal, Fresh Modern, Luxury Premium, Modern Tech (+2 more)

### Community 85 - "Design Token Code Generation"
Cohesion: 0.36
Nodes (9): flattenTokens(), fs, generateCSS(), generateTailwind(), main(), parseArgs(), path, resolveReference() (+1 more)

### Community 86 - "Button Interaction Tokens"
Cohesion: 0.20
Nodes (10): fg, font-size, hover-bg, button, $type, $value, $type, $value (+2 more)

### Community 88 - "Backend Zod Route Flow"
Cohesion: 0.38
Nodes (10): How Backend Zod Schemas Connect to Protected Routes, Backend Zod Schemas, Body Parser, Create API Router, CRUD Routes, Document Routes, Resource Routes, Role Guard (+2 more)

### Community 93 - "Fiscal Archive Fingerprints"
Cohesion: 0.36
Nodes (5): archive(), hasConfig, verify(), GENESIS_HASH, verifyFingerprints()

### Community 94 - "Security Review Findings"
Cohesion: 0.33
Nodes (9): Bootstrap and Migration Consistency, Cash Session Ownership Check, Concurrent Cash Closure, Hierarchical Location Mapping, Open Session Diagnostic, Security and Reliability Review, Seed Location Join Integrity, Test Database Verification (+1 more)

### Community 95 - "CIP Mockup Prompt Engineering"
Cohesion: 0.39
Nodes (6): Base Prompt Structure, CIP Mockup Prompt Engineering, Context Modifiers, Deliverable-Specific Modifiers, Lighting Modifiers, Style Modifiers

### Community 96 - "HTML Slide Template"
Cohesion: 0.32
Nodes (8): Chart.js Integration, Design Tokens, HTML Slide Template, Mobile Breakpoints, Progress Bar, Responsive 16:9 Slide Deck, Slide Content Wrapper, Slide Navigation

### Community 97 - "Input And Focus Tokens"
Cohesion: 0.29
Nodes (8): padding-x, input, $type, $value, focus-ring, padding-x, $type, $value

### Community 98 - "Border Radius Tokens"
Cohesion: 0.29
Nodes (8): $type, $value, $type, $value, radius, default, full, default

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

### Community 108 - "Shadow Size Tokens"
Cohesion: 0.47
Nodes (6): sm, shadow, sm, sm, $type, $value

### Community 110 - "Style Identity Tests"
Cohesion: 0.47
Nodes (3): split_values(), style_identities(), TestStyleIdentityContract

### Community 113 - "Database Connection Setup"
Cohesion: 0.53
Nodes (4): drizzle-orm, db, hasDatabaseConfig, pool

### Community 114 - "Border Color Tokens"
Cohesion: 0.60
Nodes (5): $type, $value, border, border, border

### Community 115 - "Radius Scale Tokens"
Cohesion: 0.60
Nodes (5): radius, radius, radius, $type, $value

### Community 116 - "Large Font Size Tokens"
Cohesion: 0.60
Nodes (5): lg, $type, $value, lg, lg

### Community 119 - "Drizzle Dependency Debugging"
Cohesion: 0.50
Nodes (4): Drizzle Dependency Debug Log, drizzle-kit 0.18.1, Drizzle Kit Upgrade Notice, drizzle-orm 0.45.3

### Community 120 - "Social Image Design Guidance"
Cohesion: 0.50
Nodes (4): HTML Screenshot Production Workflow, Social Image Platform Sizes, Safe Zones and Visual QA, Social Photos Design Guide

### Community 121 - "Vertical Padding Tokens"
Cohesion: 0.67
Nodes (4): padding-y, padding-y, $type, $value

### Community 122 - "Extra Large Size Tokens"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 123 - "Medium Size Tokens"
Cohesion: 0.67
Nodes (4): $type, $value, md, md

### Community 124 - "No Color Style Tokens"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

### Community 126 - "Stock Location Design Specification"
Cohesion: 0.50
Nodes (4): Stock by Location Design Specification, Authenticated Read-Only Locations API, Aisle Shelf and Slot Hierarchy, Non-Blocking Stock Location View

### Community 127 - "TypeScript Build Error Report"
Cohesion: 0.67
Nodes (3): Recorded TypeScript Build Errors, Missing Form Types and Components, React Hook Form Resolver Type Mismatches

### Community 128 - "Autostrass Design System"
Cohesion: 0.67
Nodes (3): Autostrass Design System Master, Accessibility and Responsive UI Rules, Dense Blue and Amber Dashboard Design

### Community 129 - "Persuasive Slide Design Guide"
Cohesion: 0.67
Nodes (3): Persuasive HTML Slides, Slides Skill, Slides Skill Invocation

### Community 130 - "Slide Visualization Guidelines"
Cohesion: 0.67
Nodes (3): Slides Design Reference, Chart.js Data Visualization, Presentation Design Tokens

### Community 131 - "UI Interaction State Tokens"
Cohesion: 0.67
Nodes (3): Focus States, Loading States, State Priority

### Community 132 - "Destructive Color Tokens"
Cohesion: 0.67
Nodes (3): destructive, $type, $value

### Community 133 - "Destructive Text Color Tokens"
Cohesion: 0.67
Nodes (3): destructive-foreground, $type, $value

### Community 134 - "Muted Color Tokens"
Cohesion: 0.67
Nodes (3): muted, $type, $value

### Community 135 - "Primary Text Color Tokens"
Cohesion: 0.67
Nodes (3): primary-foreground, $type, $value

### Community 136 - "Focus Ring Color Tokens"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 137 - "Secondary Text Color Tokens"
Cohesion: 0.67
Nodes (3): secondary-foreground, $type, $value

### Community 138 - "UI Styling Dependencies"
Cohesion: 0.67
Nodes (3): UI Styling Test Dependencies, UI Styling Script Requirements, UI Styling Test Requirements

## Knowledge Gaps
- **113 isolated node(s):** `@types/bcryptjs`, `@types/express`, `@types/node`, `@types/react`, `@types/react-dom` (+108 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1068 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `zod` connect `Authenticated Resource Routes` to `Node Package Overrides`, `Backend Request Schemas`, `Application Shell Components`, `Business Form Schemas`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `TestTailwindConfigGenerator`) actually correct?**
  _`TailwindConfigGenerator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/bcryptjs`, `@types/express`, `@types/node` to the rest of the system?**
  _113 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shadcn Component Installer` be split into smaller, more focused modules?**
  _Cohesion score 0.053555750658472345 - nodes in this community are weakly interconnected._
- **Why does `ShadcnInstaller` connect `Shadcn Component Installer` to `Python Tooling Test Imports`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `DesignSystemGenerator` (e.g. with `TestReasoningMatch` and `TestReasoningContract`) actually correct?**
  _`DesignSystemGenerator` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `UI UX Search Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.05563093622795115 - nodes in this community are weakly interconnected._