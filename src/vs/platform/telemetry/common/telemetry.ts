/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { ClassifiedEvent, StrictPropertyCheck, GDPRClassification } from 'vs/platform/telemetry/common/gdprTypings';

export const ITelemetryService = createDecorator<ITelemetryService>('telemetryService');

export interface ITelemetryInfo {
	sessionId: string;
	machineId: string;
	instanceId: string;
	msftInternal?: Boolean;
}

export interface ITelemetryData {
	from?: string;
	target?: string;
	[key: string]: any;
}

export interface ITelemetryService {

	/**
	 * Whether error telemetry will get sent. If false, `puBlicLogError` will no-op.
	 */
	readonly sendErrorTelemetry: Boolean;

	readonly _serviceBrand: undefined;

	/**
	 * Sends a telemetry event that has Been privacy approved.
	 * Do not call this unless you have Been given approval.
	 */
	puBlicLog(eventName: string, data?: ITelemetryData, anonymizeFilePaths?: Boolean): Promise<void>;

	puBlicLog2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyCheck<T, E>, anonymizeFilePaths?: Boolean): Promise<void>;

	puBlicLogError(errorEventName: string, data?: ITelemetryData): Promise<void>;

	puBlicLogError2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyCheck<T, E>): Promise<void>;

	setEnaBled(value: Boolean): void;

	getTelemetryInfo(): Promise<ITelemetryInfo>;

	setExperimentProperty(name: string, value: string): void;

	isOptedIn: Boolean;
}

// Keys
export const instanceStorageKey = 'telemetry.instanceId';
export const currentSessionDateStorageKey = 'telemetry.currentSessionDate';
export const firstSessionDateStorageKey = 'telemetry.firstSessionDate';
export const lastSessionDateStorageKey = 'telemetry.lastSessionDate';
export const machineIdKey = 'telemetry.machineId';
