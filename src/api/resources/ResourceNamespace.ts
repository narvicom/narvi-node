// ResourceNamespace allows you to create nested resources, i.e. `narvi.issuing.cards`.

import { NarviObject, NarviResourceObject } from '../../Types'

export type NarviResourceNamespaceObject = {
  [key: string]: NarviResourceObject | NarviResourceNamespaceObject
}

// It also works recursively, so you could do i.e. `narvi.billing.invoicing.pay`.
function ResourceNamespace(
  this: NarviResourceNamespaceObject,
  narvi: NarviObject,
  resources: Record<
    string,
    new (...args: any[]) => NarviResourceObject | NarviResourceNamespaceObject
  >,
): void {
  for (const name in resources) {
    const camelCaseName = name[0].toLowerCase() + name.substring(1)

    const resource = new resources[name](narvi)

    this[camelCaseName] = resource
  }
}

export function resourceNamespace(
  namespace: string,
  resources: Record<
    string,
    new (...args: any[]) => NarviResourceObject | NarviResourceNamespaceObject
  >,
): new (narvi: NarviObject) => NarviResourceNamespaceObject {
  return function (narvi: NarviObject): NarviResourceNamespaceObject {
    return new (ResourceNamespace as any)(narvi, resources)
  } as any
}
