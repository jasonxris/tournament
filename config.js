// Google Sheets Configuration
//
// SETUP INSTRUCTIONS:
// 1. Create a Google Sheet with the following columns:
//    Player | Matches Won | Matches Lost | Win Rate
//
// 2. Publish your sheet as CSV:
//    - In Google Sheets, go to File > Share > Publish to web
//    - Choose the sheet you want to publish
//    - Select "Comma-separated values (.csv)" as the format
//    - Click "Publish"
//    - Copy the published URL
//
// 3. Paste the published CSV URL below:

window.GOOGLE_SHEET_CONFIG = {
    // Standings sheet CSV URL
    STANDINGS_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSO2VEw2SlXzLNKw9AOh1VDzXdJiyTgIds5aJ-Ddc6p3mnZCCBZPKqN5aJkt0U45h3OEPQwi7USB5I_/pub?gid=948012834&single=true&output=csv',
    // Setup sheet CSV URL (for prize configuration)
    SETUP_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSO2VEw2SlXzLNKw9AOh1VDzXdJiyTgIds5aJ-Ddc6p3mnZCCBZPKqN5aJkt0U45h3OEPQwi7USB5I_/pub?gid=215735619&single=true&output=csv'
};
