# components/ — React UI Components

All React UI components for the Clarity AI platform. Mostly flat structure with subdirectories for onboarding and admin costs.

## Layout & Navigation

| Component | Description |
|-----------|-------------|
| `Navbar.tsx` | Public marketing navigation bar with auth-aware links and theme toggle. |
| `Sidebar.tsx` | Dashboard left sidebar: nav tabs (Home, Gallery, Discover), user info, logout. |
| `Footer.tsx` | Marketing site footer with links and copyright. |
| `ConditionalLayout.tsx` | Wraps pages in Navbar + Footer only on public routes; omits on dashboard/auth. |
| `DashboardHeader.tsx` | Dashboard top bar: user name, theme toggle, global search trigger. |
| `DiscoverNavbar.tsx` | Floating navbar for the Discover tab. |
| `TabNavigation.tsx` | Generic tab bar using `usePathname` for active highlighting. |
| `MaterialsTabs.tsx` | Tab switcher for video materials view (Flashcards, Quizzes, Transcript, etc.). |

## Core Learning Components

| Component | Description |
|-----------|-------------|
| `FlashcardViewer.tsx` | Animated 3D-flip flashcard deck with navigation, mastery tracking, edit/delete. |
| `FlashcardCreator.tsx` | Modal form for creating user-generated flashcards. |
| `FlashcardEditor.tsx` | Inline editor modal for modifying existing flashcard content. |
| `QuizInterface.tsx` | Interactive quiz engine: MCQ/true-false/fill-in-blank with animated feedback and scoring. |
| `QuizReview.tsx` | Post-quiz review screen showing all questions with correct/incorrect answers. |
| `TranscriptViewer.tsx` | Searchable transcript with timestamp navigation and animated highlights. |
| `VideoAndTranscriptViewer.tsx` | Split-panel: YouTube embed + highlighted transcript viewer. |
| `PrerequisiteChecker.tsx` | Prerequisite assessment: readiness quiz then shows gaps with Clara integration. |
| `PrerequisitesView.tsx` | Read-only display of prerequisite topics. |
| `MindMapViewer.tsx` | Interactive mind map using ReactFlow with custom nodes/edges, zoom, layout. |
| `MindMapNode.tsx` | Custom ReactFlow node component with Framer Motion and hover tooltips. |
| `CustomEdge.tsx` | Custom ReactFlow edge component with delete button on hover. |
| `NotesEditor.tsx` | Rich text notes editor using Tiptap; auto-saves per transcript segment. |
| `ChatBot.tsx` | Clara chatbot floating panel with animated open/close and message history. |
| `ChatMessage.tsx` | Individual chat bubble with Markdown rendering and syntax highlighting. |
| `ChatInput.tsx` | Chat message input with send button and loading state. |
| `VideoMaterialsView.tsx` | Full page orchestrator composing all learning material tabs. |

## Video & Gallery Components

| Component | Description |
|-----------|-------------|
| `VideoCard.tsx` | Video thumbnail card for the Discover tab. |
| `VideoListItem.tsx` | Compact list row for a processed video in the gallery. |
| `VideoDetailsModal.tsx` | Full-screen modal showing video details and quick actions. |
| `VideoSummaryButton.tsx` | Floating button showing AI-generated summary in a portal overlay. |
| `GenerateModal.tsx` | YouTube URL input modal that triggers video processing pipeline. |
| `GenerationCard.tsx` | In-progress generation status card with spinner. |
| `RecentVideoCard.tsx` | Small card for the home tab showing a recent video. |
| `CategoryRow.tsx` | Horizontally scrollable row of VideoCards for a Discover category. |
| `ChapterTimeline.tsx` | Vertical chapter list with timestamps for video navigation. |
| `ChapterButton.tsx` | Floating button that opens ChapterTimeline in a portal overlay. |

## Dashboard Analytics Components

| Component | Description |
|-----------|-------------|
| `StatCard.tsx` | Metric card with icon, value, label, and trend indicator. |
| `StudyActivityHeatmap.tsx` | GitHub-style calendar heatmap of daily study activity. |
| `WeeklyActivityChart.tsx` | Line chart of weekly study activity (Chart.js). |
| `FocusHoursChart.tsx` | Bar chart of study activity by hour of day. |
| `WeekdayConsistencyBars.tsx` | Bar chart of study consistency by day of week. |
| `VideoEngagementList.tsx` | Ranked list of most-engaged videos. |
| `ActivityFunnelCard.tsx` | Drop-off funnel from video generation to quiz completion. |
| `FlashcardDifficultyDonut.tsx` | Doughnut chart of flashcard difficulty distribution. |
| `ProgressBarCard.tsx` | Simple progress bar card with title and percentage. |
| `ProgressBar.tsx` | Reusable animated progress bar (Framer Motion). |
| `WelcomeBanner.tsx` | Personalized welcome heading with user's first name. |
| `MotivationBanner.tsx` | Small banner displaying a motivational message. |
| `HeatmapTooltip.tsx` | Portal-rendered tooltip for heatmap cells. |

## UI Primitives

| Component | Description |
|-----------|-------------|
| `Button.tsx` | Design-system button with variants (primary, secondary, ghost, danger), sizes, loading. |
| `Card.tsx` | Base card container with dark/light mode styling. |
| `Dialog.tsx` | Animated modal dialog with variant icons (error/warning/info/success). |
| `Toast.tsx` | Auto-dismissing toast notification with Framer Motion animation. |
| `Tooltip.tsx` | Hover tooltip wrapper with AnimatePresence. |
| `Switch.tsx` | Animated toggle switch input. |
| `ThemeToggle.tsx` | Light/dark mode toggle button; persists in localStorage. |
| `EmptyState.tsx` | Empty state block with icon, title, description, and optional CTA. |
| `SearchBar.tsx` | Debounced text search input. |
| `FilterDropdown.tsx` | Single-select dropdown filter. |
| `GlobalSearch.tsx` | Full-screen search portal (Cmd+K) for searching all videos. |
| `SectionTitle.tsx` | Styled section heading with optional subtitle. |

## Account Modals

| Component | Description |
|-----------|-------------|
| `DeleteAccountConfirmModal.tsx` | Confirmation modal before account deletion (requires typing confirmation). |
| `PasswordVerificationModal.tsx` | Password re-entry modal for sensitive account changes. |

## Subdirectories

| Directory | Description |
|-----------|-------------|
| `onboarding/` | Multi-step learner profiling wizard: `OnboardingFlow.tsx`, `ProgressIndicator.tsx`, 5 step components, and reusable UI primitives (`CheckboxCard`, `EmojiSlider`, `RankedChipSelector`, `TimeBlockCard`). |
| `admin/costs/` | Admin cost analytics charts: summary cards, daily cost, model comparison, feature breakdown, spending heatmap, token trends, top users table, cost drivers table, operation legend. |
