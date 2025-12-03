// Simple Data Recovery for July 4th Namaz Data
export const manualRecoveryJuly4th = async () => {
  console.log('🔍 Starting manual recovery for July 4th namaz data...');
  
  const july4thDate = '2025-07-04';
  const prayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
  const results = { recovered: 0, errors: 0 };
  
  for (const prayer of prayers) {
    try {
      // Check localStorage for this prayer on July 4th
      const storageKey = `namaz_${prayer}_${july4thDate}`;
      const data = localStorage.getItem(storageKey);
      
      if (data) {
        const parsed = JSON.parse(data);
        const studentRecords = Array.isArray(parsed) ? parsed : (parsed.students || []);
        
        if (studentRecords.length > 0) {
          console.log(`🔍 Found ${prayer} data for July 4th:`, studentRecords);
          
          // Migrate to database
          const response = await fetch('/api/namaz-attendance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              date: july4thDate,
              prayer: prayer,
              students: studentRecords.map(student => ({
                id: student.studentId || student.id,
                status: student.status || 'present'
              }))
            })
          });
          
          if (response.ok) {
            console.log(`✅ Successfully migrated ${prayer} for July 4th`);
            results.recovered++;
          } else {
            console.log(`❌ Failed to migrate ${prayer} for July 4th:`, response.status);
            results.errors++;
          }
        } else {
          console.log(`⏭️ No student records found for ${prayer} on July 4th`);
        }
      } else {
        console.log(`⏭️ No localStorage data found for ${prayer} on July 4th`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${prayer} for July 4th:`, error);
      results.errors++;
    }
  }
  
  return results;
};

// Quick localStorage scan to see what namaz data we have
export const scanLocalStorageForNamazData = () => {
  console.log('🔍 Scanning localStorage for namaz attendance data...');
  const found = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('namaz_')) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          const studentCount = Array.isArray(parsed) ? parsed.length : (parsed.students?.length || 0);
          found.push({
            key,
            studentCount,
            sampleData: parsed
          });
        } catch (error) {
          console.error(`Error parsing ${key}:`, error);
        }
      }
    }
  }
  
  console.log('📋 Found namaz data in localStorage:', found);
  return found;
};