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
exports.S3Controller = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const s3_service_1 = require("./s3.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const swagger_1 = require("@nestjs/swagger");
let S3Controller = class S3Controller {
    constructor(s3Service) {
        this.s3Service = s3Service;
    }
    async uploadFile(file, folder) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        return this.s3Service.uploadFile(file, folder || 'products');
    }
    async uploadMultipleFiles(files, folder) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('No files uploaded');
        }
        return this.s3Service.uploadMultipleFiles(files, folder || 'products');
    }
    async deleteFile(key) {
        if (!key) {
            throw new common_1.BadRequestException('File key is required');
        }
        await this.s3Service.deleteFile(key);
        return { message: 'File deleted successfully' };
    }
    async deleteMultipleFiles(keys) {
        if (!keys || keys.length === 0) {
            throw new common_1.BadRequestException('File keys are required');
        }
        await this.s3Service.deleteMultipleFiles(keys);
        return { message: 'Files deleted successfully' };
    }
};
exports.S3Controller = S3Controller;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('folder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], S3Controller.prototype, "uploadFile", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, common_1.Post)('upload-multiple'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 10)),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)('folder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, String]),
    __metadata("design:returntype", Promise)
], S3Controller.prototype, "uploadMultipleFiles", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, common_1.Delete)('delete'),
    __param(0, (0, common_1.Body)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], S3Controller.prototype, "deleteFile", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, common_1.Delete)('delete-multiple'),
    __param(0, (0, common_1.Body)('keys')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], S3Controller.prototype, "deleteMultipleFiles", null);
exports.S3Controller = S3Controller = __decorate([
    (0, swagger_1.ApiTags)('S3'),
    (0, common_1.Controller)('s3'),
    __metadata("design:paramtypes", [s3_service_1.S3Service])
], S3Controller);
//# sourceMappingURL=s3.controller.js.map