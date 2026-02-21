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
exports.UploadController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const swagger_1 = require("@nestjs/swagger");
const s3_service_1 = require("../common/services/s3.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let UploadController = class UploadController {
    constructor(s3) {
        this.s3 = s3;
    }
    async uploadImage(file, folder = 'misc') {
        const url = await this.s3.upload(file, folder);
        return { message: 'Image uploaded successfully', data: { url } };
    }
};
exports.UploadController = UploadController;
__decorate([
    (0, common_1.Post)('image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: (0, multer_1.memoryStorage)() })),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload a single image to S3',
        description: 'Uploads a JPEG, PNG, WebP or GIF image (max 5 MB) to the S3 bucket ' +
            'and returns the public URL. Use this URL in category or menu item create/update requests.\n\n' +
            '**Supported folders:** `categories`, `menu-items`, `restaurants`, `misc`',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary', description: 'Image file (max 5 MB)' },
            },
            required: ['file'],
        },
    }),
    (0, swagger_1.ApiQuery)({
        name: 'folder',
        required: false,
        enum: ['categories', 'menu-items', 'restaurants', 'misc'],
        description: 'S3 folder/prefix to store the image under (default: misc)',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Image uploaded — returns the public S3 URL.',
        schema: {
            example: {
                success: true,
                statusCode: 201,
                message: 'Image uploaded successfully',
                data: { url: 'https://your-bucket.s3.us-east-1.amazonaws.com/menu-items/uuid.jpg' },
                timestamp: '2026-02-21T10:00:00.000Z',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'No file / unsupported type / file too large.' }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Query)('folder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadImage", null);
exports.UploadController = UploadController = __decorate([
    (0, swagger_1.ApiTags)('Upload'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('upload'),
    __metadata("design:paramtypes", [s3_service_1.S3Service])
], UploadController);
//# sourceMappingURL=upload.controller.js.map