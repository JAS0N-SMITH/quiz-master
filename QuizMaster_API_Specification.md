# QuizMaster - API Specification (Revised)
## REST API v1.0

This revision updates authentication endpoints from Azure AD B2C to simple JWT auth with email/password.

---

## 1. API Overview

### Base URL
```
Development: http://localhost:3001
Production:  https://api-quizmaster.azurewebsites.net
```

### Authentication
- **Method**: JWT Bearer Token
- **Header**: `Authorization: Bearer <token>`
- **Token Source**: Returned from `/auth/login` or `/auth/register`

### Response Format

**Success Response:**
```json
{
  "data": { ... },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

### HTTP Status Codes
| Code | Description |
|------|-------------|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST (created) |
| 204 | Successful DELETE |
| 400 | Invalid request |
| 401 | Missing/invalid token |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (e.g., email exists) |
| 422 | Validation error |

---

## 2. Authentication Endpoints

### POST /auth/register
Create a new user account.

**Request:**
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "role": "STUDENT"
}
```

**Validation:**
- `email`: Valid email format, required
- `password`: Minimum 8 characters, required
- `name`: Minimum 2 characters, required
- `role`: STUDENT (default), TEACHER, or ADMIN

**Response: 201 Created**
```json
{
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "STUDENT",
      "createdAt": "2025-01-10T12:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Error: 409 Conflict**
```json
{
  "statusCode": 409,
  "message": "Email already registered",
  "error": "Conflict"
}
```

---

### POST /auth/login
Authenticate and receive JWT token.

**Request:**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response: 200 OK**
```json
{
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "STUDENT"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Error: 401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

---

### GET /auth/me
Get current authenticated user.

**Request:**
```http
GET /auth/me
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "data": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "STUDENT",
    "createdAt": "2025-01-10T12:00:00.000Z"
  }
}
```

---

## 3. Quiz Endpoints

### GET /quizzes
List quizzes with optional filters.

**Request:**
```http
GET /quizzes?published=true&page=1&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| published | boolean | - | Filter by published status |
| teacherId | string | - | Filter by teacher |
| search | string | - | Search in title/description |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |

**Response: 200 OK**
```json
{
  "data": [
    {
      "id": "quiz-uuid",
      "title": "JavaScript Fundamentals",
      "description": "Test your JS knowledge",
      "timeLimit": 30,
      "published": true,
      "teacher": {
        "id": "teacher-uuid",
        "name": "Dr. Smith"
      },
      "questionCount": 10,
      "createdAt": "2025-01-10T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

---

### GET /quizzes/:id
Get single quiz with questions.

**Request:**
```http
GET /quizzes/quiz-uuid
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "data": {
    "id": "quiz-uuid",
    "title": "JavaScript Fundamentals",
    "description": "Test your JS knowledge",
    "timeLimit": 30,
    "published": true,
    "teacher": {
      "id": "teacher-uuid",
      "name": "Dr. Smith"
    },
    "questions": [
      {
        "id": "q1-uuid",
        "text": "What is a closure?",
        "options": ["A function", "A loop", "A variable", "An object"],
        "order": 1
      }
    ],
    "createdAt": "2025-01-10T12:00:00.000Z"
  }
}
```

**Note:** `correctOption` and `explanation` are NOT included when fetching quiz for taking. They are only included in submission results.

---

### POST /quizzes
Create a new quiz.

**Access:** TEACHER, ADMIN

**Request:**
```http
POST /quizzes
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "React Hooks Quiz",
  "description": "Test your knowledge of React Hooks",
  "timeLimit": 45,
  "published": false,
  "questions": [
    {
      "text": "What does useState return?",
      "options": [
        "An array with state and setter",
        "Just the state value",
        "A function",
        "An object"
      ],
      "correctOption": 0,
      "explanation": "useState returns [state, setState]",
      "order": 1
    }
  ]
}
```

**Validation:**
- `title`: 3-200 characters, required
- `description`: Optional, max 2000 characters
- `timeLimit`: 1-180 minutes, required
- `published`: Boolean, default false
- `questions`: Array, minimum 1 question
- `questions[].text`: Minimum 10 characters
- `questions[].options`: Exactly 4 strings
- `questions[].correctOption`: 0-3
- `questions[].order`: Positive integer

**Response: 201 Created**
```json
{
  "data": {
    "id": "new-quiz-uuid",
    "title": "React Hooks Quiz",
    "description": "Test your knowledge of React Hooks",
    "timeLimit": 45,
    "published": false,
    "teacherId": "teacher-uuid",
    "questionCount": 1,
    "createdAt": "2025-01-10T12:00:00.000Z"
  },
  "message": "Quiz created successfully"
}
```

---

### PUT /quizzes/:id
Update a quiz.

**Access:** TEACHER (own quiz only), ADMIN

**Request:**
```http
PUT /quizzes/quiz-uuid
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "published": true
}
```

**Response: 200 OK**
```json
{
  "data": {
    "id": "quiz-uuid",
    "title": "Updated Title",
    "published": true,
    "updatedAt": "2025-01-10T14:00:00.000Z"
  }
}
```

**Error: 403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "You can only update your own quizzes",
  "error": "Forbidden"
}
```

**Error: 409 Conflict**
```json
{
  "statusCode": 409,
  "message": "Cannot edit quiz with existing submissions",
  "error": "Conflict"
}
```

---

### DELETE /quizzes/:id
Soft delete a quiz.

**Access:** TEACHER (own quiz only), ADMIN

**Request:**
```http
DELETE /quizzes/quiz-uuid
Authorization: Bearer <token>
```

**Response: 204 No Content**

---

## 4. Submission Endpoints

### POST /submissions/start
Start a quiz attempt.

**Access:** STUDENT

**Request:**
```http
POST /submissions/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "quizId": "quiz-uuid"
}
```

**Response: 201 Created**
```json
{
  "data": {
    "id": "submission-uuid",
    "quizId": "quiz-uuid",
    "userId": "student-uuid",
    "startedAt": "2025-01-10T12:00:00.000Z",
    "expiresAt": "2025-01-10T12:30:00.000Z",
    "quiz": {
      "id": "quiz-uuid",
      "title": "JavaScript Fundamentals",
      "timeLimit": 30,
      "questions": [
        {
          "id": "q1-uuid",
          "text": "What is a closure?",
          "options": ["A function", "A loop", "A variable", "An object"],
          "order": 1
        }
      ]
    }
  }
}
```

**Error: 409 Conflict**
```json
{
  "statusCode": 409,
  "message": "You already have an active submission for this quiz",
  "error": "Conflict"
}
```

---

### POST /submissions/:id/submit
Submit quiz answers.

**Access:** STUDENT (own submission only)

**Request:**
```http
POST /submissions/submission-uuid/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "answers": [
    { "questionId": "q1-uuid", "selectedOption": 0 },
    { "questionId": "q2-uuid", "selectedOption": 2 },
    { "questionId": "q3-uuid", "selectedOption": 1 }
  ]
}
```

**Validation:**
- All questions must be answered
- `selectedOption` must be 0-3
- Submission must not be already submitted

**Response: 200 OK**
```json
{
  "data": {
    "id": "submission-uuid",
    "score": 2,
    "totalQuestions": 3,
    "percentage": 66.67,
    "submittedAt": "2025-01-10T12:25:00.000Z",
    "answers": [
      {
        "questionId": "q1-uuid",
        "selectedOption": 0,
        "correctOption": 0,
        "isCorrect": true,
        "question": {
          "text": "What is a closure?",
          "explanation": "A closure is..."
        }
      },
      {
        "questionId": "q2-uuid",
        "selectedOption": 2,
        "correctOption": 1,
        "isCorrect": false,
        "question": {
          "text": "Which method...",
          "explanation": "push() adds..."
        }
      }
    ]
  }
}
```

---

### GET /submissions/my-submissions
Get current user's submission history.

**Access:** STUDENT

**Request:**
```http
GET /submissions/my-submissions?page=1&limit=20
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "data": [
    {
      "id": "sub-uuid",
      "quiz": {
        "id": "quiz-uuid",
        "title": "JavaScript Fundamentals"
      },
      "score": 8,
      "totalQuestions": 10,
      "percentage": 80,
      "submittedAt": "2025-01-10T12:25:00.000Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### GET /submissions/:id
Get single submission with answers.

**Access:** STUDENT (own), TEACHER (their quiz), ADMIN

**Request:**
```http
GET /submissions/submission-uuid
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "data": {
    "id": "submission-uuid",
    "user": {
      "id": "student-uuid",
      "name": "Jane Doe"
    },
    "quiz": {
      "id": "quiz-uuid",
      "title": "JavaScript Fundamentals"
    },
    "score": 8,
    "totalQuestions": 10,
    "percentage": 80,
    "startedAt": "2025-01-10T12:00:00.000Z",
    "submittedAt": "2025-01-10T12:25:00.000Z",
    "answers": [
      {
        "questionId": "q1-uuid",
        "question": {
          "text": "What is a closure?",
          "options": ["A", "B", "C", "D"],
          "explanation": "A closure is..."
        },
        "selectedOption": 0,
        "correctOption": 0,
        "isCorrect": true
      }
    ]
  }
}
```

---

### GET /quizzes/:id/submissions
Get all submissions for a quiz.

**Access:** TEACHER (own quiz), ADMIN

**Request:**
```http
GET /quizzes/quiz-uuid/submissions?page=1&limit=20
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "data": [
    {
      "id": "sub-uuid",
      "user": {
        "id": "student-uuid",
        "name": "Alex Chen",
        "email": "alex@example.com"
      },
      "score": 9,
      "totalQuestions": 10,
      "percentage": 90,
      "submittedAt": "2025-01-10T12:25:00.000Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

## 5. User Endpoints

### GET /users/me
Get current user profile.

**Request:**
```http
GET /users/me
Authorization: Bearer <token>
```

**Response: 200 OK**
```json
{
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "STUDENT",
    "createdAt": "2025-01-10T12:00:00.000Z"
  }
}
```

---

### PUT /users/me
Update current user profile.

**Request:**
```http
PUT /users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith"
}
```

**Response: 200 OK**
```json
{
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Smith",
    "role": "STUDENT",
    "updatedAt": "2025-01-10T14:00:00.000Z"
  }
}
```

---

## 6. Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid request body",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "You do not have permission to access this resource",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Quiz not found",
  "error": "Not Found"
}
```

### 422 Validation Error
```json
{
  "statusCode": 422,
  "message": [
    "title must be longer than 3 characters",
    "timeLimit must not be greater than 180"
  ],
  "error": "Unprocessable Entity"
}
```

---

## 7. Testing with cURL

**Register:**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","name":"Test User","role":"STUDENT"}'
```

**Login:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```

**Get Quizzes (with token):**
```bash
curl http://localhost:3001/quizzes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Start Quiz:**
```bash
curl -X POST http://localhost:3001/submissions/start \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"quizId":"quiz-uuid-here"}'
```

**Submit Answers:**
```bash
curl -X POST http://localhost:3001/submissions/SUBMISSION_ID/submit \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"answers":[{"questionId":"q1","selectedOption":0}]}'
```

---

## Summary

Key changes from original API spec:
- Replaced `/auth/verify-token` with `/auth/register` and `/auth/login`
- Added `/auth/me` for fetching current user
- Removed Azure AD B2C token handling
- All other endpoints remain the same
