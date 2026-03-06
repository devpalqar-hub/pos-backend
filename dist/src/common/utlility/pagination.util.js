"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginate = paginate;
async function paginate({ prismaModel, page = 1, limit = 10, fetchAll = false, where, include, orderBy, }) {
    if (fetchAll) {
        const [data, total] = await Promise.all([
            prismaModel.findMany({ where, include, orderBy }),
            prismaModel.count({ where }),
        ]);
        return {
            data,
            meta: {
                total,
                page: 1,
                limit: total,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: false,
            },
        };
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        prismaModel.findMany({
            skip,
            take: limit,
            where,
            include,
            orderBy,
        }),
        prismaModel.count({ where }),
    ]);
    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1,
        },
    };
}
//# sourceMappingURL=pagination.util.js.map