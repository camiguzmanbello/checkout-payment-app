import { IsInt, IsString, IsUUID, Min, Max, IsEmail, Matches, Length, MaxLength } from 'class-validator';

export class CreateTransactionDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(20) // límite razonable por compra, evita payloads absurdos
  quantity: number;

  @IsUUID()
  customerId: string;

  @IsUUID()
  deliveryId: string;
}

export class PayTransactionDto {
  // solo dígitos, 13-19 caracteres (rango real de tarjetas)
  @IsString()
  @Matches(/^\d{13,19}$/, { message: 'cardNumber debe tener entre 13 y 19 dígitos numéricos' })
  cardNumber: string;

  @IsString()
  @Matches(/^\d{3,4}$/, { message: 'cvc debe tener 3 o 4 dígitos' })
  cvc: string;

  @IsString()
  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'expMonth debe ser 01-12' })
  expMonth: string;

  @IsString()
  @Length(2, 2)
  @Matches(/^\d{2}$/, { message: 'expYear debe ser 2 dígitos' })
  expYear: string;

  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, { message: 'cardHolder solo admite letras y espacios' })
  cardHolder: string;

  @IsEmail()
  @MaxLength(150)
  customerEmail: string;
}
