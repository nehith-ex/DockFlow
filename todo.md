# Project TODO

- [x] Implement DockFlow dashboard shell with International Typographic Style: white canvas, black grid lines, sans-serif typography, red square accents, and responsive asymmetric layout
- [x] Add persistent sidebar/navigation and data source status indicator for Synthetic / Proxy MVP data
- [x] Build procurement input form for origin, destination, cargo type, quantity, arrival window, vessel class, draft, port limits, and operating constraints
- [x] Implement five-stage workflow: Validate, Constraints, Features, Forecast, Recommend
- [x] Implement deterministic synthetic/proxy forecast generation with uncertainty bands for freight, congestion, and delivery
- [x] Implement constraints-first vessel feasibility gate with auditable pass/fail checks and rejection reasons
- [x] Implement vessel ranking under Cost, Delivery, Risk, and Balanced strategy profiles with visibly different results
- [x] Add explainable recommendation panel with rank, trade-offs, risk flags, score breakdown, and plain-language rationale
- [x] Add interactive scenario controls for freight, congestion, fuel, and demand with recommendation sensitivity updates
- [x] Add procurement outcome summary and pipeline progress visualization
- [x] Add request history persistence and revisit flow using the project database/server APIs
- [x] Add Vitest coverage for deterministic feasibility, strategy ranking, scenario sensitivity, and request persistence helpers
- [x] Run typecheck, tests, and visual browser verification at desktop and mobile sizes
- [x] Save final project checkpoint and deliver the website version to the user

- [x] Add form validation with user-facing error states for required fields, numeric bounds, and invalid procurement constraints
- [x] Implement explicit backend pipeline steps for request validation and decision-feature construction, and expose them in the returned decision trace
- [x] Add uncertainty/confidence outputs and UI indicators for congestion and delivery forecasts, not just freight
- [x] Add Vitest tests for procurement persistence helpers and/or tRPC procurement create/history procedures

- [x] Redesign DockFlow with a black-first visual system and calmer information hierarchy
- [x] Reduce overview clutter by emphasizing route context, recommendation, and key metrics while moving secondary detail into focused views
- [x] Add an East Coast India port map showing destination ports, route context, and selectable port details
- [x] Validate dark-theme contrast, responsive map layout, and preservation of decision workflow interactions
- [x] Save and deliver the refined dark DockFlow version

- [x] Create a public-facing DockFlow home page with a hero, vessel advertising section, and clear New Request CTA
- [x] Add featured vessel listing cards using the existing synthetic vessel data and explicit sample/availability labeling
- [x] Add a client/campaign showcase using neutral, non-testimonial campaign categories without fabricated reviews or claims
- [x] Connect the home-page New Request button and existing navigation to the procurement workflow
- [x] Validate homepage hierarchy, CTA flow, responsive layout, and existing dashboard behavior
- [x] Save and deliver the updated DockFlow project

- [x] Remove the homepage block targeted by the visual editor comment at client/src/pages/Home.tsx:241 and verify the surrounding layout
- [x] Save and deliver a checkpoint for the visual editor update

- [x] Fix React hook-order crash in Home when navigating between / and /new
- [x] Verify /new, /desk, and / routes after the hook-order fix
- [x] Save and deliver a checkpoint for the hook-order bug fix

- [x] After a valid New Request submission, open the recommendation result instead of only returning to the overview
- [x] Show the suggested vessel, forecast graph, uncertainty ranges, feasibility audit, score breakdown, and plain-language rationale immediately after submission
- [x] Verify the post-request flow with browser screenshots and tests, then save a checkpoint

- [x] Route successful request submission to the dedicated recommendation result state while keeping forecast, uncertainty, trace, and feasibility panels visible
- [x] Save and deliver the post-submit recommendation-state checkpoint
