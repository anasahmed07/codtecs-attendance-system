# Codtecs Attendance System

A comprehensive attendance management system built with Next.js, FastAPI, and Python desktop application.

## Features

- **Admin Dashboard**: Manage employees, view attendance reports, and generate statistics
- **Employee Portal**: View personal attendance records and QR codes
- **Desktop Application**: QR code scanning for attendance marking
- **API Backend**: RESTful API with JWT authentication
- **Database**: MongoDB for data persistence

## Quick Start

### 1. Environment Setup

The easiest way to set up environment variables is using our setup script:


# API (FastAPI) - in a separate terminal
cd src/app/api
uvicorn index:app --reload --port 8000

# Desktop App (Python) - in a separate terminal
cd python-part
python desktop-app.py
```

## Project Structure

```
codtecs-attendance-system/
├── src/                    # Next.js frontend
│   ├── app/               # App router pages
│   │   ├── page.tsx       # Admin dashboard
│   │   ├── employee/      # Employee portal
│   │   └── api/           # FastAPI backend
│   ├── components/        # UI components
│   └── lib/               # Utilities and config
├── python-part/           # Python applications
│   ├── desktop-app.py     # QR scanner desktop app
│   ├── create_admin.py    # Admin user creation
│   └── config.py          # Configuration management
├── public/                # Static assets
├── env.example            # Environment variables template
├── setup-env.py           # Environment setup script
└── ENVIRONMENT_SETUP.md   # Detailed environment guide
```

## Environment Variables

The system uses environment variables for configuration. Key variables include:

- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET_KEY`: Secret key for JWT tokens
- `ADMIN_USERNAME`/`ADMIN_PASSWORD`: Admin credentials
- `CORS_ORIGINS`: Allowed origins for CORS
- `NEXT_PUBLIC_API_BASE_URL`: API base URL for frontend

See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) for complete documentation.

## API Endpoints

### Authentication
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/employee/login` - Employee login

### Admin Endpoints
- `GET /api/admin/employees` - List employees
- `POST /api/admin/employees` - Create employee
- `PUT /api/admin/employees/{id}` - Update employee
- `DELETE /api/admin/employees/{id}` - Delete employee
- `GET /api/admin/attendance` - View attendance records
- `GET /api/admin/stats` - Get statistics

### Employee Endpoints
- `GET /api/employee/profile` - Get employee profile
- `GET /api/employee/attendance` - Get attendance records
- `GET /api/employee/qr-code` - Get QR code data

## Development

### Frontend (Next.js)
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
```

### Backend (FastAPI)
```bash
cd src/app/api
uvicorn index:app --reload --port 8000
```

### Desktop App (Python)
```bash
cd python-part
python desktop-app.py
```

## Deployment

### Frontend (Vercel)
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Backend (Vercel)
1. Deploy the `src/app/api` directory as a Vercel function
2. Set environment variables in Vercel dashboard

### Desktop App
1. Package with PyInstaller or similar
2. Distribute the executable

## Security Considerations

- Change default admin credentials in production
- Use strong JWT secret keys
- Enable HTTPS in production
- Configure proper CORS origins
- Use secure MongoDB connections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the [Environment Setup Guide](ENVIRONMENT_SETUP.md)
2. Review the configuration validation warnings
3. Check the troubleshooting section in the setup guide
