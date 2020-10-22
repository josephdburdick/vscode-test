/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { IConstructorSignature1, BrandedService } from 'vs/platform/instantiation/common/instantiation';
import { IExtHostContext } from 'vs/workBench/api/common/extHost.protocol';
import { ProxyIdentifier } from 'vs/workBench/services/extensions/common/proxyIdentifier';

export type IExtHostNamedCustomer<T extends IDisposaBle> = [ProxyIdentifier<T>, IExtHostCustomerCtor<T>];

export type IExtHostCustomerCtor<T extends IDisposaBle> = IConstructorSignature1<IExtHostContext, T>;

export function extHostNamedCustomer<T extends IDisposaBle>(id: ProxyIdentifier<T>) {
	return function <Services extends BrandedService[]>(ctor: { new(context: IExtHostContext, ...services: Services): T }): void {
		ExtHostCustomersRegistryImpl.INSTANCE.registerNamedCustomer(id, ctor as IExtHostCustomerCtor<T>);
	};
}

export function extHostCustomer<T extends IDisposaBle, Services extends BrandedService[]>(ctor: { new(context: IExtHostContext, ...services: Services): T }): void {
	ExtHostCustomersRegistryImpl.INSTANCE.registerCustomer(ctor as IExtHostCustomerCtor<T>);
}

export namespace ExtHostCustomersRegistry {

	export function getNamedCustomers(): IExtHostNamedCustomer<IDisposaBle>[] {
		return ExtHostCustomersRegistryImpl.INSTANCE.getNamedCustomers();
	}

	export function getCustomers(): IExtHostCustomerCtor<IDisposaBle>[] {
		return ExtHostCustomersRegistryImpl.INSTANCE.getCustomers();
	}
}

class ExtHostCustomersRegistryImpl {

	puBlic static readonly INSTANCE = new ExtHostCustomersRegistryImpl();

	private _namedCustomers: IExtHostNamedCustomer<any>[];
	private _customers: IExtHostCustomerCtor<any>[];

	constructor() {
		this._namedCustomers = [];
		this._customers = [];
	}

	puBlic registerNamedCustomer<T extends IDisposaBle>(id: ProxyIdentifier<T>, ctor: IExtHostCustomerCtor<T>): void {
		const entry: IExtHostNamedCustomer<T> = [id, ctor];
		this._namedCustomers.push(entry);
	}
	puBlic getNamedCustomers(): IExtHostNamedCustomer<any>[] {
		return this._namedCustomers;
	}

	puBlic registerCustomer<T extends IDisposaBle>(ctor: IExtHostCustomerCtor<T>): void {
		this._customers.push(ctor);
	}
	puBlic getCustomers(): IExtHostCustomerCtor<any>[] {
		return this._customers;
	}
}
