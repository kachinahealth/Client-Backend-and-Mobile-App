# Data Storage System

## Current Implementation: File-Based Storage

This system currently uses **JSON file storage** for development and demo purposes.

### How It Works
- **Data Directory**: `./data/` (created automatically)
- **Main File**: `companies.json` - stores all company data
- **Log File**: `data-changes.log` - tracks all data modifications
- **Auto-Save**: Data is automatically saved after every change

### What Gets Saved
✅ **Hospitals** - All enrollment leaderboard data  
✅ **Users** - User registrations and approvals  
✅ **PDFs** - Document management  
✅ **News** - News and updates  
✅ **Company Settings** - Configuration and preferences  

### File Locations
```
STRIDE-Trial-App/backend/
├── data/
│   ├── companies.json          # Main data storage
│   └── data-changes.log       # Change history
└── multi-tenant-server.js     # Server code
```

## ⚠️ IMPORTANT: Production Upgrade Required

**Before deploying to production, you MUST upgrade to a proper database:**

### Why Upgrade?
- **Data Loss Risk**: File corruption, disk failures
- **Scalability**: Multiple server instances, load balancing
- **Performance**: Better querying, indexing, caching
- **Backup/Recovery**: Automated backups, point-in-time recovery
- **Security**: Access control, encryption, audit trails

### Recommended Database Options
1. **MongoDB** - Document-based, flexible schema
2. **PostgreSQL** - Relational, ACID compliance
3. **MySQL** - Widely supported, good performance

### Migration Path
1. **Design database schema**
2. **Create migration scripts**
3. **Test with sample data**
4. **Deploy new database**
5. **Migrate existing data**
6. **Update server code**
7. **Test thoroughly**
8. **Go live**

## Current Benefits
✅ **Immediate data persistence**  
✅ **No database setup required**  
✅ **Easy to backup** (copy JSON files)  
✅ **Human-readable data format**  
✅ **Quick development iteration**  

## Current Limitations
❌ **Single server only**  
❌ **No concurrent access control**  
❌ **Limited query capabilities**  
❌ **No automated backups**  
❌ **File corruption risk**  

## Backup Your Data
```bash
# Manual backup
cp -r data/ data-backup-$(date +%Y%m%d)/

# Or use the API endpoint
curl http://localhost:3000/api/backup > backup-$(date +%Y%m%d).json
```

## Next Steps
1. **Continue development** with current system
2. **Plan database architecture** for production
3. **Set timeline** for database migration
4. **Allocate resources** for upgrade project

---
*Last updated: $(date)*
*System: File-based JSON storage*
*Status: Development/Demo Ready*

