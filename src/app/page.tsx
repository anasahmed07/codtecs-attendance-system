"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, TrendingUp, Calendar, Copy } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

interface Employee {
  _id: string
  employee_id: string
  name: string
  email: string
  department: string
  has_login: boolean
}

interface AttendanceRecord {
  _id: string
  employee_id: string
  name: string
  check_in_time: string
  verification_method: string
}

interface Stats {
  total_employees: number
  today_attendance: number
  attendance_rate_today: number
  weekly_attendance: number
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState("")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)

  // Login form state
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  // Employee form state
  const [newEmployee, setNewEmployee] = useState({
    employee_id: "",
    name: "",
    email: "",
    department: "",
    create_login: false,
  })

  // State for reset password dialog
  const [resetCredentials, setResetCredentials] = useState<{ employee_id: string; password: string } | null>(null)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  useEffect(() => {
    const savedToken = localStorage.getItem("admin_token")
    if (savedToken) {
      setToken(savedToken)
      setIsAuthenticated(true)
      fetchData(savedToken)
    }
  }, [])

  const login = async () => {
    try {
      setLoading(true)
      const response = await fetch("http://localhost:8000/api/auth/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setToken(data.access_token)
        setIsAuthenticated(true)
        localStorage.setItem("admin_token", data.access_token)
        fetchData(data.access_token)
      } else {
        alert("Invalid credentials")
      }
    } catch {
      alert("Login failed")
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async (authToken: string) => {
    try {
      const headers = {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      }

      // Fetch employees
      const employeesResponse = await fetch("http://localhost:8000/api/admin/employees", { headers })
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json()
        setEmployees(employeesData)
      }

      // Fetch attendance
      const attendanceResponse = await fetch("http://localhost:8000/api/admin/attendance", { headers })
      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()
        setAttendance(attendanceData)
      }

      // Fetch stats
      const statsResponse = await fetch("http://localhost:8000/api/admin/stats", { headers })
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const addEmployee = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/admin/employees", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEmployee),
      })

      if (response.ok) {
        const result = await response.json()

        if (result.login_credentials) {
          alert(
            `Employee added successfully!\n\nLogin Credentials:\nEmployee ID: ${result.login_credentials.employee_id}\nPassword: ${result.login_credentials.password}\n\nPlease share these credentials with the employee.`,
          )
        } else {
          alert("Employee added successfully")
        }

        setNewEmployee({ employee_id: "", name: "", email: "", department: "", create_login: false })
        fetchData(token)
      } else {
        alert("Failed to add employee")
      }
    } catch {
      alert("Error adding employee")
    }
  }

  const deleteEmployee = async (employeeId: string) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        const response = await fetch(`http://localhost:8000/api/admin/employees/${employeeId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          alert("Employee deleted successfully")
          fetchData(token)
        } else {
          alert("Failed to delete employee")
        }
      } catch {
        alert("Error deleting employee")
      }
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setToken("")
    localStorage.removeItem("admin_token")
    setUsername("")
    setPassword("")
  }

  const enableEmployeeLogin = async (employeeId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/admin/employees/${employeeId}/enable-login`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        if (result.login_credentials) {
          alert(
            `Login enabled!\n\nCredentials:\nEmployee ID: ${result.login_credentials.employee_id}\nPassword: ${result.login_credentials.password}`,
          )
        } else {
          alert(result.message)
        }
        fetchData(token)
      } else {
        alert("Failed to enable login")
      }
    } catch {
      alert("Error enabling login")
    }
  }

  const resetEmployeePassword = async (employeeId: string) => {
    if (confirm("Are you sure you want to reset this employee's password?")) {
      try {
        const response = await fetch(`http://localhost:8000/api/admin/employees/${employeeId}/reset-password`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const result = await response.json()
          setResetCredentials(result.new_credentials)
          setIsResetDialogOpen(true)
          fetchData(token)
        } else {
          alert("Failed to reset password")
        }
      } catch {
        alert("Error resetting password")
      }
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Copied to clipboard!")
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>Access the attendance management system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            <Button onClick={login} disabled={loading} className="w-full">
              {loading ? "Logging in..." : "Login"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Attendance Management System</h1>
            <Button onClick={logout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="flex items-center p-6">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_employees}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <Clock className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Today&aposs Attendance</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.today_attendance}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.attendance_rate_today}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center p-6">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Weekly Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.weekly_attendance}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList>
            <TabsTrigger value="attendance">Attendance Records</TabsTrigger>
            <TabsTrigger value="employees">Employee Management</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance Records</CardTitle>
                <CardDescription>View and manage employee check-ins</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">Employee</th>
                        <th className="text-left p-4 font-medium">Check-in Time</th>
                        <th className="text-left p-4 font-medium">Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((record) => (
                        <tr key={record._id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div>
                              <div className="font-medium">{record.name}</div>
                              <div className="text-sm text-gray-500">{record.employee_id}</div>
                            </div>
                          </td>
                          <td className="p-4">{new Date(record.check_in_time).toLocaleString()}</td>
                          <td className="p-4">
                            <Badge variant={record.verification_method === "qr_only" ? "default" : "secondary"}>
                              {record.verification_method === "qr_only" ? "QR Code" : "Manual"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Employee</CardTitle>
                  <CardDescription>Register a new employee in the system</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emp-id">Employee ID</Label>
                    <Input
                      id="emp-id"
                      value={newEmployee.employee_id}
                      onChange={(e) => setNewEmployee({ ...newEmployee, employee_id: e.target.value })}
                      placeholder="EMP001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emp-name">Full Name</Label>
                    <Input
                      id="emp-name"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emp-email">Email</Label>
                    <Input
                      id="emp-email"
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      placeholder="john@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emp-dept">Department</Label>
                    <Input
                      id="emp-dept"
                      value={newEmployee.department}
                      onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                      placeholder="Engineering"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="create-login"
                      checked={newEmployee.create_login || false}
                      onChange={(e) => setNewEmployee({ ...newEmployee, create_login: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="create-login" className="text-sm">
                      Create login credentials for employee dashboard
                    </Label>
                  </div>
                  <Button onClick={addEmployee} className="w-full">
                    Add Employee
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Employee List</CardTitle>
                  <CardDescription>Manage existing employees</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {employees.map((employee) => (
                      <div key={employee._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-gray-500">
                            {employee.employee_id} • {employee.department}
                          </div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        </div>
                        <div className="flex gap-2">
                          {employee.has_login ? (
                            <Button
                              onClick={() => resetEmployeePassword(employee.employee_id)}
                              variant="outline"
                              size="sm"
                            >
                              Reset Password
                            </Button>
                          ) : (
                            <Button
                              onClick={() => enableEmployeeLogin(employee.employee_id)}
                              variant="outline"
                              size="sm"
                            >
                              Enable Login
                            </Button>
                          )}
                          <Button onClick={() => deleteEmployee(employee.employee_id)} variant="destructive" size="sm">
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset Successfully</DialogTitle>
            <DialogDescription>
              Please copy and securely share the new login credentials with the employee.
            </DialogDescription>
          </DialogHeader>
          {resetCredentials && (
            <div className="space-y-4 my-4">
              <div className="space-y-2">
                <Label htmlFor="reset-emp-id">Employee ID</Label>
                <Input id="reset-emp-id" value={resetCredentials.employee_id} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-emp-password">New Password</Label>
                <Input id="reset-emp-password" value={resetCredentials.password} readOnly />
              </div>
              <Button
                onClick={() =>
                  copyToClipboard(`Employee ID: ${resetCredentials.employee_id}\nPassword: ${resetCredentials.password}`)
                }
                className="w-full"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Credentials
              </Button>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
