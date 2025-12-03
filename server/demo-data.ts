import { db } from "./db";
import { students, users } from "@shared/schema";

export async function insertDemoData() {
  try {
    console.log("🌱 Inserting demo data into database...");
    
    // First, check if we already have demo data
    const existingStudents = await db.select().from(students);
    if (existingStudents.length > 0) {
      console.log("✅ Demo data already exists, skipping insertion");
      return;
    }

    // Demo students covering all course types and years
    const demoStudents = [
      // PU Commerce Section A (1st Year)
      {
        name: "Aman Khan",
        rollNo: "1",
        courseType: "pu",
        courseDivision: "commerce",
        year: "1",
        batch: "A",
        dob: "2007-03-15",
        bloodGroup: "A+",
        fatherName: "Mohammed Khan",
        motherName: "Fatima Khan",
        contact1: "9876543210",
        contact2: "9876543211",
        address: "123 Main Street, City",
        status: "active"
      },
      {
        name: "Ayesha Ahmed",
        rollNo: "2",
        courseType: "pu",
        courseDivision: "commerce",
        year: "1",
        batch: "A",
        dob: "2007-06-20",
        bloodGroup: "B+",
        fatherName: "Ahmed Ali",
        motherName: "Sara Ahmed",
        contact1: "9876543212",
        address: "456 Park Avenue, City",
        status: "active"
      },
      
      // PU Commerce Section B (2nd Year)
      {
        name: "Mohammed Ali",
        rollNo: "1",
        courseType: "pu",
        courseDivision: "commerce",
        year: "2",
        batch: "B",
        dob: "2006-09-10",
        bloodGroup: "O+",
        fatherName: "Ali Hassan",
        motherName: "Zainab Ali",
        contact1: "9876543213",
        address: "789 Garden Road, City",
        status: "active"
      },
      {
        name: "Fatima Sheikh",
        rollNo: "2",
        courseType: "pu",
        courseDivision: "commerce",
        year: "2",
        batch: "B",
        dob: "2006-12-05",
        bloodGroup: "AB+",
        fatherName: "Sheikh Abdul",
        motherName: "Mariam Sheikh",
        contact1: "9876543214",
        address: "321 Lake View, City",
        status: "active"
      },
      
      // PU Science (1st Year - No sections)
      {
        name: "Ibrahim Hassan",
        rollNo: "1",
        courseType: "pu",
        courseDivision: "science",
        year: "1",
        batch: null,
        dob: "2007-04-25",
        bloodGroup: "A-",
        fatherName: "Hassan Ibrahim",
        motherName: "Khadija Hassan",
        contact1: "9876543215",
        address: "567 Science Colony, City",
        status: "active"
      },
      {
        name: "Zainab Malik",
        rollNo: "2",
        courseType: "pu",
        courseDivision: "science",
        year: "1",
        batch: null,
        dob: "2007-07-15",
        bloodGroup: "B-",
        fatherName: "Malik Ahmed",
        motherName: "Safiya Malik",
        contact1: "9876543216",
        address: "890 Tech Park, City",
        status: "active"
      },
      
      // Post-PU 3rd Year
      {
        name: "Usman Siddiqui",
        rollNo: "1",
        courseType: "post-pu",
        courseDivision: null,
        year: "3",
        batch: null,
        dob: "2005-02-10",
        bloodGroup: "O-",
        fatherName: "Siddiqui Rehman",
        motherName: "Amina Siddiqui",
        contact1: "9876543217",
        address: "123 Post-PU Block, City",
        status: "active"
      },
      {
        name: "Mariam Ansari",
        rollNo: "2",
        courseType: "post-pu",
        courseDivision: null,
        year: "3",
        batch: null,
        dob: "2005-05-20",
        bloodGroup: "AB-",
        fatherName: "Ansari Mohammed",
        motherName: "Ruqaiya Ansari",
        contact1: "9876543218",
        address: "456 Scholar Road, City",
        status: "active"
      },
      
      // Post-PU 4th Year
      {
        name: "Abdullah Qureshi",
        rollNo: "1",
        courseType: "post-pu",
        courseDivision: null,
        year: "4",
        batch: null,
        dob: "2004-08-15",
        bloodGroup: "A+",
        fatherName: "Qureshi Hamid",
        motherName: "Nazia Qureshi",
        contact1: "9876543219",
        address: "789 Elite Avenue, City",
        status: "active"
      },
      
      // Post-PU 5th Year
      {
        name: "Khadija Patel",
        rollNo: "1",
        courseType: "post-pu",
        courseDivision: null,
        year: "5",
        batch: null,
        dob: "2003-11-30",
        bloodGroup: "B+",
        fatherName: "Patel Yusuf",
        motherName: "Hafsa Patel",
        contact1: "9876543220",
        address: "321 Senior Block, City",
        status: "active"
      },
      
      // Post-PU 6th Year
      {
        name: "Hamza Sheikh",
        rollNo: "1",
        courseType: "post-pu",
        courseDivision: null,
        year: "6",
        batch: null,
        dob: "2002-06-25",
        bloodGroup: "O+",
        fatherName: "Sheikh Rashid",
        motherName: "Sumaya Sheikh",
        contact1: "9876543221",
        address: "654 Final Year Colony, City",
        status: "active"
      },
      
      // Post-PU 7th Year
      {
        name: "Salma Begum",
        rollNo: "1",
        courseType: "post-pu",
        courseDivision: null,
        year: "7",
        batch: null,
        dob: "2001-03-10",
        bloodGroup: "AB+",
        fatherName: "Begum Akbar",
        motherName: "Rashida Begum",
        contact1: "9876543222",
        address: "987 Graduate House, City",
        status: "active"
      }
    ];

    // Insert all demo students
    await db.insert(students).values(demoStudents);
    
    console.log(`✅ Successfully inserted ${demoStudents.length} demo students`);
    console.log("📊 Student distribution:");
    console.log("   - PU Commerce: 4 students (Year 1-2, Sections A-B)");
    console.log("   - PU Science: 2 students (Year 1)");
    console.log("   - Post-PU: 6 students (Years 3-7)");
    
  } catch (error) {
    console.error("❌ Error inserting demo data:", error);
  }
}