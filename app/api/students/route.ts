import { NextRequest, NextResponse } from 'next/server'

const CSV_URL = 'https://asset.lyzr.app/xf5uIbZK'

interface StudentRecord {
  universityId: string
  studentName: string
}

let cachedStudents: StudentRecord[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

async function fetchStudents(): Promise<StudentRecord[]> {
  const now = Date.now()
  if (cachedStudents && now - cacheTimestamp < CACHE_TTL) {
    return cachedStudents
  }

  const res = await fetch(CSV_URL)
  if (!res.ok) {
    throw new Error(`Failed to fetch CSV: ${res.status}`)
  }

  const text = await res.text()
  const lines = text.trim().split('\n')

  // Skip header row
  const students: StudentRecord[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // CSV format: "University ID,Student Name"
    const commaIdx = line.indexOf(',')
    if (commaIdx === -1) continue

    const universityId = line.substring(0, commaIdx).trim()
    const studentName = line.substring(commaIdx + 1).trim()

    if (universityId && studentName) {
      students.push({ universityId, studentName })
    }
  }

  cachedStudents = students
  cacheTimestamp = now
  return students
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, universityId, studentName, password } = body

    const students = await fetchStudents()

    if (action === 'validate') {
      // Validate that the university ID exists and the name matches
      const student = students.find(
        (s) =>
          s.universityId.toLowerCase() === (universityId || '').toLowerCase()
      )

      if (!student) {
        return NextResponse.json({
          success: false,
          error: 'University ID not found. Please check your ID and try again.',
        })
      }

      // Flexible name matching: normalize and compare
      const normalize = (n: string) =>
        n
          .toLowerCase()
          .replace(/[^a-z\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim()

      const inputName = normalize(studentName || '')
      const dbName = normalize(student.studentName)

      // Check if names match (either full match or partial — first name or last name)
      const inputParts = inputName.split(' ')
      const dbParts = dbName.split(' ')

      const nameMatch =
        inputName === dbName ||
        inputParts.some((p) => dbParts.includes(p) && p.length > 2) ||
        dbParts.some((p) => inputParts.includes(p) && p.length > 2)

      if (!nameMatch) {
        return NextResponse.json({
          success: false,
          error:
            'Name does not match university records. Please enter your registered name.',
        })
      }

      // Password validation (min 4 chars — client-side storage only)
      if (!password || password.length < 4) {
        return NextResponse.json({
          success: false,
          error: 'Password must be at least 4 characters.',
        })
      }

      return NextResponse.json({
        success: true,
        student: {
          universityId: student.universityId,
          studentName: student.studentName,
        },
      })
    }

    if (action === 'login') {
      // For login, just verify the university ID exists
      const student = students.find(
        (s) =>
          s.universityId.toLowerCase() === (universityId || '').toLowerCase()
      )

      if (!student) {
        return NextResponse.json({
          success: false,
          error: 'University ID not found.',
        })
      }

      return NextResponse.json({
        success: true,
        student: {
          universityId: student.universityId,
          studentName: student.studentName,
        },
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}
