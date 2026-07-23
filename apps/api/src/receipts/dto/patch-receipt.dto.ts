import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Currencies must match the Zod schema's enum exactly.
const CURRENCIES = ['RWF', 'USD', 'EUR', 'KES', 'GBP', 'UNKNOWN'] as const;
const CONFIDENCES = ['high', 'medium', 'low'] as const;

export class LineItemDto {
  @IsString()
  name!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  price!: number;
}

// PATCH replaces the full receipt (all fields required). The review flow always
// sends the complete corrected object, so a full replace keeps the store logic
// simple and lets needs_review be recomputed from a consistent snapshot.
export class PatchReceiptDto {
  @IsString()
  vendor!: string;

  @IsString()
  date!: string;

  @IsEnum(CURRENCIES)
  currency!: (typeof CURRENCIES)[number];

  @IsNumber()
  total!: number;

  @IsEnum(CONFIDENCES)
  confidence!: (typeof CONFIDENCES)[number];

  @IsString()
  notes!: string;

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems!: LineItemDto[];
}
