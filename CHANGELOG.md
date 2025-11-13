# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Admin Portal**: Comprehensive password-protected admin portal at `/admin` for platform monitoring and user management.
  - **Authentication**: Password-only login with JWT-based session management, rate limiting (5 attempts per 15 minutes), and audit logging.
  - **Analytics Dashboard**: Platform-wide metrics including user statistics, content overview, registration timeline charts (week/month/year views), and activity heatmaps.
  - **User Management**: Search and filter users, view detailed profiles with generation counts, cascade delete users with all associated data, and delete individual items.
  - **New API Endpoints**:
    - `POST /api/admin/auth/login` - Admin login
    - `POST /api/admin/auth/logout` - Admin logout
    - `GET /api/admin/auth/verify` - Verify admin session
    - `GET /api/admin/users` - List users with search and pagination
    - `GET /api/admin/users/[userId]` - Get detailed user profile
    - `DELETE /api/admin/users/[userId]` - Delete user and all data
    - `DELETE /api/admin/users/[userId]/items/[itemType]/[itemId]` - Delete individual items
    - `GET /api/admin/analytics/summary` - Get summary statistics
    - `GET /api/admin/analytics/registrations` - Get registration timeline
    - `GET /api/admin/analytics/activity-heatmap` - Get activity heatmap
  - **New Models**: `AdminLoginAttempt` for rate limiting and audit logging.
  - **Environment Variable**: `ADMIN_PASSWORD` for admin authentication.
- Created `CHANGELOG.md` to track project changes.

### Changed

- Updated `README.md` to include a new "Available Scripts" section.
- Updated `CLAUDE.md` to document the admin portal feature and environment variables.
- Created `.env.example` file with all required environment variables.
- **Admin Dashboard Improvements**:
  - Redesigned analytics charts with cyan accent color (#06B6D4) matching app theme in both light and dark modes
  - Charts now display side-by-side for better space utilization
  - Switched to radio-button style view toggles (Week/Month only, removed year)
  - Line chart for registrations with filled area and styled points
  - Simplified activity heatmap to show only Total Activities bar chart
  - Week view shows data by weekday (Sun, Mon, Tue, etc.)
  - Month view shows data by day of month (1-30/31)
  - Added cursor-pointer to all interactive elements for better UX
  - Custom tooltips with dark theme and proper formatting
  - Integrated Dialog component for delete confirmations (replaced browser alerts)
  - All metrics now display as integers (e.g., "17" instead of "17.0")
  - Fixed runtime error in user details modal (stats.totalVideos undefined)
  - Updated API endpoints for proper weekday/day aggregation
- **User Management UI Overhaul**:
  - Implemented collapsible filters to save vertical space and reduce clutter
  - Added tabbed interface in user details modal with 3 tabs: Overview, Videos, and Activity
  - Created gradient stat cards with themed icons and colors (cyan, purple, blue, emerald)
  - Added user avatar with initials in modal header
  - Display badges for user type and login streak with flame icon
  - Enhanced videos tab with thumbnail display and better metadata organization
  - Added tags for material types (Learning Material, Mind Map, Notes)
  - Implemented activity breakdown visualization with progress bars showing percentages
  - Reorganized "Danger Zone" section with clearer warnings
  - Improved overall visual hierarchy, spacing, and component organization
  - Better empty states with icons and helpful messages

### Fixed

- **Admin Analytics**: Fixed variable shadowing bug in summary endpoint where `activeUsersLast30Days` was referenced before initialization
- **Admin Analytics**: Fixed active users count exceeding total users by verifying users still exist in database before counting (excludes deleted users' orphaned activity logs)

## [0.1.0] - 2025-11-09

### Added

- Initial commit of the project.
