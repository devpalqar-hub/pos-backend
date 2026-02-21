"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePriceRuleDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_price_rule_dto_1 = require("./create-price-rule.dto");
class UpdatePriceRuleDto extends (0, swagger_1.PartialType)(create_price_rule_dto_1.CreatePriceRuleDto) {
}
exports.UpdatePriceRuleDto = UpdatePriceRuleDto;
//# sourceMappingURL=update-price-rule.dto.js.map