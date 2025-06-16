"use strict";
// ResourceNamespace allows you to create nested resources, i.e. `narvi.issuing.cards`.
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceNamespace = void 0;
// It also works recursively, so you could do i.e. `narvi.billing.invoicing.pay`.
function ResourceNamespace(narvi, resources) {
    for (const name in resources) {
        const camelCaseName = name[0].toLowerCase() + name.substring(1);
        const resource = new resources[name](narvi);
        this[camelCaseName] = resource;
    }
}
function resourceNamespace(namespace, resources) {
    return function (narvi) {
        return new ResourceNamespace(narvi, resources);
    };
}
exports.resourceNamespace = resourceNamespace;
