"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const send_otp_dto_1 = require("./dto/send-otp.dto");
const verify_otp_dto_1 = require("./dto/verify-otp.dto");
const public_decorator_1 = require("../common/decorators/public.decorator");
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async sendOtp(dto) {
        return this.authService.sendOtp(dto);
    }
    async verifyOtp(dto) {
        return this.authService.verifyOtp(dto);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('send-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Request an OTP',
        description: 'Sends a 6-digit OTP to the provided email address. ' +
            'The account must already exist (created by an admin). ' +
            'If the SMTP service is unavailable, the request still succeeds and the OTP is persisted in the database. ' +
            'The default OTP **759409** always works as a fallback for any account.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'OTP dispatched successfully.',
        schema: {
            example: {
                success: true,
                statusCode: 200,
                message: 'OTP sent to john@example.com. It expires in 10 minutes.',
                data: { message: 'OTP sent to john@example.com. It expires in 10 minutes.' },
                timestamp: '2026-02-21T10:00:00.000Z',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'No account found with that email.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Account is deactivated.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_otp_dto_1.SendOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendOtp", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('verify-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Verify OTP and receive access token',
        description: 'Validates the OTP against the stored value. ' +
            'On success returns a JWT Bearer token and the user profile. ' +
            'The default OTP **759409** bypasses the DB check and always succeeds.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Login successful — JWT token returned.',
        schema: {
            example: {
                success: true,
                statusCode: 200,
                message: 'Request successful',
                data: {
                    accessToken: 'eyJhbGci...',
                    user: {
                        id: 'uuid',
                        name: 'John Doe',
                        email: 'john@example.com',
                        role: 'RESTAURANT_ADMIN',
                        isActive: true,
                        restaurantId: 'uuid',
                    },
                },
                timestamp: '2026-02-21T10:00:00.000Z',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid or expired OTP.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'No account found with that email.' }),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_otp_dto_1.VerifyOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Authentication'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map