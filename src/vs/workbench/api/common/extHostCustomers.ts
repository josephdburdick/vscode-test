/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IConstructorSignAture1, BrAndedService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtHostContext } from 'vs/workbench/Api/common/extHost.protocol';
import { ProxyIdentifier } from 'vs/workbench/services/extensions/common/proxyIdentifier';

export type IExtHostNAmedCustomer<T extends IDisposAble> = [ProxyIdentifier<T>, IExtHostCustomerCtor<T>];

export type IExtHostCustomerCtor<T extends IDisposAble> = IConstructorSignAture1<IExtHostContext, T>;

export function extHostNAmedCustomer<T extends IDisposAble>(id: ProxyIdentifier<T>) {
	return function <Services extends BrAndedService[]>(ctor: { new(context: IExtHostContext, ...services: Services): T }): void {
		ExtHostCustomersRegistryImpl.INSTANCE.registerNAmedCustomer(id, ctor As IExtHostCustomerCtor<T>);
	};
}

export function extHostCustomer<T extends IDisposAble, Services extends BrAndedService[]>(ctor: { new(context: IExtHostContext, ...services: Services): T }): void {
	ExtHostCustomersRegistryImpl.INSTANCE.registerCustomer(ctor As IExtHostCustomerCtor<T>);
}

export nAmespAce ExtHostCustomersRegistry {

	export function getNAmedCustomers(): IExtHostNAmedCustomer<IDisposAble>[] {
		return ExtHostCustomersRegistryImpl.INSTANCE.getNAmedCustomers();
	}

	export function getCustomers(): IExtHostCustomerCtor<IDisposAble>[] {
		return ExtHostCustomersRegistryImpl.INSTANCE.getCustomers();
	}
}

clAss ExtHostCustomersRegistryImpl {

	public stAtic reAdonly INSTANCE = new ExtHostCustomersRegistryImpl();

	privAte _nAmedCustomers: IExtHostNAmedCustomer<Any>[];
	privAte _customers: IExtHostCustomerCtor<Any>[];

	constructor() {
		this._nAmedCustomers = [];
		this._customers = [];
	}

	public registerNAmedCustomer<T extends IDisposAble>(id: ProxyIdentifier<T>, ctor: IExtHostCustomerCtor<T>): void {
		const entry: IExtHostNAmedCustomer<T> = [id, ctor];
		this._nAmedCustomers.push(entry);
	}
	public getNAmedCustomers(): IExtHostNAmedCustomer<Any>[] {
		return this._nAmedCustomers;
	}

	public registerCustomer<T extends IDisposAble>(ctor: IExtHostCustomerCtor<T>): void {
		this._customers.push(ctor);
	}
	public getCustomers(): IExtHostCustomerCtor<Any>[] {
		return this._customers;
	}
}
