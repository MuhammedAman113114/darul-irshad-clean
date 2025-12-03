# 🧪 API Testing Guide

Complete testing examples for your Vercel + Neon Student Management API.

---

## 🔗 API Endpoints

Replace `YOUR_VERCEL_URL` with your actual Vercel deployment URL.

```
Base URL: https://YOUR_VERCEL_URL.vercel.app/api
```

### Available Endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/students` | Get all students (with filters) |
| POST | `/students` | Create new student |
| GET | `/students/:id` | Get single student |
| PUT | `/students/:id` | Update student |
| DELETE | `/students/:id` | Delete student |
| GET | `/init-db` | Initialize database (run once) |

---

## 📝 Test Cases

### 1. Initialize Database (Run First)

```bash
curl https://YOUR_VERCEL_URL.vercel.app/api/init-db
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Database initialized successfully",
  "tables": ["students"],
  "indexes": ["idx_students_roll_no", "idx_students_course"]
}
```

---

### 2. Create Student (POST)

```bash
curl -X POST https://YOUR_VERCEL_URL.vercel.app/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ahmed Khan",
    "rollNo": "PU101",
    "courseType": "pu",
    "courseDivision": "commerce",
    "year": "1",
    "batch": "A",
    "dob": "2005-03-15",
    "bloodGroup": "A+",
    "fatherName": "Mohammed Khan",
    "motherName": "Fatima Khan",
    "contact1": "9876543210",
    "contact2": "9876543211",
    "address": "123 Main Street, City",
    "aadharNumber": "123456789012",
    "photoUrl": "https://example.com/photo.jpg",
    "status": "active"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Student created successfully",
  "data": {
    "id": 1,
    "name": "Ahmed Khan",
    "rollNo": "PU101",
    "courseType": "pu",
    "courseDivision": "commerce",
    "year": "1",
    "batch": "A",
    "dob": "2005-03-15",
    "bloodGroup": "A+",
    "fatherName": "Mohammed Khan",
    "motherName": "Fatima Khan",
    "contact1": "9876543210",
    "contact2": "9876543211",
    "address": "123 Main Street, City",
    "aadharNumber": "123456789012",
    "photoUrl": "https://example.com/photo.jpg",
    "status": "active",
    "createdAt": "2025-12-02T12:00:00.000Z"
  }
}
```

---

### 3. Get All Students (GET)

```bash
# Get all students
curl https://YOUR_VERCEL_URL.vercel.app/api/students

# With filters
curl "https://YOUR_VERCEL_URL.vercel.app/api/students?courseType=pu&year=1&courseDivision=commerce&batch=A"
```

**Expected Response:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": 1,
      "name": "Ahmed Khan",
      "rollNo": "PU101",
      "courseType": "pu",
      "courseDivision": "commerce",
      "year": "1",
      "batch": "A",
      "dob": "2005-03-15",
      "bloodGroup": "A+",
      "fatherName": "Mohammed Khan",
      "motherName": "Fatima Khan",
      "contact1": "9876543210",
      "contact2": "9876543211",
      "address": "123 Main Street, City",
      "aadharNumber": "123456789012",
      "photoUrl": "https://example.com/photo.jpg",
      "status": "active",
      "createdAt": "2025-12-02T12:00:00.000Z"
    }
  ]
}
```

---

### 4. Get Single Student (GET)

```bash
curl https://YOUR_VERCEL_URL.vercel.app/api/students/1
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Ahmed Khan",
    "rollNo": "PU101",
    "courseType": "pu",
    "courseDivision": "commerce",
    "year": "1",
    "batch": "A",
    "dob": "2005-03-15",
    "bloodGroup": "A+",
    "fatherName": "Mohammed Khan",
    "motherName": "Fatima Khan",
    "contact1": "9876543210",
    "contact2": "9876543211",
    "address": "123 Main Street, City",
    "aadharNumber": "123456789012",
    "photoUrl": "https://example.com/photo.jpg",
    "status": "active",
    "createdAt": "2025-12-02T12:00:00.000Z"
  }
}
```

---

### 5. Update Student (PUT)

```bash
# Update specific fields
curl -X PUT https://YOUR_VERCEL_URL.vercel.app/api/students/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ahmed Khan Updated",
    "contact1": "9999999999",
    "status": "active"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Student updated successfully",
  "data": {
    "id": 1,
    "name": "Ahmed Khan Updated",
    "rollNo": "PU101",
    "courseType": "pu",
    "courseDivision": "commerce",
    "year": "1",
    "batch": "A",
    "dob": "2005-03-15",
    "bloodGroup": "A+",
    "fatherName": "Mohammed Khan",
    "motherName": "Fatima Khan",
    "contact1": "9999999999",
    "contact2": "9876543211",
    "address": "123 Main Street, City",
    "aadharNumber": "123456789012",
    "photoUrl": "https://example.com/photo.jpg",
    "status": "active",
    "createdAt": "2025-12-02T12:00:00.000Z"
  }
}
```

---

### 6. Delete Student (DELETE)

```bash
curl -X DELETE https://YOUR_VERCEL_URL.vercel.app/api/students/1
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Student deleted successfully"
}
```

---

## 🌐 Browser Console Testing

Open browser console (F12) and run:

```javascript
const API_URL = 'https://YOUR_VERCEL_URL.vercel.app/api';

// 1. Initialize database
fetch(`${API_URL}/init-db`)
  .then(r => r.json())
  .then(data => console.log('Init DB:', data));

// 2. Create student
fetch(`${API_URL}/students`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "Test Student",
    rollNo: "TEST101",
    courseType: "pu",
    courseDivision: "commerce",
    year: "1",
    batch: "A",
    dob: "2005-01-01",
    bloodGroup: "A+",
    fatherName: "Father Name",
    motherName: "Mother Name",
    contact1: "1234567890",
    address: "Test Address"
  })
})
.then(r => r.json())
.then(data => {
  console.log('Created:', data);
  return data.data.id;
})
.then(id => {
  // 3. Get all students
  return fetch(`${API_URL}/students`)
    .then(r => r.json())
    .then(data => {
      console.log('All Students:', data);
      return id;
    });
})
.then(id => {
  // 4. Get one student
  return fetch(`${API_URL}/students/${id}`)
    .then(r => r.json())
    .then(data => {
      console.log('One Student:', data);
      return id;
    });
})
.then(id => {
  // 5. Update student
  return fetch(`${API_URL}/students/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: "Updated Name",
      status: "active"
    })
  })
  .then(r => r.json())
  .then(data => {
    console.log('Updated:', data);
    return id;
  });
})
.then(id => {
  // 6. Delete student
  return fetch(`${API_URL}/students/${id}`, {
    method: 'DELETE'
  })
  .then(r => r.json())
  .then(data => console.log('Deleted:', data));
})
.catch(error => console.error('Error:', error));
```

---

## 📱 Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "Student Management API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "https://YOUR_VERCEL_URL.vercel.app/api"
    }
  ],
  "item": [
    {
      "name": "Initialize Database",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/init-db"
      }
    },
    {
      "name": "Get All Students",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/students"
      }
    },
    {
      "name": "Create Student",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Test Student\",\n  \"rollNo\": \"101\",\n  \"courseType\": \"pu\",\n  \"courseDivision\": \"commerce\",\n  \"year\": \"1\",\n  \"batch\": \"A\",\n  \"dob\": \"2005-01-01\",\n  \"bloodGroup\": \"A+\",\n  \"fatherName\": \"Father Name\",\n  \"motherName\": \"Mother Name\",\n  \"contact1\": \"1234567890\",\n  \"contact2\": \"0987654321\",\n  \"address\": \"Test Address\",\n  \"aadharNumber\": \"123456789012\"\n}"
        },
        "url": "{{base_url}}/students"
      }
    },
    {
      "name": "Get Single Student",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/students/1"
      }
    },
    {
      "name": "Update Student",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Updated Name\",\n  \"status\": \"active\"\n}"
        },
        "url": "{{base_url}}/students/1"
      }
    },
    {
      "name": "Delete Student",
      "request": {
        "method": "DELETE",
        "url": "{{base_url}}/students/1"
      }
    }
  ]
}
```

---

## ✅ Success Criteria

Your API is working correctly if:

- ✅ `/api/init-db` returns success
- ✅ POST creates student and returns ID
- ✅ GET returns all students
- ✅ GET/:id returns single student
- ✅ PUT updates student
- ✅ DELETE removes student
- ✅ Duplicate roll numbers are rejected
- ✅ Invalid IDs return 404
- ✅ Missing required fields return 400

---

**All tests passing?** 🎉 Your API is production-ready!
