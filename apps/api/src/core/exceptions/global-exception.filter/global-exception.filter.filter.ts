import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';

@Catch()
export class GlobalExceptionFilterFilter<T> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {}
}
