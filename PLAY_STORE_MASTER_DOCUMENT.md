# EvenTime — Google Play Store Master Launch Document

> **Purpose:** This is the all-in-one, step-by-step master reference for publishing EvenTime to the Google Play Store from your laptop. Follow these phases in order tomorrow to ensure zero rejections and a smooth launch.

---

## Quick Reference Sheet

| Item | Value |
| :--- | :--- |
| **App Name** | `EvenTime - Tech & Campus Events` |
| **Android Package Name** | `com.thesurfboard.eventime` |
| **Version** | `1.0.0` (Version Code: `1`) |
| **Target Android SDK** | Android 14+ (API 34) |
| **Support Email** | `eventime.admin@gmail.com` |
| **Website** | `https://eventime.thesurfboard.in` |
| **Privacy Policy URL** | `https://eventime.thesurfboard.in/privacy` |
| **Category** | Events (or Lifestyle / Education) |

---

## Phase 1: Generate the Production `.aab` Bundle on Laptop

Google Play **requires an `.aab` (Android App Bundle)** file. Generate it using either option:

### Option A: Local Build on Laptop (100% Free & Fast)
Run this in PowerShell from `c:\Projects\eventime app`:
```powershell
cd android
./gradlew bundleRelease
```
* **Output file on your laptop**:
  `c:\Projects\eventime app\android\app\build\outputs\bundle\release\app-release.aab`
* This is the exact file you upload to Play Console.

### Option B: Cloud Build via Expo EAS
```powershell
npm install -g eas-cli
eas login
eas build --profile production --platform android
```
* Expo will compile the `.aab` in the cloud and give you a direct download link.

---

## Phase 2: Create App in Google Play Console

1. Log into **[Google Play Console](https://play.google.com/console)** on your laptop browser.
2. Click **Create app** (top-right button):
   * **App name**: `EvenTime - Tech & Campus Events`
   * **Default language**: `English (United States)`
   * **App or game**: `App`
   * **Free or paid**: `Free`
   * Accept developer declarations > Click **Create app**.

---

## Phase 3: Mandatory Store Policy Questionnaires

Under **Dashboard > "Set up your app"**, complete each section with these exact answers:

### 1. Privacy Policy
* **URL**: `https://eventime.thesurfboard.in/privacy`

### 2. App Access
* Select: *"All functionality is available without special access restrictions"* (EvenTime has guest exploration without forced login).

### 3. Ads
* Select: *"No, my app does not contain ads"*.

### 4. Content Rating
* Category: **Utility / Communication / Productivity**
* Answer **NO** to:
  * Violence
  * Sexual content or nudity
  * Offensive language
  * Controlled substances / gambling
* **Result**: Rated **Everyone (PEGI 3 / ESRB Everyone)**. Click Save & Submit.

### 5. Target Audience
* Select age groups: **13–15**, **16–17**, and **18 and over**.
* Appeal to children: Select **No**.

### 6. News, COVID-19, Financial & Government Features
* Select **No** to all.

### 7. Data Safety Questionnaire (Critical for Play Store Approval)
* **Does your app collect or share user data?**: **Yes**
* **Is data encrypted in transit?**: **Yes** (All API calls use TLS/HTTPS).
* **Do you provide a way for users to request data deletion?**: **Yes** (EvenTime has in-app account deletion under Profile settings).
* **Data Types Collected**:
  1. **Personal info**:
     * *Name*: Optional (for profile display).
     * *Email address*: Required (for account login and notifications).
     * *User IDs*: Account identification (Supabase Auth UID).
  2. **Location (Approximate / Coarse)**:
     * *Preferred Cities*: Filter event feed (User manually selects city; NO continuous GPS background tracking).
  3. **Photos and Videos**:
     * *Photos*: Only accessed if a curator uploads an event poster from their gallery.
  4. **Device or other IDs**:
     * *Push Notification Token*: For event reminders and alerts.
* **Data Sharing**:
  * Check **"No, data is not shared with any third-party brokers or advertisers"**.

---

## Phase 4: High-Converting 5-Screenshot Storyboard

> [!TIP]
> **Conversion Rule:** 80% of users decide to install solely based on your first 3 screenshot mockups.

### Specifications
* **Screenshot Size**: **1080 × 2400 px** (Aspect ratio 9:16, 24-bit PNG or JPG)
* **Feature Graphic Banner**: **1024 × 500 px** (JPG/PNG, max 15MB)
* **Design Formula**: Bold headline in top 30% on brand gradient (`#6C47FF` to `#0F172A`), phone frame in bottom 70%.

### The 5 Mockup Slides

```
+------------------------------------+
|  Slide 1: HERO / HOOK              |
|  "Discover Tech & Campus Events"   |
|  [HomeScreen: For You, Around You] |
+------------------------------------+
|  Slide 2: DISCOVERY & FILTERS      |
|  "Filter by City, College & Goals" |
|  [SearchScreen: Categories, Dates] |
+------------------------------------+
|  Slide 3: EVENT EXPERIENCE         |
|  "Never Miss a Deadline"           |
|  [EventDetailScreen: 1-Tap RSVP]   |
+------------------------------------+
|  Slide 4: CAMPUS & STUDENTS        |
|  "Your Campus, Your Stage"         |
|  [Campus Feed: College-Only Fests] |
+------------------------------------+
|  Slide 5: CURATORS & REWARDS       |
|  "Host Events & Climb Ranks"       |
|  [LeaderboardScreen: ET Scores]    |
+------------------------------------+
```

#### Detailed Breakdown:

1. **Slide 1 (Hero)**:
   * **Headline**: `Discover Tech & Campus Events`
   * **Subtitle**: `Hackathons, workshops & fests happening near you`
   * **Screen to capture**: [`HomeScreen.tsx`](file:///c:/Projects/eventime%20app/src/screens/HomeScreen.tsx) showing "For You" feed, segmented tabs, and platform stats ticker.

2. **Slide 2 (Discovery & Filters)**:
   * **Headline**: `Filter by City, College & Goals`
   * **Subtitle**: `Instant results across Hyderabad, Bengaluru & major hubs`
   * **Screen to capture**: [`SearchScreen.tsx`](file:///c:/Projects/eventime%20app/src/screens/SearchScreen.tsx) with search bar, active category tags (AI, Web3, Culturals), and city chips.

3. **Slide 3 (Event Experience)**:
   * **Headline**: `Never Miss a Deadline`
   * **Subtitle**: `Rich schedules, cash prizes & 1-tap registration`
   * **Screen to capture**: [`EventDetailScreen.tsx`](file:///c:/Projects/eventime%20app/src/screens/EventDetailScreen.tsx) displaying a high-contrast poster, date badge, organizer tag, and "Register Now" button.

4. **Slide 4 (Campus & Students)**:
   * **Headline**: `Your Campus, Your Stage`
   * **Subtitle**: `Private club fests & hackathons exclusive to your college`
   * **Screen to capture**: Campus feed tab showing college-restricted events.

5. **Slide 5 (Curator Gamification)**:
   * **Headline**: `Host Events & Climb Ranks`
   * **Subtitle**: `Earn ET points, unlock verified curator badges & get featured`
   * **Screen to capture**: [`LeaderboardScreen.tsx`](file:///c:/Projects/eventime%20app/src/screens/LeaderboardScreen.tsx) showing curator rankings and gamified scores.

---

## Phase 5: Store Listing Copy-Paste Text

Under **Grow > Store presence > Main store listing**:

### App Title (Max 30 characters)
```text
EvenTime: Events & Campus Life
```

### Short Description (Max 80 characters)
```text
Discover college fests, tech hackathons, workshops & local events near you.
```

### Full Description (Formatted Markdown)
```text
🎉 Welcome to EvenTime — India's premier student & tech event discovery platform!

Whether you are looking for 24-hour hackathons, college fests, coding workshops, startup conferences, cultural nights, or local tech meetups in your city, EvenTime brings everything happening around you into one fast, aesthetic feed.

✨ KEY FEATURES:

🔥 Curated Live Feeds:
• Explore events across Tech, Hackathons, Cultural Fests, Sports, Workshops, and Networking.
• Tailored feeds: "For You" (personalized to your interests), "Around You" (local to your city), and "Campus" (college-exclusive announcements).

🏛️ Campus & College Hubs:
• Never miss a fest, workshop, or competition happening at your university or partner campuses across India.
• Exclusive notices and student-only registration links.

⏰ Smart 24-Hour Reminders:
• Save events you are interested in and get automated reminders 24 hours before the event starts.
• Real-time alerts for newly published events in your favorite cities.

🏆 Curator Community & Leaderboards:
• Verified curators earn community ET points for listing high-quality events.
• Compete on the leaderboard, unlock curator badges, and showcase your profile.

📍 City-Level Exploration:
• Filter events across Hyderabad, Bengaluru, Mumbai, Delhi-NCR, Chennai, Pune, and all major student hubs.
• Date filter to check what is happening today, this weekend, or next month.

📶 0ms Offline-First Mode:
• Browsing underground or on spotty network? EvenTime caches your feed so you never stare at a blank screen.

🛡️ Privacy-First & DPDP Act 2023 Compliant:
• Zero intrusive tracking or background battery drain.
• Full transparency with one-tap account and data deletion anytime from Profile Settings.

Join thousands of students and young professionals discovering memorable events on EvenTime!

Website: https://eventime.thesurfboard.in
Support: eventime.admin@gmail.com
```

---

## Phase 6: Upload the `.aab` & Release

1. Go to:
   * **Production** (if organization account).
   * OR **Closed testing** (if personal account needing the 20-tester track).
2. Click **Create new release** (top right).
3. Drag & drop your `app-release.aab` from your laptop.
4. **Release name**: `1.0.0 (1)`.
5. **Release notes**:
   ```text
   Welcome to EvenTime v1.0.0!
   - Discover hackathons, workshops, and college fests in your city.
   - Offline-first event browsing with instant cold start.
   - Host and promote your own events.
   ```
6. Click **Save** > **Review release**.

---

## Phase 7: The Vital Step — Fix Google Sign-In SHA-1

> [!WARNING]
> Do NOT skip this step! If skipped, Google Sign-In will fail with Error 10 on Play Store downloads.

1. In Google Play Console, go to **Test and release > Setup > App Integrity**.
2. Under **App signing key certificate**, copy the **SHA-1 certificate fingerprint**.
3. Open **[Google Cloud Console](https://console.cloud.google.com)**.
4. Go to **APIs & Services > Credentials**.
5. Click your **Android OAuth 2.0 Client ID**:
   * Package name: `com.thesurfboard.eventime`
   * SHA-1 fingerprint: **Paste the copied SHA-1 here**.
6. Click **Save**. *(Supabase stays untouched).*

---

## Phase 8: Submit for Review

1. Return to Play Console > **Publishing overview**.
2. Click **Submit for review**.
3. Google review typically takes **24 to 48 hours**. Once approved, your app goes live worldwide!
