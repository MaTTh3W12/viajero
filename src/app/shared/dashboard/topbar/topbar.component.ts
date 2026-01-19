import { Component, Input } from '@angular/core';

type TopbarVariant =
  | 'dashboard'
  | 'coupons'
  | 'messages'
  | 'companies';

@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
})
export class TopbarComponent {
  @Input() variant: TopbarVariant = 'dashboard';
  @Input() userName = '';

  get bgClass(): string {
    return {
      dashboard: 'bg-[#538CFF]',
      coupons: 'bg-[#E6EFFF]',
      messages: 'bg-[#D4FFF1]',
      companies: 'bg-[#D4D6FF]',
    }[this.variant] ?? 'bg-[#538CFF]';
  }

}
