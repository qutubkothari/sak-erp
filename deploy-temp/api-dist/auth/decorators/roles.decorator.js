"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Roles", {
    enumerable: true,
    get: function() {
        return Roles;
    }
});
const _common = require("@nestjs/common");
const Roles = (...roles)=>(0, _common.SetMetadata)('roles', roles);

//# sourceMappingURL=roles.decorator.js.map