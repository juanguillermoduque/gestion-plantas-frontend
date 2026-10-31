export interface User { id: string; name: string; email: string; role: 'admin' | 'operator'; active?: boolean }
export interface ComponentCost { name: string; quantity: number; unitCost: number }
export interface Tier { minQty: number; price: number }
export interface Product { id: string; name: string; plantsPerUnit: number; unitCost: number; basePrice: number; minutes: number; tiers: Tier[]; components: ComponentCost[]; active: boolean }
export interface Settings { businessName: string; hourlyRate: number; monthlyFixedCosts: number; currency: string; timezone: string }
export interface Stock { unclassified: number; growing: number; mother: number; ready: number; reserved: number; available: number; total: number }
export interface Movement { id: string; type: string; from?: string; to?: string; quantity: number; note: string; createdAt: string; userName: string }
export interface QuoteItem { productId: string; productName?: string; quantity: number; unitPrice: number; unitCost?: number; plantsPerUnit?: number; minutes?: number }
export interface Quote { items: QuoteItem[]; subtotal: number; total: number; materials: number; labor: number; deliveryCost: number; deliveryCharged: number; adCost: number; otherCost: number; discount: number; costTotal: number; contribution: number; contributionMargin: number; plantsNeeded: number; assemblyMinutes: number }
export interface Payment { amount: number; date: string; note: string }
export interface Order { id: string; code: string; customerName: string; phone: string; location: string; dueDate: string; source: string; status: 'quote' | 'confirmed' | 'delivered' | 'cancelled'; notes: string; items: QuoteItem[]; totals: Quote; paid: number; balance: number; payments: Payment[]; createdAt: string; deliveredAt?: string }
export interface Expense { id: string; date: string; category: string; amount: number; note: string }
export interface Summary { month: string; deliveredRevenue: number; contribution: number; generalExpenses: number; operatingResult: number; outstanding: number; plantsReserved: number }
export interface AppState { user: User; settings: Settings; products: Product[]; stock: Stock; movements: Movement[]; orders: Order[]; expenses: Expense[]; users: User[]; summary: Summary }
export interface QuoteDraft { items: QuoteItem[]; deliveryCost: number; deliveryCharged: number; adCost: number; otherCost: number; discount: number; hourlyRate: number }
