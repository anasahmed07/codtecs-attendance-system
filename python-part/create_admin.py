import pymongo
import bcrypt
import os

# --- Configuration ---
# Read from environment variables or use default values
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = "attendance_system"
ADMIN_USERNAME = "anasahmedshaikh.work@gmail.com"
ADMIN_PASSWORD = "admin123"
# ---------------------

def create_admin_user():
    """
    Creates an admin user in the database with a hashed password.
    """
    try:
        # Connect to MongoDB
        client = pymongo.MongoClient(MONGO_URI)
        db = client[DB_NAME]
        admins_collection = db["admins"]

        # Check if admin user already exists
        if admins_collection.find_one({"username": ADMIN_USERNAME}):
            print(f"Admin user '{ADMIN_USERNAME}' already exists.")
            # Optionally, update password here if needed
            # print("Updating existing admin password.")
            # hashed_password = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt())
            # admins_collection.update_one(
            #     {"username": ADMIN_USERNAME},
            #     {"$set": {"password": hashed_password.decode('utf-8')}}
            # )
            # print("Admin password updated.")
            return

        # Hash the password
        hashed_password = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt())

        # Insert the new admin user
        admin_user = {
            "username": ADMIN_USERNAME,
            "password": hashed_password.decode('utf-8'), # Store hash as string
        }
        admins_collection.insert_one(admin_user)

        print("✅ Admin user created successfully!")
        print("Credentials to login as Admin:")
        print(f"  Username: {ADMIN_USERNAME}")
        print(f"  Password: {ADMIN_PASSWORD}")

    except pymongo.errors.ConnectionFailure as e:
        print(f"❌ Error: Could not connect to MongoDB.")
        print(f"Please ensure MongoDB is running at {MONGO_URI}")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if 'client' in locals() and client:
            client.close()

if __name__ == "__main__":
    create_admin_user() 