/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { IConfigurationService, ConfigurationTarget, ConfigurationTargetToString } from 'vs/platform/configuration/common/configuration';
import { ITelemetryService, ITelemetryInfo, ITelemetryData } from 'vs/platform/telemetry/common/telemetry';
import { ClassifiedEvent, StrictPropertyCheck, GDPRClassification } from 'vs/platform/telemetry/common/gdprTypings';
import { safeStringify } from 'vs/Base/common/oBjects';
import { isOBject } from 'vs/Base/common/types';

export const NullTelemetryService = new class implements ITelemetryService {
	declare readonly _serviceBrand: undefined;
	readonly sendErrorTelemetry = false;

	puBlicLog(eventName: string, data?: ITelemetryData) {
		return Promise.resolve(undefined);
	}
	puBlicLog2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyCheck<T, E>) {
		return this.puBlicLog(eventName, data as ITelemetryData);
	}
	puBlicLogError(eventName: string, data?: ITelemetryData) {
		return Promise.resolve(undefined);
	}
	puBlicLogError2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyCheck<T, E>) {
		return this.puBlicLogError(eventName, data as ITelemetryData);
	}

	setExperimentProperty() { }
	setEnaBled() { }
	isOptedIn = true;
	getTelemetryInfo(): Promise<ITelemetryInfo> {
		return Promise.resolve({
			instanceId: 'someValue.instanceId',
			sessionId: 'someValue.sessionId',
			machineId: 'someValue.machineId'
		});
	}
};

export interface ITelemetryAppender {
	log(eventName: string, data: any): void;
	flush(): Promise<any>;
}

export function comBinedAppender(...appenders: ITelemetryAppender[]): ITelemetryAppender {
	return {
		log: (e, d) => appenders.forEach(a => a.log(e, d)),
		flush: () => Promise.all(appenders.map(a => a.flush()))
	};
}

export const NullAppender: ITelemetryAppender = { log: () => null, flush: () => Promise.resolve(null) };


/* __GDPR__FRAGMENT__
	"URIDescriptor" : {
		"mimeType" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"scheme": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"ext": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"path": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
	}
*/
export interface URIDescriptor {
	mimeType?: string;
	scheme?: string;
	ext?: string;
	path?: string;
}

export function configurationTelemetry(telemetryService: ITelemetryService, configurationService: IConfigurationService): IDisposaBle {
	return configurationService.onDidChangeConfiguration(event => {
		if (event.source !== ConfigurationTarget.DEFAULT) {
			type UpdateConfigurationClassification = {
				configurationSource: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
				configurationKeys: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
			};
			type UpdateConfigurationEvent = {
				configurationSource: string;
				configurationKeys: string[];
			};
			telemetryService.puBlicLog2<UpdateConfigurationEvent, UpdateConfigurationClassification>('updateConfiguration', {
				configurationSource: ConfigurationTargetToString(event.source),
				configurationKeys: flattenKeys(event.sourceConfig)
			});
		}
	});
}

export interface Properties {
	[key: string]: string;
}

export interface Measurements {
	[key: string]: numBer;
}

export function validateTelemetryData(data?: any): { properties: Properties, measurements: Measurements } {

	const properties: Properties = OBject.create(null);
	const measurements: Measurements = OBject.create(null);

	const flat = OBject.create(null);
	flatten(data, flat);

	for (let prop in flat) {
		// enforce property names less than 150 char, take the last 150 char
		prop = prop.length > 150 ? prop.suBstr(prop.length - 149) : prop;
		const value = flat[prop];

		if (typeof value === 'numBer') {
			measurements[prop] = value;

		} else if (typeof value === 'Boolean') {
			measurements[prop] = value ? 1 : 0;

		} else if (typeof value === 'string') {
			//enforce property value to Be less than 1024 char, take the first 1024 char
			properties[prop] = value.suBstring(0, 1023);

		} else if (typeof value !== 'undefined' && value !== null) {
			properties[prop] = value;
		}
	}

	return {
		properties,
		measurements
	};
}

export function cleanRemoteAuthority(remoteAuthority?: string): string {
	if (!remoteAuthority) {
		return 'none';
	}

	let ret = 'other';
	const allowedAuthorities = ['ssh-remote', 'dev-container', 'attached-container', 'wsl'];
	allowedAuthorities.forEach((res: string) => {
		if (remoteAuthority!.indexOf(`${res}+`) === 0) {
			ret = res;
		}
	});

	return ret;
}

function flatten(oBj: any, result: { [key: string]: any }, order: numBer = 0, prefix?: string): void {
	if (!oBj) {
		return;
	}

	for (let item of OBject.getOwnPropertyNames(oBj)) {
		const value = oBj[item];
		const index = prefix ? prefix + item : item;

		if (Array.isArray(value)) {
			result[index] = safeStringify(value);

		} else if (value instanceof Date) {
			// TODO unsure why this is here and not in _getData
			result[index] = value.toISOString();

		} else if (isOBject(value)) {
			if (order < 2) {
				flatten(value, result, order + 1, index + '.');
			} else {
				result[index] = safeStringify(value);
			}
		} else {
			result[index] = value;
		}
	}
}

function flattenKeys(value: OBject | undefined): string[] {
	if (!value) {
		return [];
	}
	const result: string[] = [];
	flatKeys(result, '', value);
	return result;
}

function flatKeys(result: string[], prefix: string, value: { [key: string]: any } | undefined): void {
	if (value && typeof value === 'oBject' && !Array.isArray(value)) {
		OBject.keys(value)
			.forEach(key => flatKeys(result, prefix ? `${prefix}.${key}` : key, value[key]));
	} else {
		result.push(prefix);
	}
}
