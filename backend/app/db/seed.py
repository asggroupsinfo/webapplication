"""
Database seed script to create default admin user
"""
import sys
import bcrypt
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User, UserRole


def create_default_admin():
    """Create default Super Admin user if not exists"""
    db: Session = SessionLocal()
    
    try:
        # Check if admin user already exists
        admin_email = "admin@forexmasterpro.com"
        existing_user = db.query(User).filter(User.email == admin_email).first()
        
        if existing_user:
            print(f"[OK] Admin user already exists: {admin_email}")
            return existing_user
        
        # Create default admin user
        admin_password = "Admin@123"
        # Hash password directly using bcrypt
        hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        admin_user = User(
            email=admin_email,
            hashed_password=hashed_password,
            role=UserRole.SUPER_ADMIN,
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("=" * 60)
        print("[SUCCESS] Default Admin User Created Successfully!")
        print("=" * 60)
        print(f"Email: {admin_email}")
        print(f"Password: {admin_password}")
        print(f"Role: {admin_user.role.value}")
        print("=" * 60)
        print("\n[IMPORTANT] Please change the password after first login!")
        print("=" * 60)
        
        return admin_user
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error creating admin user: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting database seed...")
    create_default_admin()
    print("\n[OK] Seed script completed successfully!")

