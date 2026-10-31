import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild, signal } from '@angular/core';
import { Analytics, MonthlyTrend } from './models';

@Component({ selector: 'app-financial-charts', standalone: true, templateUrl: './financial-charts.html', styleUrl: './financial-charts.scss' })
export class FinancialCharts implements AfterViewInit, OnDestroy {
  @Input({ required: true }) data!: Analytics;
  @Input() locale = 'es';
  @ViewChild('trendSize') trendContainer?: ElementRef<HTMLElement>;
  readonly width = signal(720);
  readonly height = 270;
  private observer?: ResizeObserver;
  readonly colors = ['#315b48', '#b66b4a', '#b6a160', '#617d91', '#8b7296', '#8a9274', '#b58a7b'];
  ngAfterViewInit(): void {
    if (this.trendContainer) {
      this.observer = new ResizeObserver(entries => this.width.set(Math.max(260, Math.round(entries[0].contentRect.width))));
      this.observer.observe(this.trendContainer.nativeElement);
    }
  }
  ngOnDestroy(): void { this.observer?.disconnect(); }
  money(value: number): string { return new Intl.NumberFormat(this.locale, { style: 'currency', currency: this.data.currency, maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(value || 0); }
  quantity(value: number): string { return new Intl.NumberFormat(this.locale, { maximumFractionDigits: 3 }).format(value || 0); }
  compact(value: number): string { return new Intl.NumberFormat(this.locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value); }
  month(value: string): string { return new Intl.DateTimeFormat(this.locale, { month: 'short', timeZone: 'UTC' }).format(new Date(value + '-15T12:00:00Z')); }
  fullMonth(value: string): string { return new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + '-15T12:00:00Z')); }
  get trendHasValues(): boolean { return this.data.monthlyTrend.some(row => row.revenue !== 0 || row.operatingResult !== 0 || row.generalExpenses !== 0); }
  get domain(): { min: number; max: number } {
    const values = this.data.monthlyTrend.flatMap(row => [row.revenue, row.operatingResult]);
    const min = Math.min(0, ...values), max = Math.max(0, ...values), padding = (max - min || 1) * .12;
    return { min: min < 0 ? min - padding : 0, max: max + padding };
  }
  x(index: number): number { return 63 + index / Math.max(1, this.data.monthlyTrend.length - 1) * (this.width() - 84); }
  y(value: number): number { const domain = this.domain; return 17 + (domain.max - value) / (domain.max - domain.min) * (this.height - 53); }
  get ticks(): number[] { const { min, max } = this.domain; return [min, min + (max - min) / 3, min + (max - min) * 2 / 3, max]; }
  path(key: 'revenue' | 'operatingResult'): string { return this.data.monthlyTrend.map((row, index) => `${index ? 'L' : 'M'}${this.x(index)},${this.y(row[key])}`).join(' '); }
  trackTitle(row: MonthlyTrend): string { return `${this.fullMonth(row.month)}: ventas ${this.money(row.revenue)}, resultado operativo ${this.money(row.operatingResult)}.`; }
  get products(): Analytics['topProducts'] { return this.data.topProducts.slice(0, 8); }
  get productScale(): { min: number; max: number } { return { min: Math.min(0, ...this.products.map(row => row.directContribution)), max: Math.max(1, ...this.products.map(row => row.revenue), ...this.products.map(row => row.directContribution)) }; }
  barLeft(value: number): number { const { min, max } = this.productScale; return (Math.min(0, value) - min) / (max - min) * 100; }
  barWidth(value: number): number { const { min, max } = this.productScale; return Math.abs(value) / (max - min) * 100; }
  get zeroOffset(): number { const { min, max } = this.productScale; return -min / (max - min) * 100; }
  get costTotal(): number { return this.data.costBreakdown.reduce((sum, item) => sum + item.value, 0); }
  get costParts(): { key: string; name: string; value: number; share: number; offset: number; color: string }[] {
    let offset = 0;
    return this.data.costBreakdown.filter(item => item.value > 0).map((item, index) => {
      const share = item.value / (this.costTotal || 1), result = { ...item, share, offset, color: this.colors[index % this.colors.length] };
      offset += share; return result;
    });
  }
  share(value: number): string { return new Intl.NumberFormat(this.locale, { style: 'percent', maximumFractionDigits: 1 }).format(value); }
  get expenseMax(): number { return Math.max(1, ...this.data.expenseCategories.map(item => item.amount)); }
  get valuationMax(): number { return Math.max(1, ...this.data.inventoryValuation.map(item => item.estimatedValue)); }
  get valuationRows(): Analytics['inventoryValuation'] { return [...this.data.inventoryValuation].sort((a, b) => b.estimatedValue - a.estimatedValue).slice(0, 8); }
  get inventoryTotal(): number { return this.data.inventoryValuation.reduce((sum, item) => sum + item.estimatedValue, 0); }
}
