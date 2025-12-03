// Data Recovery Utility
// Recovers historical attendance data from localStorage and syncs to database

export const recoverNamazDataFromLocalStorage = async () => {
  const recoveredData: any[] = [];
  const results = {
    found: 0,
    migrated: 0,
    errors: 0,
    dates: [] as string[]
  };

  try {
    // Scan localStorage for namaz attendance data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('namaz_')) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            const attendanceRecords = Array.isArray(parsed) ? parsed : (parsed.students || []);
            
            if (attendanceRecords.length > 0) {
              // Extract date and prayer from key (format: namaz_prayer_date)
              const keyParts = key.split('_');
              if (keyParts.length >= 3) {
                const prayer = keyParts[1];
                const date = keyParts.slice(2).join('_'); // Handle dates with dashes
                
                console.log(`🔍 Found localStorage data: ${prayer} on ${date} (${attendanceRecords.length} records)`);
                
                recoveredData.push({
                  date,
                  prayer,
                  students: attendanceRecords,
                  storageKey: key
                });
                
                results.found++;
                if (!results.dates.includes(date)) {
                  results.dates.push(date);
                }
              }
            }
          } catch (error) {
            console.error(`Error parsing localStorage data for key ${key}:`, error);
            results.errors++;
          }
        }
      }
    }

    // Migrate recovered data to database
    for (const record of recoveredData) {
      try {
        const response = await fetch('/api/namaz-attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: record.date,
            prayer: record.prayer,
            students: record.students.map((student: any) => ({
              id: student.studentId || student.id,
              status: student.status || 'present'
            }))
          })
        });

        if (response.ok) {
          console.log(`✅ Migrated ${record.prayer} on ${record.date} to database`);
          results.migrated++;
        } else {
          console.error(`❌ Failed to migrate ${record.prayer} on ${record.date}`);
          results.errors++;
        }
      } catch (error) {
        console.error(`Error migrating ${record.prayer} on ${record.date}:`, error);
        results.errors++;
      }
    }

    return results;
  } catch (error) {
    console.error('Data recovery failed:', error);
    return results;
  }
};

export const recoverAttendanceDataFromLocalStorage = async () => {
  const recoveredData: any[] = [];
  const results = {
    found: 0,
    migrated: 0,
    errors: 0,
    dates: [] as string[]
  };

  try {
    // Scan localStorage for regular attendance data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('attendance_') && !key.startsWith('attendance_lock')) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            const attendanceRecords = Array.isArray(parsed) ? parsed : (parsed.students || []);
            
            if (attendanceRecords.length > 0 && attendanceRecords[0].date) {
              const date = attendanceRecords[0].date;
              console.log(`🔍 Found localStorage attendance data for ${date} (${attendanceRecords.length} records)`);
              
              recoveredData.push({
                date,
                records: attendanceRecords,
                storageKey: key
              });
              
              results.found++;
              if (!results.dates.includes(date)) {
                results.dates.push(date);
              }
            }
          } catch (error) {
            console.error(`Error parsing localStorage attendance data for key ${key}:`, error);
            results.errors++;
          }
        }
      }
    }

    // Check if data already exists in database before migrating
    for (const record of recoveredData) {
      try {
        const checkResponse = await fetch(`/api/attendance?date=${record.date}`);
        if (checkResponse.ok) {
          const existingData = await checkResponse.json();
          if (existingData.length > 0) {
            console.log(`⏭️  Skipping ${record.date} - already exists in database`);
            continue;
          }
        }

        // Migrate to database if not exists
        for (const attendanceRecord of record.records) {
          const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(attendanceRecord)
          });

          if (response.ok) {
            results.migrated++;
          } else {
            results.errors++;
          }
        }
        
        console.log(`✅ Migrated attendance data for ${record.date}`);
      } catch (error) {
        console.error(`Error migrating attendance for ${record.date}:`, error);
        results.errors++;
      }
    }

    return results;
  } catch (error) {
    console.error('Attendance data recovery failed:', error);
    return results;
  }
};