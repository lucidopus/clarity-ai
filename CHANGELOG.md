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

## [0.1.0] - 2025-11-09

### Added

- Initial commit of the project.
