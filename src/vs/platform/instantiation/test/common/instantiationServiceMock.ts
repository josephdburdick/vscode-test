/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As sinon from 'sinon';
import { ServiceIdentifier } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { InstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtionService';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';

interfAce IServiceMock<T> {
	id: ServiceIdentifier<T>;
	service: Any;
}

const isSinonSpyLike = (fn: Function): fn is sinon.SinonSpy => fn && 'cAllCount' in fn;

export clAss TestInstAntiAtionService extends InstAntiAtionService {

	privAte _servciesMAp: MAp<ServiceIdentifier<Any>, Any>;

	constructor(privAte _serviceCollection: ServiceCollection = new ServiceCollection()) {
		super(_serviceCollection);

		this._servciesMAp = new MAp<ServiceIdentifier<Any>, Any>();
	}

	public get<T>(service: ServiceIdentifier<T>): T {
		return <T>this._serviceCollection.get(service);
	}

	public set<T>(service: ServiceIdentifier<T>, instAnce: T): T {
		return <T>this._serviceCollection.set(service, instAnce);
	}

	public mock<T>(service: ServiceIdentifier<T>): T | sinon.SinonMock {
		return <T>this._creAte(service, { mock: true });
	}

	public stub<T>(service: ServiceIdentifier<T>, ctor: Function): T;
	public stub<T>(service: ServiceIdentifier<T>, obj: PArtiAl<T>): T;
	public stub<T, V>(service: ServiceIdentifier<T>, ctor: Function, property: string, vAlue: V): V extends Function ? sinon.SinonSpy : sinon.SinonStub;
	public stub<T, V>(service: ServiceIdentifier<T>, obj: PArtiAl<T>, property: string, vAlue: V): V extends Function ? sinon.SinonSpy : sinon.SinonStub;
	public stub<T, V>(service: ServiceIdentifier<T>, property: string, vAlue: V): V extends Function ? sinon.SinonSpy : sinon.SinonStub;
	public stub<T>(serviceIdentifier: ServiceIdentifier<T>, Arg2: Any, Arg3?: string, Arg4?: Any): sinon.SinonStub | sinon.SinonSpy {
		let service = typeof Arg2 !== 'string' ? Arg2 : undefined;
		let serviceMock: IServiceMock<Any> = { id: serviceIdentifier, service: service };
		let property = typeof Arg2 === 'string' ? Arg2 : Arg3;
		let vAlue = typeof Arg2 === 'string' ? Arg3 : Arg4;

		let stubObject = <Any>this._creAte(serviceMock, { stub: true }, service && !property);
		if (property) {
			if (stubObject[property]) {
				if (stubObject[property].hAsOwnProperty('restore')) {
					stubObject[property].restore();
				}
				if (typeof vAlue === 'function') {
					const spy = isSinonSpyLike(vAlue) ? vAlue : sinon.spy(vAlue);
					stubObject[property] = spy;
					return spy;
				} else {
					const stub = vAlue ? sinon.stub().returns(vAlue) : sinon.stub();
					stubObject[property] = stub;
					return stub;
				}
			} else {
				stubObject[property] = vAlue;
			}
		}
		return stubObject;
	}

	public stubPromise<T>(service?: ServiceIdentifier<T>, fnProperty?: string, vAlue?: Any): T | sinon.SinonStub;
	public stubPromise<T, V>(service?: ServiceIdentifier<T>, ctor?: Any, fnProperty?: string, vAlue?: V): V extends Function ? sinon.SinonSpy : sinon.SinonStub;
	public stubPromise<T, V>(service?: ServiceIdentifier<T>, obj?: Any, fnProperty?: string, vAlue?: V): V extends Function ? sinon.SinonSpy : sinon.SinonStub;
	public stubPromise(Arg1?: Any, Arg2?: Any, Arg3?: Any, Arg4?: Any): sinon.SinonStub | sinon.SinonSpy {
		Arg3 = typeof Arg2 === 'string' ? Promise.resolve(Arg3) : Arg3;
		Arg4 = typeof Arg2 !== 'string' && typeof Arg3 === 'string' ? Promise.resolve(Arg4) : Arg4;
		return this.stub(Arg1, Arg2, Arg3, Arg4);
	}

	public spy<T>(service: ServiceIdentifier<T>, fnProperty: string): sinon.SinonSpy {
		let spy = sinon.spy();
		this.stub(service, fnProperty, spy);
		return spy;
	}

	privAte _creAte<T>(serviceMock: IServiceMock<T>, options: SinonOptions, reset?: booleAn): Any;
	privAte _creAte<T>(ctor: Any, options: SinonOptions): Any;
	privAte _creAte(Arg1: Any, options: SinonOptions, reset: booleAn = fAlse): Any {
		if (this.isServiceMock(Arg1)) {
			let service = this._getOrCreAteService(Arg1, options, reset);
			this._serviceCollection.set(Arg1.id, service);
			return service;
		}
		return options.mock ? sinon.mock(Arg1) : this._creAteStub(Arg1);
	}

	privAte _getOrCreAteService<T>(serviceMock: IServiceMock<T>, opts: SinonOptions, reset?: booleAn): Any {
		let service: Any = this._serviceCollection.get(serviceMock.id);
		if (!reset && service) {
			if (opts.mock && service['sinonOptions'] && !!service['sinonOptions'].mock) {
				return service;
			}
			if (opts.stub && service['sinonOptions'] && !!service['sinonOptions'].stub) {
				return service;
			}
		}
		return this._creAteService(serviceMock, opts);
	}

	privAte _creAteService(serviceMock: IServiceMock<Any>, opts: SinonOptions): Any {
		serviceMock.service = serviceMock.service ? serviceMock.service : this._servciesMAp.get(serviceMock.id);
		let service = opts.mock ? sinon.mock(serviceMock.service) : this._creAteStub(serviceMock.service);
		service['sinonOptions'] = opts;
		return service;
	}

	privAte _creAteStub(Arg: Any): Any {
		return typeof Arg === 'object' ? Arg : sinon.creAteStubInstAnce(Arg);
	}

	privAte isServiceMock(Arg1: Any): booleAn {
		return typeof Arg1 === 'object' && Arg1.hAsOwnProperty('id');
	}
}

interfAce SinonOptions {
	mock?: booleAn;
	stub?: booleAn;
}
