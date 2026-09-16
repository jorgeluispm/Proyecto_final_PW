import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { DateRangeFilterDto } from './dto/date-range-filter.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-sales')
  async getDailySales(@Query() filter: DateRangeFilterDto) {
    const data = await this.reportsService.getDailySalesReport(filter);
    return { data };
  }

  @Get('top-products')
  async getTopProducts(
    @Query() filter: DateRangeFilterDto,
    @Query('limit') limit?: number,
  ) {
    const data = await this.reportsService.getTopSellingProducts(
      filter,
      limit ? Number(limit) : 5,
    );
    return { data };
  }
}
