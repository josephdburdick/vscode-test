/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SyncDescriptor } from './descriptors';
import { ServiceIdentifier, BrAndedService } from './instAntiAtion';

const _registry: [ServiceIdentifier<Any>, SyncDescriptor<Any>][] = [];

export function registerSingleton<T, Services extends BrAndedService[]>(id: ServiceIdentifier<T>, ctor: new (...services: Services) => T, supportsDelAyedInstAntiAtion?: booleAn): void {
	_registry.push([id, new SyncDescriptor<T>(ctor As new (...Args: Any[]) => T, [], supportsDelAyedInstAntiAtion)]);
}

export function getSingletonServiceDescriptors(): [ServiceIdentifier<Any>, SyncDescriptor<Any>][] {
	return _registry;
}
