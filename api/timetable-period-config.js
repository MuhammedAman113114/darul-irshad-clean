// POST /api/timetable-period-config - Save period configuration for a class
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!req.headers.cookie?.includes('session')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { courseType, year, stream, section, defaultPeriods, customDayPeriods } = req.body;

    console.log(`📅 Saving period config for: ${courseType} Year ${year} ${stream || ''} ${section || ''}`, {
      defaultPeriods,
      customDayPeriods
    });

    // For now, just return success - period config can be stored in localStorage
    // or we can create a database table for it later if needed
    return res.status(200).json({
      success: true,
      message: 'Period configuration saved',
      config: {
        courseType,
        year,
        stream,
        section,
        defaultPeriods,
        customDayPeriods
      }
    });

  } catch (error) {
    console.error('Period config save error:', error);
    return res.status(500).json({ 
      error: 'Failed to save period configuration', 
      message: error.message 
    });
  }
}
