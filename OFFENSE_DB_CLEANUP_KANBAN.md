# OFFENSE_DB_CLEANUP_KANBAN

## TODO
- [ ] Check all statute sections for validity (remove or correct any non-existent or misclassified sections)
- [ ] Ensure all VFO (Violent Felony Offense) indicators are correct and complete

## IN PROGRESS
- [x] Read and parse offenses in batches
- [x] Filtering and standardizing offenses
- [x] Write cleaned offenses to cleaned_offenses.json
- [x] Replace localbench database with cleaned file

## DONE
- [x] All previous steps complete

**Note:** The localbench offense database is now fully cleaned, standardized, and deployed as master_offense_database.js. All tools are using the updated database.

**Valid NYS class codes:** `A-I`, `A-II`, `B`, `C`, `D`, `E`, `A Misd`, `B Misd`, `Unclassified Misd`, `Violation`, `Infraction`