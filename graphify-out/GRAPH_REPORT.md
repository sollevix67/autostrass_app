# Graph Report - autostrass_app  (2026-10-09)

## Corpus Check
- 242 files · ~308,749 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 60 file(s) not represented in the graph (top: .csv 53, .css 3, (none) 2)

## Summary
- 2266 nodes · 4354 edges · 135 communities (92 shown, 43 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 168 edges (avg confidence: 0.86)
- Token usage: unavailable (the agent runner did not report usage; cost.json stores 0/0 placeholders, not a zero-cost measurement).

## Extraction and Integrity Notes
- Sensitive-file detection excluded `src/tokens.css`.
- Eleven SQL files were not parsed structurally because `tree_sitter_sql` is not installed.
- Five semantic documents produced no nodes and remain unstamped in the incremental manifest so they can be retried.
- Integrity diagnostics found 282 dangling-endpoint edges, 5 self-loops, and 81 directed / 82 undirected same-endpoint edge collapses. The graph is usable, but these findings may indicate incomplete or collapsed relationships.

## Community Hubs (Navigation)
- Backend Validation Security
- UI Component Setup Tools
- Design Asset Search
- Design Dataset Tests
- SVG Icon Generation
- Authentication State Management
- Database Connection Configuration
- Application Shell and Theme
- Primitive Design Tokens
- API Authentication Middleware
- Python Tooling Integration
- Shared Domain Data Schema
- Database Repositories
- Form Components and Validation
- Design Tool Dependencies
- Document Repository Operations
- Design System Generator
- Slide Search Workflow
- Presentation Copywriting Formulas
- Form Input Type Schemas
- Semantic Design Token Values
- Brand Token Synchronization Tests
- Frontend Data Fetch Cache
- Cash Register Repository
- Application Option Catalog
- Design Data Contract Tests
- Project Build Configuration
- CIP Search Core
- Express API Bootstrap
- Presentation Slide Generator
- Design Query Filtering
- Tailwind Configuration Tests
- Project Command Scripts
- Application TypeScript Configuration
- Background Image Selection
- Dark Theme Token Palette
- Error Summary Components
- Brand Asset Governance
- Toast Notification Components
- CSRF Request Protection
- CIP Search and Ranking
- CIP Content Generation
- Product Design System and Handoff
- Design and Deliverable Guidelines
- Cash Register Verification Tests
- Database Step Schemas
- Node TypeScript Configuration
- Component Token Variables
- API Integration Tests
- Brand Color Analysis Tools
- Accessible Color Contrast
- Catalog Refresh Tests
- Routing and Shared Page Data
- Design Asset Validation
- Tailwind Plugin Recommendations
- Data Contract Test Helpers
- Npm Dependency Configuration
- Icon Component and Paths
- Server TypeScript Configuration
- Logo Collection Search
- Design Token Starter Template
- Responsive Breakpoint Configuration
- Accessible Dark Palette Derivation
- Search Domain Routing Tests
- Design Domain Search Tests
- Runtime Dependency Catalog
- Design Token Extraction
- Token Validation Utilities
- Theme Utility Classes
- HTML Asset Preview Generation
- Brand Context Injection
- Style Speed and Density Taxonomy
- Typography and Spacing Utilities
- Brand Token Sync Scripts
- Design Token Generation
- Font and Hover Tokens
- Reasoning Decision Rules
- Delivery Repository Operations
- User Mapping and Repository
- BM25 Search Scoring
- BM25 Search Relevance
- Design Style Taxonomy Tests
- Compact Spacing Tokens
- Component State Tokens
- Lint Configuration Rules
- Test Threshold Validation
- Small Spacing Tokens
- Query Tokenization
- Border Color Tokens
- Border Radius Tokens
- Typography Size Tokens
- BM25 Cache and Query Tests
- Social Image Design Guide
- Vertical Padding Tokens
- Extra Large Spacing Tokens
- Medium Spacing Tokens
- Zero Spacing Tokens
- Test Fixture Validation
- Build and Form Type Errors
- Presentation Design References
- Interface Interaction States
- Destructive Action Color
- Destructive Text Color
- Muted Surface Tokens
- Primary Text Tokens
- Focus Ring Tokens
- Secondary Text Tokens
- Styling Script Dependencies
- Product Overview and API
- TypeScript Project References
- Banner Art Direction Guide
- Documentation Authoring Workflow
- Structured Code Review Guide
- Hypothesis Driven Debugging
- Full Stack Security Guidance
- React Component Guidance
- Software Test Strategy
- TypeScript Design Guidance
- UI UX Design Assistance
- HTML Application Entry
- SVG Icon Sprite
- Apache License
- Browser Favicon Asset
- Application Security Review
- Hero Background Artwork
- React Brand Mark
- Vite Brand Mark

## God Nodes (most connected - your core abstractions)
1. `TailwindConfigGenerator` - 58 edges
2. `TestTailwindConfigGenerator` - 35 edges
3. `DesignSystemGenerator` - 35 edges
4. `ShadcnInstaller` - 34 edges
5. `Icon()` - 34 edges
6. `react` - 31 edges
7. `createApiRouter()` - 27 edges
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
- `Stock by Location Design Specification` --references--> `Persisted Stock and Authenticated Location Reading`  [EXTRACTED]
  specs/stock-emplacements-design.md → passation.md
- `TestGeneratedConfigIsValidJs` --uses--> `TailwindConfigGenerator`  [INFERRED]
  .github/prompts/ui-styling/scripts/tests/test_tailwind_config_gen.py → .github/prompts/ui-styling/scripts/tailwind_config_gen.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three-Layer Design Token Architecture** — _github_prompts_design_system_references_primitive_tokens_primitive_tokens, _github_prompts_design_system_references_semantic_tokens_semantic_tokens, _github_prompts_design_system_references_component_tokens_component_tokens [EXTRACTED 1.00]
- **Strategic HTML Slide Authoring** — github_prompts_slides_skill_slides_skill, github_prompts_slides_references_copywriting_formulas_copywriting_formulas, github_prompts_slides_references_layout_patterns_slide_layout_patterns, github_prompts_slides_references_html_template_html_slide_template, github_prompts_slides_references_slide_strategies_slide_strategies [EXTRACTED 1.00]
- **UI Styling Component, Utility, and Canvas Layers** — github_prompts_ui_styling_skill_ui_styling_skill, github_prompts_ui_styling_skill_component_layer, github_prompts_ui_styling_skill_tailwind_styling_layer, github_prompts_ui_styling_skill_canvas_visual_layer [EXTRACTED 1.00]
- **Social Image HTML Design and Screenshot QA Workflow** — github_prompts_design_references_social_photos_design_social_photos_design_guide, github_prompts_design_references_social_photos_design_html_screenshot_workflow, github_prompts_design_references_social_photos_design_safe_zones_visual_qa, github_prompts_design_references_social_photos_design_platform_image_sizes [EXTRACTED 1.00]

## Communities (135 total, 43 thin omitted)

### Community 0 - "Backend Validation Security"
Cohesion: 0.04
Nodes (75): RFC-5321, CLIENT_TYPES, DELIVERY_STATUSES, ORDER_STATUSES, PAYMENT_MODES, USER_ROLES, VEHICLE_STATUSES, VEHICLE_TYPES (+67 more)

### Community 1 - "UI Component Setup Tools"
Cohesion: 0.05
Nodes (3): main(), ShadcnInstaller, TestShadcnInstaller

### Community 2 - "Design Asset Search"
Cohesion: 0.06
Nodes (31): BM25, _contains_phrase(), detect_domain(), _domain_keywords(), _exact_match_diagnostic(), _exact_row_identity(), _exact_stack_identifier(), _file_signature() (+23 more)

### Community 3 - "Design Dataset Tests"
Cohesion: 0.07
Nodes (43): read_rows(), TestAccessibilityGuidance, TestChartsTypographyAndIcons, TestCurrentReactGuidance, TestSemanticColors, _catalog_date(), _check_app_interface_contract(), _check_catalog_contract() (+35 more)

### Community 4 - "SVG Icon Generation"
Cohesion: 0.06
Nodes (25): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+17 more)

### Community 5 - "Authentication State Management"
Cohesion: 0.08
Nodes (44): AuthContext, AuthContextValue, AuthStatus, SessionUser, AuthProvider(), toAuthError(), CashState, useCashMovements() (+36 more)

### Community 6 - "Database Connection Configuration"
Cohesion: 0.05
Nodes (35): dotenv, mysql2, normalized, raw, statements, archive(), hasConfig, verify() (+27 more)

### Community 7 - "Application Shell and Theme"
Cohesion: 0.13
Nodes (42): App(), AppContent(), getStoredTheme(), getSystemTheme(), initials(), navigation, roleLabel(), ThemeMode (+34 more)

### Community 8 - "Primitive Design Tokens"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 9 - "API Authentication Middleware"
Cohesion: 0.10
Nodes (43): bcryptjs, express, jose, zod, db, UserRole, AUTH_COOKIE, authenticate() (+35 more)

### Community 10 - "Python Tooling Integration"
Cohesion: 0.06
Nodes (16): ansi_ljust(), _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides() (+8 more)

### Community 11 - "Shared Domain Data Schema"
Cohesion: 0.04
Nodes (46): ArticleRef, CASH_BREAK_DENOMINATIONS, CASH_MOVEMENT_TYPES, CASH_SESSION_STATUSES, CashBreakDenomination, cashMovements, cashMovementsRelations, CashMovementType (+38 more)

### Community 12 - "Database Repositories"
Cohesion: 0.07
Nodes (41): drizzle-orm, clients, commandes, leaked, livraisons, receptions, retours, users (+33 more)

### Community 13 - "Form Components and Validation"
Cohesion: 0.07
Nodes (38): @hookform/resolvers, react-hook-form, ConfirmDialogProps, ColumnDef, compare(), DataTableProps, SortAccessor, CommonProps (+30 more)

### Community 14 - "Design Tool Dependencies"
Cohesion: 0.06
Nodes (7): _rows(), TestNativeDesktopStackFreshness, TestMetricMath, read_rows(), read_rows(), TestTextLayoutDataContracts, TestTextLayoutRetrieval

### Community 15 - "Document Repository Operations"
Cohesion: 0.07
Nodes (13): DocumentRepository, toLine(), ClientInput, ClientRepository, ClientRow, mapClient(), mapVehicule(), Tables (+5 more)

### Community 16 - "Design System Generator"
Cohesion: 0.10
Nodes (4): DesignSystemGenerator, _resolve_dial(), TestReasoningMatch, TestReasoningContract

### Community 17 - "Slide Search Workflow"
Cohesion: 0.11
Nodes (16): format_context(), format_result(), main(), calculate_pattern_break(), detect_domain(), get_background_config(), get_color_for_emotion(), get_layout_for_goal() (+8 more)

### Community 18 - "Presentation Copywriting Formulas"
Cohesion: 0.06
Nodes (35): AIDA PAS and FAB Copywriting, Before-After-Bridge Formula, Slide Copywriting Formulas, Cost of Inaction Formula, Create Slide Prompt, HTML Slide Template, HTML Presentation Structure, Slide Layout Patterns (+27 more)

### Community 19 - "Form Input Type Schemas"
Cohesion: 0.06
Nodes (29): ArticleFormOutput, ArticleFormValues, CaisseClotureFormOutput, CaisseClotureFormValues, CaisseOuvertureFormOutput, CaisseOuvertureFormValues, CartLineFormOutput, CartLineFormValues (+21 more)

### Community 20 - "Semantic Design Token Values"
Cohesion: 0.06
Nodes (34): $type, $value, $type, $value, $type, $value, $type, $value (+26 more)

### Community 21 - "Brand Token Synchronization Tests"
Cohesion: 0.12
Nodes (5): test_sync_parses_bundled_starter_template(), main(), _run(), test_flags_hardcoded_hex_sharing_line_with_token(), test_token_only_line_reports_no_violation()

### Community 22 - "Frontend Data Fetch Cache"
Cohesion: 0.09
Nodes (26): cache, CacheEntry, fetchOnce(), useClientOptions(), useCommandeOptions(), useReferential(), useVenteOptions(), RETURN_REASON_OPTIONS (+18 more)

### Community 23 - "Cash Register Repository"
Cohesion: 0.15
Nodes (11): CashBreak, CashCountRow, CashMovementRow, CashRegisterRepository, CashSessionRow, round2(), Tables, toDecimal() (+3 more)

### Community 24 - "Application Option Catalog"
Cohesion: 0.11
Nodes (21): CARRIER_OPTIONS, CASH_DENOMINATIONS, CASH_MOVEMENT_LABELS, CLIENT_TYPE_OPTIONS, DELIVERY_STATUS_OPTIONS, denomination, euros, formatDenomination() (+13 more)

### Community 25 - "Design Data Contract Tests"
Cohesion: 0.14
Nodes (6): read_rows(), split_values(), style_identities(), TestGeneratedCatalogContract, TestLandingAndStackContract, TestStyleIdentityContract

### Community 26 - "Project Build Configuration"
Cohesion: 0.09
Nodes (20): name, overrides, esbuild, private, type, version, concurrently, drizzle-kit (+12 more)

### Community 27 - "CIP Search Core"
Cohesion: 0.12
Nodes (7): BM25, detect_domain(), get_cip_brief(), _load_csv(), search(), search_all(), _search_csv()

### Community 28 - "Express API Bootstrap"
Cohesion: 0.11
Nodes (16): app, emptyDashboard, hasDatabaseConfig, LowStockItem, port, errorHandler(), securityHeaders(), ArticleBody (+8 more)

### Community 29 - "Presentation Slide Generator"
Cohesion: 0.13
Nodes (10): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+2 more)

### Community 30 - "Design Query Filtering"
Cohesion: 0.14
Nodes (6): _filter_anti_patterns_for_mode(), _query_wants_dark(), _resolve_color_mode(), _style_is_dark_primary(), TestAntiPatternGating, TestModeResolution

### Community 32 - "Project Command Scripts"
Cohesion: 0.10
Nodes (20): scripts, build, caisse:fermer, db:generate, db:migrate, db:seed, db:studio, dev (+12 more)

### Community 33 - "Application TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 34 - "Background Image Selection"
Cohesion: 0.16
Nodes (9): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+1 more)

### Community 35 - "Dark Theme Token Palette"
Cohesion: 0.11
Nodes (19): $type, $value, background, foreground, muted-foreground, primary, primary-hover, secondary (+11 more)

### Community 36 - "Error Summary Components"
Cohesion: 0.11
Nodes (17): buildItems(), ErrorItem, ErrorRecord, ErrorSummaryProps, readMessage(), formatInteger(), VEHICLE_STATUS_OPTIONS, VEHICLE_TYPE_OPTIONS (+9 more)

### Community 37 - "Brand Asset Governance"
Cohesion: 0.17
Nodes (15): Asset Approval Checklist, Asset Organization Guide, Brand Guidelines Template, Color Palette Management, Brand Consistency Checklist, Logo Usage Rules, Messaging Framework, Typography Specifications (+7 more)

### Community 38 - "Toast Notification Components"
Cohesion: 0.18
Nodes (11): react, Toast, ToastApi, ToastContext, ToastTone, CONSOLE_FALLBACK, StockFilter, ApiStockEmplacement (+3 more)

### Community 39 - "CSRF Request Protection"
Cohesion: 0.17
Nodes (15): Bucket, bucketKey(), buckets, clientKey(), CSRF_HEADER, generateCsrfToken(), issueCsrfCookie(), prune() (+7 more)

### Community 40 - "CIP Search and Ranking"
Cohesion: 0.14
Nodes (6): format_brief(), format_results(), main(), format_output(), generate_design_brief(), main()

### Community 41 - "CIP Content Generation"
Cohesion: 0.18
Nodes (7): build_cip_prompt(), check_logo_required(), generate_cip_set(), generate_with_nano_banana(), load_env(), load_logo_image(), main()

### Community 42 - "Product Design System and Handoff"
Cohesion: 0.12
Nodes (17): Autostrass Design System Master, Accessibility and Responsive UI Rules, Dense Blue and Amber Dashboard Design, Project Handoff and Current State, Drizzle Migration 0005 and 0006 Caution, Express 5 MariaDB Monorepo Architecture, NF525 Cash Register Compliance, Persisted Stock and Authenticated Location Reading (+9 more)

### Community 43 - "Design and Deliverable Guidelines"
Cohesion: 0.13
Nodes (17): Banner Sizes and Styles, CIP Deliverable Guide, CIP Design, Design Routing, Icon Design, Logo Color Psychology, Logo Design, Logo Prompt Engineering (+9 more)

### Community 44 - "Cash Register Verification Tests"
Cohesion: 0.12
Nodes (14): apres, avant, carte, CashSession, cloture, comptageExact, courante, login (+6 more)

### Community 45 - "Database Step Schemas"
Cohesion: 0.12
Nodes (15): AUDIT_ACTIONS, AuditAction, commandeFournisseurLines, commandesFournisseurs, DELIVERY_MODES, DeliveryMode, emplacements, fournisseurs (+7 more)

### Community 46 - "Node TypeScript Configuration"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 47 - "Component Token Variables"
Cohesion: 0.12
Nodes (16): $type, $value, $type, $value, $type, $value, $type, $value (+8 more)

### Community 49 - "API Integration Tests"
Cohesion: 0.13
Nodes (13): adminId, clientId, clientPourAvoir, csrfFromCookie(), fuite, login(), metiers, nouveauClient (+5 more)

### Community 50 - "Brand Color Analysis Tools"
Cohesion: 0.20
Nodes (11): calculateCompliance(), colorDistance(), displayPalette(), extractHexColors(), findNearestBrandColor(), fs, generateImageMagickCommand(), hexToRgb() (+3 more)

### Community 51 - "Accessible Color Contrast"
Cohesion: 0.18
Nodes (4): _palette_is_dark(), _relative_luminance(), TestEndToEndCoherence, TestLuminance

### Community 53 - "Routing and Shared Page Data"
Cohesion: 0.18
Nodes (10): react-router-dom, PageLayoutProps, PAYMENT_MODE_OPTIONS, venteContext(), venteSchema(), byDateDesc(), CartLine, todayIso() (+2 more)

### Community 54 - "Design Asset Validation"
Cohesion: 0.25
Nodes (13): checkManifest(), formatBytes(), formatOutput(), fs, main(), parseFilename(), path, RULES (+5 more)

### Community 57 - "Npm Dependency Configuration"
Cohesion: 0.14
Nodes (14): devDependencies, concurrently, drizzle-kit, oxlint, tsx, @types/bcryptjs, @types/express, @types/node (+6 more)

### Community 58 - "Icon Component and Paths"
Cohesion: 0.15
Nodes (11): IconName, IconSize, PATHS, SIZES, EditableCard(), EditableCardProps, ResourceBannersProps, ApiMode (+3 more)

### Community 59 - "Server TypeScript Configuration"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleResolution, noEmit, noUnusedLocals, noUnusedParameters, skipLibCheck (+5 more)

### Community 60 - "Logo Collection Search"
Cohesion: 0.21
Nodes (5): detect_domain(), _load_csv(), search(), search_all(), _search_csv()

### Community 61 - "Design Token Starter Template"
Cohesion: 0.15
Nodes (12): component, $type, $value, dark, semantic, $schema, $type, $value (+4 more)

### Community 63 - "Accessible Dark Palette Derivation"
Cohesion: 0.22
Nodes (4): _contrast_ratio(), _derive_dark_palette(), _select_palette_for_mode(), TestPaletteSelection

### Community 66 - "Runtime Dependency Catalog"
Cohesion: 0.15
Nodes (13): dependencies, bcryptjs, dotenv, drizzle-orm, express, @hookform/resolvers, jose, mysql2 (+5 more)

### Community 67 - "Design Token Extraction"
Cohesion: 0.17
Nodes (8): args, fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath, wrapStyle

### Community 68 - "Token Validation Utilities"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 69 - "Theme Utility Classes"
Cohesion: 0.20
Nodes (12): $type, $value, bg, bg, padding, shadow, card, bg (+4 more)

### Community 70 - "HTML Asset Preview Generation"
Cohesion: 0.25
Nodes (4): generate_html(), get_deliverable_info(), get_image_base64(), main()

### Community 71 - "Brand Context Injection"
Cohesion: 0.31
Nodes (10): extractColorsFromTable(), extractCoreAttributes(), extractHexColors(), extractImageStyle(), extractTypography(), extractVoice(), fs, generatePromptAddition() (+2 more)

### Community 72 - "Style Speed and Density Taxonomy"
Cohesion: 0.18
Nodes (11): fast, normal, slow, $type, $value, $type, $value, primitive (+3 more)

### Community 75 - "Brand Token Sync Scripts"
Cohesion: 0.29
Nodes (8): adjustBrightness(), { execFileSync }, extractColorsFromMarkdown(), fs, generateColorScale(), main(), path, updateDesignTokens()

### Community 76 - "Design Token Generation"
Cohesion: 0.36
Nodes (9): flattenTokens(), fs, generateCSS(), generateTailwind(), main(), parseArgs(), path, resolveReference() (+1 more)

### Community 77 - "Font and Hover Tokens"
Cohesion: 0.20
Nodes (10): fg, font-size, hover-bg, button, $type, $value, $type, $value (+2 more)

### Community 78 - "Reasoning Decision Rules"
Cohesion: 0.27
Nodes (4): apply_decision_rules(), _object_without_duplicates(), parse_decision_rules(), _validate_action()

### Community 84 - "Compact Spacing Tokens"
Cohesion: 0.29
Nodes (8): padding-x, input, $type, $value, focus-ring, padding-x, $type, $value

### Community 85 - "Component State Tokens"
Cohesion: 0.29
Nodes (8): $type, $value, $type, $value, radius, default, full, default

### Community 89 - "Lint Configuration Rules"
Cohesion: 0.25
Nodes (7): ignorePatterns, plugins, rules, react/incompatible-library, react/only-export-components, react/rules-of-hooks, $schema

### Community 92 - "Small Spacing Tokens"
Cohesion: 0.47
Nodes (6): sm, shadow, sm, sm, $type, $value

### Community 94 - "Border Color Tokens"
Cohesion: 0.60
Nodes (5): $type, $value, border, border, border

### Community 95 - "Border Radius Tokens"
Cohesion: 0.60
Nodes (5): radius, radius, radius, $type, $value

### Community 96 - "Typography Size Tokens"
Cohesion: 0.60
Nodes (5): lg, $type, $value, lg, lg

### Community 99 - "Social Image Design Guide"
Cohesion: 0.50
Nodes (4): HTML Screenshot Production Workflow, Social Image Platform Sizes, Safe Zones and Visual QA, Social Photos Design Guide

### Community 100 - "Vertical Padding Tokens"
Cohesion: 0.67
Nodes (4): padding-y, padding-y, $type, $value

### Community 101 - "Extra Large Spacing Tokens"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 102 - "Medium Spacing Tokens"
Cohesion: 0.67
Nodes (4): $type, $value, md, md

### Community 103 - "Zero Spacing Tokens"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

### Community 105 - "Build and Form Type Errors"
Cohesion: 0.67
Nodes (3): Recorded TypeScript Build Errors, Missing Form Types and Components, React Hook Form Resolver Type Mismatches

### Community 106 - "Presentation Design References"
Cohesion: 0.67
Nodes (3): Slides Design Reference, Chart.js Data Visualization, Presentation Design Tokens

### Community 107 - "Interface Interaction States"
Cohesion: 0.67
Nodes (3): Focus States, Loading States, State Priority

### Community 108 - "Destructive Action Color"
Cohesion: 0.67
Nodes (3): destructive, $type, $value

### Community 109 - "Destructive Text Color"
Cohesion: 0.67
Nodes (3): destructive-foreground, $type, $value

### Community 110 - "Muted Surface Tokens"
Cohesion: 0.67
Nodes (3): muted, $type, $value

### Community 111 - "Primary Text Tokens"
Cohesion: 0.67
Nodes (3): primary-foreground, $type, $value

### Community 112 - "Focus Ring Tokens"
Cohesion: 0.67
Nodes (3): ring, $type, $value

### Community 113 - "Secondary Text Tokens"
Cohesion: 0.67
Nodes (3): secondary-foreground, $type, $value

### Community 114 - "Styling Script Dependencies"
Cohesion: 0.67
Nodes (3): UI Styling Test Dependencies, UI Styling Script Requirements, UI Styling Test Requirements

### Community 115 - "Product Overview and API"
Cohesion: 0.67
Nodes (3): Project README, React TypeScript Vite Express and MariaDB, Dashboard API and Vite Proxy

## Knowledge Gaps
- **584 isolated node(s):** `fs`, `path`, `fs`, `path`, `fs` (+579 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1048 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `zod` connect `API Authentication Middleware` to `Backend Validation Security`, `Project Build Configuration`, `Form Input Type Schemas`, `Application Shell and Theme`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `TestTailwindConfigGenerator`) actually correct?**
  _`TailwindConfigGenerator` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `fs`, `path`, `fs` to the rest of the system?**
  _584 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Validation Security` be split into smaller, more focused modules?**
  _Cohesion score 0.03702615339406406 - nodes in this community are weakly interconnected._
- **Why does `ShadcnInstaller` connect `UI Component Setup Tools` to `Brand Token Synchronization Tests`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `DesignSystemGenerator` (e.g. with `TestReasoningMatch` and `TestReasoningContract`) actually correct?**
  _`DesignSystemGenerator` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `UI Component Setup Tools` be split into smaller, more focused modules?**
  _Cohesion score 0.053555750658472345 - nodes in this community are weakly interconnected._