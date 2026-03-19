import { Component } from '@angular/core';
import { AuthService, UserRole } from '../../../service/auth.service';
import { CouponsMockService } from '../../../service/coupons-mock.service';
import { FilterBarComponent } from '../../../shared/dashboard/filter-bar/filter-bar.component';
import { TopbarComponent } from '../../../shared/dashboard/topbar/topbar.component';
import { DataTableComponent } from '../../../shared/dashboard/data-table/data-table.component';
import { Category } from '../../../service/category.interface';
import { DataTableConfig } from '../../../service/data-table.model';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [
    TopbarComponent,
    FilterBarComponent,
    DataTableComponent
  ],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.css',
})
export class CategoryListComponent {
  categories: Category[] = [];

  tableConfig: DataTableConfig<Category> = {
    columns: [
      { key: 'categoria', label: 'Categoría' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'estado', label: 'Estado actual', type: 'badge' },
    ],
    actions: [
      {
        iconId: 'edit',
        bgClass: 'bg-[#E6EEFF] text-[#538CFF]',
        action: () => undefined,
      },
    ],
  };

  constructor(private service: CouponsMockService, private auth: AuthService) { }

  ngOnInit() {
    this.service.getCategories().subscribe(data => {
      this.categories = data;
    });
  }

  get role(): UserRole {
    return this.auth.getRole()!;
  }
}
