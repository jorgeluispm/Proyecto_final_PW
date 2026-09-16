import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DateRangeFilterDto } from './dto/date-range-filter.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Obtiene el resumen general de ventas en un rango de fechas.
   */
  async getDailySalesReport(filter: DateRangeFilterDto) {
    const { branchId, startDate, endDate } = filter;

    const queryParams: any[] = [];
    let whereClause = `WHERE o.status = 'COMPLETED'`;

    if (branchId) {
      queryParams.push(branchId);
      whereClause += ` AND cs.branch_id = $${queryParams.length}`;
    }

    if (startDate) {
      queryParams.push(startDate);
      whereClause += ` AND o.completed_at >= $${queryParams.length}`;
    }

    if (endDate) {
      queryParams.push(endDate);
      whereClause += ` AND o.completed_at <= $${queryParams.length}`;
    }

    // Totales generales
    const totalSalesQuery = `
      SELECT 
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total), 0) as gross_revenue,
        COALESCE(AVG(o.total), 0) as average_ticket
      FROM orders o
      JOIN cash_shifts cs ON cs.id = o.cash_shift_id
      ${whereClause}
    `;

    // Desglose por método de pago exacto (usando order_payments)
    const paymentBreakdownQuery = `
      SELECT 
        op.payment_method,
        COALESCE(SUM(op.amount), 0) as total_amount,
        COUNT(op.id) as transaction_count
      FROM order_payments op
      JOIN orders o ON o.id = op.order_id
      JOIN cash_shifts cs ON cs.id = o.cash_shift_id
      ${whereClause}
      GROUP BY op.payment_method
    `;

    const [totals] = await this.dataSource.query(totalSalesQuery, queryParams);
    const payments = await this.dataSource.query(
      paymentBreakdownQuery,
      queryParams,
    );

    return {
      summary: {
        totalOrders: parseInt(totals.total_orders, 10),
        grossRevenue: parseFloat(totals.gross_revenue),
        averageTicket: parseFloat(totals.average_ticket),
      },
      paymentMethodsBreakdown: payments.map((p: any) => ({
        paymentMethod: p.payment_method,
        totalAmount: parseFloat(p.total_amount),
        transactionCount: parseInt(p.transaction_count, 10),
      })),
    };
  }

  /**
   * Obtiene el ranking de los productos/ceviches más vendidos.
   */
  async getTopSellingProducts(filter: DateRangeFilterDto, limit: number = 5) {
    const { branchId, startDate, endDate } = filter;

    const queryParams: any[] = [];
    let whereClause = `WHERE o.status = 'COMPLETED'`;

    if (branchId) {
      queryParams.push(branchId);
      whereClause += ` AND cs.branch_id = $${queryParams.length}`;
    }

    if (startDate) {
      queryParams.push(startDate);
      whereClause += ` AND o.completed_at >= $${queryParams.length}`;
    }

    if (endDate) {
      queryParams.push(endDate);
      whereClause += ` AND o.completed_at <= $${queryParams.length}`;
    }

    queryParams.push(limit);
    const limitIndex = queryParams.length;

    const query = `
      SELECT 
        p.name as product_name,
        pv.variant_name,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.subtotal) as total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN cash_shifts cs ON cs.id = o.cash_shift_id
      JOIN product_variants pv ON pv.id = oi.product_variant_id
      JOIN products p ON p.id = pv.product_id
      ${whereClause}
      GROUP BY p.name, pv.variant_name
      ORDER BY total_quantity_sold DESC
      LIMIT $${limitIndex}
    `;

    const topProducts = await this.dataSource.query(query, queryParams);

    return topProducts.map((item: any) => ({
      productName: item.product_name,
      variantName: item.variant_name,
      quantitySold: parseInt(item.total_quantity_sold, 10),
      totalRevenue: parseFloat(item.total_revenue),
    }));
  }
}
