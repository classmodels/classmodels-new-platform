import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

export type CouponPreview = {
  couponId: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: string;
  listPrice: string;
  discountAmount: string;
  finalAmount: string;
  isFree: boolean;
};

function asMoney(d: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(d.toFixed(2));
}

export function computeTryoutDiscount(
  listPrice: Prisma.Decimal,
  discountType: string,
  discountValue: Prisma.Decimal,
): { discountAmount: Prisma.Decimal; finalAmount: Prisma.Decimal; isFree: boolean } {
  let discount = new Prisma.Decimal(0);
  if (discountType === 'percent') {
    discount = listPrice.mul(discountValue).div(100);
  } else if (discountType === 'fixed') {
    discount = discountValue;
  } else {
    throw new BadRequestException('Ongeldig kortingstype.');
  }
  if (discount.lt(0)) discount = new Prisma.Decimal(0);
  if (discount.gt(listPrice)) discount = listPrice;
  discount = asMoney(discount);
  const finalAmount = asMoney(Prisma.Decimal.max(new Prisma.Decimal(0), listPrice.sub(discount)));
  return { discountAmount: discount, finalAmount, isFree: finalAmount.lte(0) };
}

export async function resolveTryoutCoupon(
  prisma: PrismaService,
  opts: {
    codeRaw: string | null | undefined;
    userId: string;
    editionSlug: string;
    listPrice: Prisma.Decimal;
  },
): Promise<CouponPreview | null> {
  const code = opts.codeRaw?.trim().toUpperCase() ?? '';
  if (!code) return null;

  const coupon = await prisma.tryoutCoupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) {
    throw new BadRequestException('Deze couponcode is ongeldig of niet actief.');
  }
  if (coupon.editionSlug && coupon.editionSlug !== opts.editionSlug) {
    throw new BadRequestException('Deze couponcode geldt niet voor deze try-out editie.');
  }
  if (coupon.maxTotalUses != null && coupon.usedCount >= coupon.maxTotalUses) {
    throw new BadRequestException('Deze couponcode is volledig opgebruikt.');
  }

  const userUses = await prisma.tryoutCouponRedemption.count({
    where: { couponId: coupon.id, userId: opts.userId },
  });
  if (userUses >= coupon.maxUsesPerUser) {
    throw new BadRequestException('Je hebt deze couponcode al gebruikt.');
  }

  const { discountAmount, finalAmount, isFree } = computeTryoutDiscount(
    opts.listPrice,
    coupon.discountType,
    coupon.discountValue,
  );

  return {
    couponId: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType === 'percent' ? 'percent' : 'fixed',
    discountValue: coupon.discountValue.toString(),
    listPrice: opts.listPrice.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    finalAmount: finalAmount.toFixed(2),
    isFree,
  };
}
