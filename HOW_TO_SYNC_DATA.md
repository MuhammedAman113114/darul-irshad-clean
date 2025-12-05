# How to Sync Data Across All Devices

## The Problem

Your app uses **offline-first architecture** where each device stores data locally in the browser. This means:
- ✅ Students sync correctly (loaded from database)
- ❌ Attendance is different on each device (stored locally)
- ❌ Namaz tracking is different on each device (stored locally)

## Quick Fix: Force Sync on Each Device

### Step 1: On Desktop/Laptop

1. Open https://darul-irshad-clean.vercel.app
2. Look at the top-right corner - you'll see status badges:
   - 🟢 **Online** (green badge)
   - ☁️ **Synced** or **X pending** (sync status)
3. Click the **"Sync"** button (blue button with refresh icon)
4. Wait for it to show "Synced"
5. **Refresh the page** (Ctrl+R or F5)

### Step 2: On Mobile

1. Open https://darul-irshad-clean.vercel.app
2. Look at the top-right corner for status badges
3. Tap the **"Sync"** button
4. Wait for "Synced" status
5. **Pull down to refresh** or close and reopen the browser

### Step 3: Verify Data Matches

1. Open Namaz Tracking on both devices
2. Check December 4th attendance
3. ✅ Should now show the same data on both devices

## What the Sync Button Does

When you click "Sync":
1. **Pulls latest data** from PostgreSQL database
2. **Overwrites local data** in browser storage
3. **Uploads pending changes** from your device
4. **Refreshes the view** with synced data

## Understanding the Status Badges

### Online/Offline Badge
- 🟢 **Online** = Connected to internet, can sync
- 🔴 **Offline** = No internet, using local data only

### Sync Status Badge
- ☁️ **Synced** = All data is up to date
- ⚠️ **X pending** = X items waiting to sync
- 🔄 **Syncing...** = Currently syncing data

### Last Sync Time
- Shows when data was last synced
- "Just now" = Synced within last minute
- "5m ago" = Synced 5 minutes ago

## Automatic Sync

The app automatically syncs every 30 seconds when:
- ✅ Device is online
- ✅ No sync is currently in progress
- ✅ There are pending changes

## Manual Sync (Advanced)

If the sync button doesn't work, open browser console (F12) and run:

```javascript
// Clear all local data and reload from database
localStorage.clear();
location.reload();
```

## Best Practices to Avoid Sync Issues

### 1. Use One Primary Device
- Designate one device (e.g., desktop) for data entry
- Use other devices for viewing only

### 2. Wait for Sync
- After marking attendance, wait for "Synced" badge
- Don't immediately switch to another device

### 3. Refresh Regularly
- Refresh browser before viewing data
- Especially after someone else has entered data

### 4. Check Sync Status
- Always check the sync badges before trusting data
- If it says "X pending", click Sync button

### 5. Avoid Simultaneous Edits
- Don't mark attendance on multiple devices at the same time
- This can cause conflicts

## Troubleshooting

### Problem: Sync button doesn't appear
**Solution:** 
- Check if "Online" badge is showing
- Refresh the page
- Check internet connection

### Problem: Sync keeps showing "pending"
**Solution:**
- Check browser console (F12) for errors
- Try clearing browser cache
- Log out and log back in

### Problem: Data still different after sync
**Solution:**
1. Clear browser cache on both devices
2. Log out on both devices
3. Clear localStorage: `localStorage.clear()`
4. Log back in
5. Force sync on both devices

### Problem: "Synced" shows but data is old
**Solution:**
- The "Synced" badge shows local sync status
- Click the Sync button to pull latest from database
- Refresh the page after syncing

## Long-term Solution

To permanently fix this issue, we need to:
1. **Disable offline mode** - Make app always use database directly
2. **Add real-time sync** - Use WebSockets for instant updates
3. **Show sync conflicts** - Alert when data conflicts occur
4. **Add sync logs** - Track what was synced and when

## Current Workaround Summary

**Before viewing data:**
1. ✅ Check "Online" badge is green
2. ✅ Click "Sync" button
3. ✅ Wait for "Synced" status
4. ✅ Refresh the page
5. ✅ Now view the data

**After entering data:**
1. ✅ Wait for "Synced" status
2. ✅ Don't close browser immediately
3. ✅ Verify data appears in database
4. ✅ Then sync on other devices

This will ensure all devices show the same data!
