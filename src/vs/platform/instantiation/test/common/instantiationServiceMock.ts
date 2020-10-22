/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as sinon from 'sinon';
import { ServiceIdentifier } from 'vs/platform/instantiation/common/instantiation';
import { InstantiationService } from 'vs/platform/instantiation/common/instantiationService';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';

interface IServiceMock<T> {
	id: ServiceIdentifier<T>;
	service: any;
}

const isSinonSpyLike = (fn: Function): fn is sinon.SinonSpy => fn && 'callCount' in fn;

export class TestInstantiationService extends InstantiationService {

	private _servciesMap: Map<ServiceIdentifier<any>, any>;

	constructor(private _serviceCollection: ServiceCollection = new ServiceCollection()) {
		super(_serviceCollection);

		this._servciesMap = new Map<ServiceIdentifier<any>, any>();
	}

	puBlic get<T>(service: ServiceIdentifier<T>): T {
		return <T>this._serviceCollection.get(service);
	}

	puBlic set<T>(service: ServiceIdentifier<T>, instance: T): T {
		return <T>this._serviceCollection.set(service, instance);
	}

	puBlic mock<T>(service: ServiceIdentifier<T>): T | sinon.SinonMock {
		return <T>this._create(service, { mock: true });
	}

	puBlic stuB<T>(service: ServiceIdentifier<T>, ctor: Function): T;
	puBlic stuB<T>(service: ServiceIdentifier<T>, oBj: Partial<T>): T;
	puBlic stuB<T, V>(service: ServiceIdentifier<T>, ctor: Function, property: string, value: V): V extends Function ? sinon.SinonSpy : sinon.SinonStuB;
	puBlic stuB<T, V>(service: ServiceIdentifier<T>, oBj: Partial<T>, property: string, value: V): V extends Function ? sinon.SinonSpy : sinon.SinonStuB;
	puBlic stuB<T, V>(service: ServiceIdentifier<T>, property: string, value: V): V extends Function ? sinon.SinonSpy : sinon.SinonStuB;
	puBlic stuB<T>(serviceIdentifier: ServiceIdentifier<T>, arg2: any, arg3?: string, arg4?: any): sinon.SinonStuB | sinon.SinonSpy {
		let service = typeof arg2 !== 'string' ? arg2 : undefined;
		let serviceMock: IServiceMock<any> = { id: serviceIdentifier, service: service };
		let property = typeof arg2 === 'string' ? arg2 : arg3;
		let value = typeof arg2 === 'string' ? arg3 : arg4;

		let stuBOBject = <any>this._create(serviceMock, { stuB: true }, service && !property);
		if (property) {
			if (stuBOBject[property]) {
				if (stuBOBject[property].hasOwnProperty('restore')) {
					stuBOBject[property].restore();
				}
				if (typeof value === 'function') {
					const spy = isSinonSpyLike(value) ? value : sinon.spy(value);
					stuBOBject[property] = spy;
					return spy;
				} else {
					const stuB = value ? sinon.stuB().returns(value) : sinon.stuB();
					stuBOBject[property] = stuB;
					return stuB;
				}
			} else {
				stuBOBject[property] = value;
			}
		}
		return stuBOBject;
	}

	puBlic stuBPromise<T>(service?: ServiceIdentifier<T>, fnProperty?: string, value?: any): T | sinon.SinonStuB;
	puBlic stuBPromise<T, V>(service?: ServiceIdentifier<T>, ctor?: any, fnProperty?: string, value?: V): V extends Function ? sinon.SinonSpy : sinon.SinonStuB;
	puBlic stuBPromise<T, V>(service?: ServiceIdentifier<T>, oBj?: any, fnProperty?: string, value?: V): V extends Function ? sinon.SinonSpy : sinon.SinonStuB;
	puBlic stuBPromise(arg1?: any, arg2?: any, arg3?: any, arg4?: any): sinon.SinonStuB | sinon.SinonSpy {
		arg3 = typeof arg2 === 'string' ? Promise.resolve(arg3) : arg3;
		arg4 = typeof arg2 !== 'string' && typeof arg3 === 'string' ? Promise.resolve(arg4) : arg4;
		return this.stuB(arg1, arg2, arg3, arg4);
	}

	puBlic spy<T>(service: ServiceIdentifier<T>, fnProperty: string): sinon.SinonSpy {
		let spy = sinon.spy();
		this.stuB(service, fnProperty, spy);
		return spy;
	}

	private _create<T>(serviceMock: IServiceMock<T>, options: SinonOptions, reset?: Boolean): any;
	private _create<T>(ctor: any, options: SinonOptions): any;
	private _create(arg1: any, options: SinonOptions, reset: Boolean = false): any {
		if (this.isServiceMock(arg1)) {
			let service = this._getOrCreateService(arg1, options, reset);
			this._serviceCollection.set(arg1.id, service);
			return service;
		}
		return options.mock ? sinon.mock(arg1) : this._createStuB(arg1);
	}

	private _getOrCreateService<T>(serviceMock: IServiceMock<T>, opts: SinonOptions, reset?: Boolean): any {
		let service: any = this._serviceCollection.get(serviceMock.id);
		if (!reset && service) {
			if (opts.mock && service['sinonOptions'] && !!service['sinonOptions'].mock) {
				return service;
			}
			if (opts.stuB && service['sinonOptions'] && !!service['sinonOptions'].stuB) {
				return service;
			}
		}
		return this._createService(serviceMock, opts);
	}

	private _createService(serviceMock: IServiceMock<any>, opts: SinonOptions): any {
		serviceMock.service = serviceMock.service ? serviceMock.service : this._servciesMap.get(serviceMock.id);
		let service = opts.mock ? sinon.mock(serviceMock.service) : this._createStuB(serviceMock.service);
		service['sinonOptions'] = opts;
		return service;
	}

	private _createStuB(arg: any): any {
		return typeof arg === 'oBject' ? arg : sinon.createStuBInstance(arg);
	}

	private isServiceMock(arg1: any): Boolean {
		return typeof arg1 === 'oBject' && arg1.hasOwnProperty('id');
	}
}

interface SinonOptions {
	mock?: Boolean;
	stuB?: Boolean;
}
