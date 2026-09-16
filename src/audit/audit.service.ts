import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditService {
  async logAction(data: {
    userId?: string;
    cashShiftId?: string;
    action: string;
    entity: string;
    details?: Record<string, any>;
  }) {
    // Registrar eventos de auditoría en consola o BD
    console.log('[AUDIT LOG]:', data);
    return true;
  }
}
