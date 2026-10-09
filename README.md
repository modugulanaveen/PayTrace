# Anvion Expense Statements — Final Phase 6

Final integration package for the voice-to-text director expense statement app.

## Included
- Supabase authentication and protected pages
- Dashboard with Paid / Taken totals
- Start / Stop browser speech-to-text
- Audio is not uploaded or stored
- Edit and confirm statement before saving
- Paid / Taken transaction type
- Automatic current date/time
- Supabase expense history
- Search, month filter, Paid/Taken filter
- Edit and delete records
- A4 monthly PDF statement download
- Responsive mobile-friendly UI

## Setup
1. Create a Supabase project.
2. Run `supabase-phase2.sql` in Supabase SQL Editor.
3. Run `supabase-phase4.sql` in Supabase SQL Editor.
4. Copy `.env.example` to `.env` and add your Supabase URL and anon key.
5. Run `npm install`.
6. Run `npm run dev`.

## Vercel deployment
The included `vercel.json` rewrites route requests to the app entry point, so refreshing or opening routes such as `/history` works on Vercel.

## Browser voice support
Speech recognition is provided by the browser/device and is not saved as audio. Use a supported browser such as Chrome when speech recognition is available.

## Final note
The application intentionally does not include bank statement imports, vendor/category management, Zoho API integration, or paid AI services because they are outside the agreed scope.
