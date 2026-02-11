# Enhancement: YouTube Playlist Integration in Review & Copy Bundle

## Overview
This update integrates YouTube Playlist information (Name and ID) into the "Post Review" display and the "Copy Bundle" clipboard functionality. It also optimizes the text formatting for mobile devices by shortening separator lines.

## Changes

### 1. Post Review Overlay (`src/components/studio/PostReviewOverlay.jsx`)
- **Feature:** Added a "Playlists" section under "Platform Specific (YouTube)".
- **Logic:** Resolves playlist IDs stored in `formData.platform_fields.youtube_playlists` against the global `settings.youtube_playlists` to display human-readable names.
- **UI:** Displays playlists as badges (e.g., `Playlist Name`) with IDs visible in the review text.

### 2. Copy Bundle Logic (`src/components/studio/PostEditorModal.jsx`)
- **Fix:** Updated the `executeBundleProcess` function (triggered by the main "Copy" button in the editor header).
- **Implementation:** Explicitly calculates `resolvedPlaylists` and passes both this array and the global `settings` object to the `generateReviewText` utility. This ensures the clipboard text matches the visual review.

### 3. Review Text Formatter (`src/utils/postReviewFormatter.js`)
- **Enhancement:** Updated `generateReviewText` signature to accept `resolvedPlaylists` and `settings`.
- **Logic:** Added a backup resolution step. If `resolvedPlaylists` is empty (due to race conditions), it attempts to re-resolve IDs using `formData` and `settings` internally.
- **Mobile Optimization:** Shortened the separator lines (e.g., `════════════════════`) to 20 characters to prevent text wrapping on narrower mobile screens.

## Verification
- **Visual Check:** Open a YouTube post -> Click Eye Icon -> Verify Playlists appear in the platform section.
- **Clipboard Check:** Click "Copy" icon -> Paste text -> Verify Playlists are listed and separators are short.
