# Local Judicial Bench Toolkit

## Overview
This toolkit is a self-contained, offline suite of judicial bench tools designed for local use on both Windows and Mac. It provides judges and legal professionals with fast, reliable access to essential courtroom tools and reference materials—no internet connection required.

## Included Tools
- **Plea of Guilty Tool**
- **Bail Determination Tool**
- **Sentencing Guide**
- **Motion Schedule Calculator**
- **Readiness Inquiry Tool**
- **VOP (Violation of Probation) Arraignment Tool**
- **Fugitive Arraignment Tool**

## How to Use
1. **Copy the Folder:**
   - Place the `localbench` folder anywhere on your Windows or Mac desktop.
2. **Open the Toolkit:**
   - Double-click `benchtool/index.html` to launch the main menu in your web browser.
   - All tools are accessible via the main index page.
3. **No Installation Needed:**
   - All tools run locally in your browser. No server, Python, or Node.js required.

## Master Offense Database
- The file `master_offense_database.js` contains all offense and sentencing data used by the tools.
- All search and reference features are powered by this local file—no data is sent or received over the internet.
- To update the database, replace this file with a new version (if provided).

## Offline/Local-Only
- **No Internet Required:** All features work 100% offline.
- **No AI or Cloud Services:** All AI and internet-dependent features have been removed for privacy and reliability.

## Adding or Updating Tools
- To add a new tool, copy its `.html` file into the `benchtool` folder and link it from `index.html`.
- To update a tool, simply replace its `.html` file with the new version.
- For database updates, replace `master_offense_database.js`.

## Troubleshooting
- If a tool does not load, ensure you are opening it in a modern browser (Chrome, Edge, Safari, or Firefox).
- If you see a security warning, right-click the `.html` file and choose "Open With" your browser.
- For best results, avoid moving files out of the `benchtool` folder.

## Support
- This toolkit is designed for self-contained, local use. For updates or support, contact your system administrator or the original toolkit provider.

---

*This README is auto-generated and maintained for optimal clarity and reproducibility. For advanced usage or customization, see the comments in each tool's HTML file.* 

## Offense Database Cleaning & Standardization

This toolkit includes a locally cleaned and standardized master offense database. The cleaning process involved:

1. Filtering out non-criminal entries (e.g., definitions, general purposes, or entries with non-NYS class codes).
2. Standardizing the `class` field to match NYS codes: `A-I`, `A-II`, `B`, `C`, `D`, `E`, `A Misd`, `B Misd`, `Unclassified Misd`, `Violation`, `Infraction`.
3. Mapping ambiguous or generic classes (e.g., `Felony`, `Misdemeanor`) to the correct NYS class using `offenseLevel` or `classificationDescription`.
4. Writing the cleaned data to `cleaned_offenses.json` and verifying the offense count (final count: 479).
5. Replacing the localbench database with the cleaned file.

This ensures all local APIs and tools work with a consistent, accurate, and comprehensive set of NYS criminal offenses, fully offline. 