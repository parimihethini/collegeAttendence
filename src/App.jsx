
import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8081'
const API_URL = `${API_BASE}/api/students`
const ATTENDANCE_URL = `${API_BASE}/api/attendance`
const REPORTS_URL = `${ATTENDANCE_URL}/reports`
const AUTH_URL = `${API_BASE}/api/auth`

const initialForm = {
  name: '',
  rollNumber: '',
  department: '',
  year: '',
}

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [csrfToken, setCsrfToken] = useState('')
  const [activePage, setActivePage] = useState('dashboard')

  const [students, setStudents] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingStudentId, setEditingStudentId] = useState(null)
  const [deletingStudentId, setDeletingStudentId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [facultyForm, setFacultyForm] = useState({
    username: '',
    password: '',
  })
  const [facultySaving, setFacultySaving] = useState(false)
  const [facultyMessage, setFacultyMessage] = useState('')
  const [facultyError, setFacultyError] = useState('')

  const [attendanceDate, setAttendanceDate] = useState(today())
  const [attendance, setAttendance] = useState([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')
  const [markingId, setMarkingId] = useState(null)
  const [pendingAttendance, setPendingAttendance] = useState({})
  const [subjectName, setSubjectName] = useState('')
  const [classTopic, setClassTopic] = useState('')
  const [submittingAttendance, setSubmittingAttendance] = useState(false)

  const [reports, setReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState('')

  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState('ALL')

  const isAdmin = user?.role === 'ADMIN'

  const apiFetch = useCallback((url, options = {}) => {
    return fetch(url, {
      ...options,
      credentials: 'include',
    })
  }, [])

  const refreshCsrfToken = useCallback(async () => {
    const response = await apiFetch(`${AUTH_URL}/csrf`)

    if (!response.ok) {
      throw new Error(`Unable to obtain CSRF token (${response.status})`)
    }

    const data = await response.json()

    if (!data.token) {
      throw new Error('The backend did not return a CSRF token.')
    }

    setCsrfToken(data.token)
    return data.token
  }, [apiFetch])

  useEffect(() => {
    let active = true

    async function initializeAuth() {
      try {
        await refreshCsrfToken()
        const response = await apiFetch(`${AUTH_URL}/me`)

        if (response.ok) {
          const data = await response.json()
          if (active) setUser(data)
        } else if (active) {
          setUser(null)
        }
      } catch {
        if (active) {
          setUser(null)
          setLoginError(
            'Cannot connect to the backend. Check that Spring Boot is running.'
          )
        }
      } finally {
        if (active) setAuthLoading(false)
      }
    }

    initializeAuth()

    return () => {
      active = false
    }
  }, [apiFetch, refreshCsrfToken])

  async function handleLogin(event) {
    event.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    try {
      const token = csrfToken || await refreshCsrfToken()

      const response = await apiFetch(`${AUTH_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': token,
        },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid username or password.')
        }

        if (response.status === 403) {
          throw new Error(
            'Login was rejected by security protection. Refresh the page and try again.'
          )
        }

        throw new Error(`Login failed (${response.status}).`)
      }

      const data = await response.json()
      await refreshCsrfToken()

      setUser(data)
      setLoginPassword('')
      setLoginError('')
      setError('')
      setMessage('')
      setAttendanceError('')
      setReportsError('')
    } catch (err) {
      setLoginError(err.message || 'Unable to log in.')
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleLogout() {
    try {
      const token = csrfToken || await refreshCsrfToken()

      await apiFetch(`${AUTH_URL}/logout`, {
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': token,
        },
      })
    } catch (err) {
      console.error('Logout request failed:', err)
    } finally {
      setUser(null)
      setLoginUsername('')
      setLoginPassword('')
      setStudents([])
      setAttendance([])
      setReports([])
      setForm(initialForm)
      setMessage('')
      setError('')
      setAttendanceError('')
      setReportsError('')
      setLoginError('')

      try {
        await refreshCsrfToken()
      } catch {
        setCsrfToken('')
      }
    }
  }

  const loadStudents = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await apiFetch(API_URL)

      if (!response.ok) {
        throw new Error(`Could not load students (${response.status})`)
      }

      setStudents(await response.json())
    } catch {
      setError('Unable to load students. Check your session and backend.')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  const loadAttendance = useCallback(async () => {
    setAttendanceLoading(true)
    setAttendanceError('')

    try {
      const response = await apiFetch(
        `${ATTENDANCE_URL}?date=${attendanceDate}`
      )

      if (!response.ok) {
        throw new Error(`Could not load attendance (${response.status})`)
      }

      setAttendance(await response.json())
    } catch {
      setAttendance([])
      setAttendanceError('Unable to load attendance records.')
    } finally {
      setAttendanceLoading(false)
    }
  }, [apiFetch, attendanceDate])

  const loadReports = useCallback(async () => {
    setReportsLoading(true)
    setReportsError('')

    try {
      const response = await apiFetch(REPORTS_URL)

      if (!response.ok) {
        throw new Error(`Could not load reports (${response.status})`)
      }

      setReports(await response.json())
    } catch {
      setReports([])
      setReportsError('Unable to load reports. Check the backend report API.')
    } finally {
      setReportsLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    if (user) loadStudents()
  }, [user, loadStudents])

  useEffect(() => {
    if (user) loadAttendance()
  }, [user, loadAttendance])

  useEffect(() => {
    if (user) loadReports()
  }, [user, loadReports])

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setError('')
    setMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!form.name.trim() || !form.rollNumber.trim()) {
      setError('Name and roll number are required.')
      return
    }

    const student = {
      name: form.name.trim(),
      rollNumber: form.rollNumber.trim(),
      department: form.department.trim(),
      year: form.year === '' ? null : Number(form.year),
    }

    setSaving(true)

    try {
      const token = csrfToken || await refreshCsrfToken()
      const response = await apiFetch(
        editingStudentId === null
          ? API_URL
          : `${API_URL}/${editingStudentId}`,
        {
          method: editingStudentId === null ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': token,
          },
          body: JSON.stringify(student),
        }
      )

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? 'Your session expired. Please log in again.'
            : response.status === 403
              ? 'Request forbidden. Check your role and CSRF token.'
              : response.status === 409
                ? 'That roll number already exists.'
                : response.status === 400
                  ? 'Name and roll number are required.'
                  : `Unable to save student (${response.status}).`
        )
      }

      const wasEditing = editingStudentId !== null
      setForm(initialForm)
      setEditingStudentId(null)
      setMessage(
        wasEditing
          ? 'Student updated successfully.'
          : 'Student registered successfully.'
      )

      await Promise.all([loadStudents(), loadReports()])
    } catch (err) {
      setError(err.message || 'Unable to save student.')
    } finally {
      setSaving(false)
    }
  }

  function startEditingStudent(student) {
    setEditingStudentId(student.id)
    setForm({
      name: student.name || '',
      rollNumber: student.rollNumber || '',
      department: student.department || '',
      year: student.year == null ? '' : String(student.year),
    })
    setError('')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEditingStudent() {
    setEditingStudentId(null)
    setForm(initialForm)
    setError('')
    setMessage('')
  }

  async function handleDeleteStudent(student) {
    const confirmed = window.confirm(
      `Permanently delete ${student.name} (${student.rollNumber}) and ALL of their attendance history? This cannot be undone.`
    )

    if (!confirmed) return

    setDeletingStudentId(student.id)
    setError('')
    setMessage('')

    try {
      const token = csrfToken || await refreshCsrfToken()

      const response = await apiFetch(`${API_URL}/${student.id}`, {
        method: 'DELETE',
        headers: {
          'X-XSRF-TOKEN': token,
        },
      })

      if (!response.ok) {
        const body = await response.text()
        let detail = ''

        try {
          const parsed = JSON.parse(body)
          detail =
            parsed.detail ||
            parsed.message ||
            parsed.error ||
            parsed.title ||
            ''
        } catch {
          detail = body
        }

        if (response.status === 401) {
          throw new Error('Your session expired. Please log in again.')
        }

        if (response.status === 403) {
          throw new Error(
            'Deletion forbidden. Confirm you are logged in as ADMIN and refresh the page.'
          )
        }

        if (response.status === 404) {
          throw new Error('Student not found. Refresh the student list.')
        }

        if (response.status === 409) {
          throw new Error(
            detail ||
            'The student could not be deleted because related records prevent deletion.'
          )
        }

        throw new Error(
          detail || `Unable to delete student (${response.status}).`
        )
      }

      if (editingStudentId === student.id) {
        setEditingStudentId(null)
        setForm(initialForm)
      }

      setMessage(`Student ${student.name} was deleted successfully.`)

      await Promise.all([
        loadStudents(),
        loadAttendance(),
        loadReports(),
      ])
    } catch (err) {
      setError(err.message || 'Unable to delete student.')
    } finally {
      setDeletingStudentId(null)
    }
  }

  async function handleCreateFaculty(event) {
    event.preventDefault()
    setFacultyError('')
    setFacultyMessage('')

    const username = facultyForm.username.trim()
    const password = facultyForm.password

    if (!username) {
      setFacultyError('Faculty username is required.')
      return
    }

    if (password.length < 12) {
      setFacultyError('Password must be at least 12 characters.')
      return
    }

    setFacultySaving(true)

    try {
      const token = csrfToken || await refreshCsrfToken()
      const response = await apiFetch(`${API_BASE}/api/faculty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': token,
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const body = await response.text()
        let detail = ''

        try {
          const parsed = JSON.parse(body)
          detail = parsed.detail || parsed.message || parsed.error || ''
        } catch {
          detail = body
        }

        throw new Error(
          response.status === 401
            ? 'Your session expired. Please log in again.'
            : response.status === 403
              ? 'Request forbidden. Confirm you are logged in as ADMIN and refresh the page.'
              : response.status === 409
                ? 'That username already exists.'
                : response.status === 400
                  ? detail || 'Check the username and password requirements.'
                  : detail || `Unable to create faculty account (${response.status}).`
        )
      }

      const data = await response.json()
      setFacultyForm({ username: '', password: '' })
      setFacultyMessage(data.message || 'Faculty account created successfully.')
    } catch (err) {
      setFacultyError(err.message || 'Unable to create faculty account.')
    } finally {
      setFacultySaving(false)
    }
  }

  function chooseAttendance(studentId, status) {
    setAttendanceError('')
    setMessage('')
    setPendingAttendance((current) => ({
      ...current,
      [studentId]: status,
    }))
  }

  async function submitAttendanceSession() {
    setAttendanceError('')
    setMessage('')

    if (!subjectName.trim()) {
      setAttendanceError('Enter the subject name before submitting attendance.')
      return
    }

    if (!classTopic.trim()) {
      setAttendanceError('Enter the topic covered in this class before submitting attendance.')
      return
    }

    const toSubmit = students.filter(
      (student) =>
        !attendanceByStudent.has(student.id) &&
        Boolean(pendingAttendance[student.id])
    )

    if (toSubmit.length === 0) {
      setAttendanceError('Mark Present or Absent for at least one unmarked student before submitting.')
      return
    }

    setSubmittingAttendance(true)
    setMarkingId('submitting')

    let savedPresent = 0
    let savedAbsent = 0
    const failures = []

    try {
      const token = csrfToken || await refreshCsrfToken()

      for (const student of toSubmit) {
        const status = pendingAttendance[student.id]
        try {
          const response = await apiFetch(
            `${ATTENDANCE_URL}?studentId=${student.id}&status=${status}&date=${attendanceDate}`,
            {
              method: 'POST',
              headers: {
                'X-XSRF-TOKEN': token,
              },
            }
          )

          if (!response.ok) {
            const body = await response.text()
            let detail = ''
            try {
              const parsed = JSON.parse(body)
              detail = parsed.detail || parsed.message || parsed.error || parsed.title || ''
            } catch {
              detail = body
            }
            if (response.status === 401) {
              throw new Error('Your session expired. Please log in again.')
            }
            if (response.status === 403) {
              throw new Error('Request forbidden. Check your role and CSRF token.')
            }
            if (response.status === 409) {
              failures.push(`${student.name}: already marked`)
              continue
            }
            failures.push(`${student.name}: ${detail || `request failed (${response.status})`}`)
            continue
          }

          if (status === 'PRESENT') savedPresent += 1
          else savedAbsent += 1
        } catch (err) {
          if (err.message?.includes('session expired') || err.message?.includes('CSRF token')) {
            throw err
          }
          failures.push(`${student.name}: ${err.message || 'request failed'}`)
        }
      }

      await Promise.all([loadAttendance(), loadReports()])

      if (savedPresent + savedAbsent > 0) {
        setMessage(
          `Attendance submitted: ${savedPresent} present, ${savedAbsent} absent` +
          (failures.length ? `. ${failures.length} record(s) could not be saved.` : '.')
        )
        setPendingAttendance((current) => {
          const next = { ...current }
          for (const student of toSubmit) delete next[student.id]
          return next
        })
      }

      if (failures.length) {
        setAttendanceError(`Some records were not saved: ${failures.slice(0, 4).join('; ')}${failures.length > 4 ? '; …' : ''}`)
      }
    } catch (err) {
      setAttendanceError(err.message || 'Unable to submit attendance.')
    } finally {
      setSubmittingAttendance(false)
      setMarkingId(null)
    }
  }

  const attendanceByStudent = useMemo(
    () => new Map(attendance.map((record) => [record.student?.id, record])),
    [attendance]
  )

  const presentCount = attendance.filter(
    (record) => record.status === 'PRESENT'
  ).length

  const absentCount = attendance.filter(
    (record) => record.status === 'ABSENT'
  ).length

  const markedCount = attendance.length

  const pendingPresentCount = students.filter(
    (student) =>
      !attendanceByStudent.has(student.id) &&
      pendingAttendance[student.id] === 'PRESENT'
  ).length

  const pendingAbsentCount = students.filter(
    (student) =>
      !attendanceByStudent.has(student.id) &&
      pendingAttendance[student.id] === 'ABSENT'
  ).length

  const pendingCount = pendingPresentCount + pendingAbsentCount

  const attendanceRate = markedCount
    ? Math.round((presentCount / markedCount) * 100)
    : 0

  const departments = useMemo(
    () =>
      [
        ...new Set(
          students.map((student) => student.department).filter(Boolean)
        ),
      ].sort(),
    [students]
  )

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()

    return students.filter((student) => {
      const matchesSearch =
        !query ||
        student.name?.toLowerCase().includes(query) ||
        student.rollNumber?.toLowerCase().includes(query)

      const matchesDepartment =
        departmentFilter === 'ALL' ||
        student.department === departmentFilter

      const matchesYear =
        yearFilter === 'ALL' ||
        String(student.year ?? '') === yearFilter

      return matchesSearch && matchesDepartment && matchesYear
    })
  }, [students, search, departmentFilter, yearFilter])

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase()

    return reports.filter((report) => {
      const matchesSearch =
        !query ||
        report.name?.toLowerCase().includes(query) ||
        report.rollNumber?.toLowerCase().includes(query)

      const matchesDepartment =
        departmentFilter === 'ALL' ||
        report.department === departmentFilter

      const matchesYear =
        yearFilter === 'ALL' ||
        String(report.year ?? '') === yearFilter

      return matchesSearch && matchesDepartment && matchesYear
    })
  }, [reports, search, departmentFilter, yearFilter])

  const reportTotals = useMemo(() => {
    return filteredReports.reduce(
      (totals, report) => ({
        students: totals.students + 1,
        days: totals.days + Number(report.totalDays || 0),
        present: totals.present + Number(report.presentDays || 0),
        absent: totals.absent + Number(report.absentDays || 0),
      }),
      { students: 0, days: 0, present: 0, absent: 0 }
    )
  }, [filteredReports])

  const overallReportRate = reportTotals.days
    ? Math.round((reportTotals.present / reportTotals.days) * 100)
    : 0

  async function refreshAll() {
    await Promise.all([
      loadStudents(),
      loadAttendance(),
      loadReports(),
    ])
  }

  if (authLoading) {
    return (
      <main className="login-page">
        <section className="login-brand-panel" aria-label="Campus attendance">
          <div className="brand-mark" aria-hidden="true">CA</div>
          <p className="brand-kicker">CAMPUS ATTENDANCE</p>
          <h2>Attendance,<br />without the paperwork.</h2>
          <p className="brand-description">
            A simpler way to manage students, daily attendance, and academic
            records in one secure workspace.
          </p>
          <div className="brand-footer">
            <span className="brand-footer-dot" />
            College Management System
          </div>
        </section>

        <section className="login-content-panel">
          <div className="login-panel">
            <p className="eyebrow">WELCOME BACK</p>
            <h1>Attendance Portal</h1>
            <p className="subtitle">Checking your secure login session...</p>
            <div className="login-loading-indicator" role="status">
              <span className="login-spinner" />
              Verifying session
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="login-page">
        <section className="login-brand-panel" aria-label="Campus attendance">
          <div className="brand-mark" aria-hidden="true">CA</div>
          <p className="brand-kicker">CAMPUS ATTENDANCE</p>
          <h2>Attendance,<br />without the paperwork.</h2>
          <p className="brand-description">
            A simpler way to manage students, daily attendance, and academic
            records in one secure workspace.
          </p>

          <div className="brand-feature-list">
            <div className="brand-feature">
              <span className="brand-feature-icon" aria-hidden="true">✓</span>
              <span>Student records in one place</span>
            </div>
            <div className="brand-feature">
              <span className="brand-feature-icon" aria-hidden="true">✓</span>
              <span>Reliable daily attendance tracking</span>
            </div>
            <div className="brand-feature">
              <span className="brand-feature-icon" aria-hidden="true">✓</span>
              <span>Clear reports for better decisions</span>
            </div>
          </div>

          <div className="brand-footer">
            <span className="brand-footer-dot" />
            College Management System
          </div>
        </section>

        <section className="login-content-panel">
          <div className="login-panel">
            <p className="eyebrow">SECURE SIGN IN</p>
            <h1>Welcome back</h1>
            <p className="subtitle">
              Sign in with your college account to continue.
            </p>

            <form className="student-form" onSubmit={handleLogin}>
              <label>
                Username
                <input
                  value={loginUsername}
                  onChange={(event) => setLoginUsername(event.target.value)}
                  autoComplete="username"
                  required
                  placeholder="Enter your username"
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                />
              </label>

              {loginError && (
                <p className="form-error" role="alert">
                  {loginError}
                </p>
              )}

              <button
                className="submit-button"
                type="submit"
                disabled={loginLoading || !csrfToken}
              >
                {loginLoading
                  ? 'Signing in...'
                  : !csrfToken
                    ? 'Preparing secure login...'
                    : 'Sign in securely'}
              </button>
            </form>

            <p className="login-security-note">
              Your session is protected by secure authentication.
            </p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand"><div className="sidebar-brand-mark">CA</div><div><strong>Campus</strong><span>Attendance</span></div></div>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {[
            ['dashboard', 'Dashboard', 'dashboard-section'],
            ['students', 'Students', 'students-section'],
            ['attendance', 'Attendance', 'attendance-section'],
            ['reports', 'Reports', 'reports-section'],
            ...(isAdmin ? [['faculty', 'Faculty Management', 'faculty-section']] : []),
          ].map(([id, label, target]) => (
            <button
              key={id}
              type="button"
              className={`sidebar-nav-item ${activePage === id ? 'active' : ''}`}
              onClick={() => setActivePage(id)}
              aria-current={activePage === id ? 'page' : undefined}
            >
              <span className="sidebar-nav-icon" aria-hidden="true">
                {id === 'dashboard' ? '⌂' : id === 'students' ? '♙' : id === 'attendance' ? '✓' : id === 'reports' ? '▥' : '♧'}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-user-avatar">{(user.username || 'U').slice(0, 1).toUpperCase()}</div><div className="sidebar-user-details"><strong>{user.username}</strong><span>{isAdmin ? 'Administrator' : 'Faculty'}</span></div><button className="sidebar-logout" type="button" onClick={handleLogout} aria-label="Log out">↗</button></div>
      </aside>
      <div className="app-main"><div className="page-content">
    <main className="attendance-app" id="dashboard-section">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">COLLEGE MANAGEMENT SYSTEM</p>
          <h1>{{
            dashboard: 'Attendance Dashboard',
            students: 'Students',
            attendance: 'Mark Attendance',
            reports: 'Attendance Reports',
            faculty: 'Faculty Management',
          }[activePage] || 'Attendance Dashboard'}</h1>
          <p className="subtitle">
            {{
              dashboard: 'Manage students, attendance, and reports in one place.',
              students: 'Register, search, and manage student records.',
              attendance: 'Choose a date and record each student’s attendance.',
              reports: 'Review attendance totals and student percentages.',
              faculty: 'Create and manage faculty access.',
            }[activePage] || ''}
          </p>
        </div>

        <div className="status-badge">
          <span className="status-dot" />
          <span>{user.username} · {user.role}</span>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

{activePage === 'dashboard' && (
        <div className="dashboard-page">
          <section className="stats-grid dashboard-stats-grid">
            <article className="stat-card dashboard-stat-card">
              <div className="dashboard-stat-top">
                <span className="dashboard-stat-icon students-icon">♙</span>
                <span className="dashboard-stat-kicker">STUDENT BODY</span>
              </div>
              <p>Total Students</p>
              <h2>{loading ? '—' : students.length}</h2>
              <span>Registered students</span>
            </article>

            <article className="stat-card dashboard-stat-card">
              <div className="dashboard-stat-top">
                <span className="dashboard-stat-icon present-icon">✓</span>
                <span className="dashboard-stat-kicker">SELECTED DATE</span>
              </div>
              <p>Present</p>
              <h2>{attendanceLoading ? '—' : presentCount}</h2>
              <span>Present on {attendanceDate}</span>
            </article>

            <article className="stat-card dashboard-stat-card">
              <div className="dashboard-stat-top">
                <span className="dashboard-stat-icon absent-icon">×</span>
                <span className="dashboard-stat-kicker">SELECTED DATE</span>
              </div>
              <p>Absent</p>
              <h2>{attendanceLoading ? '—' : absentCount}</h2>
              <span>Absent on {attendanceDate}</span>
            </article>

            <article className="stat-card dashboard-stat-card">
              <div className="dashboard-stat-top">
                <span className="dashboard-stat-icon rate-icon">％</span>
                <span className="dashboard-stat-kicker">RECORDED</span>
              </div>
              <p>Attendance Rate</p>
              <h2>{attendanceLoading ? '—' : `${attendanceRate}%`}</h2>
              <span>{markedCount} attendance records</span>
            </article>
          </section>

          <section className="dashboard-lower-grid">
            <article className="students-panel dashboard-overview-panel">
              <div className="panel-header">
                <div>
                  <h2>Attendance overview</h2>
                  <p>Attendance status for the selected date.</p>
                </div>
                <span className="count-badge">{attendanceDate}</span>
              </div>
              <div className="dashboard-overview-content">
                {attendanceLoading ? (
                  <p className="message">Loading attendance...</p>
                ) : markedCount === 0 ? (
                  <div className="report-empty-state">
                    <span className="report-empty-icon">▥</span>
                    <strong>No attendance recorded</strong>
                    <p>Choose the Attendance page to mark students for this date.</p>
                  </div>
                ) : (
                  <>
                    <div className="dashboard-rate-row">
                      <div>
                        <span className="dashboard-rate-label">Present rate</span>
                        <strong>{attendanceRate}%</strong>
                      </div>
                      <span className="dashboard-rate-detail">{presentCount} of {markedCount} records</span>
                    </div>
                    <div className="dashboard-stacked-bar" role="img" aria-label={`${presentCount} present and ${absentCount} absent`}>
                      <span className="dashboard-stacked-present" style={{ width: `${markedCount ? (presentCount / markedCount) * 100 : 0}%` }} />
                      <span className="dashboard-stacked-absent" style={{ width: `${markedCount ? (absentCount / markedCount) * 100 : 0}%` }} />
                    </div>
                    <div className="dashboard-legend">
                      <span><i className="dashboard-legend-dot present-dot" />Present <strong>{presentCount}</strong></span>
                      <span><i className="dashboard-legend-dot absent-dot" />Absent <strong>{absentCount}</strong></span>
                    </div>
                    <div className="dashboard-overview-foot">
                      <span>Total marked</span><strong>{markedCount} / {students.length || 0}</strong>
                    </div>
                  </>
                )}
              </div>
            </article>

            <article className="students-panel dashboard-actions-panel">
              <div className="panel-header">
                <div>
                  <h2>Quick actions</h2>
                  <p>Jump straight to common tasks.</p>
                </div>
              </div>
              <div className="dashboard-quick-actions">
                <button type="button" className="dashboard-action-button" onClick={() => setActivePage('students')}>
                  <span className="dashboard-action-icon">♙</span>
                  <span><strong>Manage students</strong><small>View and update student records</small></span>
                  <span className="dashboard-action-arrow">›</span>
                </button>
                <button type="button" className="dashboard-action-button" onClick={() => setActivePage('attendance')}>
                  <span className="dashboard-action-icon action-present">✓</span>
                  <span><strong>Mark attendance</strong><small>Record attendance by date</small></span>
                  <span className="dashboard-action-arrow">›</span>
                </button>
                <button type="button" className="dashboard-action-button" onClick={() => setActivePage('reports')}>
                  <span className="dashboard-action-icon action-report">▥</span>
                  <span><strong>View reports</strong><small>Review totals and percentages</small></span>
                  <span className="dashboard-action-arrow">›</span>
                </button>
              </div>
            </article>
          </section>
        </div>
      )}

            {activePage === 'faculty' && isAdmin && (
        <section className="students-panel" id="faculty-section">
          <div className="panel-header">
            <div>
              <h2>Create Faculty Account</h2>
              <p>
                Create a login for a faculty member. Passwords must be at least
                12 characters.
              </p>
            </div>
          </div>

          <form className="student-form" onSubmit={handleCreateFaculty}>
            <label>
              Faculty Username *
              <input
                value={facultyForm.username}
                onChange={(event) => {
                  setFacultyForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                  setFacultyError('')
                  setFacultyMessage('')
                }}
                autoComplete="off"
                required
                maxLength={100}
                placeholder="Enter faculty username"
              />
            </label>

            <label>
              Temporary Password *
              <input
                type="password"
                value={facultyForm.password}
                onChange={(event) => {
                  setFacultyForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                  setFacultyError('')
                  setFacultyMessage('')
                }}
                autoComplete="new-password"
                minLength={12}
                required
                placeholder="At least 12 characters"
              />
            </label>

            <button
              className="submit-button"
              type="submit"
              disabled={facultySaving}
            >
              {facultySaving ? 'Creating account...' : 'Create Faculty Account'}
            </button>
          </form>

          {facultyMessage && (
            <p className="success-message" role="status">
              {facultyMessage}
            </p>
          )}

          {facultyError && (
            <p className="form-error" role="alert">
              {facultyError}
            </p>
          )}
        </section>
      )}

      {activePage === 'students' && isAdmin && (
        <section className="students-panel registration-panel" id="student-registration-section">
          <div className="panel-header">
            <div>
              <h2>
                {editingStudentId === null ? 'Register Student' : 'Edit Student'}
              </h2>
              <p>
                {editingStudentId === null
                  ? "Enter the student's details below."
                  : 'Update the selected student details.'}
              </p>
            </div>
          </div>

          <form className="student-form" onSubmit={handleSubmit}>
            <label>
              Student Name *
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
              />
            </label>

            <label>
              Roll Number *
              <input
                name="rollNumber"
                value={form.rollNumber}
                onChange={handleChange}
                placeholder="Enter roll number"
                required
              />
            </label>

            <label>
              Department
              <input
                name="department"
                value={form.department}
                onChange={handleChange}
                placeholder="e.g. CSE"
              />
            </label>

            <label>
              Year
              <select
                name="year"
                value={form.year}
                onChange={handleChange}
              >
                <option value="">Select year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </label>

            <button
              className="submit-button"
              type="submit"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : editingStudentId === null
                  ? 'Add Student'
                  : 'Save Changes'}
            </button>

            {editingStudentId !== null && (
              <button
                type="button"
                onClick={cancelEditingStudent}
                disabled={saving}
              >
                Cancel Edit
              </button>
            )}
          </form>

          {message && (
            <p className="success-message" role="status">
              {message}
            </p>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </section>
      )}

      {activePage === 'students' && !isAdmin && (
        <section className="students-panel">
          <p className="message">
            Signed in as faculty. Student registration is restricted to admins.
          </p>
        </section>
      )}

      {activePage === 'students' && isAdmin && !message && error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

{activePage === 'attendance' && (
        <>
      <section className="students-panel" id="attendance-section">
        <div className="panel-header">
          <div>
            <h2>Mark Attendance</h2>
            <p>Choose a date and mark each student's status once. It cannot be changed later.</p>
          </div>

          <label>
            Attendance Date
            <input
              type="date"
              value={attendanceDate}
              onChange={(event) => {
                setAttendanceDate(event.target.value)
                setPendingAttendance({})
                setAttendanceError('')
                setMessage('')
              }}
            />
          </label>
        </div>

        <div className="class-session-fields">
          <label>
            Subject
            <input
              type="text"
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              placeholder="e.g. Java Programming"
              maxLength={120}
            />
          </label>
          <label>
            Topic covered
            <input
              type="text"
              value={classTopic}
              onChange={(event) => setClassTopic(event.target.value)}
              placeholder="e.g. Exception Handling"
              maxLength={180}
            />
          </label>
        </div>

        {attendanceError && (
          <p className="form-error" role="alert">
            {attendanceError}
          </p>
        )}

        {message && !isAdmin && (
          <p className="success-message" role="status">
            {message}
          </p>
        )}

        {attendanceLoading ? (
          <p className="message">Loading attendance...</p>
        ) : loading ? (
          <p className="message">Loading students...</p>
        ) : students.length === 0 ? (
          <p className="message">
            Register students before marking attendance.
          </p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Roll Number</th>
                  <th>Current Status</th>
                  <th>Mark Attendance</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const record = attendanceByStudent.get(student.id)
                  const alreadyMarked = Boolean(record)

                  return (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td>{student.rollNumber}</td>
                      <td>
                        {record?.status ? (
                          <span className={`attendance-status-pill ${record.status === 'PRESENT' ? 'status-present' : 'status-absent'}`}>
                            {record.status === 'PRESENT' ? 'Present' : 'Absent'} · Saved
                          </span>
                        ) : pendingAttendance[student.id] ? (
                          <span className={`attendance-status-pill ${pendingAttendance[student.id] === 'PRESENT' ? 'status-present' : 'status-absent'}`}>
                            {pendingAttendance[student.id] === 'PRESENT' ? 'Present' : 'Absent'} · Pending
                          </span>
                        ) : (
                          <span className="attendance-not-marked">Not marked</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          disabled={submittingAttendance || alreadyMarked}
                          className={`attendance-action-button present-button ${pendingAttendance[student.id] === 'PRESENT' ? 'attendance-choice-selected' : ''}`}
                          onClick={() => chooseAttendance(student.id, 'PRESENT')}
                        >
                          Present
                        </button>{' '}
                        <button
                          type="button"
                          disabled={submittingAttendance || alreadyMarked}
                          className={`attendance-action-button absent-button ${pendingAttendance[student.id] === 'ABSENT' ? 'attendance-choice-selected' : ''}`}
                          onClick={() => chooseAttendance(student.id, 'ABSENT')}
                        >
                          Absent
                        </button>
                        {alreadyMarked && (
                          <span className="message">
                            {' '}Already saved
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!attendanceLoading && !loading && students.length > 0 && (
          <div className="attendance-submit-area">
            <div className="attendance-session-summary">
              <div className="attendance-summary-heading">
                <strong>Attendance summary</strong>
                <span>{students.filter((student) => attendanceByStudent.has(student.id)).length + students.filter((student) => !attendanceByStudent.has(student.id) && pendingAttendance[student.id]).length} of {students.length} students marked</span>
              </div>
              <div className="attendance-summary-counts">
                <span className="summary-count summary-present"><strong>{attendance.filter((record) => record.status === 'PRESENT').length + students.filter((student) => !attendanceByStudent.has(student.id) && pendingAttendance[student.id] === 'PRESENT').length}</strong> Present</span>
                <span className="summary-count summary-absent"><strong>{attendance.filter((record) => record.status === 'ABSENT').length + students.filter((student) => !attendanceByStudent.has(student.id) && pendingAttendance[student.id] === 'ABSENT').length}</strong> Absent</span>
                <span className="summary-count summary-unmarked"><strong>{students.filter((student) => !attendanceByStudent.has(student.id) && !pendingAttendance[student.id]).length}</strong> Unmarked</span>
              </div>
              <div className="attendance-summary-progress">
                <span style={{ width: `${students.length ? ((students.filter((student) => attendanceByStudent.has(student.id)).length + students.filter((student) => !attendanceByStudent.has(student.id) && pendingAttendance[student.id]).length) / students.length) * 100 : 0}%` }} />
              </div>
            </div>
            <button
              type="button"
              className="submit-attendance-session"
              onClick={submitAttendanceSession}
              disabled={submittingAttendance || students.every((student) => attendanceByStudent.has(student.id) || !pendingAttendance[student.id])}
            >
              {submittingAttendance
                ? 'Submitting attendance…'
                : pendingCount > 0
                  ? `Submit New Records (${pendingPresentCount} Present, ${pendingAbsentCount} Absent)`
                  : students.length > 0 && students.every((student) => attendanceByStudent.has(student.id))
                    ? 'All Attendance Saved'
                    : 'Select Attendance to Submit'}
            </button>
            <p className="attendance-submit-note">Selections are saved only when you submit. Existing saved records cannot be changed.</p>
          </div>
        )}
      </section>


        </>
      )}

      {activePage === 'students' && (
        <>
      <section className="students-panel" id="students-section">
        <div className="panel-header">
          <div>
            <h2>Search and Filter Students</h2>
            <p>These filters apply to the student list and reports.</p>
          </div>
          <button type="button" onClick={refreshAll}>
            Refresh Data
          </button>
        </div>

        <div className="student-form">
          <label>
            Search name or roll number
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Type a name or roll number"
            />
          </label>

          <label>
            Department
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              <option value="ALL">All departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>

          <label>
            Year
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
            >
              <option value="ALL">All years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </label>
        </div>
      </section>

      <section className="students-panel">
        <div className="panel-header">
          <div>
            <h2>Registered Students</h2>
            <p>Filtered student records</p>
          </div>
          <span className="count-badge">
            {filteredStudents.length} of {students.length} students
          </span>
        </div>

        {loading ? (
          <p className="message">Loading students...</p>
        ) : filteredStudents.length === 0 ? (
          <p className="message">No students match your search or filters.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Roll Number</th>
                  <th>Department</th>
                  <th>Year</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>{student.id}</td>
                    <td>{student.name}</td>
                    <td>{student.rollNumber}</td>
                    <td>{student.department || '—'}</td>
                    <td>{student.year ?? '—'}</td>
                    {isAdmin && (
                      <td>
                        <button
                          type="button"
                          disabled={deletingStudentId !== null}
                          className="table-action-button edit-button"
                          onClick={() => startEditingStudent(student)}
                        >
                          Edit
                        </button>{' '}
                        <button
                          type="button"
                          disabled={deletingStudentId !== null}
                          className="table-action-button delete-button"
                          onClick={() => handleDeleteStudent(student)}
                        >
                          {deletingStudentId === student.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>


        </>
      )}

      {activePage === 'reports' && (
        <>
          <section className="report-summary-grid" aria-label="Attendance report summary">
            <article className="report-summary-card">
              <div className="report-summary-icon students-icon">ST</div>
              <div>
                <p>Students in report</p>
                <h2>{reportTotals.students}</h2>
                <span>Matching current filters</span>
              </div>
            </article>
            <article className="report-summary-card">
              <div className="report-summary-icon present-icon">P</div>
              <div>
                <p>Present records</p>
                <h2>{reportTotals.present}</h2>
                <span>Across recorded days</span>
              </div>
            </article>
            <article className="report-summary-card">
              <div className="report-summary-icon absent-icon">A</div>
              <div>
                <p>Absent records</p>
                <h2>{reportTotals.absent}</h2>
                <span>Across recorded days</span>
              </div>
            </article>
            <article className="report-summary-card">
              <div className="report-summary-icon rate-icon">%</div>
              <div>
                <p>Overall attendance</p>
                <h2>{overallReportRate}%</h2>
                <span>{reportTotals.days} total attendance records</span>
              </div>
            </article>
          </section>

          <section className="students-panel report-visual-panel">
            <div className="panel-header">
              <div>
                <h2>Attendance overview</h2>
                <p>Present versus absent records for the students matching your filters.</p>
              </div>
              <span className="count-badge">{reportTotals.days} records</span>
            </div>
            {reportsError && <p className="form-error" role="alert">{reportsError}</p>}
            {reportsLoading ? (
              <p className="message">Loading attendance analytics...</p>
            ) : reportTotals.days === 0 ? (
              <div className="report-empty-state">
                <span className="report-empty-icon">▥</span>
                <strong>No attendance data yet</strong>
                <p>Once attendance is marked, this overview will show the recorded totals.</p>
              </div>
            ) : (
              <div className="report-chart-layout">
                <div className="report-donut-wrap">
                  <div
                    className="report-donut"
                    style={{ '--present-share': `${(reportTotals.present / reportTotals.days) * 100}%` }}
                    role="img"
                    aria-label={`${overallReportRate}% present and ${100 - overallReportRate}% absent`}
                  >
                    <div className="report-donut-center">
                      <strong>{overallReportRate}%</strong>
                      <span>present</span>
                    </div>
                  </div>
                </div>
                <div className="report-legend">
                  <div className="report-legend-row">
                    <span className="legend-dot present-legend-dot" />
                    <span>Present</span>
                    <strong>{reportTotals.present}</strong>
                  </div>
                  <div className="report-legend-row">
                    <span className="legend-dot absent-legend-dot" />
                    <span>Absent</span>
                    <strong>{reportTotals.absent}</strong>
                  </div>
                  <div className="report-legend-row report-legend-total">
                    <span>Total records</span>
                    <strong>{reportTotals.days}</strong>
                  </div>
                  <div className="report-progress-track" aria-label="Overall attendance percentage">
                    <span style={{ width: `${overallReportRate}%` }} />
                  </div>
                  <p className="report-chart-note">Attendance rate is calculated from present records divided by all recorded attendance records.</p>
                </div>
              </div>
            )}
          </section>

          <section className="students-panel">
            <div className="panel-header">
              <div>
                <h2>Detailed attendance report</h2>
                <p>Per-student attendance totals and attendance percentage.</p>
              </div>
              <span className="count-badge">{filteredReports.length} students</span>
            </div>

            {reportsError && <p className="form-error" role="alert">{reportsError}</p>}
            {reportsLoading ? (
              <p className="message">Loading reports...</p>
            ) : filteredReports.length === 0 ? (
              <p className="message">No reports match your search or filters.</p>
            ) : (
              <div className="table-wrapper">
                <table className="report-detail-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll Number</th>
                      <th>Department</th>
                      <th>Year</th>
                      <th>Days Marked</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report) => {
                      const rate = Math.max(0, Math.min(100, Number(report.attendancePercentage) || 0))
                      return (
                        <tr key={report.studentId}>
                          <td>
                            <strong className="report-student-name">{report.name}</strong>
                          </td>
                          <td>{report.rollNumber}</td>
                          <td>{report.department || '—'}</td>
                          <td>{report.year ?? '—'}</td>
                          <td>{report.totalDays}</td>
                          <td><span className="report-count-present">{report.presentDays}</span></td>
                          <td><span className="report-count-absent">{report.absentDays}</span></td>
                          <td>
                            <div className="report-rate-cell">
                              <div className="report-rate-track">
                                <span style={{ width: `${rate}%` }} />
                              </div>
                              <strong>{rate.toFixed(2)}%</strong>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <footer>College Attendance Management System</footer>
    </main>
      </div>
      </div>
    </div>
  )
}

export default App