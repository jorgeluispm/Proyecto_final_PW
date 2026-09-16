"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductVariant = void 0;
var typeorm_1 = require("typeorm");
var product_entity_1 = require("./product.entity");
var ProductVariant = function () {
    var _classDecorators = [(0, typeorm_1.Entity)('product_variants')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _productId_decorators;
    var _productId_initializers = [];
    var _productId_extraInitializers = [];
    var _variantName_decorators;
    var _variantName_initializers = [];
    var _variantName_extraInitializers = [];
    var _price_decorators;
    var _price_initializers = [];
    var _price_extraInitializers = [];
    var _stockQuantity_decorators;
    var _stockQuantity_initializers = [];
    var _stockQuantity_extraInitializers = [];
    var _isAvailable_decorators;
    var _isAvailable_initializers = [];
    var _isAvailable_extraInitializers = [];
    var _createdAt_decorators;
    var _createdAt_initializers = [];
    var _createdAt_extraInitializers = [];
    var _product_decorators;
    var _product_initializers = [];
    var _product_extraInitializers = [];
    var ProductVariant = _classThis = /** @class */ (function () {
        function ProductVariant_1() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.productId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _productId_initializers, void 0));
            this.variantName = (__runInitializers(this, _productId_extraInitializers), __runInitializers(this, _variantName_initializers, void 0));
            this.price = (__runInitializers(this, _variantName_extraInitializers), __runInitializers(this, _price_initializers, void 0));
            this.stockQuantity = (__runInitializers(this, _price_extraInitializers), __runInitializers(this, _stockQuantity_initializers, void 0));
            this.isAvailable = (__runInitializers(this, _stockQuantity_extraInitializers), __runInitializers(this, _isAvailable_initializers, void 0));
            this.createdAt = (__runInitializers(this, _isAvailable_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.product = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _product_initializers, void 0));
            __runInitializers(this, _product_extraInitializers);
        }
        return ProductVariant_1;
    }());
    __setFunctionName(_classThis, "ProductVariant");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)()];
        _productId_decorators = [(0, typeorm_1.Column)({ name: 'product_id' })];
        _variantName_decorators = [(0, typeorm_1.Column)({ name: 'variant_name' })];
        _price_decorators = [(0, typeorm_1.Column)({ type: 'numeric', precision: 10, scale: 2 })];
        _stockQuantity_decorators = [(0, typeorm_1.Column)({ name: 'stock_quantity', default: 0 })];
        _isAvailable_decorators = [(0, typeorm_1.Column)({ name: 'is_available', default: true })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' })];
        _product_decorators = [(0, typeorm_1.ManyToOne)(function () { return product_entity_1.Product; }, function (product) { return product.variants; }), (0, typeorm_1.JoinColumn)({ name: 'product_id' })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _productId_decorators, { kind: "field", name: "productId", static: false, private: false, access: { has: function (obj) { return "productId" in obj; }, get: function (obj) { return obj.productId; }, set: function (obj, value) { obj.productId = value; } }, metadata: _metadata }, _productId_initializers, _productId_extraInitializers);
        __esDecorate(null, null, _variantName_decorators, { kind: "field", name: "variantName", static: false, private: false, access: { has: function (obj) { return "variantName" in obj; }, get: function (obj) { return obj.variantName; }, set: function (obj, value) { obj.variantName = value; } }, metadata: _metadata }, _variantName_initializers, _variantName_extraInitializers);
        __esDecorate(null, null, _price_decorators, { kind: "field", name: "price", static: false, private: false, access: { has: function (obj) { return "price" in obj; }, get: function (obj) { return obj.price; }, set: function (obj, value) { obj.price = value; } }, metadata: _metadata }, _price_initializers, _price_extraInitializers);
        __esDecorate(null, null, _stockQuantity_decorators, { kind: "field", name: "stockQuantity", static: false, private: false, access: { has: function (obj) { return "stockQuantity" in obj; }, get: function (obj) { return obj.stockQuantity; }, set: function (obj, value) { obj.stockQuantity = value; } }, metadata: _metadata }, _stockQuantity_initializers, _stockQuantity_extraInitializers);
        __esDecorate(null, null, _isAvailable_decorators, { kind: "field", name: "isAvailable", static: false, private: false, access: { has: function (obj) { return "isAvailable" in obj; }, get: function (obj) { return obj.isAvailable; }, set: function (obj, value) { obj.isAvailable = value; } }, metadata: _metadata }, _isAvailable_initializers, _isAvailable_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: function (obj) { return "createdAt" in obj; }, get: function (obj) { return obj.createdAt; }, set: function (obj, value) { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _product_decorators, { kind: "field", name: "product", static: false, private: false, access: { has: function (obj) { return "product" in obj; }, get: function (obj) { return obj.product; }, set: function (obj, value) { obj.product = value; } }, metadata: _metadata }, _product_initializers, _product_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ProductVariant = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ProductVariant = _classThis;
}();
exports.ProductVariant = ProductVariant;
