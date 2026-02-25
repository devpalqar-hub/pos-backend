import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { CreateSessionDto } from './dto/create-session.dto';
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
    private generateUniqueSessionNumber;
    private generateUniqueBatchNumber;
    private generateUniqueBillNumber;
    private getEffectivePriceForItem;
    createSession(actor: User, restaurantId: string, dto: CreateSessionDto): Promise<{
        table: {
            id: string;
            status: import(".prisma/client").$Enums.TableStatus;
            name: string;
            seatCount: number;
        } | null;
        openedBy: {
            id: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        _count: {
            batches: number;
        };
    } & {
        id: string;
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
        deliveryFee: import("@prisma/client/runtime/library").Decimal | null;
        specialInstructions: string | null;
        subtotal: import("@prisma/client/runtime/library").Decimal | null;
        taxAmount: import("@prisma/client/runtime/library").Decimal | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal | null;
        totalAmount: import("@prisma/client/runtime/library").Decimal | null;
        closedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
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
            deliveryFee: import("@prisma/client/runtime/library").Decimal | null;
            specialInstructions: string | null;
            subtotal: import("@prisma/client/runtime/library").Decimal | null;
            taxAmount: import("@prisma/client/runtime/library").Decimal | null;
            discountAmount: import("@prisma/client/runtime/library").Decimal | null;
            totalAmount: import("@prisma/client/runtime/library").Decimal | null;
            closedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
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
            status: import(".prisma/client").$Enums.TableStatus;
            name: string;
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
                status: import(".prisma/client").$Enums.OrderItemStatus;
                createdAt: Date;
                updatedAt: Date;
                notes: string | null;
                batchId: string;
                menuItemId: string;
                quantity: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                totalPrice: import("@prisma/client/runtime/library").Decimal;
                preparedAt: Date | null;
                servedAt: Date | null;
                cancelledAt: Date | null;
                cancelReason: string | null;
            })[];
        } & {
            id: string;
            status: import(".prisma/client").$Enums.BatchStatus;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            sessionId: string;
            batchNumber: string;
            notes: string | null;
        })[];
        bill: ({
            items: {
                id: string;
                name: string;
                menuItemId: string;
                quantity: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                totalPrice: import("@prisma/client/runtime/library").Decimal;
                billId: string;
            }[];
            generatedBy: {
                id: string;
                name: string;
            } | null;
            payments: {
                id: string;
                createdAt: Date;
                notes: string | null;
                billId: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                method: import(".prisma/client").$Enums.PaymentMethod;
                reference: string | null;
                processedById: string | null;
            }[];
        } & {
            id: string;
            status: import(".prisma/client").$Enums.BillStatus;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            sessionId: string;
            notes: string | null;
            billNumber: string;
            taxRate: import("@prisma/client/runtime/library").Decimal;
            generatedById: string | null;
            paidAt: Date | null;
        }) | null;
    } & {
        id: string;
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
        deliveryFee: import("@prisma/client/runtime/library").Decimal | null;
        specialInstructions: string | null;
        subtotal: import("@prisma/client/runtime/library").Decimal | null;
        taxAmount: import("@prisma/client/runtime/library").Decimal | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal | null;
        totalAmount: import("@prisma/client/runtime/library").Decimal | null;
        closedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        tableId: string | null;
        openedById: string;
    }>;
    updateSessionStatus(actor: User, restaurantId: string, sessionId: string, dto: UpdateSessionStatusDto): Promise<{
        table: {
            id: string;
            status: import(".prisma/client").$Enums.TableStatus;
            name: string;
            seatCount: number;
        } | null;
        openedBy: {
            id: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        _count: {
            batches: number;
        };
    } & {
        id: string;
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
        deliveryFee: import("@prisma/client/runtime/library").Decimal | null;
        specialInstructions: string | null;
        subtotal: import("@prisma/client/runtime/library").Decimal | null;
        taxAmount: import("@prisma/client/runtime/library").Decimal | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal | null;
        totalAmount: import("@prisma/client/runtime/library").Decimal | null;
        closedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
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
            sessionNumber: string;
            restaurantId: string;
            tableId: string | null;
        };
        items: ({
            menuItem: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            batchId: string;
            menuItemId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            preparedAt: Date | null;
            servedAt: Date | null;
            cancelledAt: Date | null;
            cancelReason: string | null;
        })[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.BatchStatus;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        sessionId: string;
        batchNumber: string;
        notes: string | null;
    }>;
    findAllBatches(actor: User, restaurantId: string, sessionId: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            status: import(".prisma/client").$Enums.BatchStatus;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            sessionId: string;
            batchNumber: string;
            notes: string | null;
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
            sessionNumber: string;
            restaurantId: string;
            tableId: string | null;
        };
        items: {
            id: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
        }[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.BatchStatus;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        sessionId: string;
        batchNumber: string;
        notes: string | null;
    }>;
    updateItemStatus(actor: User, itemId: string, dto: UpdateItemStatusDto): Promise<{
        menuItem: {
            id: string;
            name: string;
        };
        batch: {
            id: string;
            sessionId: string;
            batchNumber: string;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.OrderItemStatus;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        batchId: string;
        menuItemId: string;
        quantity: number;
        unitPrice: import("@prisma/client/runtime/library").Decimal;
        totalPrice: import("@prisma/client/runtime/library").Decimal;
        preparedAt: Date | null;
        servedAt: Date | null;
        cancelledAt: Date | null;
        cancelReason: string | null;
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
            status: import(".prisma/client").$Enums.OrderItemStatus;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            batchId: string;
            menuItemId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            preparedAt: Date | null;
            servedAt: Date | null;
            cancelledAt: Date | null;
            cancelReason: string | null;
        })[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.BatchStatus;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        sessionId: string;
        batchNumber: string;
        notes: string | null;
    })[]>;
    getBillingView(actor: User, restaurantId: string): Promise<({
        table: {
            id: string;
            name: string;
        } | null;
        batches: {
            status: import(".prisma/client").$Enums.BatchStatus;
            _count: {
                items: number;
            };
        }[];
        bill: {
            id: string;
            status: import(".prisma/client").$Enums.BillStatus;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            billNumber: string;
            payments: {
                amount: import("@prisma/client/runtime/library").Decimal;
            }[];
        } | null;
    } & {
        id: string;
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
        deliveryFee: import("@prisma/client/runtime/library").Decimal | null;
        specialInstructions: string | null;
        subtotal: import("@prisma/client/runtime/library").Decimal | null;
        taxAmount: import("@prisma/client/runtime/library").Decimal | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal | null;
        totalAmount: import("@prisma/client/runtime/library").Decimal | null;
        closedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        tableId: string | null;
        openedById: string;
    })[]>;
    generateBill(actor: User, restaurantId: string, sessionId: string, dto: GenerateBillDto): Promise<{
        items: {
            id: string;
            name: string;
            menuItemId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            billId: string;
        }[];
        generatedBy: {
            id: string;
            name: string;
        } | null;
        payments: {
            id: string;
            createdAt: Date;
            notes: string | null;
            billId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            method: import(".prisma/client").$Enums.PaymentMethod;
            reference: string | null;
            processedById: string | null;
        }[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.BillStatus;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        sessionId: string;
        notes: string | null;
        billNumber: string;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        generatedById: string | null;
        paidAt: Date | null;
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
            menuItemId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            billId: string;
        })[];
        generatedBy: {
            id: string;
            name: string;
        } | null;
        payments: {
            id: string;
            createdAt: Date;
            notes: string | null;
            billId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            method: import(".prisma/client").$Enums.PaymentMethod;
            reference: string | null;
            processedById: string | null;
        }[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.BillStatus;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        sessionId: string;
        notes: string | null;
        billNumber: string;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        generatedById: string | null;
        paidAt: Date | null;
    }>;
    addPayment(actor: User, billId: string, dto: AddPaymentDto): Promise<{
        payment: {
            id: string;
            createdAt: Date;
            notes: string | null;
            billId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
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
        notes: string | null;
        billId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        method: import(".prisma/client").$Enums.PaymentMethod;
        reference: string | null;
        processedById: string | null;
    })[]>;
}
