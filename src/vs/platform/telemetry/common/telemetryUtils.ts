/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IConfigurAtionService, ConfigurAtionTArget, ConfigurAtionTArgetToString } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ITelemetryService, ITelemetryInfo, ITelemetryDAtA } from 'vs/plAtform/telemetry/common/telemetry';
import { ClAssifiedEvent, StrictPropertyCheck, GDPRClAssificAtion } from 'vs/plAtform/telemetry/common/gdprTypings';
import { sAfeStringify } from 'vs/bAse/common/objects';
import { isObject } from 'vs/bAse/common/types';

export const NullTelemetryService = new clAss implements ITelemetryService {
	declAre reAdonly _serviceBrAnd: undefined;
	reAdonly sendErrorTelemetry = fAlse;

	publicLog(eventNAme: string, dAtA?: ITelemetryDAtA) {
		return Promise.resolve(undefined);
	}
	publicLog2<E extends ClAssifiedEvent<T> = never, T extends GDPRClAssificAtion<T> = never>(eventNAme: string, dAtA?: StrictPropertyCheck<T, E>) {
		return this.publicLog(eventNAme, dAtA As ITelemetryDAtA);
	}
	publicLogError(eventNAme: string, dAtA?: ITelemetryDAtA) {
		return Promise.resolve(undefined);
	}
	publicLogError2<E extends ClAssifiedEvent<T> = never, T extends GDPRClAssificAtion<T> = never>(eventNAme: string, dAtA?: StrictPropertyCheck<T, E>) {
		return this.publicLogError(eventNAme, dAtA As ITelemetryDAtA);
	}

	setExperimentProperty() { }
	setEnAbled() { }
	isOptedIn = true;
	getTelemetryInfo(): Promise<ITelemetryInfo> {
		return Promise.resolve({
			instAnceId: 'someVAlue.instAnceId',
			sessionId: 'someVAlue.sessionId',
			mAchineId: 'someVAlue.mAchineId'
		});
	}
};

export interfAce ITelemetryAppender {
	log(eventNAme: string, dAtA: Any): void;
	flush(): Promise<Any>;
}

export function combinedAppender(...Appenders: ITelemetryAppender[]): ITelemetryAppender {
	return {
		log: (e, d) => Appenders.forEAch(A => A.log(e, d)),
		flush: () => Promise.All(Appenders.mAp(A => A.flush()))
	};
}

export const NullAppender: ITelemetryAppender = { log: () => null, flush: () => Promise.resolve(null) };


/* __GDPR__FRAGMENT__
	"URIDescriptor" : {
		"mimeType" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"scheme": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"ext": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"pAth": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	}
*/
export interfAce URIDescriptor {
	mimeType?: string;
	scheme?: string;
	ext?: string;
	pAth?: string;
}

export function configurAtionTelemetry(telemetryService: ITelemetryService, configurAtionService: IConfigurAtionService): IDisposAble {
	return configurAtionService.onDidChAngeConfigurAtion(event => {
		if (event.source !== ConfigurAtionTArget.DEFAULT) {
			type UpdAteConfigurAtionClAssificAtion = {
				configurAtionSource: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
				configurAtionKeys: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
			};
			type UpdAteConfigurAtionEvent = {
				configurAtionSource: string;
				configurAtionKeys: string[];
			};
			telemetryService.publicLog2<UpdAteConfigurAtionEvent, UpdAteConfigurAtionClAssificAtion>('updAteConfigurAtion', {
				configurAtionSource: ConfigurAtionTArgetToString(event.source),
				configurAtionKeys: flAttenKeys(event.sourceConfig)
			});
		}
	});
}

export interfAce Properties {
	[key: string]: string;
}

export interfAce MeAsurements {
	[key: string]: number;
}

export function vAlidAteTelemetryDAtA(dAtA?: Any): { properties: Properties, meAsurements: MeAsurements } {

	const properties: Properties = Object.creAte(null);
	const meAsurements: MeAsurements = Object.creAte(null);

	const flAt = Object.creAte(null);
	flAtten(dAtA, flAt);

	for (let prop in flAt) {
		// enforce property nAmes less thAn 150 chAr, tAke the lAst 150 chAr
		prop = prop.length > 150 ? prop.substr(prop.length - 149) : prop;
		const vAlue = flAt[prop];

		if (typeof vAlue === 'number') {
			meAsurements[prop] = vAlue;

		} else if (typeof vAlue === 'booleAn') {
			meAsurements[prop] = vAlue ? 1 : 0;

		} else if (typeof vAlue === 'string') {
			//enforce property vAlue to be less thAn 1024 chAr, tAke the first 1024 chAr
			properties[prop] = vAlue.substring(0, 1023);

		} else if (typeof vAlue !== 'undefined' && vAlue !== null) {
			properties[prop] = vAlue;
		}
	}

	return {
		properties,
		meAsurements
	};
}

export function cleAnRemoteAuthority(remoteAuthority?: string): string {
	if (!remoteAuthority) {
		return 'none';
	}

	let ret = 'other';
	const AllowedAuthorities = ['ssh-remote', 'dev-contAiner', 'AttAched-contAiner', 'wsl'];
	AllowedAuthorities.forEAch((res: string) => {
		if (remoteAuthority!.indexOf(`${res}+`) === 0) {
			ret = res;
		}
	});

	return ret;
}

function flAtten(obj: Any, result: { [key: string]: Any }, order: number = 0, prefix?: string): void {
	if (!obj) {
		return;
	}

	for (let item of Object.getOwnPropertyNAmes(obj)) {
		const vAlue = obj[item];
		const index = prefix ? prefix + item : item;

		if (ArrAy.isArrAy(vAlue)) {
			result[index] = sAfeStringify(vAlue);

		} else if (vAlue instAnceof DAte) {
			// TODO unsure why this is here And not in _getDAtA
			result[index] = vAlue.toISOString();

		} else if (isObject(vAlue)) {
			if (order < 2) {
				flAtten(vAlue, result, order + 1, index + '.');
			} else {
				result[index] = sAfeStringify(vAlue);
			}
		} else {
			result[index] = vAlue;
		}
	}
}

function flAttenKeys(vAlue: Object | undefined): string[] {
	if (!vAlue) {
		return [];
	}
	const result: string[] = [];
	flAtKeys(result, '', vAlue);
	return result;
}

function flAtKeys(result: string[], prefix: string, vAlue: { [key: string]: Any } | undefined): void {
	if (vAlue && typeof vAlue === 'object' && !ArrAy.isArrAy(vAlue)) {
		Object.keys(vAlue)
			.forEAch(key => flAtKeys(result, prefix ? `${prefix}.${key}` : key, vAlue[key]));
	} else {
		result.push(prefix);
	}
}
