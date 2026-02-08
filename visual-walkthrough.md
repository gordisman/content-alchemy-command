# CONTENT ALCHEMY COMMAND - VISUAL WALKTHROUGH
Screenshots and UI Documentation for Firebase Migration

---

## INTRODUCTION FOR ANTI-GRAVITY/FIREBASE

This document provides visual documentation of the Content Alchemy Command user interface with annotated screenshots. Use these screenshots alongside the Master Architectural Blueprint to understand the complete application design, user workflows, and UI interactions.

**Screenshot Date:** January 25, 2026
**Base44 Version:** Current production instance
**Total Screenshots:** 19 images

**Important Note:** Some component file names (like `BacklogCard.js`) may differ from displayed UI labels (like "Ideas Ready"). Screenshots show the actual UI as it appears to users. Refer to screenshots for accurate visual design and labels.

---

## SCREENSHOT INDEX

### Core Pages:
1. studio-overview.png - Main workspace with Ideas Ready + platform lanes
2. studio-filters.png - Filter controls at top of Studio
3. vault-overview.png - Idea repository default view
4. vault-overview2.png - Select Mode activated
5. vault-overview3.png - Bulk actions after Select All
6. vault-overview4.png - Search and filter controls detail
7. horizon-calendar.png - Calendar view with Loading Dock
8. horizon-calendar2-archive-and-reset.png - Archive & Reset modal
9. settings.png - Admin configuration panel
10. system-health.png - Analytics dashboard

### Modals & Details:
11. create-post-modal-youtube.png - Create Post for YouTube
12. create-post-modal-linkedin.png - Create Post for LinkedIn
13. edit-post-modal-youtube.png - Edit Post for YouTube
14. edit-post-modal-linkedin.png - Edit Post for LinkedIn
15. idea-manifesto.png - Idea detail reference modal
16. detailed-postcard-cover.png - Post card action icons
17. allocation-matrix-detail.png - Strategy allocation matrix (if captured separately)

---

## 1. STUDIO PAGE (Main Workspace)

### 1.1 Studio Overview

**Screenshots:** 
- studio-overview.png (full page view)
- studio-filters.png (filter bar detail)

**Description:**
Main content production workspace divided into two distinct sections showing Idea cards (top/left) and Post cards (bottom/center).

**TOP SECTION: "Ideas Ready" (Idea Cards)**
- Vertical column on the left side of the page
- Displays **Idea** documents where status = 'ready'
- Shows IdeaCards (component: BacklogCard.js) with:
  - Idea title (master_title)
  - Pillar badge (color-coded)
  - Concept preview
  - "Spawn Post" button
- Purpose: Ideas that are ready to be turned into posts
- Click "Spawn Post" → Opens PostEditorModal to create a new Post from this Idea
- Query: `Ideas WHERE status = 'ready'`

[Note: Component file is called BacklogCard.js but UI label displays "Ideas Ready"]

**BOTTOM SECTION: Platform Lanes (Post Cards)**
- Main area showing up to 9 platform lanes (based on Settings.lane_visibility)
- Each lane displays **Post** documents filtered by platform
- Shows PlatformCards with:
  - Post title
  - Status badge (draft, scheduled, published, overdue)
  - Pillar badge
  - Publish date
  - Idea reference (if spawned from idea)
  - Quick action icons (see detailed-postcard-cover.png)
- Purpose: Posts at various stages of production/publishing
- Click any post card → Opens PostEditorModal in edit mode
- Drag-and-drop within lanes → Reorders posts (updates display_order field)
- Lanes visible: Instagram, YouTube, Facebook Page, Facebook Group, LinkedIn, X, Email
  [Note: Screenshot shows 7 active lanes - TikTok/Substack disabled in Settings.lane_visibility]

**Key Distinction:**
- **Ideas Ready section** = IDEA documents (from /ideas collection) - source material
- **Platform lanes** = POST documents (from /posts collection) - actual content pieces

---

### 1.2 Studio Filter Controls

**Screenshot:** studio-filters.png

**Description:**
Multi-row filter and control bar at top of Studio page. Filters work cumulatively to control which posts display in lanes below.

**Row 1: Search and View Controls**
- **Search bar**: Searches post titles across all visible posts
- **Pillars dropdown**: Filter by content pillar (shows only posts with selected pillar)
- **Horizon dropdown**: Time range filter for post dates
  - Options: "Last 7 days + future" (default shown), "7 days", "30 days", "90 days", "All time"
  - Filters based on publish_date field
- **Collapse All button**: Collapses all platform lanes (hides cards, shows only lane headers)
- **Expand All button**: Expands all platform lanes (shows all post cards in each lane)

**Row 2: Platform Lane Selector**
- **Show All button**: Displays all active platform lanes (default state)
- **Individual platform buttons**: Instagram, YouTube, Facebook Page, Facebook Group, LinkedIn, X, TikTok, Email, Substack, Community
  - Click single platform → shows ONLY that platform's lane
  - Click "Show All" → returns to showing all lanes
  - Only active platforms (Settings.lane_visibility = true) appear as buttons
  [Note: Screenshot shows 7 buttons because TikTok/Substack disabled in Settings]

**Row 3: Status Filters**
- **Archived toggle**:
  - ON: Shows archived posts alongside non-archived
  - OFF (default): Hides archived posts
- **Published filter** (3-state toggle):
  - **Hide**: Excludes published posts
  - **Show** (default): Includes published posts with other statuses
  - **Only**: Shows ONLY published posts

**Filter Interaction:**
All filters work together cumulatively.
Example: Pillar="Strategy" + Horizon="7 days" + Platform="LinkedIn" + Published="Hide"
Result: Shows draft/scheduled/overdue LinkedIn posts with Strategy pillar from last 7 days

---
### 1.3 Post Card Header Detail

**Screenshots:** 
- detailed-postcard-cover.png

**Description:**
Close-up view of a Post card showing the header elements and action icons. PostCards appear in the platform lanes in Studio. Component: components/studio/PlatformCard.js

**Post Card Header Line (top row - left to right):**

**Left Side - Platform and ID:**
1. **Platform Icon**: Facebook icon (blue circle with 'f' shown in screenshot)
   - Shows which platform this post is for (Post.platform field)
   - Icon and color match platform (Instagram=pink, YouTube=red, Facebook=blue, LinkedIn=blue, etc.)

2. **Post Badge**: "#POST-118-1"
   - Format: #POST-{idea_number}-{post_sequence} for idea-spawned posts
   - Format: #POST-D{direct_entry_sequence} for direct entry posts
   - Purple/brand colored badge
   - Quick identification and tracking

**Right Side - Quick Action Icons:**
3. **✨ Sparkle icon (purple)**: "View Idea Manifesto"
   - Opens IdeaManifestoModal showing parent Idea details
   - **Only visible if post.idea_id exists** (spawned from idea)
   - Hidden for direct entry posts (is_direct_entry=true)

4. **📅 Calendar icon**: "Jump to Horizon"
   - Navigates to Horizon page
   - Auto-scrolls to this post's publish_date

5. **↔️ Right arrow icon**: "Move to Different Lane"
   - Opens dropdown showing all active platforms
   - Select platform → Updates Post.platform field
   - **Card moves to selected platform lane**
   - **Platform Specific fields shift** to new platform in PostEditorModal
   - **All data preserved**: When moving between lanes, ALL platform-specific fields remain in database
     - LinkedIn fields, Instagram fields, YouTube fields all stored
     - Only the currently "active" platform fields display in modal
     - Example: Move LinkedIn post → Instagram. LinkedIn fields preserved, Instagram fields now active/editable

6. **⋮ Three dots menu**: "Post Actions"
   - **Edit**: Opens PostEditorModal in edit mode
   - **Delete**: Permanently deletes post (with confirmation)

**Post Card Body (below header - from screenshot):**
- **Status Badge**: "Published" (green) - Post.status
- **Post Title**: Full title text
- **Concept Preview**: Truncated body text
- **Timestamp**: "Jan 21, 11:38 AM" - Post.publish_date
- **Action Notes** (orange dot + text): "- Need to put images in and finalize post"
  - Only visible if Post.action_notes is populated

**Technical Note:**
PostCard component differs from IdeaCard. Shows platform icon (not status), post-specific actions (move lane, link to calendar), and preserves all platform field data when switching lanes.

---

## 2. IDEA VAULT PAGE

### 2.1 Vault Default View

**Screenshot:** vault-overview.png

**Description:**
Central idea repository showing grid of IdeaCards with filters and search.

**Layout:**
- Top: VaultUtilityBar with sorting, toggles, and "Select Mode" button
- Main: Responsive grid of IdeaCards (1-4 columns)

**Each IdeaCard Shows:**
- Master title
- Pillar badge (color-coded)
- Status badge (incubating/ready/completed)
- Concept preview (truncated)
- Resource count indicator
- Audio memo indicator
- Spawned post count
- Favorite star toggle
- Quick actions: View, Edit, Spawn Post

---

### 2.2 Vault Search and Filters

**Screenshot:** vault-overview4.png

**Description:**
Detailed view of IdeaVault filter and search controls (VaultUtilityBar component).

**Top Row:**
- **Sort dropdown**: "Date Created (Newest)" shown
  - Also available: Date Created (Oldest)
- **"Show Completed" toggle**: Includes/excludes status='completed' ideas
- **"Select Mode" button**: Activates bulk selection (see vault-overview2.png)

**Search Bar:**
- Searches by idea title (master_title)
- Searches by idea number (e.g., "#101")
- Searches in concept field
- Real-time filtering, case-insensitive

**Filter Row 1 - Status (Exclusive):**
- **All** (active): Shows all ideas
- **Incubating**: Shows only status='incubating'
- **Ready**: Shows only status='ready'
- **Completed**: Shows only status='completed'

**Filter Row 2 - Toggles (Additive):**
- **Archived** (trash icon):
  - OFF (default): Hides archived ideas
  - ON: Shows archived alongside active
- **Favorites** (star icon):
  - OFF: Shows all ideas
  - ON: Shows only is_favorite=true

**Filter Interaction:**
Filters are cumulative. Example: Status="Ready" + Favorites=ON → Shows ready ideas that are favorited

---

### 2.3 Vault Select Mode (Bulk Operations)

**Screenshots:**
- vault-overview2.png (Select Mode activated)
- vault-overview3.png (After Select All Visible)

**Description:**
Bulk selection mode for managing multiple ideas simultaneously.

**Step 1 - Activate Select Mode (vault-overview2.png):**
When user clicks "Select Mode" button:
- Button changes to "Selected (0)" with count
- "Select All Visible" button appears
- Each IdeaCard gains checkbox in corner
- User can individually check ideas
- Count updates: "Selected (3)" as user checks boxes

**Step 2 - Select All & Bulk Actions (vault-overview3.png):**
When user clicks "Select All Visible":
- All visible IdeaCards get checkboxes ticked
- Screenshot shows "Selected (16)" - all visible ideas selected
- Bulk action buttons appear:
  - **Move to Ready**: Sets status='ready' for all selected
  - **Return to Incubating**: Sets status='incubating' for all selected
  - **Assign Pillar**: Opens dropdown to assign pillar to all selected

**Bulk Actions:**
- Move to Ready: Makes ideas available in Studio "Ideas Ready" section
- Return to Incubating: Removes from Studio, returns to development
- Assign Pillar: Batch-reassign pillar categories

**Technical Note:**
"Select All Visible" only selects ideas matching current filters. Example: Filter by "Incubating" → Select All → Move to Ready = bulk promote visible incubating ideas only.

---
## 2.4 Idea Card Header Detail

**Screenshot:** detailed-idea-card-cover.png

**Description:**
Close-up view of an IdeaCard header showing all information elements and action icons arranged in the top line. Component: components/vault/IdeaCard.js

**Header Elements (left to right):**

**Left Side - Status and Stats:**
1. **Status Badge**: "Ready" (green)
   - Color-coded by status:
     - Green: "Ready" (status='ready')
     - Yellow/Orange: "Incubating" (status='incubating')
     - Grey: "Completed" (status='completed')

2. **Post Publication Counter**: "Posts: 0/1 Published"
   - Format: "Posts: {published_count}/{total_spawned} Published"
   - Shows: How many posts spawned from this idea have been published
   - Calculation:
     - Total spawned = Idea.post_sequence_counter (number of posts created from this idea)
     - Published count = COUNT(Posts WHERE idea_id=this_idea AND status='published')
   - Example: "0/1 Published" means 1 post spawned, 0 published yet
   - Helps track which ideas have resulted in actual published content

**Right Side - Identifiers and Actions:**
3. **Idea Number Badge**: "#IDEA-102" (purple badge)
   - Shows sequential idea_number (starts at 101)
   - Format: "#IDEA-{idea_number}"
   - Color: Purple/brand color
   - Helps with quick identification and reference

4. **Favorite Star Icon**: ⭐
   - Click to toggle Idea.is_favorite field
   - Filled star = is_favorite=true
   - Empty star = is_favorite=false
   - Used for filtering "Greatest Hits" or priority ideas

5. **Three-Dot Menu** (⋮): Action menu
   - Click opens dropdown with options:
     - **Edit**: Opens IdeaEditorModal
     - **View**: Opens IdeaViewModal (read-only)
     - **Spawn Post**: Opens PostEditorModal (create post from idea)
     - **Delete**: Deletes idea (with confirmation)
     - **Archive**: Sets archived=true (removes from active view)

**Technical Note for Anti-Gravity:**
The post counter requires a sub-query:
```javascript
// For each IdeaCard:
const totalSpawned = idea.post_sequence_counter;
const publishedCount = await firestore()
  .collection('posts')
  .where('idea_id', '==', idea.id)
  .where('status', '==', 'published')
  .get()
  .then(snapshot => snapshot.size);

// Display: `Posts: ${publishedCount}/${totalSpawned} Published`

---

## 3. HORIZON PAGE (Content Calendar)

### 3.1 Calendar Main View

**Screenshot:** horizon-calendar.png

**Description:**
Calendar scheduling view with Loading Dock, visual coding system, and date detail panel.

**Left Column - "Loading Dock":**
Posts without publish_date (staging area for scheduling).

- **Search bar**: Search by post title, ID, or platform
- **Sort dropdown**: Currently shows "Date Created (Newest)"
  - Options: Date Created (Newest), Date Created (Oldest), By Platform, By ID Number
- **Instruction text**: "Drag posts onto calendar dates to schedule"
- **Post cards**: Shows unscheduled posts ready to be dragged onto calendar

**Center - Calendar Grid:**
Monthly view (January 2026 shown) with sophisticated visual coding system.

**Calendar Visual Coding - 3 Layers:**

Each post appears as circular indicator with three information layers:

1. **Center Dot Color** = Platform
   - Instagram: Pink/Magenta
   - YouTube: Red
   - Facebook Profile: Light Blue
   - Facebook Group: Blue
   - LinkedIn: Blue
   - X/Twitter: Black
   - TikTok: Teal
   - Email: Purple
   - Substack: Orange

2. **Outer Ring Color** = Content Pillar
   - Ring color matches Settings.content_pillars[].color
   - Surrounds the platform dot
   - Example: Purple ring = first pillar, Green ring = second pillar

3. **Small Dot on Ring** = Action Notes Present
   - Tiny dot on outer ring → post.action_notes is populated
   - No dot → no action notes

**Right Panel - Day Detail:**
When user clicks a calendar date (purple highlight):
- Date header: "Wednesday, January 21, 2026"
- Post count: "1 scheduled posts"
- Detailed post card with:
  - Platform icon
  - Post ID
  - Status badge
  - Title and concept preview
  - Publish time
  - Action notes (if present)
  - Quick actions: Delete, Edit

**Platform Legend:**
Bottom of calendar shows color-coded platform dots with names.

**Drag & Drop:**
- Drag from Loading Dock → Calendar date → Updates publish_date
- Drag between dates → Reschedules post

---

### 3.2 Archive & Reset Modal

**Screenshot:** horizon-calendar2-archive-and-reset.png

**Description:**
Bulk operation modal for managing published/scheduled posts within date range. Component: ArchiveResetModal.js

**Action Mode Selection (Top):**

1. **Archive Published** (active/highlighted):
   - Archives published posts within date range
   - Sets Post.archived = true
   - Description: "Archive published posts within the date range"

2. **Return to Backlog**:
   - Clears Post.publish_date (sets to null)
   - Sets Post.status = 'draft'
   - Returns posts to Loading Dock
   - Use case: Reschedule content no longer relevant

**Date Range Selection:**
- **From Date**: Date picker for start date
- **To Date**: Date picker for end date
- Posts affected: WHERE publish_date BETWEEN from_date AND to_date

**Advanced Option:**
- **"Shuffle remaining posts to fill gaps?" toggle**:
  - When ON: After archiving/removing posts, redistributes remaining posts to fill calendar gaps
  - When OFF: Gaps remain in schedule (shown: "Gaps will remain in your schedule")
  - Use case: Automatically compact schedule after removing posts

**Action Button:**
- **Archive (0)** / **Return to Backlog (0)**: 
  - Shows count of affected posts in parentheses
  - Updates based on selected date range
  - Executes batch update when clicked

**Workflows:**

**Archive Published Posts:**
1. Select date range
2. Count shows: "Archive (15)"
3. Optionally enable shuffle
4. Click "Archive (15)"
5. Result: Posts archived, optionally schedule compacted

**Return to Backlog:**
1. Switch to "Return to Backlog" mode
2. Select date range
3. Enable shuffle if desired
4. Click action button
5. Result: Posts lose publish_date, return to draft, appear in Loading Dock

---

## 4. SETTINGS PAGE (Admin Only)

**Screenshots:** settings.png, allocation-matrix-detail.png

**Description:**
Admin configuration panel with six major sections for managing application settings.

**Section 1: Content Pillars Manager**
- CRUD operations on Settings.content_pillars[]
- Each pillar: id, name, description, color, disabled
- Screenshot shows 7 custom pillars defined

**Section 2: Weekly Quotas Editor**
- Edit Settings.weekly_quotas{platform: number}
- Per-platform post goals
- Used for SystemHealth dashboard calculations

**Section 3: YouTube Playlists Manager**
- CRUD operations on Settings.youtube_playlists[]
- Playlists available in PostEditorModal for YouTube posts

**Section 4: Lane Visibility Toggles**
- Settings.lane_visibility{} controls which platform lanes appear in Studio
- Screenshot shows TikTok and Substack set to false (inactive)
- This is why Studio shows 7 lanes instead of all 9

**Section 5: Strategy Allocation Matrix** (Most Complex)
- Displays: AllocationSets (columns) × ContentPillars (rows)
- Cell values: PillarTarget.target_percentage (editable)
- Validation: Each column (allocation set) should sum to 100%
- onSave: Creates/updates PillarTarget documents
- Uses composite key: allocation_set_id + pillar_id
- Screenshot shows matrix with 7 pillars × 3 allocation sets

**Section 6: Alert Settings**
- alert_notification_email (email recipients)
- alert_time (HH:MM format)
- alert_timezone (e.g., America/Toronto)

**Key Features Visible:**
- Content pillar list with color badges (7 custom pillars)
- Editable allocation matrix grid
- Weekly quota inputs per platform
- Lane visibility toggles (shows TikTok/Substack disabled)
- YouTube playlist manager

---

## 5. POST EDITOR MODAL (Create & Edit Modes with Post Review)

**Screenshots:**
- create-post-modal-youtube.png (Create, YouTube, Platform Specific tab)
- create-post-modal-linkedin.png (Create, LinkedIn, Platform Specific tab)
- edit-post-modal-youtube.png (Edit, YouTube, Platform Specific tab)
- edit-post-modal-linkedin.png (Edit, LinkedIn, Platform Specific tab)
- edit-post-modal-additional-pop-up.png (Post Review overlay)

**Description:**
Comprehensive modal with 4-tab structure organizing 80+ fields, plus a Post Review overlay for previewing formatted content before publishing. Same modal handles both create and edit workflows.

---

### 5.1 Post Editor - Tab Structure

**Tab Structure:**

1. **Content Tab** - General fields (title, body, CTA, action_notes, audio memo)
   - Behavior: Same for all platforms

2. **Platform Specific Tab** - Platform-dependent fields [SHOWN IN SCREENSHOTS]
   - Behavior: Changes based on selected platform
   - Screenshots show YouTube vs LinkedIn field differences
   - This is the ONLY tab that varies by platform

3. **Idea Resources Tab** - Parent idea's resources
   - Behavior: Same for all platforms
   - Only visible if post has idea_id (not shown for direct entry posts)
   - Shows web links, Google Drive files, local files from linked idea

4. **Schedule Tab** - Publish date, status, display_order, verification, archive
   - Behavior: Same for all platforms

**Create vs Edit Mode:**
- **Create**: Empty fields, "Create Post" title, creates new Post document
- **Edit**: Pre-populated fields, "Edit Post" title, updates existing Post
- Platform Specific tab: Identical field structure in both modes (content determined by platform selection)

**Platform-Specific Fields (Summary):**

**YouTube** (see create-post-modal-youtube.png and edit-post-modal-youtube.png):
- Playlists, SEO (title/description/tags)
- Video type: video/short/podcast/live_stream/community_post
- Thumbnail brief, pinned comment, related video link
- Audio notes, output notes

**LinkedIn** (see create-post-modal-linkedin.png and edit-post-modal-linkedin.png):
- Scroll stopper (first 140 chars)
- Presentation format: text_only/document_slideshow/native_video/image_text/poll
- Proof insight, primary CTA, first comment
- Headline, document URI

[Complete list of all 9 platforms' fields available in post-schema.json - includes Instagram, Facebook, X/Twitter, TikTok, Email, Substack, Community]

**Technical Note:**
PostEditorModal component uses conditional rendering based on `platform` prop. All 80+ fields exist in Post schema, but only relevant fields display to user. Modal receives `mode` prop ('create' or 'edit') and `post` object (null for create, populated for edit).

---

### 5.2 Post Review Overlay

**Screenshot:** edit-post-modal-additional-pop-up.png

**Description:**
Preview overlay showing formatted post content as it will appear when published. Accessed by clicking the **eye icon (👁️)** at the top of PostEditorModal. Allows user to review complete post before publishing.

**Component:** components/studio/PostReviewOverlay.js

**Overlay Structure (top to bottom):**

**Header Section:**
- **Top Right**: "Copy All to Clipboard" button
  - Copies all post content (title, body, platform fields, resources, etc.) to clipboard
  - Useful for pasting into actual platform or external tools
  
- **Post ID Badge**: "#POST-102-1" (or similar)
  - Shows post's sequential identifier
  
- **Platform Badge**: "Platform: YouTube" (in screenshot)
  - Indicates which platform this post is for
  - Determines which platform-specific content displays below

**Content Section (from Content Tab):**
- **Post Title**: "Post Title 2" (example)
- **Body**: Full post body text
  - Shows complete formatted text
  - Example in screenshot: "AI slop vs. real creativity: where your channel lands in 2026..." with full multi-paragraph content
- **Call to Action**: "Nothing yet for CTA" (if populated)
- **Action Notes**: "Gonna make an image before going live." (if populated)
  - Displays with orange indicator dot
  - Shows manual tasks needed

**Platform Specific Section:**
- **Section Header**: "PLATFORM SPECIFIC (YouTube)" 
  - Platform name matches Post.platform field
  - Content below changes based on platform

**For YouTube (shown in screenshot):**
- YouTube Type: "video"
- SEO Title: N/A (or populated value)
- SEO Description: N/A (or populated value)
- SEO Tags: N/A (or populated value)
- Thumbnail Brief: N/A (or populated value)
- Pinned Comment: N/A (or populated value)
- Related Video Link: N/A (or populated value)
- Audio Notes: N/A (or populated value)
- Output Notes: N/A (or populated value)

[For other platforms, would show LinkedIn fields, Instagram fields, etc. based on Post.platform]

**Idea Resources Section:**
- **Section Header**: "IDEA RESOURCES"
- Lists all resources from linked parent idea (if post.idea_id exists):
  - **Gord Isman website link**: https://gordisman.com/
  - **CAS Infographic link**: https://drive.google.com/file/d/...
  - [Shows resource type icons: web link, Google Drive, local file]
- Not shown for direct entry posts (is_direct_entry=true)

**Schedule Section (Bottom):**
- **Status**: "Draft" (shown in screenshot)
- **Date & Time**: "Not scheduled" (if publish_date is null)
  - Or shows actual date/time if scheduled

**Actions:**
- **"Back to Edit" button**: Closes Post Review overlay, returns to PostEditorModal editing view

**Use Cases:**
1. **Pre-publish review**: Check all content before setting status to 'published'
2. **Copy to clipboard**: Export all post data for pasting into actual platform (Instagram, LinkedIn, etc.)
3. **Final QA check**: Ensure platform-specific fields filled correctly
4. **Resource reference**: Quick view of linked idea resources without switching tabs

**Technical Note:**
Post Review overlay renders all populated fields from the Post document in a formatted, read-only view. It pulls data from:
- Content tab fields (title, body, cta, action_notes)
- Platform-specific fields (conditional based on Post.platform)
- Linked Idea resources (if idea_id exists)
- Schedule fields (status, publish_date)

The overlay is modal-over-modal (opens on top of PostEditorModal). "Back to Edit" closes overlay but keeps PostEditorModal open.

---

**Key Features of Combined Post Editor + Review:**
- Edit across 4 tabs with specialized field groups
- Preview formatted output via eye icon
- Copy complete post content to clipboard
- Platform-specific preview (YouTube fields vs LinkedIn fields, etc.)
- Seamless workflow: Edit → Review → Copy → Publish externally

---

## 6. IDEA MANIFESTO MODAL

**Screenshot:** idea-manifesto.png

**Description:**
Read-only modal displaying complete Idea details. Accessed from Studio by clicking sparkle (✨) icon on Post cards that were spawned from ideas. Provides quick reference to source idea without leaving Studio workflow.

**Component:** IdeaManifestoModal.js

**Information Displayed:**
- Idea number (sequential ID: #101, #102, etc.)
- Master title
- Concept (long-form narrative hook and description)
- Pillar assignment (color-coded badge)
- Status (incubating/ready/completed)
- Universal hashtags
- Favorite toggle (is_favorite indicator)
- Last posted date (when idea last spawned a post)
- Post count (number of posts spawned from this idea - from post_sequence_counter)
- Resources array (web links, Google Drive files, local files with appropriate icons)
- Audio memo (playback controls if idea_audio_memo exists, shows duration)

**Purpose:**
While working on posts in Studio, users can instantly view original idea's details—concept, resources, audio memos—without navigating to IdeaVault. Provides context while maintaining Studio workflow.

**Key Features:**
- Read-only (cannot edit from this modal)
- Quick close (returns to Studio)
- Optional "Edit Idea" button (navigates to IdeaVault → IdeaEditorModal)
- Context preservation (user stays in Studio)

**Difference from IdeaViewModal:**
- IdeaManifestoModal: Studio context, auto-opens from post card sparkle icon
- IdeaViewModal: Vault context, opens from IdeaCard in vault grid

---

## 7. SYSTEM HEALTH DASHBOARD

**Screenshot:** system-health.png

**Description:**
Analytics dashboard with multiple interactive reports tracking content production performance against strategic goals. Combines data from Settings (targets), AllocationSets (strategy), and Posts (actuals) to provide actionable insights.

**Page Structure - Five Reports:**

---

### Report 1: Pillar Alignment Tracker

**Visual Display:** Bar chart comparing target allocations vs. actual output

**Chart Elements:**
- **X-axis**: Content pillars (7 pillars shown in screenshot)
- **Y-axis**: Number of posts (scale 0-60)
- **Grey bars**: Target posts per pillar
  - Source: Active AllocationSet's PillarTarget.target_percentage
  - Calculation: (target_percentage / 100) × total published posts in date range
- **Colored bars**: Actual published posts per pillar
  - Color: Matches pillar color from Settings.content_pillars[].color
  - Height: COUNT(Posts WHERE definitive_pillar=X AND status='published' AND publish_date in range)
- **Percentage labels**: Actual percentage displayed above each colored bar

**Legend (Below Chart):**
All 7 content pillars with color swatches:
- Strategic Target (grey bars)
- #1 (purple - 8B5CF6): "YouTube Clarity & Growth - strategy & next steps"
- #2 (green - 10B981): "Workflow & Creator Systems - AI + Process"
- #3 (blue - 3B82F6): "AI Tools for Video Creation - tool demos & reviews"
- #4 (red - EF4444): "Editing & Production Craft - make videos better"
- #5 (yellow - EAB308): "Creator Mindset & Consistency - ship & sustain"
- #6 (pink - EC4899): "Offers & Creator Business - launch & monetize"
- #7 (grey - 6B7280): "! General Strategy Unassigned"

**Strategic Insights Panel:**
Automated analysis comparing targets to actuals:
- **⚠️ PRIORITY FOCUS**: Identifies under-performing pillars
  - Example: "These weak pillars need more focus. May be under-producing these topics compared to your current Steady State goals."
  - Lists specific pillars below target
- **📉 OVERSHADOWING**: Identifies over-performing pillars
  - Example: "These pillars are currently over-planned strategic allocation. Consider pulling back to make room for priority pillars."

**Date Range Filter:**
- Dropdown: "7 Days" (shown in screenshot)
- Options: 7 days, 30 days, 90 days, All time
- Affects: Published post count calculations for both targets and actuals

---

### Report 2: Omnichannel Velocity Map

**Visual Display:** Scatter plot timeline showing publishing activity

**View Mode Toggle (Top Right):**
- **View by Platform** (active in screenshot)
- **View by Pillar** (alternative mode)

**Chart Display - View by Platform Mode:**
- **Y-axis**: Platform names (YouTube, Facebook Profile, Facebook Group, LinkedIn, X/Twitter, Email shown)
- **X-axis**: Timeline (dates)
- **Dots**: Each dot = one published post
  - Dot color = platform color
  - Dot position = publish_date
  - Screenshot example: Pink dot on Facebook Profile row = 1 published Facebook post

**Chart Display - View by Pillar Mode (not shown):**
- Y-axis: Pillar names instead of platforms
- Dots colored by pillar colors
- Shows content distribution across pillars over time

**Legend (Below Chart):**
Color-coded pillar list (when in Platform view):
- Purple: "YouTube Clarity & Growth"
- Green: "Workflow & Creator Systems"
- Blue: "AI Tools for Video Creation"
- Red: "Editing & Production Craft"
- Yellow: "Creator Mindset & Consistency"
- Pink: "Offers & Creator Business"

**Strategic Observer Panel:**
Automated velocity analysis:
- Publishing frequency observations
- Gap and cluster identification
- Velocity metrics
- Examples from screenshot:
  - "Facebook Profile (1x – back-loaded) currently represents 100% of total volume"
  - "The 'YouTube Clone' line shows 0% activity for the selected window. Check Vault for ready ideas"
  - "Current shipping velocity is 0.1 posts/day for this 7-day window"

**Controls:**
- **Date Range dropdown**: "7 Days" (options: 7, 30, 90 days, All time)
- **View Toggle**: "View by Platform" / "View by Pillar" buttons
- Affects: Timeline display and data grouping

---

### Report 3: Dynamic Production Audit

**Visual Display:** List of pillar health cards showing production status

**Card Structure:**
Each pillar displays as a card with:
- **Pillar name** (left, large text with pillar color)
- **Status badge** (top right): "Neglected" (red), "Fresh" (green), or other statuses
- **Description** (below name): Full pillar description from Settings
- **Statistics** (right side):
  - **Last Shipped**: Date of most recent published post in this pillar
  - **Next Ideas**: Count of ideas WHERE pillar=X AND status='ready'
  - **Count**: Number of published posts in this pillar within date range

**Pillar Cards Shown (Examples from Screenshot):**
1. "YouTube Clarity & Growth - strategy & next steps" - Neglected, Count: 0
2. "AI Tools for Video Creation - tool demos & reviews" - Neglected, Count: 0
3. "Editing & Production Craft - make videos better" - Neglected, Count: 0
4. "Offers & Creator Business - launch & monetize" - Neglected, Count: 0
5. "Workflow & Creator Systems - AI + Process" - Fresh, Last: Jan 16, 2024, Count: 0
6. "Creator Mindset & Consistency - ship & sustain" - Fresh, Last: Jan 15, 2024, Count: 1

**Strategy Alert Box (Bottom):**
- Orange warning icon (⚠️)
- Alert message: "Offers & Creator Business - launch & monetize is currently neglected. You have 1 'Ready' idea in the Vault for this topic—move one to the Studio today to restore balance."
- Actionable recommendation linking specific pillar to available ideas in Vault

**Date Range Filter:**
- Dropdown: "Last 7 Days" (top right)
- Options: 7 days, 30 days, **Year to Date**, All time
  - [Note: Unique "Year to Date" option not available in other reports]
- Affects: "Count" calculations and "Last Shipped" relevance

---

### Report 4: Incubation Audit (Bottom Section)

**Visual Display:** Clock/timer icon with count

**Purpose:** Tracks ideas lingering in incubation too long

**Information Shown:**
- "Ideas in 'incubation' mode for 30+ days"
- Count of stale ideas
- Helps identify ideas stuck in development

---

### Report 5: Missed Schedule Audit (Bottom Section)

**Visual Display:** Calendar icon with warning, post cards

**Purpose:** Alerts on overdue scheduled posts

**Information Shown:**
- "Posts past their publish_date"
- Post cards displaying:
  - Post title
  - Scheduled date/time
  - Minutes/hours overdue
  - "Return to Studio" quick action button

**Example from Screenshot:**
- Post: "You're Not Ready for the Next Phase of YouTube - Coaching Worthy Creators, Part 1"
- Scheduled: Jan 26, 11:45 am
- Status: 120+ minutes overdue
- Action: "Return to Studio" button for quick access

---

**Technical Notes:**
All reports query Firestore with date range filters, compare against Settings targets, and generate automated insights. Chart colors dynamically pulled from Settings.content_pillars[].color. Component: pages/SystemHealth.js with components/health/OmnichannelVelocityMap.js

---

## KEY WORKFLOWS

### Workflow 1: Spawning a Post from an Idea

1. Navigate to IdeaVault
2. Find idea with status="ready"
3. Click "Spawn Post" button on IdeaCard
4. PostEditorModal opens with idea_id pre-filled
5. Select platform (determines Platform Specific tab fields)
6. Fill Content tab (title, body, CTA, audio memo)
7. Fill Platform Specific tab (YouTube/LinkedIn/Instagram/etc. fields)
8. Review Idea Resources tab (shows parent idea's resources)
9. Set Schedule tab (publish_date, status)
10. Save → Post created, appears in platform lane in Studio
11. Idea.post_sequence_counter increments

### Workflow 2: Direct Entry Post Creation

1. Navigate to Studio
2. Click "New Post" button
3. PostEditorModal opens without idea_id
4. is_direct_entry = true
5. Gets sequential D-number (D001, D002, etc.)
6. Select platform, fill all tabs (no Idea Resources tab)
7. Save → Post appears in platform lane
8. Settings.direct_entry_post_counter increments

### Workflow 3: Bulk Status Change in Vault

1. Navigate to IdeaVault
2. Click "Select Mode" button (vault-overview2.png)
3. Checkboxes appear on all IdeaCards
4. Check ideas individually OR click "Select All Visible"
5. Count updates: "Selected (16)" (vault-overview3.png)
6. Bulk action buttons appear:
   - Move to Ready
   - Return to Incubating
   - Assign Pillar
7. Click desired action
8. Batch update executes on all selected ideas
9. Status='ready' ideas now appear in Studio "Ideas Ready" section

### Workflow 4: Calendar Scheduling

1. Navigate to Horizon (horizon-calendar.png)
2. Find post in Loading Dock (left column)
3. Drag post onto calendar date
4. Drop → Updates Post.publish_date
5. Post appears on calendar with visual coding:
   - Center dot color = platform
   - Outer ring color = pillar
   - Small dot on ring = has action_notes
6. Click date → Detail panel shows all posts for that day
7. Click post card → Edit or manage

### Workflow 5: Archive Published Content

1. Navigate to Horizon
2. Click "Archive & Reset" button (top right)
3. Modal opens (horizon-calendar2-archive-and-reset.png)
4. Ensure "Archive Published" mode selected
5. Pick From Date and To Date
6. Count updates: "Archive (15)"
7. Optionally enable "Shuffle remaining posts" toggle
8. Click "Archive (15)"
9. Posts in range set to archived=true
10. If shuffle enabled, remaining posts redistribute to fill gaps

### Workflow 6: Managing Allocation Strategy

1. Navigate to Settings (admin only)
2. Scroll to Strategy Allocation Matrix section
3. Edit percentage values in matrix cells
4. Ensure each column (allocation set) sums to 100%
5. Click Save
6. PillarTarget documents created/updated
7. View SystemHealth → Pillar Alignment Tracker to see targets vs actuals

---

## NOTES FOR DEVELOPERS

**UI Framework & Libraries:**
- shadcn/ui components (Tailwind CSS-based)
- Lucide React icons
- Dark theme (shown in all screenshots)
- Drag-and-drop: react-dnd or @dnd-kit library
- Calendar: react-big-calendar or custom implementation
- Charts: Recharts or Chart.js
- Responsive: Mobile-first design with collapsible navigation

**Visual Design System:**
- Platform colors: Hardcoded constants
- Pillar colors: Dynamic from Settings.content_pillars[].color
- Status colors: Standard (green=published, yellow=scheduled, red=overdue, grey=draft)
- Dark background (#0a0a0a or similar)
- Purple accent color for primary actions (#8B5CF6)

**Component Patterns:**
- Modals: Full-screen overlays on mobile, centered on desktop
- Cards: Consistent shadow/border styling
- Badges: Rounded pills with appropriate colors
- Buttons: Primary (purple), Secondary (grey), Destructive (red)

**State Management:**
- No complex state library visible (Redux/MobX)
- Likely uses React Context + hooks for auth and settings
- Local component state for UI interactions
- React Query recommended for data fetching/caching

---

## SCREENSHOT REFERENCE LIST

**Core Pages (10 screenshots):**
1. studio-overview.png
2. studio-filters.png
3. vault-overview.png
4. vault-overview2.png
5. vault-overview3.png
6. vault-overview4.png
7. horizon-calendar.png
8. horizon-calendar2-archive-and-reset.png
9. settings.png
10. system-health.png

**Modals & Details (9 screenshots):**
11. allocation-matrix-detail.png
12. create-post-modal-youtube.png
13. create-post-modal-linkedin.png
14. edit-post-modal-youtube.png
15. edit-post-modal-linkedin.png
16. edit-post-modal-additional-pop-up.png
17. idea-manifesto.png
18. detailed-postcard-cover.png
19. detailed-idea-card-cover.png

---

## IMPORTANT NOTES FOR ANTI-GRAVITY

**UI Labels vs Component Names:**
- Component: BacklogCard.js → UI Label: "Ideas Ready"
- Always defer to screenshots for actual displayed text

**Configurable Elements:**
- Platform lanes: 9 supported, screenshots show 7 (TikTok/Substack disabled)
- Content pillars: 7 custom pillars in this installation (unlimited supported)
- Allocation sets: 3 shown (Growth Mode, Launch Mode, Steady State) - more can be added
- Date ranges: Different options per report (some include "Year to Date")

**Data Variability:**
- Screenshots represent specific moment with specific data
- Pillar names, colors, platform visibility are all configurable via Settings
- Number of visible lanes/pillars/cards depends on current Settings configuration
- Refer to schema JSON files for data structure, not screenshot content for field names

**Visual Coding in Calendar:**
- 3-layer system (platform dot + pillar ring + action note indicator)
- Must fetch Settings.content_pillars to render pillar ring colors
- Platform colors likely hardcoded in component
- Action note dot requires checking if post.action_notes field is populated

**Bulk Operations:**
- "Select All Visible" in Vault only selects filtered results
- Batch operations use Firestore batch writes for efficiency
- Archive & Reset shuffle algorithm redistributes remaining posts to fill gaps
