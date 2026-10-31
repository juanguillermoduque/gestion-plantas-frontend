export interface User { id: string; name: string; email: string; role: 'admin' | 'operator'; active?: boolean }
export interface ComponentCost { name: string; quantity: number; unitCost: number }
export interface Tier { minQty: number; price: number }
export type StockBucket = 'unclassified' | 'growing' | 'mother' | 'ready';
export interface BusinessLocation { id: number; name: string; city: string; country: string; address: string; phone: string; active: boolean }
export interface Product { id: string; name: string; stockUnitsPerUnit: number; unitCost: number; basePrice: number; minutes: number; tiers: Tier[]; components: ComponentCost[]; active: boolean }
export interface Settings { businessName: string; businessType: string; city: string; country: string; deliveryCoverage: string; inventoryUnit: string; inventoryUnitSingular: string; bucketLabels: Record<StockBucket, string>; hourlyRate: number; monthlyFixedCosts: number; currency: string; locale: string; timezone: string; moneyPrecision: number; currencyLocked?: boolean }
export interface Stock { unclassified: number; growing: number; mother: number; ready: number; reserved: number; available: number; total: number }
export interface Movement { id: string; locationId: number; type: string; from?: string; to?: string; quantity: number; note: string; createdAt: string; userName: string }
export interface QuoteItem { productId: string; productName?: string; quantity: number; unitPrice: number; unitCost?: number; stockUnitsPerUnit?: number; minutes?: number }
export interface Quote { items: QuoteItem[]; subtotal: number; total: number; materials: number; labor: number; deliveryCost: number; deliveryCharged: number; adCost: number; otherCost: number; discount: number; costTotal: number; contribution: number; contributionMargin: number; stockUnitsNeeded: number; assemblyMinutes: number; currency?: string; inventoryUnit?: string; inventoryUnitSingular?: string }
export interface Payment { amount: number; date: string; note: string }
export interface Order { id: string; locationId: number; code: string; customerName: string; phone: string; location: string; dueDate: string; source: string; status: 'quote' | 'confirmed' | 'delivered' | 'cancelled'; notes: string; items: QuoteItem[]; totals: Quote; paid: number; balance: number; payments: Payment[]; createdAt: string; deliveredAt?: string }
export interface Expense { id: string; locationId: number; date: string; category: string; amount: number; note: string }
export interface Summary { month: string; deliveredRevenue: number; contribution: number; generalExpenses: number; operatingResult: number; outstanding: number; stockUnitsReserved: number }
export interface AppState { user: User; settings: Settings; locationId: number; locations: BusinessLocation[]; products: Product[]; stock: Stock; movements: Movement[]; orders: Order[]; expenses: Expense[]; users: User[]; summary: Summary }
export interface QuoteDraft { items: QuoteItem[]; deliveryCost: number; deliveryCharged: number; adCost: number; otherCost: number; discount: number; hourlyRate: number }
