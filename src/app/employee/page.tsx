"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, User, QrCode, TrendingUp, LogOut } from "lucide-react"
import QRCode from "qrcode"
import Image from "next/image"

interface EmployeeProfile {
  employee_id: string
  name: string
  email: string
  department: string
}

interface AttendanceRecord {
  _id: string
  employee_id: string
  name: string
  check_in_time: string
  verification_method: string
  date: string
}

interface AttendanceData {
  month: number
  year: number
  records: AttendanceRecord[]
  statistics: {
    total_days: number
    present_days: number
    working_days: number
    attendance_percentage: number
  }
}

export default function EmployeeDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState("")
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [loading, setLoading] = useState(false)

  // Login form state
  const [employeeId, setEmployeeId] = useState("")
  const [password, setPassword] = useState("")

  // Date selection
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  useEffect(() => {
    const savedToken = localStorage.getItem("employee_token")
    if (savedToken) {
      setToken(savedToken)
      setIsAuthenticated(true)
      fetchEmployeeData(savedToken)
    }
  })

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchAttendanceData(selectedMonth, selectedYear)
    }
  }, [selectedMonth, selectedYear, isAuthenticated, token])

  const login = async () => {
    try {
      setLoading(true)
      const response = await fetch("http://localhost:8000/api/auth/employee/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employee_id: employeeId, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setToken(data.access_token)
        setIsAuthenticated(true)
        localStorage.setItem("employee_token", data.access_token)
        setProfile(data.user_info)
        fetchEmployeeData(data.access_token)
      } else {
        const errorData = await response.json()
        alert(errorData.detail || "Invalid credentials")
      }
    } catch {
      alert("Login failed")
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployeeData = async (authToken: string) => {
    try {
      const headers = {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      }

      // Fetch profile
      const profileResponse = await fetch("http://localhost:8000/api/employee/profile", { headers })
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setProfile(profileData)
      }

      // Fetch QR code
      const qrResponse = await fetch("http://localhost:8000/api/employee/qr-code", { headers })
      if (qrResponse.ok) {
        const qrData = await qrResponse.json()
        const qrUrl = await QRCode.toDataURL(qrData.qr_data)
        setQrCodeUrl(qrUrl)
      }

      // Fetch current month attendance
      fetchAttendanceData(selectedMonth, selectedYear, authToken)
    } catch (error) {
      console.error("Error fetching employee data:", error)
    }
  }

  const fetchAttendanceData = async (month: number, year: number, authToken?: string) => {
    try {
      const headers = {
        Authorization: `Bearer ${authToken || token}`,
        "Content-Type": "application/json",
      }

      const response = await fetch(`http://localhost:8000/api/employee/attendance?month=${month}&year=${year}`, {
        headers,
      })

      if (response.ok) {
        const data = await response.json()
        setAttendanceData(data)
      }
    } catch (error) {
      console.error("Error fetching attendance data:", error)
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setToken("")
    setProfile(null)
    setAttendanceData(null)
    setQrCodeUrl("")
    localStorage.removeItem("employee_token")
    setEmployeeId("")
    setPassword("")
  }

  const downloadQRCode = () => {
    if (qrCodeUrl && profile) {
      const link = document.createElement("a")
      link.download = `${profile.employee_id}_qr_code.png`
      link.href = qrCodeUrl
      link.click()
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Employee Portal</CardTitle>
            <CardDescription>Access your attendance dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee-id">Employee ID</Label>
              <Input
                id="employee-id"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Enter your employee ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <Button onClick={login} disabled={loading} className="w-full">
              {loading ? "Logging in..." : "Login"}
            </Button>
            <div className="text-center text-sm text-gray-600">
              <p>Contact your administrator if you don&apost have login credentials</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Dashboard</h1>
              {profile && <p className="text-sm text-gray-600">Welcome, {profile.name}</p>}
            </div>
            <Button onClick={logout} variant="outline" className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Summary */}
        {profile && (
          <Card className="mb-8">
            <CardContent className="flex items-center p-6">
              <User className="h-12 w-12 text-blue-600 mr-4" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{profile.name}</h2>
                <p className="text-gray-600">ID: {profile.employee_id}</p>
                <p className="text-gray-600">Department: {profile.department}</p>
                <p className="text-gray-600">Email: {profile.email}</p>
              </div>
              {attendanceData && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {attendanceData.statistics.attendance_percentage}%
                  </div>
                  <div className="text-sm text-gray-600">This Month</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList>
            <TabsTrigger value="attendance">Attendance Reports</TabsTrigger>
            <TabsTrigger value="qr-code">My QR Code</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
            <div className="space-y-6">
              {/* Month/Year Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Month & Year</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <div className="flex-1">
                    <Label>Month</Label>
                    <Select
                      value={selectedMonth.toString()}
                      onValueChange={(value) => setSelectedMonth(Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month, index) => (
                          <SelectItem key={index} value={(index + 1).toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label>Year</Label>
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(value) => setSelectedYear(Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2023, 2022].map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics Cards */}
              {attendanceData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="flex items-center p-6">
                      <Calendar className="h-8 w-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Days</p>
                        <p className="text-2xl font-bold text-gray-900">{attendanceData.statistics.total_days}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex items-center p-6">
                      <Clock className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Present Days</p>
                        <p className="text-2xl font-bold text-gray-900">{attendanceData.statistics.present_days}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex items-center p-6">
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Working Days</p>
                        <p className="text-2xl font-bold text-gray-900">{attendanceData.statistics.working_days}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex items-center p-6">
                      <TrendingUp className="h-8 w-8 text-orange-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Attendance %</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {attendanceData.statistics.attendance_percentage}%
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Attendance Records */}
              {attendanceData && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Attendance Records - {months[selectedMonth - 1]} {selectedYear}
                    </CardTitle>
                    <CardDescription>Your daily attendance for the selected month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {attendanceData.records.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-4 font-medium">Date</th>
                              <th className="text-left p-4 font-medium">Check-in Time</th>
                              <th className="text-left p-4 font-medium">Method</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceData.records.map((record) => (
                              <tr key={record._id} className="border-b hover:bg-gray-50">
                                <td className="p-4">{new Date(record.check_in_time).toLocaleDateString()}</td>
                                <td className="p-4">{new Date(record.check_in_time).toLocaleTimeString()}</td>
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
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No attendance records found for this month</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="qr-code">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Your Personal QR Code
                </CardTitle>
                <CardDescription>Use this QR code to mark your attendance at the office scanner</CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                {qrCodeUrl ? (
                  <>
                    <div className="flex justify-center">
                      <div className="p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                        <Image src={qrCodeUrl || "/placeholder.svg"} alt="Employee QR Code" className="w-64 h-64" />
                      </div>
                    </div>
                    {profile && (
                      <div className="space-y-2">
                        <p className="font-medium text-lg">{profile.name}</p>
                        <p className="text-gray-600">ID: {profile.employee_id}</p>
                        <p className="text-gray-600">Department: {profile.department}</p>
                      </div>
                    )}
                    <div className="space-y-4">
                      <Button onClick={downloadQRCode} className="w-full max-w-xs">
                        Download QR Code
                      </Button>
                      <div className="text-sm text-gray-600 max-w-md mx-auto">
                        <p>
                          <strong>Instructions:</strong>
                        </p>
                        <ul className="text-left mt-2 space-y-1">
                          <li>• Save this QR code to your phone</li>
                          <li>• Show it to the office scanner to mark attendance</li>
                          <li>• Keep your QR code private and secure</li>
                          <li>• Contact admin if you lose access to your QR code</li>
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading your QR code...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
