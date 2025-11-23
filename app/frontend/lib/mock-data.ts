/**
 * Mock data for UI-only mode (no Python backend)
 * All data is hardcoded here and can be persisted to localStorage
 */

export interface MockCustomer {
  wa_id: string;
  customer_name: string;
  age?: number;
  age_recorded_at?: string;
  document?: any;
  is_blocked?: boolean;
  is_favorite?: boolean;
}

export interface MockReservation {
  id: number;
  wa_id: string;
  customer_name: string;
  date: string;
  time_slot: string;
  type: number; // 0 = checkup, 1 = followup
  status: "active" | "cancelled";
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MockConversation {
  id: number;
  wa_id: string;
  role: "user" | "assistant" | "secretary";
  message: string;
  date: string;
  time: string;
}

export interface MockVacationPeriod {
  id: number;
  start_date: string;
  end_date: string;
  title?: string;
  duration_days: number;
}

// Helper to get dates relative to today
const getRelativeDate = (daysFromNow: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
};

const getRelativeDateTime = (daysFromNow: number, hours: number = 10): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};

// Initial mock data
export const INITIAL_MOCK_CUSTOMERS: MockCustomer[] = [
  {
    wa_id: "966501234567",
    customer_name: "Ahmed Al-Said",
    age: 35,
    age_recorded_at: "2024-01-15",
    document: {
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Regular patient, prefers morning appointments" },
          ],
        },
      ],
    },
    is_blocked: false,
    is_favorite: true,
  },
  {
    wa_id: "966507654321",
    customer_name: "Fatima Hassan",
    age: 28,
    age_recorded_at: "2024-02-20",
    document: {
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "New patient, afternoon slots preferred" }],
        },
      ],
    },
    is_blocked: false,
    is_favorite: false,
  },
  {
    wa_id: "966509876543",
    customer_name: "Mohammed Ibrahim",
    age: 42,
    age_recorded_at: "2023-12-10",
    document: null,
    is_blocked: false,
    is_favorite: true,
  },
  {
    wa_id: "966502345678",
    customer_name: "Sara Abdullah",
    age: 31,
    age_recorded_at: "2024-03-05",
    document: {
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Follow-up required" }],
        },
      ],
    },
    is_blocked: false,
    is_favorite: false,
  },
  {
    wa_id: "966503456789",
    customer_name: "Khalid Mansour",
    age: 45,
    age_recorded_at: "2024-01-10",
    document: null,
    is_blocked: false,
    is_favorite: false,
  },
];

export const getInitialMockReservations = (): MockReservation[] => [
  {
    id: 1,
    wa_id: "966501234567",
    customer_name: "Ahmed Al-Said",
    date: getRelativeDate(1),
    time_slot: "10:00",
    type: 0,
    status: "active",
    created_at: getRelativeDateTime(0),
    updated_at: getRelativeDateTime(0),
  },
  {
    id: 2,
    wa_id: "966507654321",
    customer_name: "Fatima Hassan",
    date: getRelativeDate(1),
    time_slot: "14:00",
    type: 1,
    status: "active",
    created_at: getRelativeDateTime(0),
    updated_at: getRelativeDateTime(0),
  },
  {
    id: 3,
    wa_id: "966509876543",
    customer_name: "Mohammed Ibrahim",
    date: getRelativeDate(2),
    time_slot: "11:00",
    type: 0,
    status: "active",
    created_at: getRelativeDateTime(0),
    updated_at: getRelativeDateTime(0),
  },
  {
    id: 4,
    wa_id: "966502345678",
    customer_name: "Sara Abdullah",
    date: getRelativeDate(3),
    time_slot: "15:00",
    type: 1,
    status: "active",
    created_at: getRelativeDateTime(0),
    updated_at: getRelativeDateTime(0),
  },
  {
    id: 5,
    wa_id: "966503456789",
    customer_name: "Khalid Mansour",
    date: getRelativeDate(4),
    time_slot: "09:00",
    type: 0,
    status: "active",
    created_at: getRelativeDateTime(0),
    updated_at: getRelativeDateTime(0),
  },
];

export const INITIAL_MOCK_CONVERSATIONS: Record<string, MockConversation[]> = {
  "966501234567": [
    {
      id: 1,
      wa_id: "966501234567",
      role: "user",
      message: "السلام عليكم، أريد حجز موعد",
      date: getRelativeDate(-1),
      time: "09:30:00",
    },
    {
      id: 2,
      wa_id: "966501234567",
      role: "assistant",
      message: "وعليكم السلام ورحمة الله، بالتأكيد. ما هو التاريخ المفضل لك؟",
      date: getRelativeDate(-1),
      time: "09:30:15",
    },
    {
      id: 3,
      wa_id: "966501234567",
      role: "user",
      message: "غداً في الصباح الساعة 10",
      date: getRelativeDate(-1),
      time: "09:31:00",
    },
    {
      id: 4,
      wa_id: "966501234567",
      role: "assistant",
      message: "تم حجز موعدك بنجاح غداً الساعة 10:00 صباحاً",
      date: getRelativeDate(-1),
      time: "09:31:10",
    },
  ],
  "966507654321": [
    {
      id: 5,
      wa_id: "966507654321",
      role: "user",
      message: "Hello, I need to book an appointment",
      date: getRelativeDate(-2),
      time: "14:00:00",
    },
    {
      id: 6,
      wa_id: "966507654321",
      role: "assistant",
      message: "Of course! When would you like to come in?",
      date: getRelativeDate(-2),
      time: "14:00:10",
    },
    {
      id: 7,
      wa_id: "966507654321",
      role: "user",
      message: "Tomorrow at 2 PM",
      date: getRelativeDate(-2),
      time: "14:01:00",
    },
    {
      id: 8,
      wa_id: "966507654321",
      role: "assistant",
      message: "Perfect! Your appointment is confirmed for tomorrow at 2:00 PM",
      date: getRelativeDate(-2),
      time: "14:01:05",
    },
  ],
  "966509876543": [
    {
      id: 9,
      wa_id: "966509876543",
      role: "user",
      message: "أريد تغيير موعدي",
      date: getRelativeDate(-3),
      time: "16:45:00",
    },
    {
      id: 10,
      wa_id: "966509876543",
      role: "assistant",
      message: "بالتأكيد، ما هو الموعد الجديد المفضل؟",
      date: getRelativeDate(-3),
      time: "16:45:05",
    },
  ],
};

export const INITIAL_MOCK_VACATION_PERIODS: MockVacationPeriod[] = [
  {
    id: 1,
    start_date: "2025-03-15",
    end_date: "2025-03-20",
    title: "Spring Break",
    duration_days: 6,
  },
];

// LocalStorage keys
export const STORAGE_KEYS = {
  CUSTOMERS: "mock_customers",
  RESERVATIONS: "mock_reservations",
  CONVERSATIONS: "mock_conversations",
  VACATION_PERIODS: "mock_vacation_periods",
  NOTIFICATIONS: "mock_notifications",
} as const;

// Helper functions for localStorage (only run on client side)
const isClient = typeof window !== "undefined";

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  if (!isClient) return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export const saveToStorage = <T>(key: string, value: T): void => {
  if (!isClient) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

// Data access functions
export const getMockCustomers = (): MockCustomer[] => {
  return loadFromStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_MOCK_CUSTOMERS);
};

export const saveMockCustomers = (customers: MockCustomer[]): void => {
  saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
};

export const getMockReservations = (): MockReservation[] => {
  return loadFromStorage(STORAGE_KEYS.RESERVATIONS, getInitialMockReservations());
};

export const saveMockReservations = (reservations: MockReservation[]): void => {
  saveToStorage(STORAGE_KEYS.RESERVATIONS, reservations);
};

export const getMockConversations = (): Record<string, MockConversation[]> => {
  return loadFromStorage(STORAGE_KEYS.CONVERSATIONS, INITIAL_MOCK_CONVERSATIONS);
};

export const saveMockConversations = (conversations: Record<string, MockConversation[]>): void => {
  saveToStorage(STORAGE_KEYS.CONVERSATIONS, conversations);
};

export const getMockVacationPeriods = (): MockVacationPeriod[] => {
  return loadFromStorage(STORAGE_KEYS.VACATION_PERIODS, INITIAL_MOCK_VACATION_PERIODS);
};

export const saveMockVacationPeriods = (periods: MockVacationPeriod[]): void => {
  saveToStorage(STORAGE_KEYS.VACATION_PERIODS, periods);
};

// Utility functions
export const getCustomerByWaId = (waId: string): MockCustomer | null => {
  const customers = getMockCustomers();
  return customers.find((c) => c.wa_id === waId) || null;
};

export const getReservationsForCustomer = (waId: string): MockReservation[] => {
  const reservations = getMockReservations();
  return reservations.filter((r) => r.wa_id === waId);
};

export const getConversationForCustomer = (waId: string): MockConversation[] => {
  const conversations = getMockConversations();
  return conversations[waId] || [];
};

export const getNextId = (items: { id: number }[]): number => {
  return items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
};

// Reset to initial data
export const resetAllMockData = (): void => {
  if (!isClient) return;
  localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
  localStorage.removeItem(STORAGE_KEYS.RESERVATIONS);
  localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
  localStorage.removeItem(STORAGE_KEYS.VACATION_PERIODS);
  localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
};
