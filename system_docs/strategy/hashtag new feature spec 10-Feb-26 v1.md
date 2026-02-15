# Platform-Specific Hashtag Generation Feature
## Content Alchemy Command - Feature Specification

**Date:** February 10, 2026  
**Author:** Gord Isman  
**Status:** Ready for Implementation

---

## Overview

Add AI-powered hashtag generation to the Post entity, allowing users to automatically generate platform-optimized hashtags based on post content, title, platform, and content pillar context.

---

## 1. Schema Changes

### New Field to Add to Post Entity

**Location:** Insert after `cta` field (line ~53), before `action_notes` field

```json
"generated_hashtags": {
  "type": "string",
  "description": "Platform-optimized hashtags generated from post title, body, platform, and content pillar"
}
```

**Field Specifications:**
- **Type:** String (text area in UI)
- **Required:** No (optional/nullable)
- **Max Length:** 500 characters
- **Default:** Empty/null
- **Display:** Tag-style input with inline generation button

---

## 2. Generation Context (Input Variables)

The hashtag generator will use these existing Post entity fields:

1. **`post_title`** (line 5) - Post headline/topic
2. **`body`** (line 46) - Main post content
3. **`platform`** (line 22) - Target platform (x, tiktok, instagram, youtube, fb_page, fb_group, linkedin, email, substack, community)
4. **`definitive_pillar`** (line 38) - Content pillar ID → resolved to full pillar object from Settings entity for name & description

---

## 3. Platform-Specific Generation Rules

| Platform | Hashtag Count | Style Guidelines |
|----------|--------------|------------------|
| **Instagram** | 20-30 | Mix of popular + niche tags, branded |
| **X (Twitter)** | 1-3 | Concise, trending-focused |
| **TikTok** | 3-5 | Trending + niche combo |
| **LinkedIn** | 3-5 | Professional, industry-relevant |
| **YouTube** | 10-15 | SEO-focused for description |
| **Facebook** | 3-5 | Community/group-relevant |
| **Community** | 3-5 | Topic-specific |

---

## 4. Generation Algorithm

### Process Flow:
```
1. Extract key themes/keywords from post_title and body
2. Resolve definitive_pillar ID → get pillar name + description from Settings
3. Combine content keywords + pillar context
4. Apply platform-specific rules based on platform value
5. Generate optimized hashtag list
6. Return formatted hashtag string
```

### AI Prompt Context Template:
```
Generate platform-optimized hashtags for:
- Platform: {platform}
- Title: {post_title}
- Content: {body}
- Topic/Pillar: {pillar_name} - {pillar_description}

Follow {platform}-specific best practices for hashtag count and style.
```

---

## 5. UI Implementation

### Content Tab Field Order:
1. Post Title
2. Body
3. CTA
4. **🆕 Generated Hashtags** ← NEW FIELD HERE
5. Action Notes

### Field Layout:
```
┌─────────────────────────────────────────────┐
│ Generated Hashtags                          │
│ ┌─────────────────────────────────────────┐ │
│ │ #VideoCreation #AITools #CreatorTips    │ │
│ │ #YouTubeGrowth #ContentStrategy         │ │
│ └─────────────────────────────────────────┘ │
│ [✨ Generate Hashtags] [🔄 Regenerate]      │
└─────────────────────────────────────────────┘
```

### UI Components:
- **Text Area/Tag Input:** Display generated hashtags (editable)
- **Generate Button:** Primary action - triggers initial generation
- **Regenerate Button:** Secondary action - generates new variation
- **Visual Feedback:** Loading spinner during generation

### User Flow:
1. User fills in: post_title, body, platform, definitive_pillar
2. User clicks "✨ Generate Hashtags"
3. System calls generation function with 4 context variables
4. Generated hashtags appear in field (user can edit)
5. Optional: Click "🔄 Regenerate" for different variation
6. Save post with generated hashtags

---

## 6. Technical Implementation

### Components Needed:

**A. Backend Function:** `functions/generateHashtags.js`
- Input: `{ post_title, body, platform, definitive_pillar }`
- Process: AI generation with platform rules
- Output: Hashtag string

**B. UI Component:** Update Post form in `src/pages/Studio.jsx` (or wherever post editing occurs)
- Add field after CTA, before Action Notes
- Add generation button(s)
- Handle loading/error states

**C. Schema Update:** Add `generated_hashtags` field to `entities/Post`

---

## 7. Scope & Complexity Assessment

### What's Actually Being Added:
- ✅ **1 new field** in Post entity schema
- ✅ **1 backend function** for hashtag generation
- ✅ **2 UI buttons** (Generate + Regenerate)
- ✅ **Minor UI adjustment** to post form layout

### Estimated Effort:
Small-to-medium feature
- Schema change: 5 minutes
- Backend function: 30-60 minutes
- UI integration: 30-45 minutes
- **Total:** ~1.5-2 hours

---

## 8. Implementation Recommendation

### ✅ IMPLEMENT NOW

**Why Add It Now:**
1. **Small, Contained Feature** - Only 1 field + 1 function + minor UI work
2. **Low Risk** - Doesn't touch newly-stabilized pillar/allocation system
3. **High User Value** - Immediate productivity boost for creators
4. **Clean Foundation** - Post entity is stable, pillars are fixed
5. **Natural Extension** - Leverages existing data structure perfectly

**This Won't Destabilize Anything:**
- No database restructuring needed (just 1 optional field)
- Doesn't affect existing workflows
- No dependencies on other pending work
- Can be added, tested, and deployed independently

---

## 9. Micro-App Spinoff Decision

### 🅿️ PARK THE MICRO-APP FOR NOW

**Why Wait:**

❌ **Reasons NOT to Build Micro-App Right Now:**
1. **Loss of Focus** - Main app just stabilized after significant debugging
2. **Fragmented Effort** - Splits attention between two codebases
3. **Duplicate Work** - Building same feature twice (main app + standalone)
4. **Premature Optimization** - Test feature in main app first to validate value
5. **Context Switching Cost** - New project = new mental model, setup, deployment

✅ **Better Strategy:**
1. **Build it into Content Alchemy first** (1.5-2 hours)
2. **Use it yourself for 2-4 weeks** - validate it solves the problem
3. **Gather feedback** from mastermind/community
4. **THEN consider** spinning it out as micro-app if there's demand

**The Micro-App Can Wait Because:**
- Main app IS the best testing ground
- Real usage will inform what features matter most
- If valuable, micro-app will be better informed
- Won't waste time building features nobody needs

---

## 10. Implementation Action Plan

### 🎯 Phase 1 (NOW - ~2 hours):
1. Add `generated_hashtags` field to Post entity schema
2. Create `generateHashtags` backend function
3. Add Generate/Regenerate buttons to Post form UI
4. Test with a few sample posts

### Phase 2 (Later - validate first):
- Use the feature for 2-4 weeks in production
- Collect feedback from real usage
- Refine generation prompts based on actual results
- Track which platforms/pillars generate best hashtags

### Phase 3 (Future - only if validated):
- Consider micro-app spinoff
- Package as standalone tool
- Market to broader creator community
- Potential revenue stream

---

## Summary

✅ **This is a good implementation** because it:
- Small enough to add now without risk
- High value for users
- Well-scoped and contained
- Leverages existing stable foundation

✅ **Recommended approach:**
- Add to main app first (1.5-2 hours)
- Validate through real usage
- Park the micro-app idea for later
- Stay focused on stabilizing Content Alchemy

**You've got a solid, stable foundation now. This hashtag feature is a perfect "quick win" to add immediate value without derailing progress.**

---

## Technical Notes

### Dependencies:
- Existing Post entity fields (no new dependencies)
- Settings entity for pillar name/description lookup
- AI generation service (already in use in app)

### Migration Considerations:
- New field is nullable - no data migration needed
- Existing posts will have null/empty hashtags
- No breaking changes to existing functionality

### Testing Checklist:
- [ ] Field appears in correct position in UI
- [ ] Generate button triggers function correctly
- [ ] All 4 context variables passed to generator
- [ ] Platform rules correctly applied
- [ ] Pillar context properly resolved
- [ ] Regenerate produces different variations
- [ ] User can edit generated hashtags
- [ ] Save/update works correctly
- [ ] Test across all supported platforms

---

**End of Specification**
