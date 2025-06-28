import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import cv2
from PIL import Image, ImageTk
import threading
import time
import json
from pyzbar import pyzbar
import pymongo
from datetime import datetime, timedelta
import winsound
import os

class AttendanceApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Codtecs Attendance System")
        self.root.geometry("900x700")
        self.root.configure(bg='#f0f0f0')
        
        # Environment variables
        self.mongo_uri = os.getenv("MONGO_URI")
        self.db_name = os.getenv("DB_NAME")
        
        # MongoDB connection
        try:
            self.client = pymongo.MongoClient(self.mongo_uri)
            self.db = self.client[self.db_name]
            self.employees_collection = self.db["employees"]
            self.attendance_collection = self.db["attendance"]
            
            # Test connection
            self.client.server_info()
            self.db_connected = True
        except Exception as e:
            self.db_connected = False
            messagebox.showerror("Database Error", f"Could not connect to MongoDB: {str(e)}")
        
        # Camera setup
        self.camera_index = 0
        self.camera_available = False
        
        # State variables
        self.current_frame = None
        self.last_qr_time = 0
        self.qr_cooldown = 3  # 3 seconds between QR scans
        
        self.setup_ui()
        self.root.after(0, self.setup_camera)
        
    def setup_ui(self):
        # Main container
        main_container = ttk.Frame(self.root)
        main_container.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Title
        title_frame = ttk.Frame(main_container)
        title_frame.pack(fill=tk.X, pady=(0, 20))
        
        title_label = ttk.Label(title_frame, text="Codtecs Attendance System", font=("Arial", 20, "bold"))
        title_label.pack()
        
        subtitle_label = ttk.Label(title_frame, text="Scan your QR code to mark attendance", font=("Arial", 12))
        subtitle_label.pack()
        
        # Main content area
        content_frame = ttk.Frame(main_container)
        content_frame.pack(fill=tk.BOTH, expand=True)
        
        # Left side - Camera feed
        camera_frame = ttk.LabelFrame(content_frame, text="Camera Feed", padding="10")
        camera_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 10))
        
        self.camera_label = ttk.Label(camera_frame)
        if self.camera_available:
            self.camera_label.pack()
        else:
            no_camera_label = ttk.Label(camera_frame, text="Camera not available\nUse Manual Entry", font=("Arial", 14), foreground="black")
            no_camera_label.pack(expand=True)
            self.no_camera_label = no_camera_label  # Save reference for later removal
        
        # Right side - Information and controls
        info_frame = ttk.Frame(content_frame)
        info_frame.pack(side=tk.RIGHT, fill=tk.Y, padx=(10, 0))
        
        # Status display
        status_frame = ttk.LabelFrame(info_frame, text="Status", padding="10")
        status_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.status_label = ttk.Label(status_frame, text="Ready - Please scan QR code",  font=("Arial", 12), foreground="blue")
        self.status_label.pack()
        
        # Employee info display
        employee_frame = ttk.LabelFrame(info_frame, text="Last Scanned Employee", padding="10")
        employee_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.name_label = ttk.Label(employee_frame, text="Name: -", font=("Arial", 11))
        self.name_label.pack(anchor=tk.W)
        
        self.id_label = ttk.Label(employee_frame, text="ID: -", font=("Arial", 11))
        self.id_label.pack(anchor=tk.W)
        
        self.dept_label = ttk.Label(employee_frame, text="Department: -", font=("Arial", 11))
        self.dept_label.pack(anchor=tk.W)
        
        self.time_label = ttk.Label(employee_frame, text="Time: -", font=("Arial", 11))
        self.time_label.pack(anchor=tk.W)
        
        # Recent attendance
        recent_frame = ttk.LabelFrame(info_frame, text="Recent Attendance", padding="10")
        recent_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Create treeview for recent attendance
        self.recent_tree = ttk.Treeview(recent_frame, columns=("Name", "Time"), show="headings", height=8)
        self.recent_tree.heading("Name", text="Employee")
        self.recent_tree.heading("Time", text="Check-in Time")
        self.recent_tree.column("Name", width=120)
        self.recent_tree.column("Time", width=120)
        self.recent_tree.pack(fill=tk.BOTH, expand=True)
        
        # Scrollbar for treeview
        scrollbar = ttk.Scrollbar(recent_frame, orient=tk.VERTICAL, command=self.recent_tree.yview)
        self.recent_tree.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Control buttons
        button_frame = ttk.Frame(info_frame)
        button_frame.pack(fill=tk.X)
        
        self.manual_button = ttk.Button(button_frame, text="Manual Entry", command=self.manual_entry)
        self.manual_button.pack(fill=tk.X, pady=(0, 5))
        
        self.refresh_button = ttk.Button(button_frame, text="Refresh Recent", command=self.refresh_recent_attendance)
        self.refresh_button.pack(fill=tk.X, pady=(0, 5))
        
        self.stats_button = ttk.Button(button_frame, text="Today's Stats", command=self.show_stats)
        self.stats_button.pack(fill=tk.X)
        
        # Load initial data
        self.refresh_recent_attendance()
        
    def start_camera_thread(self):
        self.camera_thread = threading.Thread(target=self.camera_loop, daemon=True)
        self.camera_thread.start()
        
    def camera_loop(self):
        while True:
            if not self.camera_available:
                break
                
            ret, frame = self.cap.read()
            if ret:
                self.current_frame = frame.copy()
                
                # Detect QR codes
                self.detect_qr_code(frame)
                
                # Add overlay text
                cv2.putText(frame, "Scan QR Code Here", (10, 30), cv2.FONT_HERSHEY_COMPLEX_SMALL, 1, (0, 0, 0), 1)
                
                # Convert frame for display
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_pil = Image.fromarray(frame_rgb)
                frame_tk = ImageTk.PhotoImage(frame_pil.resize((480, 360)))
                
                # Update UI in main thread
                self.root.after(0, self.update_camera_display, frame_tk)
                
            time.sleep(0.03)  # ~30 FPS
            
    def update_camera_display(self, frame_tk):
        if hasattr(self, 'camera_label'):
            self.camera_label.configure(image=frame_tk)
            self.camera_label.image = frame_tk
        
    def detect_qr_code(self, frame):
        # Check cooldown
        current_time = time.time()
        if current_time - self.last_qr_time < self.qr_cooldown:
            return
            
        # Decode QR codes
        qr_codes = pyzbar.decode(frame)
        
        for qr_code in qr_codes:
            try:
                # Extract QR code data
                qr_data = qr_code.data.decode('utf-8')
                employee_data = json.loads(qr_data)
                employee_id = employee_data.get('employee_id')
                
                if employee_id:
                    self.last_qr_time = current_time
                    self.process_qr_detection(employee_id)
                    break
                    
            except (json.JSONDecodeError, KeyError):
                continue
                
    def process_qr_detection(self, employee_id):
        if not self.db_connected:
            self.update_status("Database not connected!", "red")
            return
        try:
            # Fetch employee from database
            employee = self.employees_collection.find_one({"employee_id": employee_id})
            if employee:
                # Check if attendance already marked today
                today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                tomorrow = today + timedelta(days=1)
                already_marked = self.attendance_collection.find_one({
                    "employee_id": employee['employee_id'],
                    "check_in_time": {"$gte": today, "$lt": tomorrow}
                })
                if already_marked:
                    self.root.after(0, self.update_status, f"⚠️ Attendance already marked for {employee['name']} today", "orange")
                    return
                # Mark attendance
                attendance_record = {
                    "employee_id": employee['employee_id'],
                    "name": employee['name'],
                    "check_in_time": datetime.now(),
                    "verification_method": "qr_only"
                }
                # Insert into database
                self.attendance_collection.insert_one(attendance_record)
                # Update UI
                self.root.after(0, self.update_employee_info, employee, attendance_record["check_in_time"])
                self.root.after(0, self.update_status, f"✓ Attendance marked for {employee['name']}", "green")
                self.root.after(0, self.refresh_recent_attendance)
                # Play success sound (if available)
                try:
                    winsound.Beep(1000, 200)  # 1000 Hz for 200ms
                except:
                    pass
            else:
                self.root.after(0, self.update_status, "❌ Employee not found in database", "red")
        except Exception as e:
            self.root.after(0, self.update_status, f"❌ Error: {str(e)}", "red")
            
    def update_employee_info(self, employee, check_in_time):
        self.name_label.configure(text=f"Name: {employee['name']}")
        self.id_label.configure(text=f"ID: {employee['employee_id']}")
        self.dept_label.configure(text=f"Department: {employee.get('department', 'N/A')}")
        self.time_label.configure(text=f"Time: {check_in_time.strftime('%H:%M:%S')}")
        
    def update_status(self, message, color="blue"):
        self.status_label.configure(text=message, foreground=color)
        
    def refresh_recent_attendance(self):
        if not self.db_connected:
            return
            
        try:
            # Get today's attendance
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            tomorrow = today + timedelta(days=1)
            
            recent_records = list(self.attendance_collection.find({
                "check_in_time": {"$gte": today, "$lt": tomorrow}
            }).sort("check_in_time", -1).limit(10))
            
            # Clear existing items
            for item in self.recent_tree.get_children():
                self.recent_tree.delete(item)
            
            # Add new items
            for record in recent_records:
                check_in_time = record["check_in_time"].strftime("%H:%M:%S")
                self.recent_tree.insert("", "end", values=(record["name"], check_in_time))
                
        except Exception as e:
            print(f"Error refreshing recent attendance: {e}")
            
    def manual_entry(self):
        if not self.db_connected:
            messagebox.showerror("Error", "Database not connected!")
            return
        employee_id = simpledialog.askstring("Manual Entry", "Enter Employee ID:")
        if employee_id:
            try:
                employee = self.employees_collection.find_one({"employee_id": employee_id})
                if employee:
                    # Check if attendance already marked today
                    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                    tomorrow = today + timedelta(days=1)
                    already_marked = self.attendance_collection.find_one({
                        "employee_id": employee['employee_id'],
                        "check_in_time": {"$gte": today, "$lt": tomorrow}
                    })
                    if already_marked:
                        messagebox.showinfo("Already Marked", f"Attendance already marked for {employee['name']} today.")
                        return
                    # Mark attendance
                    attendance_record = {
                        "employee_id": employee['employee_id'],
                        "name": employee['name'],
                        "check_in_time": datetime.now(),
                        "verification_method": "manual"
                    }
                    self.attendance_collection.insert_one(attendance_record)
                    # Update UI
                    self.update_employee_info(employee, attendance_record["check_in_time"])
                    self.update_status(f"✓ Manual attendance marked for {employee['name']}", "green")
                    self.refresh_recent_attendance()
                    messagebox.showinfo("Success", f"Manual attendance marked for {employee['name']}")
                else:
                    messagebox.showerror("Error", "Employee not found")
            except Exception as e:
                messagebox.showerror("Error", f"Database error: {str(e)}")
                
    def show_stats(self):
        if not self.db_connected:
            messagebox.showerror("Error", "Database not connected!")
            return
            
        try:
            # Get today's stats
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            tomorrow = today + timedelta(days=1)
            
            total_employees = self.employees_collection.count_documents({})
            today_attendance = self.attendance_collection.count_documents({
                "check_in_time": {"$gte": today, "$lt": tomorrow}
            })
            
            attendance_rate = (today_attendance / total_employees * 100) if total_employees > 0 else 0
            
            stats_message = f"""Today's Attendance Statistics:\nTotal Employees: {total_employees}\nPresent Today: {today_attendance}\nAttendance Rate: {attendance_rate:.1f}%\nDate: {today.strftime('%Y-%m-%d')}"""
            messagebox.showinfo("Today's Statistics", stats_message)
            
        except Exception as e:
            messagebox.showerror("Error", f"Error fetching statistics: {str(e)}")
            
    def get_available_cameras(self):
        """Get a list of available camera devices"""
        available_cameras = []
        for i in range(10):  # Check first 10 indexes
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                ret, _ = cap.read()
                if ret:
                    available_cameras.append(i)
                cap.release()
        return available_cameras

    def setup_camera(self):
        """Setup camera with proper error handling and camera selection"""
        self.available_cameras = self.get_available_cameras()
        
        if not self.available_cameras:
            self.camera_available = False
            messagebox.showerror("Camera Error", "No cameras found!")
            return
        
        if len(self.available_cameras) > 1:
            self.show_camera_selection_window()
        else:
            # Single camera case
            self.camera_index = self.available_cameras[0]
            self.initialize_camera()

    def show_camera_selection_window(self):
        """Show a window with live video previews for all available cameras. User selects by clicking a preview."""
        camera_dialog = tk.Toplevel(self.root)
        camera_dialog.title("Select Camera")
        camera_dialog.geometry("700x400")
        camera_dialog.grab_set()
        camera_dialog.transient(self.root)
        
        info_label = tk.Label(camera_dialog, text="Multiple cameras detected. Click a video to select:")
        info_label.pack(pady=10)
        
        preview_frame = tk.Frame(camera_dialog)
        preview_frame.pack(fill=tk.BOTH, expand=True)
        
        self._camera_previews = []  # [(cap, label, running, thread)]
        self._selected_camera = None
        
        def on_select(cam_idx):
            self._selected_camera = cam_idx
            # Stop all preview threads and release cameras
            for cap, label, running, thread in self._camera_previews:
                running[0] = False
                cap.release()
            camera_dialog.destroy()
            self.camera_index = cam_idx
            self.initialize_camera()
            # Remove the 'no camera' label if it exists
            if hasattr(self, 'no_camera_label'):
                self.no_camera_label.destroy()
                del self.no_camera_label
            # Pack the camera label if not already packed
            if not self.camera_label.winfo_ismapped():
                self.camera_label.pack()
            if self.camera_available:
                self.start_camera_thread()
        
        def make_preview(cam_idx, row, col):
            cap = cv2.VideoCapture(cam_idx)
            label = tk.Label(
                preview_frame,
                text=f"Camera {cam_idx}",
                bd=2,
                relief=tk.RIDGE,
                width=220,
                height=180,
                cursor="hand2"  # Set pointer cursor
            )
            label.grid(row=row, column=col, padx=10, pady=10)
            running = [True]
            def update():
                while running[0]:
                    ret, frame = cap.read()
                    if ret:
                        frame = cv2.resize(frame, (200, 150))
                        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        img = Image.fromarray(frame_rgb)
                        # Schedule the GUI update in the main thread
                        def update_label():
                            imgtk = ImageTk.PhotoImage(img)
                            label.configure(image=imgtk)
                            label.image = imgtk
                        label.after(0, update_label)
                    time.sleep(0.05)
            thread = threading.Thread(target=update, daemon=True)
            thread.start()
            label.bind("<Button-1>", lambda e, idx=cam_idx: on_select(idx))
            self._camera_previews.append((cap, label, running, thread))
        
        # Arrange previews in a grid (2 per row)
        for i, cam_idx in enumerate(self.available_cameras):
            row, col = divmod(i, 2)
            make_preview(cam_idx, row, col)
        
        # Wait for user selection
        self.root.wait_window(camera_dialog)
        # Clean up in case dialog closed without selection
        for cap, label, running, thread in self._camera_previews:
            running[0] = False
            cap.release()
        self._camera_previews.clear()

    def initialize_camera(self):
        """Initialize the selected camera"""
        try:
            self.cap = cv2.VideoCapture(self.camera_index)
            
            # Try to set HD resolution
            resolutions = [(1920, 1080), (1280, 720), (640, 480)]
            
            for width, height in resolutions:
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
                
                # Check if resolution was actually set
                actual_width = self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)
                actual_height = self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
                
                if actual_width == width and actual_height == height:
                    break
            
            # Test camera capture
            ret, frame = self.cap.read()
            if not ret:
                raise Exception("Could not read frame from camera")
                
            self.camera_available = True
            self.camera_resolution = (
                int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            )
            
        except Exception as e:
            self.camera_available = False
            messagebox.showerror("Camera Error", f"Could not initialize camera {self.camera_index}: {str(e)}")
            
    def add_camera_controls(self, button_frame):
        """Add camera control buttons"""
        if len(self.available_cameras) > 1:
            self.switch_camera_button = ttk.Button(
                button_frame, 
                text="Switch Camera",
                command=self.switch_camera
            )
            self.switch_camera_button.pack(fill=tk.X, pady=(0, 5))

    def switch_camera(self):
        """Switch to next available camera"""
        if self.camera_available:
            self.cap.release()
            
        # Get next camera index
        current_idx = self.available_cameras.index(self.camera_index)
        next_idx = (current_idx + 1) % len(self.available_cameras)
        self.camera_index = self.available_cameras[next_idx]
        
        self.initialize_camera()
        if self.camera_available:
            messagebox.showinfo("Camera Switch", f"Switched to Camera {self.camera_index}")
        
    def run(self):
        try:
            self.root.mainloop()
        finally:
            if self.camera_available and hasattr(self, 'cap'):
                self.cap.release()
                cv2.destroyAllWindows()

if __name__ == "__main__":
    app = AttendanceApp()
    app.run()