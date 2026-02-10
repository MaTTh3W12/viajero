import { Component } from '@angular/core';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { FilterBarComponent } from '../../../shared/dashboard/filter-bar/filter-bar.component';
import { CouponsMockService } from '../../../service/coupons-mock.service';
import { AuthService, UserRole } from '../../../service/auth.service';

@Component({
  selector: 'app-audit-list',
  imports: [
    TopbarComponent,
    FilterBarComponent
  ],
  templateUrl: './audit-list.component.html',
  styleUrl: './audit-list.component.css',
})
export class AuditListComponent {

  constructor(private service: CouponsMockService, private auth: AuthService) { }

  get role(): UserRole {
    return this.auth.getRole()!;
  }
}
