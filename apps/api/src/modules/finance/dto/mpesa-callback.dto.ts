// apps/api/src/modules/finance/dto/mpesa-callback.dto.ts
// Daraja Callback structure
export class MpesaCallbackDto {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: {
    Item: Array<{ Name: string; Value: number | string }>;
  };
}