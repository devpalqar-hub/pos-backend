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
        _count: {
            batches: number;
        };
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
    } & {
        id: string;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
        channel: import(".prisma/client").$Enums.OrderChannel;
        sessionNumber: string;
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
            status: import(".prisma/client").$Enums.SessionStatus;
            channel: import(".prisma/client").$Enums.OrderChannel;
            sessionNumber: string;
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
        bill: ({
            items: {
                name: string;
                id: string;
                menuItemId: string;
                billId: string;
                quantity: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                totalPrice: import("@prisma/client/runtime/library").Decimal;
            }[];
            generatedBy: {
                name: string;
                id: string;
            } | null;
            payments: {
                id: string;
                createdAt: Date;
                notes: string | null;
                amount: import("@prisma/client/runtime/library").Decimal;
                billId: string;
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
            sessionId: string;
            notes: string | null;
            taxRate: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            billNumber: string;
            generatedById: string | null;
            paidAt: Date | null;
        }) | null;
        openedBy: {
            name: string;
            id: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
        batches: ({
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
                menuItemId: string;
                status: import(".prisma/client").$Enums.OrderItemStatus;
                notes: string | null;
                quantity: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                totalPrice: import("@prisma/client/runtime/library").Decimal;
                batchId: string;
                preparedAt: Date | null;
                servedAt: Date | null;
                cancelledAt: Date | null;
                cancelReason: string | null;
            })[];
            createdBy: {
                name: string;
                id: string;
                role: import(".prisma/client").$Enums.UserRole;
            } | null;
        } & {
            id: string;
            createdById: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.BatchStatus;
            sessionId: string;
            notes: string | null;
            batchNumber: string;
        })[];
    } & {
        id: string;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
        channel: import(".prisma/client").$Enums.OrderChannel;
        sessionNumber: string;
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
        _count: {
            batches: number;
        };
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
    } & {
        id: string;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
        channel: import(".prisma/client").$Enums.OrderChannel;
        sessionNumber: string;
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
        items: ({
            menuItem: {
                name: string;
                id: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            menuItemId: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
            notes: string | null;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            batchId: string;
            preparedAt: Date | null;
            servedAt: Date | null;
            cancelledAt: Date | null;
            cancelReason: string | null;
        })[];
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
    } & {
        id: string;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BatchStatus;
        sessionId: string;
        notes: string | null;
        batchNumber: string;
    }>;
    findAllBatches(actor: User, restaurantId: string, sessionId: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            createdById: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.BatchStatus;
            sessionId: string;
            notes: string | null;
            batchNumber: string;
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
        items: {
            id: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
        }[];
        session: {
            id: string;
            restaurantId: string;
            sessionNumber: string;
            tableId: string | null;
        };
    } & {
        id: string;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BatchStatus;
        sessionId: string;
        notes: string | null;
        batchNumber: string;
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
        menuItemId: string;
        status: import(".prisma/client").$Enums.OrderItemStatus;
        notes: string | null;
        quantity: number;
        unitPrice: import("@prisma/client/runtime/library").Decimal;
        totalPrice: import("@prisma/client/runtime/library").Decimal;
        batchId: string;
        preparedAt: Date | null;
        servedAt: Date | null;
        cancelledAt: Date | null;
        cancelReason: string | null;
    }>;
    getKitchenView(actor: User, restaurantId: string): Promise<({
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
            menuItemId: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
            notes: string | null;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            batchId: string;
            preparedAt: Date | null;
            servedAt: Date | null;
            cancelledAt: Date | null;
            cancelReason: string | null;
        })[];
        createdBy: {
            name: string;
            id: string;
        } | null;
        session: {
            id: string;
            channel: import(".prisma/client").$Enums.OrderChannel;
            table: {
                name: string;
                id: string;
            } | null;
            sessionNumber: string;
        };
    } & {
        id: string;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BatchStatus;
        sessionId: string;
        notes: string | null;
        batchNumber: string;
    })[]>;
    getBillingView(actor: User, restaurantId: string): Promise<({
        table: {
            name: string;
            id: string;
        } | null;
        bill: {
            id: string;
            status: import(".prisma/client").$Enums.BillStatus;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            billNumber: string;
            payments: {
                amount: import("@prisma/client/runtime/library").Decimal;
            }[];
        } | null;
        batches: {
            _count: {
                items: number;
            };
            status: import(".prisma/client").$Enums.BatchStatus;
        }[];
    } & {
        id: string;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
        channel: import(".prisma/client").$Enums.OrderChannel;
        sessionNumber: string;
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
            billId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
        }[];
        generatedBy: {
            name: string;
            id: string;
        } | null;
        payments: {
            id: string;
            createdAt: Date;
            notes: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            billId: string;
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
        sessionId: string;
        notes: string | null;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        billNumber: string;
        generatedById: string | null;
        paidAt: Date | null;
    }>;
    getBillForSession(actor: User, restaurantId: string, sessionId: string): Promise<{
        items: ({
            menuItem: {
                name: string;
                id: string;
            };
        } & {
            name: string;
            id: string;
            menuItemId: string;
            billId: string;
            quantity: number;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
        })[];
        session: {
            id: string;
            channel: import(".prisma/client").$Enums.OrderChannel;
            table: {
                name: string;
                id: string;
            } | null;
            sessionNumber: string;
            customerName: string | null;
            customerPhone: string | null;
        };
        generatedBy: {
            name: string;
            id: string;
        } | null;
        payments: {
            id: string;
            createdAt: Date;
            notes: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            billId: string;
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
        sessionId: string;
        notes: string | null;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        billNumber: string;
        generatedById: string | null;
        paidAt: Date | null;
    }>;
    addPayment(actor: User, billId: string, dto: AddPaymentDto): Promise<{
        payment: {
            id: string;
            createdAt: Date;
            notes: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            billId: string;
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
        amount: import("@prisma/client/runtime/library").Decimal;
        billId: string;
        method: import(".prisma/client").$Enums.PaymentMethod;
        reference: string | null;
        processedById: string | null;
    })[]>;
}
