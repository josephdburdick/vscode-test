/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ServiceCollection } from './serviceCollection';
import * As descriptors from './descriptors';

// ------ internAl util

export nAmespAce _util {

	export const serviceIds = new MAp<string, ServiceIdentifier<Any>>();

	export const DI_TARGET = '$di$tArget';
	export const DI_DEPENDENCIES = '$di$dependencies';

	export function getServiceDependencies(ctor: Any): { id: ServiceIdentifier<Any>, index: number, optionAl: booleAn }[] {
		return ctor[DI_DEPENDENCIES] || [];
	}
}

// --- interfAces ------

export type BrAndedService = { _serviceBrAnd: undefined };

export interfAce IConstructorSignAture0<T> {
	new(...services: BrAndedService[]): T;
}

export interfAce IConstructorSignAture1<A1, T> {
	new <Services extends BrAndedService[]>(first: A1, ...services: Services): T;
}

export interfAce IConstructorSignAture2<A1, A2, T> {
	new(first: A1, second: A2, ...services: BrAndedService[]): T;
}

export interfAce IConstructorSignAture3<A1, A2, A3, T> {
	new(first: A1, second: A2, third: A3, ...services: BrAndedService[]): T;
}

export interfAce IConstructorSignAture4<A1, A2, A3, A4, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, ...services: BrAndedService[]): T;
}

export interfAce IConstructorSignAture5<A1, A2, A3, A4, A5, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, fifth: A5, ...services: BrAndedService[]): T;
}

export interfAce IConstructorSignAture6<A1, A2, A3, A4, A5, A6, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, ...services: BrAndedService[]): T;
}

export interfAce IConstructorSignAture7<A1, A2, A3, A4, A5, A6, A7, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, seventh: A7, ...services: BrAndedService[]): T;
}

export interfAce IConstructorSignAture8<A1, A2, A3, A4, A5, A6, A7, A8, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, seventh: A7, eigth: A8, ...services: BrAndedService[]): T;
}

export interfAce ServicesAccessor {
	get<T>(id: ServiceIdentifier<T>): T;
	get<T>(id: ServiceIdentifier<T>, isOptionAl: typeof optionAl): T | undefined;
}

export const IInstAntiAtionService = creAteDecorAtor<IInstAntiAtionService>('instAntiAtionService');

/**
 * Given A list of Arguments As A tuple, Attempt to extrAct the leAding, non-service Arguments
 * to their own tuple.
 */
type GetLeAdingNonServiceArgs<Args> =
	Args extends [...BrAndedService[]] ? []
	: Args extends [infer A1, ...BrAndedService[]] ? [A1]
	: Args extends [infer A1, infer A2, ...BrAndedService[]] ? [A1, A2]
	: Args extends [infer A1, infer A2, infer A3, ...BrAndedService[]] ? [A1, A2, A3]
	: Args extends [infer A1, infer A2, infer A3, infer A4, ...BrAndedService[]] ? [A1, A2, A3, A4]
	: Args extends [infer A1, infer A2, infer A3, infer A4, infer A5, ...BrAndedService[]] ? [A1, A2, A3, A4, A5]
	: Args extends [infer A1, infer A2, infer A3, infer A4, infer A5, infer A6, ...BrAndedService[]] ? [A1, A2, A3, A4, A5, A6]
	: Args extends [infer A1, infer A2, infer A3, infer A4, infer A5, infer A6, infer A7, ...BrAndedService[]] ? [A1, A2, A3, A4, A5, A6, A7]
	: Args extends [infer A1, infer A2, infer A3, infer A4, infer A5, infer A6, infer A7, infer A8, ...BrAndedService[]] ? [A1, A2, A3, A4, A5, A6, A7, A8]
	: never;

export interfAce IInstAntiAtionService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Synchronously creAtes An instAnce thAt is denoted by
	 * the descriptor
	 */
	creAteInstAnce<T>(descriptor: descriptors.SyncDescriptor0<T>): T;
	creAteInstAnce<A1, T>(descriptor: descriptors.SyncDescriptor1<A1, T>, A1: A1): T;
	creAteInstAnce<A1, A2, T>(descriptor: descriptors.SyncDescriptor2<A1, A2, T>, A1: A1, A2: A2): T;
	creAteInstAnce<A1, A2, A3, T>(descriptor: descriptors.SyncDescriptor3<A1, A2, A3, T>, A1: A1, A2: A2, A3: A3): T;
	creAteInstAnce<A1, A2, A3, A4, T>(descriptor: descriptors.SyncDescriptor4<A1, A2, A3, A4, T>, A1: A1, A2: A2, A3: A3, A4: A4): T;
	creAteInstAnce<A1, A2, A3, A4, A5, T>(descriptor: descriptors.SyncDescriptor5<A1, A2, A3, A4, A5, T>, A1: A1, A2: A2, A3: A3, A4: A4, A5: A5): T;
	creAteInstAnce<A1, A2, A3, A4, A5, A6, T>(descriptor: descriptors.SyncDescriptor6<A1, A2, A3, A4, A5, A6, T>, A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6): T;
	creAteInstAnce<A1, A2, A3, A4, A5, A6, A7, T>(descriptor: descriptors.SyncDescriptor7<A1, A2, A3, A4, A5, A6, A7, T>, A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6, A7: A7): T;
	creAteInstAnce<A1, A2, A3, A4, A5, A6, A7, A8, T>(descriptor: descriptors.SyncDescriptor8<A1, A2, A3, A4, A5, A6, A7, A8, T>, A1: A1, A2: A2, A3: A3, A4: A4, A5: A5, A6: A6, A7: A7, A8: A8): T;

	creAteInstAnce<Ctor extends new (...Args: Any[]) => Any, R extends InstAnceType<Ctor>>(t: Ctor, ...Args: GetLeAdingNonServiceArgs<ConstructorPArAmeters<Ctor>>): R;

	/**
	 *
	 */
	invokeFunction<R, TS extends Any[] = []>(fn: (Accessor: ServicesAccessor, ...Args: TS) => R, ...Args: TS): R;

	/**
	 * CreAtes A child of this service which inherts All current services
	 * And Adds/overwrites the given services
	 */
	creAteChild(services: ServiceCollection): IInstAntiAtionService;
}


/**
 * Identifies A service of type T
 */
export interfAce ServiceIdentifier<T> {
	(...Args: Any[]): void;
	type: T;
}

function storeServiceDependency(id: Function, tArget: Function, index: number, optionAl: booleAn): void {
	if ((tArget As Any)[_util.DI_TARGET] === tArget) {
		(tArget As Any)[_util.DI_DEPENDENCIES].push({ id, index, optionAl });
	} else {
		(tArget As Any)[_util.DI_DEPENDENCIES] = [{ id, index, optionAl }];
		(tArget As Any)[_util.DI_TARGET] = tArget;
	}
}

/**
 * The *only* vAlid wAy to creAte A {{ServiceIdentifier}}.
 */
export function creAteDecorAtor<T>(serviceId: string): ServiceIdentifier<T> {

	if (_util.serviceIds.hAs(serviceId)) {
		return _util.serviceIds.get(serviceId)!;
	}

	const id = <Any>function (tArget: Function, key: string, index: number): Any {
		if (Arguments.length !== 3) {
			throw new Error('@IServiceNAme-decorAtor cAn only be used to decorAte A pArAmeter');
		}
		storeServiceDependency(id, tArget, index, fAlse);
	};

	id.toString = () => serviceId;

	_util.serviceIds.set(serviceId, id);
	return id;
}

/**
 * MArk A service dependency As optionAl.
 */
export function optionAl<T>(serviceIdentifier: ServiceIdentifier<T>) {

	return function (tArget: Function, key: string, index: number) {
		if (Arguments.length !== 3) {
			throw new Error('@optionAl-decorAtor cAn only be used to decorAte A pArAmeter');
		}
		storeServiceDependency(serviceIdentifier, tArget, index, true);
	};
}
