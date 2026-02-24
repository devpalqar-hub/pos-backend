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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBatchStatusDto = exports.BatchStatus = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var BatchStatus;
(function (BatchStatus) {
    BatchStatus["PENDING"] = "PENDING";
    BatchStatus["IN_PROGRESS"] = "IN_PROGRESS";
    BatchStatus["READY"] = "READY";
    BatchStatus["SERVED"] = "SERVED";
})(BatchStatus || (exports.BatchStatus = BatchStatus = {}));
class UpdateBatchStatusDto {
}
exports.UpdateBatchStatusDto = UpdateBatchStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: BatchStatus }),
    (0, class_validator_1.IsEnum)(BatchStatus),
    __metadata("design:type", String)
], UpdateBatchStatusDto.prototype, "status", void 0);
//# sourceMappingURL=update-batch-status.dto.js.map