import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AppState, BusinessLocation, ComponentCost, Order, Product, Quote, QuoteDraft, Settings, StockBucket, Tier, User } from './models';
import { Store, errorMessage } from './store';

@Component({ selector: 'app-workspace', standalone: true, imports: [CommonModule, FormsModule, RouterLink], templateUrl: './workspace.html' })
export class Workspace {
  readonly store = inject(Store);
  private route = inject(ActivatedRoute);
  private title = inject(Title);
  private destroyRef = inject(DestroyRef);
  readonly state = this.store.state;
  readonly view: string = this.route.snapshot.data['view'] || 'resumen';
  readonly admin = computed(() => this.state()?.user.role === 'admin');
  readonly busy = signal(false);
  readonly pageError = signal('');
  readonly menuOpen = signal(false);
  readonly locationBusy = this.store.locationChanging;
  readonly locationSelection = signal(0);
  readonly selectedLocation = computed(() => this.state()?.locations.find(location => location.id === this.state()?.locationId));
  readonly locationActive = computed(() => this.selectedLocation()?.active !== false);
  readonly timezoneOptions = ['UTC', 'America/Mexico_City', 'America/Bogota', 'America/New_York', 'America/Argentina/Buenos_Aires', 'Europe/Madrid', 'Europe/London', 'Asia/Tokyo'];
  readonly quote = signal<Quote | null>(null);
  readonly quoteError = signal('');
  readonly calculating = signal(false);
  readonly modalType = signal('');
  readonly modalError = signal('');
  readonly selectedOrder = signal<Order | null>(null);
  readonly printMode = signal<'internal' | 'customer'>('internal');
  readonly paperQuote = signal<{ totals: Quote; customerName: string; location: string; dueDate: string; code: string; paid: number | null } | null>(null);
  readonly today = computed(() => new Intl.DateTimeFormat(this.locale, { dateStyle: 'long', timeZone: this.timezone }).format(new Date()));
  readonly nav = [
    { id: 'resumen', name: 'Resumen', icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z' },
    { id: 'cotizador', name: 'Cotizador', icon: 'M6 3h12v18H6z M9 7h6 M9 11h1 M14 11h1 M9 15h1 M14 15h1 M9 18h1 M14 18h1' },
    { id: 'inventario', name: 'Inventario', icon: 'M3 7h18v14H3z M1 3h22v4H1z M9 11h6' },
    { id: 'pedidos', name: 'Pedidos', icon: 'M5 6h14v15H5z M9 6V3h6v3 M9 11h6 M9 15h6' },
    { id: 'productos', name: 'Productos', icon: 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 5 9-5 M12 12v9' },
    { id: 'ajustes', name: 'Ajustes', icon: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6' }
  ];
  readonly buckets = computed(() => (['unclassified', 'growing', 'mother', 'ready'] as StockBucket[]).map(id => ({ id, name: this.state()?.settings.bucketLabels[id] || this.defaultSettings().bucketLabels[id] })));
  loginEmail = '';
  loginPassword = '';
  loginError = '';
  orderSearch = '';
  orderFilter = '';
  draft: QuoteDraft = { items: [], deliveryCost: 0, deliveryCharged: 0, adCost: 0, otherCost: 0, discount: 0, hourlyRate: 0 };
  inventoryForm = { type: 'transfer', from: 'unclassified', to: 'ready', quantity: 1, note: '' };
  orderForm = { customerName: '', phone: '', location: '', dueDate: this.localDate(), source: 'Directo', notes: '', status: 'quote', paid: 0 };
  paymentForm = { amount: 0, date: this.localDate(), note: '' };
  expenseForm = { date: this.localDate(), category: 'General', amount: 0, note: '' };
  settingsForm: Settings = this.defaultSettings();
  locationForm = { name: '', city: '', country: '', address: '', phone: '', active: true };
  editingLocationId: number | null = null;
  userForm = { name: '', email: '', password: '', role: 'operator' };
  productForm: { id: string; name: string; stockUnitsPerUnit: number; basePrice: number; minutes: number; active: boolean; components: ComponentCost[]; tiers: Tier[] } = this.blankProduct();
  editingProductId = '';
  private quoteSequence = 0;
  private quoteTimer?: ReturnType<typeof setTimeout>;
  private preparedContext = '';
  private isDestroyed = false;
  @ViewChild('modal') modal?: ElementRef<HTMLDialogElement>;

  constructor() {
    effect(() => { if (!this.state() && !this.store.loading()) this.clearPrivateForms(); });
    effect(() => { const selected = this.store.pendingLocationId() ?? this.state()?.locationId; if (selected) this.locationSelection.set(selected); });
    effect(() => {
      const state = this.state();
      if (!state || this.locationBusy()) return;
      const context = `${state.user.id}:${state.locationId}`;
      if (context !== this.preparedContext) { this.preparedContext = context; this.prepareForms(); }
    });
    effect(() => { this.title.setTitle(`${this.state()?.settings.businessName || 'Mi negocio'} · Gestión`); });
    this.destroyRef.onDestroy(() => { this.isDestroyed = true; this.quoteSequence++; clearTimeout(this.quoteTimer); });
    void this.initialize();
  }
  clearPrivateForms(): void {
    this.close();
    this.preparedContext = '';
    clearTimeout(this.quoteTimer);
    this.quoteSequence++;
    this.quote.set(null);
    this.quoteError.set('');
    this.selectedOrder.set(null);
    this.paperQuote.set(null); this.printMode.set('internal');
    this.draft = { items: [], deliveryCost: 0, deliveryCharged: 0, adCost: 0, otherCost: 0, discount: 0, hourlyRate: 0 };
    this.orderForm = { customerName: '', phone: '', location: '', dueDate: this.localDate(), source: 'Directo', notes: '', status: 'quote', paid: 0 };
    this.paymentForm = { amount: 0, date: this.localDate(), note: '' };
    this.loginEmail = ''; this.loginPassword = ''; this.resetPassword = ''; this.resetUser = null;
    this.userForm = { name: '', email: '', password: '', role: 'operator' };
    this.productForm = this.blankProduct();
    this.orderSearch = ''; this.orderFilter = '';
    this.locationSelection.set(0);
    this.locationForm = { name: '', city: '', country: '', address: '', phone: '', active: true };
    this.editingLocationId = null;
  }
  async initialize(): Promise<void> {
    await this.store.initialize();
  }
  prepareForms(): void {
    const state = this.state();
    if (!state || this.locationBusy() || this.isDestroyed) return;
    this.settingsForm = { ...state.settings, bucketLabels: { ...state.settings.bucketLabels } };
    this.draft.hourlyRate = state.settings.hourlyRate;
    this.draft.items = state.products.filter(product => product.active).map((product, index) => ({ productId: product.id, productName: product.name, quantity: index === 0 ? 1 : 0, unitPrice: this.tierPrice(product, 1) }));
    if (this.view === 'cotizador' && this.draft.items.length) void this.calculate();
  }
  defaultSettings(): Settings { return { businessName: 'Mi negocio', businessType: '', city: '', country: '', deliveryCoverage: '', inventoryUnit: 'Unidades', inventoryUnitSingular: 'Unidad', bucketLabels: { unclassified: 'Sin clasificar', growing: 'En preparación', mother: 'Reserva interna', ready: 'Disponible' }, currency: 'USD', locale: 'es', timezone: 'UTC', hourlyRate: 0, monthlyFixedCosts: 0, moneyPrecision: 0 }; }
  get locale(): string { return this.state()?.settings.locale || 'es'; }
  get currency(): string { return this.state()?.settings.currency || 'USD'; }
  get timezone(): string { return this.state()?.settings.timezone || 'UTC'; }
  unitName(quantity = 2): string { return quantity === 1 ? (this.state()?.settings.inventoryUnitSingular || 'Unidad') : (this.state()?.settings.inventoryUnit || 'Unidades'); }
  quoteUnitName(quote: Quote, quantity = 2): string { return quantity === 1 ? (quote.inventoryUnitSingular || this.unitName(1)) : (quote.inventoryUnit || this.unitName()); }
  money(value: number | undefined | null): string { return new Intl.NumberFormat(this.locale, { style: 'currency', currency: this.currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value || 0)); }
  percent(value: number): string { return new Intl.NumberFormat(this.locale, { style: 'percent', maximumFractionDigits: 1 }).format(value || 0); }
  date(value: string | undefined): string {
    if (!value) return 'Sin fecha';
    const dateOnly = value.length === 10;
    const parsed = new Date(dateOnly ? value + 'T12:00:00Z' : value);
    return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat(this.locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: dateOnly ? 'UTC' : this.timezone }).format(parsed);
  }
  localDate(): string { return new Intl.DateTimeFormat('en-CA', { timeZone: this.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  minutes(value: number): string { const n = Math.round(value); return n >= 60 ? `${Math.floor(n / 60)} h${n % 60 ? ` ${n % 60} min` : ''}` : `${n} min`; }
  statusName(status: string): string { return ({ quote: 'Cotización', confirmed: 'Confirmado', delivered: 'Entregado', cancelled: 'Cancelado' } as Record<string, string>)[status] || status; }
  statusClass(status: string): string { return ({ quote: 'pending', confirmed: 'blue', delivered: '', cancelled: 'neutral' } as Record<string, string>)[status] || ''; }
  bucketName(bucket: string | undefined): string { return this.buckets().find(item => item.id === bucket)?.name || '—'; }
  movementName(type: string): string { return ({ transfer: 'Clasificación', add: 'Entrada', loss: 'Baja', reserve: 'Reserva', release: 'Liberación', delivery: 'Entrega', initial: 'Inventario inicial' } as Record<string, string>)[type] || type; }
  product(id: string): Product | undefined { return this.state()?.products.find(product => product.id === id); }
  tierPrice(product: Product, quantity: number): number { return [...product.tiers].sort((a, b) => b.minQty - a.minQty).find(tier => quantity >= tier.minQty)?.price ?? product.basePrice; }
  activeOrders(): Order[] { return (this.state()?.orders || []).filter(order => order.status === 'confirmed').sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5); }
  filteredOrders(): Order[] {
    const query = this.orderSearch.toLowerCase().trim();
    return (this.state()?.orders || []).filter(order => (!this.orderFilter || order.status === this.orderFilter) && (!query || `${order.code} ${order.customerName} ${order.location}`.toLowerCase().includes(query)));
  }
  componentTotal(): number { return this.productForm.components.reduce((sum, component) => sum + Number(component.quantity || 0) * Number(component.unitCost || 0), 0); }
  async login(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.loginError = '';
    try { await this.store.login(this.loginEmail.trim(), this.loginPassword); this.loginPassword = ''; }
    catch (error) { this.loginError = errorMessage(error); }
    finally { this.busy.set(false); }
  }
  async logout(): Promise<void> {
    try { await this.store.logout(); this.quote.set(null); }
    catch (error) { this.pageError.set(errorMessage(error)); }
  }
  async refresh(): Promise<void> {
    try { await this.store.reload(); this.store.toast('Información actualizada.'); }
    catch (error) { this.pageError.set(errorMessage(error)); }
  }
  async changeLocation(value: number): Promise<void> {
    const id = Number(value);
    if (!id || id === this.state()?.locationId || this.locationBusy() || this.busy()) return;
    this.locationSelection.set(id); this.pageError.set(''); this.preparedContext = '';
    this.close(); this.selectedOrder.set(null); this.paperQuote.set(null); this.printMode.set('internal');
    clearTimeout(this.quoteTimer); this.quoteSequence++; this.quote.set(null); this.quoteError.set('');
    this.orderSearch = ''; this.orderFilter = '';
    this.inventoryForm = { type: 'transfer', from: 'unclassified', to: 'ready', quantity: 1, note: '' };
    this.expenseForm = { date: this.localDate(), category: 'General', amount: 0, note: '' };
    this.paymentForm = { amount: 0, date: this.localDate(), note: '' };
    this.orderForm = { customerName: '', phone: '', location: '', dueDate: this.localDate(), source: 'Directo', notes: '', status: 'quote', paid: 0 };
    this.draft = { items: [], deliveryCost: 0, deliveryCharged: 0, adCost: 0, otherCost: 0, discount: 0, hourlyRate: this.state()?.settings.hourlyRate || 0 };
    const changed = await this.store.changeLocation(id);
    if (changed && !this.isDestroyed) this.store.toast('Sede actualizada.');
  }
  quantityChanged(index: number): void {
    const item = this.draft.items[index], product = this.product(item.productId);
    if (product) item.unitPrice = this.tierPrice(product, Number(item.quantity));
    this.scheduleQuote();
  }
  scheduleQuote(): void { clearTimeout(this.quoteTimer); this.quoteSequence++; this.calculating.set(true); this.quoteTimer = setTimeout(() => void this.calculate(), 220); }
  quotePayload(): QuoteDraft { return { ...this.draft, items: this.draft.items.filter(item => Number(item.quantity) > 0).map(item => ({ productId: item.productId, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })) }; }
  async calculate(): Promise<void> {
    const sequence = ++this.quoteSequence;
    this.calculating.set(true); this.quoteError.set('');
    try {
      if (this.draft.items.some(item => !Number.isInteger(item.quantity) || item.quantity < 0)) throw new Error('Las cantidades deben ser números enteros iguales o mayores que cero.');
      if (this.draft.items.some(item => item.quantity > 0 && (!Number.isInteger(item.unitPrice) || item.unitPrice < 1))) throw new Error('El precio de cada producto debe ser un número entero mayor que cero.');
      const amounts = [this.draft.deliveryCost, this.draft.deliveryCharged, this.draft.adCost, this.draft.otherCost, this.draft.discount, this.draft.hourlyRate, ...this.draft.items.filter(item => item.quantity > 0).map(item => item.unitPrice)];
      if (amounts.some(amount => !Number.isInteger(amount) || amount < 0)) throw new Error('Ingresa todos los montos en valores enteros iguales o mayores que cero, sin centavos.');
      const payload = this.quotePayload();
      if (!payload.items.length) { this.quote.set(null); this.quoteError.set('Agrega al menos un producto para calcular el pedido.'); return; }
      const response = await this.store.post<{ quote: Quote }>('/api/quote', payload);
      if (sequence === this.quoteSequence) this.quote.set(response.quote);
    } catch (error) { if (sequence === this.quoteSequence) { this.quote.set(null); this.quoteError.set(errorMessage(error)); } }
    finally { if (sequence === this.quoteSequence) this.calculating.set(false); }
  }
  open(type: string): void { this.modalError.set(''); this.modalType.set(type); this.modal?.nativeElement.showModal(); }
  close(): void { this.modal?.nativeElement.close(); this.modalType.set(''); this.modalError.set(''); }
  openOrder(): void {
    if (!this.quote() || this.calculating()) return;
    this.orderForm = { customerName: '', phone: '', location: '', dueDate: this.localDate(), source: 'Directo', notes: '', status: 'quote', paid: 0 };
    this.open('order');
  }
  inspectOrder(order: Order): void { this.selectedOrder.set(order); this.paymentForm = { amount: 0, date: this.localDate(), note: '' }; this.open('order-detail'); }
  async saveOrder(): Promise<void> {
    await this.mutate(async () => { await this.store.post('/api/orders', { ...this.quotePayload(), ...this.orderForm, locationId: this.state()?.locationId }); }, 'Pedido guardado.');
  }
  async changeStatus(status: string): Promise<void> {
    const order = this.selectedOrder(); if (!order) return;
    await this.mutate(async () => { await this.store.patch(`/api/orders/${encodeURIComponent(order.id)}`, { status }); }, `Pedido ${this.statusName(status).toLowerCase()}.`);
  }
  async savePayment(): Promise<void> {
    const order = this.selectedOrder(); if (!order) return;
    if (!Number(this.paymentForm.amount)) { this.modalError.set('Ingresa un pago positivo o un valor negativo para registrar una devolución.'); return; }
    await this.mutate(async () => { await this.store.post(`/api/orders/${encodeURIComponent(order.id)}/payments`, this.paymentForm); }, 'Movimiento de pago registrado.');
  }
  async saveInventory(): Promise<void> {
    await this.mutate(async () => { await this.store.post('/api/inventory', { ...this.inventoryForm, locationId: this.state()?.locationId }); this.inventoryForm.quantity = 1; this.inventoryForm.note = ''; }, 'Inventario actualizado.', false);
  }
  async saveSettings(): Promise<void> {
    const { moneyPrecision: _precision, currencyLocked: _locked, ...settings } = this.settingsForm;
    await this.mutate(async () => { await this.store.put('/api/settings', settings); }, 'Configuración guardada.', false);
    if (!this.pageError() && this.state()) this.settingsForm = { ...this.state()!.settings, bucketLabels: { ...this.state()!.settings.bucketLabels } };
  }
  openLocation(location?: BusinessLocation): void {
    this.editingLocationId = location?.id || null;
    this.locationForm = location ? { name: location.name, city: location.city || '', country: location.country || '', address: location.address || '', phone: location.phone || '', active: location.active } : { name: '', city: '', country: '', address: '', phone: '', active: true };
    this.open('location');
  }
  async saveLocation(): Promise<void> {
    await this.mutate(async () => {
      if (this.editingLocationId) await this.store.put(`/api/locations/${this.editingLocationId}`, this.locationForm);
      else await this.store.post('/api/locations', this.locationForm);
    }, 'Sede guardada.');
  }
  openExpense(): void { this.expenseForm = { date: this.localDate(), category: 'General', amount: 0, note: '' }; this.open('expense'); }
  async saveExpense(): Promise<void> { await this.mutate(async () => { await this.store.post('/api/expenses', { ...this.expenseForm, locationId: this.state()?.locationId }); }, 'Gasto registrado.'); }
  async removeExpense(id: string): Promise<void> {
    if (!window.confirm('¿Eliminar este gasto? El resultado del mes se recalculará.')) return;
    await this.mutate(async () => { await this.store.delete(`/api/expenses/${encodeURIComponent(id)}`); }, 'Gasto eliminado.', false);
  }
  openUser(): void { this.userForm = { name: '', email: '', password: '', role: 'operator' }; this.open('user'); }
  async saveUser(): Promise<void> { await this.mutate(async () => { await this.store.post('/api/users', this.userForm); }, 'Acceso creado.'); }
  async toggleUser(user: User): Promise<void> {
    await this.mutate(async () => { await this.store.patch(`/api/users/${encodeURIComponent(user.id)}`, { active: user.active === false }); }, 'Acceso actualizado.', false);
  }
  resetUser: User | null = null;
  resetPassword = '';
  openPassword(user: User): void { this.resetUser = user; this.resetPassword = ''; this.open('password'); }
  async savePassword(): Promise<void> {
    if (!this.resetUser) return;
    await this.mutate(async () => { await this.store.patch(`/api/users/${encodeURIComponent(this.resetUser!.id)}`, { password: this.resetPassword }); this.resetPassword = ''; }, 'Contraseña actualizada.');
  }
  blankProduct() { return { id: '', name: '', stockUnitsPerUnit: 1, basePrice: 0, minutes: 0, active: true, components: [{ name: 'Componente', quantity: 1, unitCost: 0 }] as ComponentCost[], tiers: [] as Tier[] }; }
  openProduct(product?: Product): void {
    this.editingProductId = product?.id || '';
    this.productForm = product ? { id: product.id, name: product.name, stockUnitsPerUnit: product.stockUnitsPerUnit, basePrice: product.basePrice, minutes: product.minutes, active: product.active, components: product.components.map(item => ({ ...item })), tiers: product.tiers.filter(tier => tier.minQty > 1).map(tier => ({ ...tier })) } : this.blankProduct();
    this.open('product');
  }
  addComponent(): void { this.productForm.components.push({ name: '', quantity: 1, unitCost: 0 }); }
  removeComponent(index: number): void { this.productForm.components.splice(index, 1); }
  addTier(): void { this.productForm.tiers.push({ minQty: 2, price: 0 }); }
  removeTier(index: number): void { this.productForm.tiers.splice(index, 1); }
  async saveProduct(): Promise<void> {
    const payload = { ...this.productForm, tiers: [{ minQty: 1, price: Number(this.productForm.basePrice) }, ...this.productForm.tiers] };
    await this.mutate(async () => { if (this.editingProductId) await this.store.put(`/api/products/${encodeURIComponent(this.editingProductId)}`, payload); else await this.store.post('/api/products', payload); }, 'Producto guardado.');
  }
  async mutate(action: () => Promise<void>, message: string, close = true): Promise<void> {
    if (this.busy() || this.locationBusy()) return;
    this.busy.set(true); this.modalError.set(''); this.pageError.set('');
    try {
      await action(); await this.store.reload();
      if (close) this.close();
      this.store.toast(message);
    } catch (error) { if (!this.state()) this.close(); else if (this.modalType()) this.modalError.set(errorMessage(error)); else this.pageError.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }
  print(): void { window.print(); }
  printCustomer(order?: Order): void {
    const totals = order?.totals || this.quote();
    if (!totals || this.calculating()) return;
    this.paperQuote.set({ totals, customerName: order?.customerName || 'Por confirmar', location: order?.location || 'Por confirmar', dueDate: order?.dueDate || '', code: order?.code || 'Cotización preliminar', paid: order ? order.paid : null });
    this.printMode.set('customer');
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }
  @HostListener('window:afterprint') afterPrint(): void { this.printMode.set('internal'); this.paperQuote.set(null); }
  breakEven(quote: Quote): string { const fixed = Number(this.state()?.settings.monthlyFixedCosts || 0); return fixed <= 0 ? 'Configura tus gastos fijos' : quote.contribution > 0 ? `${Math.ceil(fixed / quote.contribution)} pedidos similares / mes` : 'Este pedido no cubre gastos fijos'; }
  initials(user: User): string { return (user.name || user.email).split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase(); }
  ringStyle(stock: AppState['stock']): string {
    const total = stock.total || 1, ready = stock.ready / total * 360, growing = ready + stock.growing / total * 360, mother = growing + stock.mother / total * 360;
    return `--ready-angle:${ready}deg;--growing-angle:${growing}deg;--mother-angle:${mother}deg`;
  }
}
