import { SetMetadata } from '@nestjs/common';

export const SkipAutomaticAudit = () => SetMetadata('skipAutomaticAudit', true);
