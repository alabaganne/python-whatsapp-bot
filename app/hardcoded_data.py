"""
Hardcoded data module for UI-only mode.
This module provides all the mock data needed for the UI to function without a database.
"""

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

# Mock timezone
TIMEZONE = "Asia/Riyadh"

# Mock customers data
MOCK_CUSTOMERS = [
    {
        "wa_id": "966501234567",
        "customer_name": "Ahmed Al-Said",
        "age": 35,
        "age_recorded_at": "2024-01-15",
        "document": {
            "notes": "Regular patient, prefers morning appointments",
            "medical_history": "No known allergies",
        },
        "is_blocked": False,
        "is_favorite": True,
    },
    {
        "wa_id": "966507654321",
        "customer_name": "Fatima Hassan",
        "age": 28,
        "age_recorded_at": "2024-02-20",
        "document": {
            "notes": "New patient",
            "preferences": "Afternoon slots preferred",
        },
        "is_blocked": False,
        "is_favorite": False,
    },
    {
        "wa_id": "966509876543",
        "customer_name": "Mohammed Ibrahim",
        "age": 42,
        "age_recorded_at": "2023-12-10",
        "document": None,
        "is_blocked": False,
        "is_favorite": True,
    },
    {
        "wa_id": "966502345678",
        "customer_name": "Sara Abdullah",
        "age": 31,
        "age_recorded_at": "2024-03-05",
        "document": {
            "notes": "Follow-up required",
        },
        "is_blocked": False,
        "is_favorite": False,
    },
]

# Mock reservations data
def get_mock_reservations():
    """Generate mock reservations with dates relative to today"""
    today = datetime.now(tz=ZoneInfo(TIMEZONE)).date()
    tomorrow = today + timedelta(days=1)
    in_two_days = today + timedelta(days=2)
    in_three_days = today + timedelta(days=3)

    return [
        {
            "id": 1,
            "wa_id": "966501234567",
            "customer_name": "Ahmed Al-Said",
            "date": tomorrow.strftime("%Y-%m-%d"),
            "time_slot": "10:00",
            "type": 0,  # Check-up
            "status": "active",
            "cancelled_at": None,
            "created_at": datetime.now(tz=ZoneInfo(TIMEZONE)).isoformat(),
            "updated_at": datetime.now(tz=ZoneInfo(TIMEZONE)).isoformat(),
        },
        {
            "id": 2,
            "wa_id": "966507654321",
            "customer_name": "Fatima Hassan",
            "date": tomorrow.strftime("%Y-%m-%d"),
            "time_slot": "14:00",
            "type": 1,  # Follow-up
            "status": "active",
            "cancelled_at": None,
            "created_at": datetime.now(tz=ZoneInfo(TIMEZONE)).isoformat(),
            "updated_at": datetime.now(tz=ZoneInfo(TIMEZONE)).isoformat(),
        },
        {
            "id": 3,
            "wa_id": "966509876543",
            "customer_name": "Mohammed Ibrahim",
            "date": in_two_days.strftime("%Y-%m-%d"),
            "time_slot": "11:00",
            "type": 0,
            "status": "active",
            "cancelled_at": None,
            "created_at": datetime.now(tz=ZoneInfo(TIMEZONE)).isoformat(),
            "updated_at": datetime.now(tz=ZoneInfo(TIMEZONE)).isoformat(),
        },
        {
            "id": 4,
            "wa_id": "966502345678",
            "customer_name": "Sara Abdullah",
            "date": in_three_days.strftime("%Y-%m-%d"),
            "time_slot": "15:00",
            "type": 1,
            "status": "active",
            "cancelled_at": None,
            "created_at": datetime.now(tz=ZoneInfo(TIMEZONE)).isoformat(),
            "updated_at": datetime.now(tz=ZoneInfo(TIMEZONE)).isoformat(),
        },
    ]

# Mock conversations data
MOCK_CONVERSATIONS = {
    "966501234567": [
        {
            "id": 1,
            "wa_id": "966501234567",
            "role": "user",
            "message": "السلام عليكم، أريد حجز موعد",
            "date": "2025-01-20",
            "time": "09:30:00",
        },
        {
            "id": 2,
            "wa_id": "966501234567",
            "role": "assistant",
            "message": "وعليكم السلام ورحمة الله، بالتأكيد. ما هو التاريخ المفضل لك؟",
            "date": "2025-01-20",
            "time": "09:30:15",
        },
        {
            "id": 3,
            "wa_id": "966501234567",
            "role": "user",
            "message": "غداً في الصباح",
            "date": "2025-01-20",
            "time": "09:31:00",
        },
    ],
    "966507654321": [
        {
            "id": 4,
            "wa_id": "966507654321",
            "role": "user",
            "message": "Hello, I need to book an appointment",
            "date": "2025-01-21",
            "time": "14:00:00",
        },
        {
            "id": 5,
            "wa_id": "966507654321",
            "role": "assistant",
            "message": "Of course! When would you like to come in?",
            "date": "2025-01-21",
            "time": "14:00:10",
        },
    ],
    "966509876543": [
        {
            "id": 6,
            "wa_id": "966509876543",
            "role": "user",
            "message": "أريد تغيير موعدي",
            "date": "2025-01-19",
            "time": "16:45:00",
        },
        {
            "id": 7,
            "wa_id": "966509876543",
            "role": "assistant",
            "message": "بالتأكيد، ما هو الموعد الجديد المفضل؟",
            "date": "2025-01-19",
            "time": "16:45:05",
        },
    ],
}

# Mock vacation periods
MOCK_VACATION_PERIODS = [
    {
        "start_date": "2025-03-15",
        "end_date": "2025-03-20",
        "title": "Spring Break",
        "duration_days": 6,
    },
]

# Mock notification events
MOCK_NOTIFICATIONS = [
    {
        "id": 1,
        "event_type": "reservation_created",
        "ts_iso": datetime.now(tz=ZoneInfo(TIMEZONE)).isoformat(),
        "data": '{"wa_id": "966501234567", "customer_name": "Ahmed Al-Said", "date": "2025-01-22", "time_slot": "10:00"}',
    },
    {
        "id": 2,
        "event_type": "reservation_modified",
        "ts_iso": datetime.now(tz=ZoneInfo(TIMEZONE)).isoformat(),
        "data": '{"wa_id": "966509876543", "customer_name": "Mohammed Ibrahim", "date": "2025-01-24"}',
    },
]

# Mock dashboard stats
def get_mock_dashboard_stats():
    """Generate mock dashboard statistics"""
    today = datetime.now(tz=ZoneInfo(TIMEZONE)).date()
    return {
        "total_customers": len(MOCK_CUSTOMERS),
        "total_reservations": len(get_mock_reservations()),
        "total_messages": sum(len(conv) for conv in MOCK_CONVERSATIONS.values()),
        "new_customers_this_month": 2,
        "reservations_this_week": 4,
        "avg_response_time_seconds": 15,
        "top_words": [
            {"word": "موعد", "count": 5},
            {"word": "حجز", "count": 4},
            {"word": "appointment", "count": 3},
        ],
        "reservations_by_type": {
            "checkup": 2,
            "followup": 2,
        },
        "reservations_by_date": [
            {
                "date": (today + timedelta(days=i)).strftime("%Y-%m-%d"),
                "count": 2 if i == 1 else 1,
            }
            for i in range(1, 4)
        ],
    }

# Helper functions
def get_customer_by_wa_id(wa_id: str):
    """Get customer by WhatsApp ID"""
    for customer in MOCK_CUSTOMERS:
        if customer["wa_id"] == wa_id:
            return customer.copy()
    return None

def get_all_customers():
    """Get all customers"""
    return [c.copy() for c in MOCK_CUSTOMERS]

def get_reservations_for_customer(wa_id: str):
    """Get reservations for a specific customer"""
    return [r.copy() for r in get_mock_reservations() if r["wa_id"] == wa_id]

def get_conversation_for_customer(wa_id: str, limit: int = 0):
    """Get conversation messages for a specific customer"""
    messages = MOCK_CONVERSATIONS.get(wa_id, [])
    if limit > 0:
        messages = messages[-limit:]
    return [m.copy() for m in messages]

def get_all_customer_names():
    """Get all customer names with wa_id"""
    return [
        {
            "wa_id": c["wa_id"],
            "customer_name": c["customer_name"],
            "is_favorite": c.get("is_favorite", False),
        }
        for c in MOCK_CUSTOMERS
    ]

def get_customer_stats(wa_id: str):
    """Get statistics for a specific customer"""
    customer = get_customer_by_wa_id(wa_id)
    if not customer:
        return None

    conversations = get_conversation_for_customer(wa_id)
    reservations = get_reservations_for_customer(wa_id)

    return {
        "total_messages": len(conversations),
        "total_reservations": len(reservations),
        "last_contact_date": conversations[-1]["date"] if conversations else None,
        "is_favorite": customer.get("is_favorite", False),
        "is_blocked": customer.get("is_blocked", False),
    }
