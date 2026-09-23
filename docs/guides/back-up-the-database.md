<title>Back up the database</title>

# Back up the database

Accounts, classes, homework and synced progress live in one sqlite file: `data/blockout.db` (or the path in `BLOCKOUT_DB`).

- **Safest:** stop the server, copy the file, start it again.
- **While it runs:** use sqlite's online backup, which copies a consistent snapshot:
  ```sh
  sqlite3 data/blockout.db ".backup 'backups/blockout-$(date +%F).db'"
  ```
- **To restore:** stop the server, put the backup back as `data/blockout.db`, start it.

The file holds children's first names and progress; keep backups as private as the server (see [privacy](../privacy.md)).
