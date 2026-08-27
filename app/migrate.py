from app.database import engine, Base
from app.models import CoachSchedule, MemberBooking

print("Creating new tables...")
Base.metadata.create_all(bind=engine, tables=[
    CoachSchedule.__table__,
    MemberBooking.__table__,
])
print("Done! New tables created.")
