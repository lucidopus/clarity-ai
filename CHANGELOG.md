# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Admin Analytics Dashboard**: Password-protected admin portal at `/admin` with comprehensive user management and analytics capabilities
  - Admin authentication system with JWT-based password-only login
  - User management interface with search, pagination, and detailed user profiles
  - Analytics visualizations:
    - User registration timeline (week/month/year views)
    - Activity heatmap showing user engagement patterns
    - Summary statistics (total users, active users, videos processed, generations)
  - User detail modal with generation statistics and activity history
  - Cascade user deletion (removes all associated videos, materials, progress, and activity logs)
  - Individual generation deletion support (learning materials, mindmaps, notes, solutions, flashcards, videos)
  - API endpoints:
    - `POST /api/admin/login` - Admin authentication
    - `GET /api/admin/users` - List users with pagination and search
    - `GET /api/admin/users/[id]` - User detail with generation breakdown
    - `DELETE /api/admin/users/[id]` - Delete user with cascade
    - `DELETE /api/admin/generations/[id]` - Delete individual generation
    - `GET /api/admin/analytics/registrations` - Registration timeline
    - `GET /api/admin/analytics/activity` - Activity heatmap data
    - `GET /api/admin/analytics/summary` - Summary statistics
  - Admin route protection via Next.js middleware
  - Environment variable `ADMIN_PASSWORD` for secure admin access
- Created `CHANGELOG.md` to track project changes.

### Changed

- Updated `README.md` to include a new "Available Scripts" section.
- Added `.env.example` with `ADMIN_PASSWORD` configuration

## [0.1.0] - 2025-11-09

### Added

- Initial commit of the project.
