/**
 * Utility to clear old localStorage student data and force use of database students
 */

export function clearOldLocalStorageData() {
  const oldKeys = [
    'pu_1_commerce_A', 'pu_1_commerce_B',
    'pu_2_commerce_A', 'pu_2_commerce_B', 
    'pu_1_science_A', 'pu_2_science_A',
    'post-pu_3_A', 'post-pu_4_A', 'post-pu_5_A', 'post-pu_6_A', 'post-pu_7_A'
  ];

  let clearedCount = 0;
  oldKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      clearedCount++;
    }
  });

  if (clearedCount > 0) {
    console.log(`🧹 Cleared ${clearedCount} old localStorage student data entries`);
    console.log('✅ Now using database students only');
  }

  return clearedCount;
}

// Auto-clear on module load to ensure clean state
clearOldLocalStorageData();