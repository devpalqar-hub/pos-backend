import { OrdersService } from './orders.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { UpdateBatchStatusDto } from './dto/update-batch-status.dto';
import { UpdateSessionStatusDto, SessionStatus } from './dto/update-session-status.dto';
import { GenerateBillDto } from './dto/generate-bill.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { User } from '@prisma/client';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    createSession(actor: User, restaurantId: string, dto: CreateSessionDto): Promise<{
        table: {
            name: string;
            id: string;
            status: import(".prisma/client").$Enums.TableStatus;
            seatCount: number;
        } | null;
        openedBy: {
            name: string;
            id: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        _count: {
            batches: number;
        };
    } & {
        id: string;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
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
        tableId: string | null;
        openedById: string;
    }>;
    findAllSessions(actor: User, restaurantId: string, status?: SessionStatus, tableId?: string, channel?: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
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
            name: string;
            id: string;
            status: import(".prisma/client").$Enums.TableStatus;
            groupId: string | null;
            seatCount: number;
        } | null;
        openedBy: {
            name: string;
            id: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        batches: ({
            createdBy: {
                name: string;
                id: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
            items: ({
                menuItem: {
                    name: string;
                    id: string;
                    imageUrl: string | null;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.OrderItemStatus;
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
            createdById: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.BatchStatus;
            sessionId: string;
            batchNumber: string;
            notes: string | null;
        })[];
        bill: ({
            items: {
                name: string;
                id: string;
                menuItemId: string;
                quantity: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                totalPrice: import("@prisma/client/runtime/library").Decimal;
                billId: string;
            }[];
            generatedBy: {
                name: string;
                id: string;
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
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.BillStatus;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            sessionId: string;
            notes: string | null;
            billNumber: string;
            taxRate: import("@prisma/client/runtime/library").Decimal;
            generatedById: string | null;
            paidAt: Date | null;
        }) | null;
    } & {
        id: string;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
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
        tableId: string | null;
        openedById: string;
    }>;
    updateSessionStatus(actor: User, restaurantId: string, sessionId: string, dto: UpdateSessionStatusDto): Promise<{
        table: {
            name: string;
            id: string;
            status: import(".prisma/client").$Enums.TableStatus;
            seatCount: number;
        } | null;
        openedBy: {
            name: string;
            id: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        _count: {
            batches: number;
        };
    } & {
        id: string;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
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
        tableId: string | null;
        openedById: string;
    }>;
    addBatch(actor: User, restaurantId: string, sessionId: string, dto: CreateBatchDto): Promise<{
        createdBy: {
            name: string;
            id: string;
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
                name: string;
                id: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.OrderItemStatus;
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
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BatchStatus;
        sessionId: string;
        batchNumber: string;
        notes: string | null;
    }>;
    findAllBatches(actor: User, restaurantId: string, sessionId: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            createdById: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.BatchStatus;
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
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BatchStatus;
        sessionId: string;
        batchNumber: string;
        notes: string | null;
    }>;
    updateItemStatus(actor: User, itemId: string, dto: UpdateItemStatusDto): Promise<{
        menuItem: {
            name: string;
            id: string;
        };
        batch: {
            id: string;
            sessionId: string;
            batchNumber: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderItemStatus;
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
    getKitchenView(actor: User, restaurantId: string): Promise<({
        createdBy: {
            name: string;
            id: string;
        } | null;
        session: {
            id: string;
            sessionNumber: string;
            channel: import(".prisma/client").$Enums.OrderChannel;
            table: {
                name: string;
                id: string;
            } | null;
        };
        items: ({
            menuItem: {
                name: string;
                id: string;
                imageUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.OrderItemStatus;
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
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BatchStatus;
        sessionId: string;
        batchNumber: string;
        notes: string | null;
    })[]>;
    getBillingView(actor: User, restaurantId: string): Promise<({
        table: {
            name: string;
            id: string;
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
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
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
        tableId: string | null;
        openedById: string;
    })[]>;
    generateBill(actor: User, restaurantId: string, sessionId: string, dto: GenerateBillDto): Promise<{
        items: {
            name: string;
            id: string;
            menuItemId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            billId: string;
        }[];
        generatedBy: {
            name: string;
            id: string;
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
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BillStatus;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
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
                name: string;
                id: string;
            } | null;
        };
        items: ({
            menuItem: {
                name: string;
                id: string;
            };
        } & {
            name: string;
            id: string;
            menuItemId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            billId: string;
        })[];
        generatedBy: {
            name: string;
            id: string;
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
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BillStatus;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
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
            name: string;
            id: string;
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
