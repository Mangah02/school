// apps/api/src/core/guards/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

// The metadata key used by Guards to check if a route is public
export const IS_PUBLIC_KEY = 'isPublic';

// The decorator itself
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);