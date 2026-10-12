# Student Management API

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set a private `JWT_SECRET`.
3. Start MongoDB, then run `npm run dev`.

Public registration supports student and teacher accounts. Admin accounts are created separately so visitors cannot choose the admin role during signup.

## Create the first admin

In PowerShell, set the admin details for the current terminal and run the command from the `backend` directory:

```powershell
$env:ADMIN_NAME = "System Admin"
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "use-a-long-private-password"
npm run create-admin
```

The command creates an admin account in the configured MongoDB database. It refuses to promote an existing non-admin account.

## Role access

- Admins can list, add, edit, and delete student records.
- Teachers can view and search the student roster.
- Teachers can mark each student's attendance as present, absent, or late for a selected date.
- Teachers can add, edit, and delete assessment results; students can view their own results.
- Students can view the record whose email matches their login email and review their attendance history. An administrator must add that record first.
