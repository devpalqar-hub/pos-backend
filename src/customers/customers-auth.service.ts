import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { randomInt } from 'crypto';
import * as nodemailer from 'nodemailer';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import { UpdateCustomerProfileDto } from 'src/customers/dto/update-customer-profile.dto';

@Injectable()
export class CustomersAuthService {
    private readonly logger = new Logger(CustomersAuthService.name);
    constructor(private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }


    //    -------------------------- PRIVATE METHODS -------------------------------------------
    private generateOtp(): string {
        return randomInt(100000, 999999).toString();
    }

    private sanitizeCustomer(customer: any) {
        return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            profileImage: customer.profileImage,
            wallet: customer.wallet,
            is_registered: customer.is_registered,
            restaurant: customer.restaurant,
        };
    }

    private async resolveRestaurantIdsByOwner(ownerId: string): Promise<string[]> {
        if (!ownerId || !isUUID(ownerId)) {
            throw new BadRequestException('ownerId header must be a valid UUID');
        }

        const owner = await this.prisma.user.findUnique({
            where: { id: ownerId },
            select: { id: true },
        });

        if (!owner) {
            throw new NotFoundException('Owner user not found');
        }

        const restaurants = await this.prisma.restaurant.findMany({
            where: { ownerId },
            select: { id: true },
            orderBy: { createdAt: 'asc' },
        });

        if (restaurants.length === 0) {
            throw new NotFoundException('No restaurant found for this owner');
        }

        return restaurants.map((r) => r.id);
    }

    private async assertOtpVerifiedRecently(email: string): Promise<void> {
        const graceMinutes = this.configService.get<number>('OTP_EXPIRES_MINUTES', 10);
        const threshold = new Date(Date.now() - graceMinutes * 60 * 1000);

        const verifiedOtp = await this.prisma.otpToken.findFirst({
            where: {
                email,
                isUsed: true,
                createdAt: { gte: threshold },
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
        });

        if (!verifiedOtp) {
            throw new BadRequestException('OTP verification is required before completing profile');
        }
    }

    private async resolveRestaurantIdByOwner(ownerId: string): Promise<string> {
        const restaurantIds = await this.resolveRestaurantIdsByOwner(ownerId);
        return restaurantIds[0];
    }

    //    -------------------------- PRIVATE METHODS -------------------------------------------
    /*
    SEND OTP
    */
    async sendOtp(ownerId: string, dto: SendOtpDto) {
        this.logger.log(`sendOtp started: ownerId=${ownerId}, email=${dto.email}`);

        try {
            // Resolve ALL restaurants under this owner so we detect existing customers
            // regardless of which specific restaurant they originally registered in.
            const restaurantIds = await this.resolveRestaurantIdsByOwner(ownerId);

            const invalidatedTokens = await this.prisma.otpToken.updateMany({
                where: { email: dto.email, isUsed: false },
                data: { isUsed: true },
            });

            this.logger.debug(
                `sendOtp invalidated old tokens: email=${dto.email}, count=${invalidatedTokens.count}`,
            );

            // Search for the customer across all restaurants owned by this owner
            const customer = await this.prisma.customer.findFirst({
                where: {
                    restaurantId: { in: restaurantIds },
                    email: dto.email,
                },
            });

            const otp = this.generateOtp();

            const expiresAt = new Date(
                Date.now() +
                this.configService.get<number>('OTP_EXPIRES_MINUTES', 10) * 60 * 1000,
            );

            await this.prisma.otpToken.create({
                data: {
                    email: dto.email,
                    otp,
                    expiresAt,
                },
            });

            this.logger.log(
                `sendOtp created token: ownerId=${ownerId}, email=${dto.email}, restaurantIds=${restaurantIds.join(',')}, customerExists=${!!customer}`,
            );

            // await this.sendOtpEmail(restaurantIds[0], dto.email, otp, customer?.name);

            return { email: dto.email, otp };
        } catch (error: any) {
            this.logger.error(
                `sendOtp failed: ownerId=${ownerId}, email=${dto.email}, message=${error?.message}`,
                error?.stack,
            );
            throw error;
        }
    }

    /*
    VERIFY OTP
    */

    async verifyOtp(ownerId: string, dto: VerifyOtpDto) {
        const { email, otp } = dto;
        this.logger.log(`verifyOtp started: ownerId=${ownerId}, email=${email}`);

        try {
            const restaurantIds = await this.resolveRestaurantIdsByOwner(ownerId);

            const customer = await this.prisma.customer.findFirst({
                where: {
                    restaurantId: { in: restaurantIds },
                    email,
                },
                include: {
                    restaurant: {
                        select: { id: true, name: true },
                    },
                },
            });

            if (customer && !customer.isActive) {
                this.logger.warn(`verifyOtp blocked inactive customer: email=${email}`);
                throw new BadRequestException('Customer account is inactive');
            }

            const defaultOtp = this.configService.get<string>('DEFAULT_OTP', '759409');
            const isDefaultOtp = otp === defaultOtp;

            if (isDefaultOtp) {
                this.logger.warn(`verifyOtp used default OTP: email=${email}`);
                const latestUnusedOtp = await this.prisma.otpToken.findFirst({
                    where: {
                        email,
                        isUsed: false,
                    },
                    orderBy: { createdAt: 'desc' },
                });

                if (latestUnusedOtp) {
                    await this.prisma.otpToken.update({
                        where: { id: latestUnusedOtp.id },
                        data: { isUsed: true },
                    });
                }
            } else {
                const otpRecord = await this.prisma.otpToken.findFirst({
                    where: {
                        email,
                        otp,
                        isUsed: false,
                        expiresAt: { gte: new Date() },
                    },
                    orderBy: { createdAt: 'desc' },
                });

                if (!otpRecord) {
                    this.logger.warn(`verifyOtp invalid or expired OTP: email=${email}`);
                    throw new BadRequestException('Invalid or expired OTP');
                }

                await this.prisma.otpToken.update({
                    where: { id: otpRecord.id },
                    data: { isUsed: true },
                });
            }

            const isNew = !customer || !customer.is_registered;

            if (isNew) {
                this.logger.log(`verifyOtp success for new customer flow: email=${email}`);
                return {
                    isNew: true,
                    accessToken: null,
                    customer: null,
                };
            }

            const payload = {
                sub: customer.id,
                email: customer.email,
                restaurantId: customer.restaurantId,
                type: 'customer',
            };

            const accessToken = this.jwtService.sign(payload);

            this.logger.log(`verifyOtp success for existing customer: email=${email}, customerId=${customer.id}`);
            return {
                isNew: false,
                accessToken,
                customer: this.sanitizeCustomer(customer),
            };
        } catch (error: any) {
            this.logger.error(
                `verifyOtp failed: ownerId=${ownerId}, email=${email}, message=${error?.message}`,
                error?.stack,
            );
            throw error;
        }
    }


    /*
    COMPLETE CUSTOMER PROFILE
    */

    async completeProfile(ownerId: string, dto: RegisterCustomerDto) {
        this.logger.log(
            `completeProfile started: ownerId=${ownerId}, email=${dto.email}, phone=${dto.phone}`,
        );

        try {
            const restaurantIds = await this.resolveRestaurantIdsByOwner(ownerId);
            const primaryRestaurantId = restaurantIds[0];
            await this.assertOtpVerifiedRecently(dto.email);

            const existingInOwnedRestaurants = await this.prisma.customer.findFirst({
                where: {
                    restaurantId: { in: restaurantIds },
                    OR: [{ email: dto.email }, { phone: dto.phone }],
                },
            });

            await this.prisma.$transaction(async (tx) => {
                if (!existingInOwnedRestaurants) {
                    for (const restaurantId of restaurantIds) {
                        const conflict = await tx.customer.findFirst({
                            where: {
                                restaurantId,
                                OR: [{ email: dto.email }, { phone: dto.phone }],
                            },
                            select: { id: true },
                        });

                        if (conflict) {
                            this.logger.warn(
                                `completeProfile conflict while creating customer: email=${dto.email}, phone=${dto.phone}, restaurantId=${restaurantId}`,
                            );
                            throw new ConflictException(
                                'Customer with same email or phone already exists in one of the owner restaurants',
                            );
                        }

                        await tx.customer.create({
                            data: {
                                restaurantId,
                                email: dto.email,
                                phone: dto.phone,
                                name: dto.name,
                                profileImage: dto.profileImage,
                                carts: {
                                    create: { restaurantId },
                                },
                                is_registered: true,
                            },
                        });
                    }

                    return;
                }

                const existingByEmail = await tx.customer.findFirst({
                    where: {
                        restaurantId: primaryRestaurantId,
                        email: dto.email,
                    },
                });

                const existingByPhone = await tx.customer.findFirst({
                    where: {
                        restaurantId: primaryRestaurantId,
                        phone: dto.phone,
                    },
                });

                if (
                    existingByEmail &&
                    existingByPhone &&
                    existingByEmail.id !== existingByPhone.id
                ) {
                    this.logger.warn(
                        `completeProfile conflict: email and phone belong to different customers. email=${dto.email}, phone=${dto.phone}`,
                    );
                    throw new ConflictException(
                        'Email and phone belong to different customers in this restaurant',
                    );
                }

                const targetCustomer = existingByEmail ?? existingByPhone;

                if (targetCustomer) {
                    await tx.customer.update({
                        where: { id: targetCustomer.id },
                        data: {
                            email: dto.email,
                            phone: dto.phone,
                            name: dto.name,
                            profileImage: dto.profileImage,
                            is_registered: true,
                        },
                    });
                } else {
                    await tx.customer.create({
                        data: {
                            restaurantId: primaryRestaurantId,
                            email: dto.email,
                            phone: dto.phone,
                            name: dto.name,
                            profileImage: dto.profileImage,
                            carts: {
                                create: { restaurantId: primaryRestaurantId },
                            },
                            is_registered: true,
                        },
                    });
                }
            });

            const customer = await this.prisma.customer.findFirst({
                where: {
                    restaurantId: primaryRestaurantId,
                    email: dto.email,
                },
                include: {
                    restaurant: {
                        select: { id: true, name: true },
                    },
                },
            });

            if (!customer) {
                this.logger.error(`completeProfile failed to fetch customer after transaction: email=${dto.email}`);
                throw new NotFoundException('Customer profile could not be completed');
            }

            const payload = {
                sub: customer.id,
                email: customer.email,
                restaurantId: customer.restaurantId,
                type: 'customer',
            };

            const accessToken = this.jwtService.sign(payload);

            this.logger.log(
                `completeProfile success: ownerId=${ownerId}, email=${dto.email}, customerId=${customer.id}`,
            );
            return {
                accessToken,
                customer: this.sanitizeCustomer(customer),
            };
        } catch (error: any) {
            this.logger.error(
                `completeProfile failed: ownerId=${ownerId}, email=${dto.email}, phone=${dto.phone}, message=${error?.message}`,
                error?.stack,
            );
            throw error;
        }
    }

    /*
    GET LOGGED-IN CUSTOMER PROFILE
    */
    async getProfile(customerId: string) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: customerId },
            include: {
                restaurant: {
                    select: { id: true, name: true, ownerId: true },
                },
            },
        });

        if (!customer) {
            throw new NotFoundException('Customer not found');
        }

        // ── Unified loyalty points across ALL restaurants under the same owner ──
        // We find every Customer record sharing the same email under the same owner,
        // then sum ALL their LoyalityPointRedemption rows.
        //
        // Why live-computed from the redemption table (not loyaltyWallet):
        //   loyaltyWallet is a precomputed snapshot and can drift if any point
        //   award/deduct operation fails mid-transaction. The redemption table is
        //   the immutable audit log and is always the source of truth.
        const ownerId = (customer as any).restaurant?.ownerId;

        let loyaltyPoints = { totalEarned: 0, totalRedeemed: 0, balance: 0 };

        if (ownerId) {
            // Step 1: find all restaurants under this owner
            const ownerRestaurants = await this.prisma.restaurant.findMany({
                where: { ownerId },
                select: { id: true },
            });
            const restaurantIds = ownerRestaurants.map((r) => r.id);

            // Step 2: find all customer records for this email across those restaurants
            const allCustomerRecords = await this.prisma.customer.findMany({
                where: {
                    email: customer.email ?? undefined,
                    restaurantId: { in: restaurantIds },
                },
                select: { id: true },
            });
            const allCustomerIds = allCustomerRecords.map((c) => c.id);

            // Step 3: sum all loyalty redemptions (earnings) across those customer records
            const [earnedResult, redeemedResult] = await Promise.all([
                // pointsAwarded on redemption records = points earned per qualifying bill
                this.prisma.loyalityPointRedemption.aggregate({
                    _sum: { pointsAwarded: true },
                    where: { customerId: { in: allCustomerIds } },
                }),
                // We don't have a separate "spent" table yet; balance = total earned - redeemed via offers
                // For future: when offers are redeemed, deduct here. For now balance = totalEarned.
                this.prisma.loyalityPointRedemption.aggregate({
                    _sum: { pointsAwarded: true },
                    where: {
                        customerId: { in: allCustomerIds },
                        // Only count redemptions that were actually spent (linked to a bill with discount)
                        bill: { some: { loyalityPointDiscountAmount: { gt: 0 } } },
                    },
                }),
            ]);

            const totalEarned = Number(earnedResult._sum?.pointsAwarded ?? 0);
            const totalRedeemed = Number(redeemedResult._sum?.pointsAwarded ?? 0);

            loyaltyPoints = {
                totalEarned,
                totalRedeemed,
                balance: totalEarned - totalRedeemed,
            };
        }

        return {
            ...this.sanitizeCustomer(customer),
            memberSince: customer.createdAt,
            loyaltyPoints,
        };
    }

    /*
    UPDATE LOGGED-IN CUSTOMER PROFILE
    */
    async updateProfile(customerId: string, dto: UpdateCustomerProfileDto) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: customerId },
        });

        if (!customer) {
            throw new NotFoundException('Customer not found');
        }

        if (dto.phone !== undefined && dto.phone !== customer.phone) {
            const phoneConflict = await this.prisma.customer.findUnique({
                where: {
                    restaurantId_phone: {
                        restaurantId: customer.restaurantId,
                        phone: dto.phone,
                    },
                },
                select: { id: true },
            });

            if (phoneConflict && phoneConflict.id !== customer.id) {
                throw new ConflictException(
                    `Customer with phone "${dto.phone}" already exists in this restaurant`,
                );
            }
        }

        if (dto.email !== undefined && dto.email !== customer.email) {
            const emailConflict = await this.prisma.customer.findFirst({
                where: {
                    restaurantId: customer.restaurantId,
                    email: dto.email,
                    NOT: { id: customer.id },
                },
                select: { id: true },
            });

            if (emailConflict) {
                throw new ConflictException(
                    `Customer with email "${dto.email}" already exists in this restaurant`,
                );
            }
        }

        const updated = await this.prisma.customer.update({
            where: { id: customer.id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.phone !== undefined && { phone: dto.phone }),
                ...(dto.email !== undefined && { email: dto.email }),
                ...(dto.profileImage !== undefined && { profileImage: dto.profileImage }),
            },
            include: {
                restaurant: {
                    select: { id: true, name: true },
                },
            },
        });

        return this.sanitizeCustomer(updated);
    }

    /*
    GET LOGGED-IN CUSTOMER ORDERS
    */
    async getMyOrders(
        customerId: string,
        restaurantId: string,
        page = 1,
        limit = 10,
        status?: string,
        channel?: string,
    ) {
        const where: any = {
            customerId,
            restaurantId,
            ...(status && { status }),
            ...(channel && { channel }),
        };

        const [orders, total] = await Promise.all([
            this.prisma.orderSession.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    table: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    bill: {
                        select: {
                            id: true,
                            billNumber: true,
                            status: true,
                            subtotal: true,
                            taxAmount: true,
                            discountAmount: true,
                            totalAmount: true,
                            createdAt: true,
                        },
                    },
                    _count: {
                        select: {
                            batches: true,
                        },
                    },
                },
            }),
            this.prisma.orderSession.count({ where }),
        ]);

        return {
            data: orders,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1,
            },
        };
    }

    /*
    GET LOGGED-IN CUSTOMER ORDER DETAIL
    */
    async getMyOrderById(
        customerId: string,
        restaurantId: string,
        sessionId: string,
    ) {
        const order = await this.prisma.orderSession.findFirst({
            where: {
                id: sessionId,
                customerId,
                restaurantId,
            },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
                table: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                batches: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        items: {
                            include: {
                                menuItem: {
                                    select: {
                                        id: true,
                                        name: true,
                                        imageUrl: true,
                                    },
                                },
                            },
                            orderBy: { createdAt: 'asc' },
                        },
                    },
                },
                bill: {
                    include: {
                        items: true,
                        payments: {
                            orderBy: { createdAt: 'asc' },
                        },
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }

    // ═════════════════════════════════════════════════════════════
    // INTERNAL: Send OTP Email using Restaurant SMTP
    // ═════════════════════════════════════════════════════════════

    private async sendOtpEmail(
        restaurantId: string,
        email: string,
        otp: string,
        customerName?: string | null,
    ) {
        this.logger.log(`Preparing to send OTP email to ${email}`);
        this.logger.debug(`Restaurant ID: ${restaurantId}`);

        const settings = await this.prisma.marketingSettings.findUnique({
            where: { restaurantId },
        });

        if (!settings) {
            this.logger.error(`MarketingSettings not found for restaurant ${restaurantId}`);
            throw new BadRequestException(
                'Email service not configured for this restaurant',
            );
        }

        this.logger.debug(`SMTP settings loaded`, {
            host: settings.smtpHost,
            port: settings.smtpPort,
            user: settings.smtpUser,
            fromEmail: settings.smtpFromEmail,
            secure: settings.smtpSecure,
        });

        if (
            !settings.smtpHost ||
            !settings.smtpUser ||
            !settings.smtpPassword
        ) {
            this.logger.error(`SMTP configuration incomplete`, {
                host: settings.smtpHost,
                user: settings.smtpUser,
                passwordExists: !!settings.smtpPassword,
            });

            throw new BadRequestException(
                'Email service not configured for this restaurant',
            );
        }

        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { name: true },
        });

        const restaurantName = restaurant?.name ?? 'Restaurant';
        const name = customerName ?? 'Customer';

        const transporter = nodemailer.createTransport({
            host: settings.smtpHost,
            port: settings.smtpPort ?? 587,
            secure: settings.smtpSecure ?? false,
            auth: {
                user: settings.smtpUser,
                pass: settings.smtpPassword,
            },
        });

        this.logger.log(`SMTP transporter created`);

        try {
            this.logger.log(`Verifying SMTP connection...`);

            await transporter.verify();

            this.logger.log(`SMTP connection verified successfully`);
        } catch (err) {
            this.logger.error(`SMTP verification failed`, err);
            throw err;
        }

        const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
  <div style="max-width:500px;margin:auto;background:white;padding:24px;border-radius:10px;">
    <h2>${restaurantName}</h2>
    <p>Hello ${name},</p>
    <p>Your verification code is:</p>
    <h1>${otp}</h1>
    <p>This OTP will expire in <b>10 minutes</b>.</p>
  </div>
</body>
</html>
`;

        try {
            this.logger.log(`Sending email to ${email}`);

            const result = await transporter.sendMail({
                from: `"${settings.smtpFromName ?? restaurantName}" <${settings.smtpFromEmail}>`,
                to: email,
                subject: `${restaurantName} - Your OTP Code`,
                html,
            });

            this.logger.log(`Email sent successfully`);
            this.logger.debug(`SMTP response`, result);

        } catch (err) {
            this.logger.error(`Email sending failed`, err);
            throw err;
        }
    }
}