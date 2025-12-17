// Dummy data for component previews and testing

export interface DummyUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly avatar?: string;
}

export interface DummyProduct {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly category: string;
  readonly stock: number;
  readonly status: "active" | "inactive";
}

export interface DummyOrder {
  readonly id: string;
  readonly customer: string;
  readonly product: string;
  readonly quantity: number;
  readonly total: number;
  readonly date: string;
  readonly status: "pending" | "completed" | "cancelled";
}

export const dummyUsers: readonly DummyUser[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@example.com",
    role: "Admin",
    avatar: "https://github.com/shadcn.png",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    role: "User",
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob.johnson@example.com",
    role: "Manager",
  },
  {
    id: "4",
    name: "Alice Williams",
    email: "alice.williams@example.com",
    role: "User",
  },
  {
    id: "5",
    name: "Charlie Brown",
    email: "charlie.brown@example.com",
    role: "Admin",
  },
] as const;

export const dummyProducts: readonly DummyProduct[] = [
  {
    id: "1",
    name: "Laptop Pro",
    price: 1299.99,
    category: "Electronics",
    stock: 45,
    status: "active",
  },
  {
    id: "2",
    name: "Wireless Mouse",
    price: 29.99,
    category: "Accessories",
    stock: 120,
    status: "active",
  },
  {
    id: "3",
    name: "Mechanical Keyboard",
    price: 89.99,
    category: "Accessories",
    stock: 0,
    status: "inactive",
  },
  {
    id: "4",
    name: 'Monitor 27"',
    price: 399.99,
    category: "Electronics",
    stock: 25,
    status: "active",
  },
  {
    id: "5",
    name: "USB-C Cable",
    price: 12.99,
    category: "Accessories",
    stock: 200,
    status: "active",
  },
] as const;

export const dummyOrders: readonly DummyOrder[] = [
  {
    id: "ORD-001",
    customer: "John Doe",
    product: "Laptop Pro",
    quantity: 1,
    total: 1299.99,
    date: "2024-01-15",
    status: "completed",
  },
  {
    id: "ORD-002",
    customer: "Jane Smith",
    product: "Wireless Mouse",
    quantity: 2,
    total: 59.98,
    date: "2024-01-16",
    status: "pending",
  },
  {
    id: "ORD-003",
    customer: "Bob Johnson",
    product: 'Monitor 27"',
    quantity: 1,
    total: 399.99,
    date: "2024-01-17",
    status: "completed",
  },
  {
    id: "ORD-004",
    customer: "Alice Williams",
    product: "Mechanical Keyboard",
    quantity: 1,
    total: 89.99,
    date: "2024-01-18",
    status: "cancelled",
  },
  {
    id: "ORD-005",
    customer: "Charlie Brown",
    product: "USB-C Cable",
    quantity: 5,
    total: 64.95,
    date: "2024-01-19",
    status: "pending",
  },
] as const;

export const dummyChartData = [
  { name: "Jan", value: 400 },
  { name: "Feb", value: 300 },
  { name: "Mar", value: 200 },
  { name: "Apr", value: 278 },
  { name: "May", value: 189 },
  { name: "Jun", value: 239 },
] as const;
