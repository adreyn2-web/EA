> **Archived 2026-07-18.** The Sheets-tracking half of this guide was never actually finished —
> `credentials.json` was never present on the GitHub Actions runner, so every scheduled run
> silently fell back and no history ever persisted. Tracking now lives in
> `projects/meal-plan/data/tracker.json`, fed from the Compass dashboard (More → Health) instead
> of a Google Form + Sheet. Gmail app-password delivery (Step 5 below) is still in use.

# Google Setup Guide

This guide connects Gmail (email delivery) and Google Sheets (tracking) to the meal planning workflow. Takes about 15 minutes total.

---

## Step 1 — Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **New Project** → name it `meal-planner` → click **Create**
3. Select the project from the top dropdown

---

## Step 2 — Enable the APIs

In the left sidebar go to **APIs & Services > Library** and enable both:
- **Gmail API**
- **Google Sheets API**

Search each by name, click it, then click **Enable**.

---

## Step 3 — Create OAuth Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. If prompted to configure the consent screen:
   - User type: **External**
   - Fill in app name (`Meal Planner`), your email for support and developer contact → Save
   - On the **Scopes** step, click **Save and Continue** (no scopes needed here)
   - On **Test users**, add `adreyn2@gmail.com` → Save and Continue
4. Back on **Create OAuth client ID**:
   - Application type: **Desktop app**
   - Name: `meal-planner-desktop`
   - Click **Create**
5. Click **Download JSON** on the confirmation dialog
6. Rename the downloaded file to `credentials.json`
7. Move it to your `~/Desktop/sink/` folder

---

## Step 4 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Name it **Meal Plan Tracker**
3. Create three tabs (click `+` at the bottom):
   - `Meal Log`
   - `Weekly Summary`
   - `Feedback Raw`
4. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit
   ```
5. Add it to your `.env` file:
   ```
   GOOGLE_SHEET_ID=your_sheet_id_here
   ```

---

## Step 5 — Create the Feedback Google Form

1. Go to [forms.google.com](https://forms.google.com) and create a new form
2. Title it: **Meal Feedback**
3. Add these questions (exact types noted):
   | Question | Type |
   |----------|------|
   | Recipe Name | Short answer |
   | Rating (1–5) | Linear scale (1 to 5, label: "Bad" → "Loved it") |
   | Time spent cooking (minutes) | Short answer |
   | Actual cost ($) | Short answer |
   | Notes | Paragraph |

4. Click the **Responses** tab → click the Google Sheets icon → **Link to existing spreadsheet** → select your **Meal Plan Tracker** sheet → choose the `Feedback Raw` tab
5. Copy the form's share URL and add it to `config/user_preferences.json`:
   ```json
   "feedback_form_url": "https://forms.gle/your_form_id"
   ```

---

## Step 6 — Authorize on First Run

The first time you run any Google-connected tool, a browser window will open asking you to log in and grant permission. Do this once and the token is saved to `token.json` for all future runs.

```bash
cd ~/Desktop/sink
python tools/log_to_sheet.py   # triggers auth flow
```

If you see a warning saying the app isn't verified, click **Advanced > Go to Meal Planner (unsafe)** — this is expected for personal OAuth apps.

---

## Step 7 — Set Up the Sunday 8am Schedule

Once everything is working manually, set up the automated Sunday send:

```
/schedule "Run weekly meal plan workflow" --cron "0 8 * * 0"
```

Or run manually any time:
```bash
cd ~/Desktop/sink
python tools/fetch_feedback.py
python tools/generate_meal_plan.py
python tools/generate_pdf.py
python tools/send_email.py
python tools/log_to_sheet.py
```

---

## Checklist

- [ ] `credentials.json` in `~/Desktop/sink/`
- [ ] `GOOGLE_SHEET_ID` set in `.env`
- [ ] Google Sheet has tabs: Meal Log, Weekly Summary, Feedback Raw
- [ ] Feedback Form created and linked to `Feedback Raw` tab
- [ ] `feedback_form_url` set in `config/user_preferences.json`
- [ ] First auth run completed (token.json exists)
