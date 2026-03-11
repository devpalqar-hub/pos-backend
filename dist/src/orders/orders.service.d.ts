import { PrismaService } from '../prisma/prisma.service';
import { BillStatus, Prisma, User } from '@prisma/client';
import { CreateSessionDto, OrderChannel } from './dto/create-session.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { UpdateBatchStatusDto } from './dto/update-batch-status.dto';
import { UpdateSessionStatusDto, SessionStatus } from './dto/update-session-status.dto';
import { GenerateBillDto } from './dto/generate-bill.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { OrdersGateway } from './orders.gateway';
export declare class OrdersService {
    private readonly prisma;
    private readonly gateway;
    private readonly logger;
    constructor(prisma: PrismaService, gateway: OrdersGateway);
    private assertRestaurantAccess;
    private assertManageRole;
    private mapSessionStatusToOrderStatus;
    private generateUniqueSessionNumber;
    private generateUniqueBatchNumber;
    private generateUniqueBillNumber;
    private getEffectivePriceForItem;
    createSession(actor: User, restaurantId: string, dto: CreateSessionDto): Promise<{
        _count: {
            batches: number;
        };
        table: {
            id: string;
            name: string;
            status: import(".prisma/client").$Enums.TableStatus;
            seatCount: number;
        } | null;
        openedBy: {
            id: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        sessionNumber: string;
        channel: import(".prisma/client").$Enums.OrderChannel;
        status: import(".prisma/client").$Enums.SessionStatus;
        customerName: string | null;
        customerPhone: string | null;
        customerEmail: string | null;
        guestCount: number;
        externalOrderId: string | null;
        externalChannel: string | null;
        deliveryAddress: string | null;
        deliveryFee: Prisma.Decimal | null;
        specialInstructions: string | null;
        subtotal: Prisma.Decimal | null;
        taxAmount: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal | null;
        totalAmount: Prisma.Decimal | null;
        closedAt: Date | null;
        tableId: string | null;
        openedById: string;
    }>;
    findAllSessions(actor: User, restaurantId: string, filters?: {
        status?: SessionStatus;
        tableId?: string;
        channel?: string;
    }, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            sessionNumber: string;
            channel: import(".prisma/client").$Enums.OrderChannel;
            status: import(".prisma/client").$Enums.SessionStatus;
            customerName: string | null;
            customerPhone: string | null;
            customerEmail: string | null;
            guestCount: number;
            externalOrderId: string | null;
            externalChannel: string | null;
            deliveryAddress: string | null;
            deliveryFee: Prisma.Decimal | null;
            specialInstructions: string | null;
            subtotal: Prisma.Decimal | null;
            taxAmount: Prisma.Decimal | null;
            discountAmount: Prisma.Decimal | null;
            totalAmount: Prisma.Decimal | null;
            closedAt: Date | null;
            tableId: string | null;
            openedById: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    findOneSession(actor: User, restaurantId: string, sessionId: string): Promise<{
        table: {
            id: string;
            name: string;
            status: import(".prisma/client").$Enums.TableStatus;
            groupId: string | null;
            seatCount: number;
        } | null;
        openedBy: {
            id: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        batches: ({
            createdBy: {
                id: string;
                name: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            items: ({
                menuItem: {
                    id: string;
                    name: string;
                    imageUrl: string | null;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.OrderItemStatus;
                notes: string | null;
                quantity: number;
                unitPrice: Prisma.Decimal;
                totalPrice: Prisma.Decimal;
                preparedAt: Date | null;
                servedAt: Date | null;
                cancelledAt: Date | null;
                cancelReason: string | null;
                batchId: string;
                menuItemId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            status: import(".prisma/client").$Enums.BatchStatus;
            batchNumber: string;
            notes: string | null;
            sessionId: string;
        })[];
        bill: ({
            items: {
                id: string;
                name: string;
                quantity: number;
                unitPrice: Prisma.Decimal;
                totalPrice: Prisma.Decimal;
                menuItemId: string;
                billId: string;
            }[];
            generatedBy: {
                id: string;
                name: string;
            } | null;
            payments: {
                id: string;
                createdAt: Date;
                amount: Prisma.Decimal;
                notes: string | null;
                billId: string;
                method: import(".prisma/client").$Enums.PaymentMethod;
                reference: string | null;
                processedById: string | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            status: import(".prisma/client").$Enums.BillStatus;
            subtotal: Prisma.Decimal;
            taxAmount: Prisma.Decimal;
            discountAmount: Prisma.Decimal;
            totalAmount: Prisma.Decimal;
            notes: string | null;
            sessionId: string;
            billNumber: string;
            taxRate: Prisma.Decimal;
            paidAt: Date | null;
            generatedById: string | null;
        }) | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        sessionNumber: string;
        channel: import(".prisma/client").$Enums.OrderChannel;
        status: import(".prisma/client").$Enums.SessionStatus;
        customerName: string | null;
        customerPhone: string | null;
        customerEmail: string | null;
        guestCount: number;
        externalOrderId: string | null;
        externalChannel: string | null;
        deliveryAddress: string | null;
        deliveryFee: Prisma.Decimal | null;
        specialInstructions: string | null;
        subtotal: Prisma.Decimal | null;
        taxAmount: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal | null;
        totalAmount: Prisma.Decimal | null;
        closedAt: Date | null;
        tableId: string | null;
        openedById: string;
    }>;
    updateSessionStatus(actor: User, restaurantId: string, sessionId: string, dto: UpdateSessionStatusDto): Promise<{
        _count: {
            batches: number;
        };
        table: {
            id: string;
            name: string;
            status: import(".prisma/client").$Enums.TableStatus;
            seatCount: number;
        } | null;
        openedBy: {
            id: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        sessionNumber: string;
        channel: import(".prisma/client").$Enums.OrderChannel;
        status: import(".prisma/client").$Enums.SessionStatus;
        customerName: string | null;
        customerPhone: string | null;
        customerEmail: string | null;
        guestCount: number;
        externalOrderId: string | null;
        externalChannel: string | null;
        deliveryAddress: string | null;
        deliveryFee: Prisma.Decimal | null;
        specialInstructions: string | null;
        subtotal: Prisma.Decimal | null;
        taxAmount: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal | null;
        totalAmount: Prisma.Decimal | null;
        closedAt: Date | null;
        tableId: string | null;
        openedById: string;
    }>;
    private releaseTableIfNoOpenSessions;
    addBatch(actor: User, restaurantId: string, sessionId: string, dto: CreateBatchDto): Promise<{
        createdBy: {
            id: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
        } | null;
        session: {
            id: string;
            restaurantId: string;
            sessionNumber: string;
            tableId: string | null;
        };
        items: ({
            menuItem: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.OrderItemStatus;
            notes: string | null;
            quantity: number;
            unitPrice: Prisma.Decimal;
            totalPrice: Prisma.Decimal;
            preparedAt: Date | null;
            servedAt: Date | null;
            cancelledAt: Date | null;
            cancelReason: string | null;
            batchId: string;
            menuItemId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        status: import(".prisma/client").$Enums.BatchStatus;
        batchNumber: string;
        notes: string | null;
        sessionId: string;
    }>;
    findAllBatches(actor: User, restaurantId: string, sessionId: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            status: import(".prisma/client").$Enums.BatchStatus;
            batchNumber: string;
            notes: string | null;
            sessionId: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    updateBatchStatus(actor: User, batchId: string, dto: UpdateBatchStatusDto): Promise<{
        session: {
            id: string;
            restaurantId: string;
            sessionNumber: string;
            tableId: string | null;
        };
        items: {
            id: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        status: import(".prisma/client").$Enums.BatchStatus;
        batchNumber: string;
        notes: string | null;
        sessionId: string;
    }>;
    updateItemStatus(actor: User, itemId: string, dto: UpdateItemStatusDto): Promise<{
        menuItem: {
            id: string;
            name: string;
        };
        batch: {
            id: string;
            batchNumber: string;
            sessionId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderItemStatus;
        notes: string | null;
        quantity: number;
        unitPrice: Prisma.Decimal;
        totalPrice: Prisma.Decimal;
        preparedAt: Date | null;
        servedAt: Date | null;
        cancelledAt: Date | null;
        cancelReason: string | null;
        batchId: string;
        menuItemId: string;
    }>;
    private syncBatchStatus;
    getKitchenView(actor: User, restaurantId: string): Promise<({
        createdBy: {
            id: string;
            name: string;
        } | null;
        session: {
            id: string;
            sessionNumber: string;
            channel: import(".prisma/client").$Enums.OrderChannel;
            table: {
                id: string;
                name: string;
            } | null;
        };
        items: ({
            menuItem: {
                id: string;
                name: string;
                imageUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.OrderItemStatus;
            notes: string | null;
            quantity: number;
            unitPrice: Prisma.Decimal;
            totalPrice: Prisma.Decimal;
            preparedAt: Date | null;
            servedAt: Date | null;
            cancelledAt: Date | null;
            cancelReason: string | null;
            batchId: string;
            menuItemId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        status: import(".prisma/client").$Enums.BatchStatus;
        batchNumber: string;
        notes: string | null;
        sessionId: string;
    })[]>;
    getBillingView(actor: User, restaurantId: string): Promise<({
        table: {
            id: string;
            name: string;
        } | null;
        batches: {
            _count: {
                items: number;
            };
            status: import(".prisma/client").$Enums.BatchStatus;
        }[];
        bill: {
            id: string;
            status: import(".prisma/client").$Enums.BillStatus;
            totalAmount: Prisma.Decimal;
            billNumber: string;
            payments: {
                amount: Prisma.Decimal;
            }[];
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        sessionNumber: string;
        channel: import(".prisma/client").$Enums.OrderChannel;
        status: import(".prisma/client").$Enums.SessionStatus;
        customerName: string | null;
        customerPhone: string | null;
        customerEmail: string | null;
        guestCount: number;
        externalOrderId: string | null;
        externalChannel: string | null;
        deliveryAddress: string | null;
        deliveryFee: Prisma.Decimal | null;
        specialInstructions: string | null;
        subtotal: Prisma.Decimal | null;
        taxAmount: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal | null;
        totalAmount: Prisma.Decimal | null;
        closedAt: Date | null;
        tableId: string | null;
        openedById: string;
    })[]>;
    generateBill(actor: User, restaurantId: string, sessionId: string, dto: GenerateBillDto): Promise<{
        items: {
            id: string;
            name: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
            totalPrice: Prisma.Decimal;
            menuItemId: string;
            billId: string;
        }[];
        generatedBy: {
            id: string;
            name: string;
        } | null;
        payments: {
            id: string;
            createdAt: Date;
            amount: Prisma.Decimal;
            notes: string | null;
            billId: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            reference: string | null;
            processedById: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        status: import(".prisma/client").$Enums.BillStatus;
        subtotal: Prisma.Decimal;
        taxAmount: Prisma.Decimal;
        discountAmount: Prisma.Decimal;
        totalAmount: Prisma.Decimal;
        notes: string | null;
        sessionId: string;
        billNumber: string;
        taxRate: Prisma.Decimal;
        paidAt: Date | null;
        generatedById: string | null;
    }>;
    getBillForSession(actor: User, restaurantId: string, sessionId: string): Promise<{
        session: {
            id: string;
            sessionNumber: string;
            channel: import(".prisma/client").$Enums.OrderChannel;
            customerName: string | null;
            customerPhone: string | null;
            table: {
                id: string;
                name: string;
            } | null;
        };
        items: ({
            menuItem: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            name: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
            totalPrice: Prisma.Decimal;
            menuItemId: string;
            billId: string;
        })[];
        generatedBy: {
            id: string;
            name: string;
        } | null;
        payments: {
            id: string;
            createdAt: Date;
            amount: Prisma.Decimal;
            notes: string | null;
            billId: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            reference: string | null;
            processedById: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        status: import(".prisma/client").$Enums.BillStatus;
        subtotal: Prisma.Decimal;
        taxAmount: Prisma.Decimal;
        discountAmount: Prisma.Decimal;
        totalAmount: Prisma.Decimal;
        notes: string | null;
        sessionId: string;
        billNumber: string;
        taxRate: Prisma.Decimal;
        paidAt: Date | null;
        generatedById: string | null;
    }>;
    addPayment(actor: User, billId: string, dto: AddPaymentDto): Promise<{
        payment: {
            id: string;
            createdAt: Date;
            amount: Prisma.Decimal;
            notes: string | null;
            billId: string;
            method: import(".prisma/client").$Enums.PaymentMethod;
            reference: string | null;
            processedById: string | null;
        };
        isFullyPaid: boolean;
    }>;
    getPaymentsForBill(actor: User, billId: string): Promise<({
        processedBy: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        amount: Prisma.Decimal;
        notes: string | null;
        billId: string;
        method: import(".prisma/client").$Enums.PaymentMethod;
        reference: string | null;
        processedById: string | null;
    })[]>;
    getOrderAnalytics(actor: User, restaurantId: string, filters: {
        sessionStatus?: SessionStatus;
        billStatus?: BillStatus;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        totalOrder: number;
        totalRevenue: number;
        averageRevenue: number;
        insights: Record<string, {
            order: number;
            revenue: number;
        }>;
    }>;
    getOrdersWithAnalytics(actor: User, restaurantId: string, filters: {
        channel?: OrderChannel;
        status?: SessionStatus;
        startDate?: string;
        endDate?: string;
    }, page: number, limit: number, fetchAll?: boolean): Promise<{
        analytics: {
            total_revenue: {
                value: number;
                change_percentage: number;
            };
            total_orders: {
                value: number;
                change_percentage: number;
            };
            avg_spend_time: {
                value: number;
            };
        };
        orders: {
            order_id: string;
            timestamp: string;
            customer: {
                name: string;
                email: string | null;
            };
            channel: import(".prisma/client").$Enums.OrderChannel;
            table_number: string | null;
            total_amount: number;
            status: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    getOrderDetails(actor: User, restaurantId: string, sessionId: string): Promise<{
        order_header: {
            order_id: string;
            status_tag: import(".prisma/client").$Enums.SessionStatus;
            channel_name: import(".prisma/client").$Enums.OrderChannel;
            total_amount: number;
        };
        customer_details: {
            customer_name: string;
            email: string | null;
            table_number: string | null;
            start_time: Date;
            estimated_checkout: Date | null;
        };
        order_items: {
            name: string;
            description: string | null;
            image_url: string | null;
            quantity: number;
            unit_price: number;
        }[];
        order_status_timeline: {
            status: string;
            timestamp: Date | null;
            is_completed: boolean;
        }[];
        financial_summary: {
            subtotal: number;
            tax_percentage: number;
            tax_amount: number;
            delivery_fee: number;
            grand_total: number;
        };
    }>;
}
