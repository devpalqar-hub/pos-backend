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
exports.RemoveStaffDto = exports.AssignStaffDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class AssignStaffDto {
}
exports.AssignStaffDto = AssignStaffDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'UUID of the user to assign to this restaurant',
        example: 'user-uuid',
    }),
    (0, class_validator_1.IsUUID)('4', { message: 'userId must be a valid UUID' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'userId is required' }),
    __metadata("design:type", String)
], AssignStaffDto.prototype, "userId", void 0);
class RemoveStaffDto {
}
exports.RemoveStaffDto = RemoveStaffDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'UUID of the user to remove from this restaurant',
        example: 'user-uuid',
    }),
    (0, class_validator_1.IsUUID)('4', { message: 'userId must be a valid UUID' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'userId is required' }),
    __metadata("design:type", String)
], RemoveStaffDto.prototype, "userId", void 0);
//# sourceMappingURL=assign-staff.dto.js.map