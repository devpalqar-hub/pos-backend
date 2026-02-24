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
            id: string;
            name: string;
            seatCount: number;
            status: import(".prisma/client").$Enums.TableStatus;
        } | null;
        _count: {
            batches: number;
        };
        openedBy: {
            id: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
        tableId: string | null;
        channel: import(".prisma/client").$Enums.OrderChannel;
        customerName: string | null;
        customerPhone: string | null;
        customerEmail: string | null;
        guestCount: number;
        externalOrderId: string | null;
        deliveryAddress: string | null;
        specialInstructions: string | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal | null;
        sessionNumber: string;
        externalChannel: string | null;
        deliveryFee: import("@prisma/client/runtime/library").Decimal | null;
        subtotal: import("@prisma/client/runtime/library").Decimal | null;
        taxAmount: import("@prisma/client/runtime/library").Decimal | null;
        totalAmount: import("@prisma/client/runtime/library").Decimal | null;
        openedById: string;
        closedAt: Date | null;
    }>;
    findAllSessions(actor: User, restaurantId: string, status?: SessionStatus, tableId?: string, channel?: string): Promise<({
        table: {
            id: string;
            name: string;
            seatCount: number;
            status: import(".prisma/client").$Enums.TableStatus;
        } | null;
        _count: {
            batches: number;
        };
        openedBy: {
            id: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
        tableId: string | null;
        channel: import(".prisma/client").$Enums.OrderChannel;
        customerName: string | null;
        customerPhone: string | null;
        customerEmail: string | null;
        guestCount: number;
        externalOrderId: string | null;
        deliveryAddress: string | null;
        specialInstructions: string | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal | null;
        sessionNumber: string;
        externalChannel: string | null;
        deliveryFee: import("@prisma/client/runtime/library").Decimal | null;
        subtotal: import("@prisma/client/runtime/library").Decimal | null;
        taxAmount: import("@prisma/client/runtime/library").Decimal | null;
        totalAmount: import("@prisma/client/runtime/library").Decimal | null;
        openedById: string;
        closedAt: Date | null;
    })[]>;
    findOneSession(actor: User, restaurantId: string, sessionId: string): Promise<{
        table: {
            id: string;
            name: string;
            seatCount: number;
            groupId: string | null;
            status: import(".prisma/client").$Enums.TableStatus;
        } | null;
        bill: ({
            items: {
                id: string;
                name: string;
                quantity: number;
                menuItemId: string;
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
                amount: import("@prisma/client/runtime/library").Decimal;
                method: import(".prisma/client").$Enums.PaymentMethod;
                reference: string | null;
                billId: string;
                processedById: string | null;
            }[];
        } & {
            id: string;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            taxRate: import("@prisma/client/runtime/library").Decimal;
            status: import(".prisma/client").$Enums.BillStatus;
            notes: string | null;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            sessionId: string;
            billNumber: string;
            generatedById: string | null;
            paidAt: Date | null;
        }) | null;
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
                quantity: number;
                menuItemId: string;
                status: import(".prisma/client").$Enums.OrderItemStatus;
                notes: string | null;
                cancelReason: string | null;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                totalPrice: import("@prisma/client/runtime/library").Decimal;
                preparedAt: Date | null;
                servedAt: Date | null;
                cancelledAt: Date | null;
                batchId: string;
            })[];
        } & {
            id: string;
            createdById: string | null;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.BatchStatus;
            notes: string | null;
            sessionId: string;
            batchNumber: string;
        })[];
    } & {
        id: string;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
        tableId: string | null;
        channel: import(".prisma/client").$Enums.OrderChannel;
        customerName: string | null;
        customerPhone: string | null;
        customerEmail: string | null;
        guestCount: number;
        externalOrderId: string | null;
        deliveryAddress: string | null;
        specialInstructions: string | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal | null;
        sessionNumber: string;
        externalChannel: string | null;
        deliveryFee: import("@prisma/client/runtime/library").Decimal | null;
        subtotal: import("@prisma/client/runtime/library").Decimal | null;
        taxAmount: import("@prisma/client/runtime/library").Decimal | null;
        totalAmount: import("@prisma/client/runtime/library").Decimal | null;
        openedById: string;
        closedAt: Date | null;
    }>;
    updateSessionStatus(actor: User, restaurantId: string, sessionId: string, dto: UpdateSessionStatusDto): Promise<{
        table: {
            id: string;
            name: string;
            seatCount: number;
            status: import(".prisma/client").$Enums.TableStatus;
        } | null;
        _count: {
            batches: number;
        };
        openedBy: {
            id: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    } & {
        id: string;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SessionStatus;
        tableId: string | null;
        channel: import(".prisma/client").$Enums.OrderChannel;
        customerName: string | null;
        customerPhone: string | null;
        customerEmail: string | null;
        guestCount: number;
        externalOrderId: string | null;
        deliveryAddress: string | null;
        specialInstructions: string | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal | null;
        sessionNumber: string;
        externalChannel: string | null;
        deliveryFee: import("@prisma/client/runtime/library").Decimal | null;
        subtotal: import("@prisma/client/runtime/library").Decimal | null;
        taxAmount: import("@prisma/client/runtime/library").Decimal | null;
        totalAmount: import("@prisma/client/runtime/library").Decimal | null;
        openedById: string;
        closedAt: Date | null;
    }>;
    addBatch(actor: User, restaurantId: string, sessionId: string, dto: CreateBatchDto): Promise<{
        createdBy: {
            id: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
        } | null;
        items: ({
            menuItem: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            quantity: number;
            menuItemId: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
            notes: string | null;
            cancelReason: string | null;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            preparedAt: Date | null;
            servedAt: Date | null;
            cancelledAt: Date | null;
            batchId: string;
        })[];
        session: {
            id: string;
            restaurantId: string;
            tableId: string | null;
            sessionNumber: string;
        };
    } & {
        id: string;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BatchStatus;
        notes: string | null;
        sessionId: string;
        batchNumber: string;
    }>;
    findAllBatches(actor: User, restaurantId: string, sessionId: string): Promise<({
        createdBy: {
            id: string;
            name: string;
            role: import(".prisma/client").$Enums.UserRole;
        } | null;
        items: ({
            menuItem: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            quantity: number;
            menuItemId: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
            notes: string | null;
            cancelReason: string | null;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            preparedAt: Date | null;
            servedAt: Date | null;
            cancelledAt: Date | null;
            batchId: string;
        })[];
    } & {
        id: string;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BatchStatus;
        notes: string | null;
        sessionId: string;
        batchNumber: string;
    })[]>;
    updateBatchStatus(actor: User, batchId: string, dto: UpdateBatchStatusDto): Promise<{
        items: {
            id: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
        }[];
        session: {
            id: string;
            restaurantId: string;
            tableId: string | null;
            sessionNumber: string;
        };
    } & {
        id: string;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BatchStatus;
        notes: string | null;
        sessionId: string;
        batchNumber: string;
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
        createdAt: Date;
        updatedAt: Date;
        quantity: number;
        menuItemId: string;
        status: import(".prisma/client").$Enums.OrderItemStatus;
        notes: string | null;
        cancelReason: string | null;
        unitPrice: import("@prisma/client/runtime/library").Decimal;
        totalPrice: import("@prisma/client/runtime/library").Decimal;
        preparedAt: Date | null;
        servedAt: Date | null;
        cancelledAt: Date | null;
        batchId: string;
    }>;
    getKitchenView(actor: User, restaurantId: string): Promise<({
        createdBy: {
            id: string;
            name: string;
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
            quantity: number;
            menuItemId: string;
            status: import(".prisma/client").$Enums.OrderItemStatus;
            notes: string | null;
            cancelReason: string | null;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            preparedAt: Date | null;
            servedAt: Date | null;
            cancelledAt: Date | null;
            batchId: string;
        })[];
        session: {
            id: string;
            table: {
                id: string;
                name: string;
            } | null;
            channel: import(".prisma/client").$Enums.OrderChannel;
            sessionNumber: string;
        };
    } & {
        id: string;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.BatchStatus;
        notes: string | null;
        sessionId: string;
        batchNumber: string;
    })[]>;
    getBillingView(actor: User, restaurantId: string): Promise<({
        table: {
            id: string;
            name: string;
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
        tableId: string | null;
        channel: import(".prisma/client").$Enums.OrderChannel;
        customerName: string | null;
        customerPhone: string | null;
        customerEmail: string | null;
        guestCount: number;
        externalOrderId: string | null;
        deliveryAddress: string | null;
        specialInstructions: string | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal | null;
        sessionNumber: string;
        externalChannel: string | null;
        deliveryFee: import("@prisma/client/runtime/library").Decimal | null;
        subtotal: import("@prisma/client/runtime/library").Decimal | null;
        taxAmount: import("@prisma/client/runtime/library").Decimal | null;
        totalAmount: import("@prisma/client/runtime/library").Decimal | null;
        openedById: string;
        closedAt: Date | null;
    })[]>;
    generateBill(actor: User, restaurantId: string, sessionId: string, dto: GenerateBillDto): Promise<{
        items: {
            id: string;
            name: string;
            quantity: number;
            menuItemId: string;
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
            amount: import("@prisma/client/runtime/library").Decimal;
            method: import(".prisma/client").$Enums.PaymentMethod;
            reference: string | null;
            billId: string;
            processedById: string | null;
        }[];
    } & {
        id: string;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.BillStatus;
        notes: string | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        sessionId: string;
        billNumber: string;
        generatedById: string | null;
        paidAt: Date | null;
    }>;
    getBillForSession(actor: User, restaurantId: string, sessionId: string): Promise<{
        items: ({
            menuItem: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            name: string;
            quantity: number;
            menuItemId: string;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            totalPrice: import("@prisma/client/runtime/library").Decimal;
            billId: string;
        })[];
        session: {
            id: string;
            table: {
                id: string;
                name: string;
            } | null;
            channel: import(".prisma/client").$Enums.OrderChannel;
            customerName: string | null;
            customerPhone: string | null;
            sessionNumber: string;
        };
        generatedBy: {
            id: string;
            name: string;
        } | null;
        payments: {
            id: string;
            createdAt: Date;
            notes: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            method: import(".prisma/client").$Enums.PaymentMethod;
            reference: string | null;
            billId: string;
            processedById: string | null;
        }[];
    } & {
        id: string;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        taxRate: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.BillStatus;
        notes: string | null;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        taxAmount: import("@prisma/client/runtime/library").Decimal;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        sessionId: string;
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
            method: import(".prisma/client").$Enums.PaymentMethod;
            reference: string | null;
            billId: string;
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
        amount: import("@prisma/client/runtime/library").Decimal;
        method: import(".prisma/client").$Enums.PaymentMethod;
        reference: string | null;
        billId: string;
        processedById: string | null;
    })[]>;
}
