# UI-Only Mode - Frontend Only Setup

This application has been configured to run in **UI-only mode** - the Next.js frontend runs standalone with hardcoded data, without requiring the Python backend.

## What Changed

### Backend (Python)
- ✅ Database initialization disabled
- ✅ Scheduler disabled
- ✅ Background workers disabled
- ✅ LLM/WhatsApp API calls disabled

**Note:** The Python backend is no longer needed to run the UI!

### Frontend (Next.js)
- ✅ All API routes updated to use hardcoded data
- ✅ Data stored in browser `localStorage` for persistence
- ✅ Mock data module created (`app/frontend/lib/mock-data.ts`)
- ✅ No Python backend calls - everything runs client-side

## Running the UI-Only Application

### Prerequisites
- Node.js 18+ and pnpm installed
- No Python or PostgreSQL required!

### Installation

```bash
# Navigate to the frontend directory
cd app/frontend

# Install dependencies
pnpm install
```

### Development Mode

```bash
# Start the Next.js development server
pnpm dev
```

The application will be available at: **http://localhost:3000**

### Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Features Available in UI-Only Mode

✅ **Calendar & Reservations**
- View, create, modify, and cancel reservations
- All changes persist in localStorage
- Hardcoded sample reservations with dates relative to today

✅ **Customer Management**
- View and edit customer information
- Customer documents with rich text editor (TipTap)
- Age tracking and calculations
- Favorites and blocking

✅ **Dashboard**
- Mock statistics and analytics
- No real data - returns static values

✅ **Configuration**
- View configuration (mock data)
- Updates acknowledged but not persisted

✅ **Vacation Periods**
- View and update vacation periods
- Persisted in localStorage

## Mock Data

### Initial Data
The application comes with pre-populated mock data:

- **5 sample customers** with realistic Arabic and English names
- **5 sample reservations** for upcoming dates
- **Sample conversations** in Arabic and English
- **1 vacation period** for demonstration

### Data Location
All data is stored in **browser localStorage** under these keys:
- `mock_customers`
- `mock_reservations`
- `mock_conversations`
- `mock_vacation_periods`

### Resetting Data

To reset all data to initial state, open browser console and run:

```javascript
localStorage.clear()
// Then refresh the page
```

Or programmatically:

```javascript
import { resetAllMockData } from '@/lib/mock-data'
resetAllMockData()
```

## File Structure

### Key Files Modified

```
app/frontend/
├── lib/
│   └── mock-data.ts              # Mock data module with localStorage
├── app/api/
│   ├── customers/[waId]/route.ts # Customer CRUD
│   ├── reservations/route.ts     # Reservations list
│   ├── reserve/route.ts          # Create reservation
│   ├── cancel-reservation/route.ts
│   ├── modify-reservation/route.ts
│   ├── modify-id/route.ts
│   ├── vacations/route.ts
│   ├── update-vacation-periods/route.ts
│   ├── config/route.ts
│   ├── notifications/route.ts
│   ├── message/
│   │   ├── send/route.ts
│   │   └── append/route.ts
│   └── typing/route.ts
```

### Python Files Modified (for reference)

```
app/
├── __init__.py                   # Scheduler & workers disabled
└── db.py                         # Database init disabled
```

## Limitations

### What Doesn't Work
❌ **WhatsApp Integration**
- No actual WhatsApp messages sent
- Message sending returns success but doesn't send

❌ **Real-time Updates**
- No WebSocket notifications
- No live updates between tabs/windows

❌ **LLM/AI Features**
- No AI-powered responses
- No system agent interactions

❌ **External Integrations**
- No email notifications
- No database persistence beyond localStorage

### Data Persistence
⚠️ **localStorage only** - Data is stored per browser/device
- Clearing browser data will reset everything
- No sync between devices
- Limited to ~5-10MB (browser dependent)

## Customizing Mock Data

Edit `/app/frontend/lib/mock-data.ts` to change:

1. **Initial Customers**:
```typescript
export const INITIAL_MOCK_CUSTOMERS: MockCustomer[] = [
  {
    wa_id: "966501234567",
    customer_name: "Your Name",
    // ...
  }
]
```

2. **Initial Reservations**:
```typescript
export const getInitialMockReservations = (): MockReservation[] => [
  {
    id: 1,
    wa_id: "966501234567",
    date: getRelativeDate(1), // Tomorrow
    // ...
  }
]
```

3. **Conversations**:
```typescript
export const INITIAL_MOCK_CONVERSATIONS: Record<string, MockConversation[]> = {
  "966501234567": [
    {
      role: "user",
      message: "Your message here",
      // ...
    }
  ]
}
```

## Development Tips

### Debugging
```javascript
// In browser console, inspect current data:
console.log('Customers:', JSON.parse(localStorage.getItem('mock_customers')))
console.log('Reservations:', JSON.parse(localStorage.getItem('mock_reservations')))
```

### Testing Different Scenarios
```javascript
// Add a new customer programmatically
import { getMockCustomers, saveMockCustomers } from '@/lib/mock-data'

const customers = getMockCustomers()
customers.push({
  wa_id: "966500000000",
  customer_name: "Test Customer",
  is_blocked: false,
  is_favorite: false
})
saveMockCustomers(customers)
```

## Switching Back to Full Stack

To re-enable the Python backend:

1. In `app/__init__.py` - uncomment database, scheduler, and workers
2. In `app/db.py` - uncomment `init_models()`
3. In Next.js API routes - restore `callPythonBackend()` calls
4. Start both backend and frontend servers

## Support

This is a **demonstration/testing setup** intended for:
- UI development without backend dependencies
- Frontend testing and prototyping
- Demo presentations
- Learning the UI structure

For production use, enable the full stack with Python backend.

## License

Same as the main project.
