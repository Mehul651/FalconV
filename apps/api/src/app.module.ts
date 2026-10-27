import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SessionAuthGuard } from './auth/auth.guard';
import { AuditService } from './audit/audit.service';
import { HealthController } from './health/health.controller';
import { CatalogController } from './identity/catalog.controller';
import { IdentityController } from './identity/identity.controller';
import { IdentityService } from './identity/identity.service';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { PrismaModule } from './prisma/prisma.module';
import { ClientsController } from './clients/clients.controller';
import { ClientsService } from './clients/clients.service';
import { RequestsController } from './requests/requests.controller';
import { RequestsService } from './requests/requests.service';
import { ProjectsController } from './projects/projects.controller';
import { ProjectsService } from './projects/projects.service';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { IssuesController } from './issues/issues.controller';
import { IssuesService } from './issues/issues.service';
import { DocumentsController } from './documents/documents.controller';
import { DocumentsService } from './documents/documents.service';
import { LocalStorageService } from './storage/local-storage.service';
import { ReportingController } from './reporting/reporting.controller';
import { KpiService } from './reporting/kpi.service';
import { FinanceService } from './reporting/finance.service';
import { ImportsService } from './reporting/imports.service';
import { IntelligenceController } from './intelligence/intelligence.controller';
import { DashboardService } from './intelligence/dashboard.service';
import { RisksService } from './intelligence/risks.service';
import { CapaService } from './intelligence/capa.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    PrismaModule,
  ],
  controllers: [
    HealthController,
    IdentityController,
    CatalogController,
    NotificationsController,
    ClientsController,
    RequestsController,
    ProjectsController,
    TasksController,
    IssuesController,
    DocumentsController,
    ReportingController,
    IntelligenceController,
  ],
  providers: [
    IdentityService,
    NotificationsService,
    AuditService,
    ClientsService,
    RequestsService,
    ProjectsService,
    TasksService,
    IssuesService,
    DocumentsService,
    LocalStorageService,
    KpiService,
    FinanceService,
    ImportsService,
    DashboardService,
    RisksService,
    CapaService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionAuthGuard },
  ],
})
export class AppModule {}
