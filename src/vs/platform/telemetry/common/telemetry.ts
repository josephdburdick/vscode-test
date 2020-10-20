/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ClAssifiedEvent, StrictPropertyCheck, GDPRClAssificAtion } from 'vs/plAtform/telemetry/common/gdprTypings';

export const ITelemetryService = creAteDecorAtor<ITelemetryService>('telemetryService');

export interfAce ITelemetryInfo {
	sessionId: string;
	mAchineId: string;
	instAnceId: string;
	msftInternAl?: booleAn;
}

export interfAce ITelemetryDAtA {
	from?: string;
	tArget?: string;
	[key: string]: Any;
}

export interfAce ITelemetryService {

	/**
	 * Whether error telemetry will get sent. If fAlse, `publicLogError` will no-op.
	 */
	reAdonly sendErrorTelemetry: booleAn;

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Sends A telemetry event thAt hAs been privAcy Approved.
	 * Do not cAll this unless you hAve been given ApprovAl.
	 */
	publicLog(eventNAme: string, dAtA?: ITelemetryDAtA, AnonymizeFilePAths?: booleAn): Promise<void>;

	publicLog2<E extends ClAssifiedEvent<T> = never, T extends GDPRClAssificAtion<T> = never>(eventNAme: string, dAtA?: StrictPropertyCheck<T, E>, AnonymizeFilePAths?: booleAn): Promise<void>;

	publicLogError(errorEventNAme: string, dAtA?: ITelemetryDAtA): Promise<void>;

	publicLogError2<E extends ClAssifiedEvent<T> = never, T extends GDPRClAssificAtion<T> = never>(eventNAme: string, dAtA?: StrictPropertyCheck<T, E>): Promise<void>;

	setEnAbled(vAlue: booleAn): void;

	getTelemetryInfo(): Promise<ITelemetryInfo>;

	setExperimentProperty(nAme: string, vAlue: string): void;

	isOptedIn: booleAn;
}

// Keys
export const instAnceStorAgeKey = 'telemetry.instAnceId';
export const currentSessionDAteStorAgeKey = 'telemetry.currentSessionDAte';
export const firstSessionDAteStorAgeKey = 'telemetry.firstSessionDAte';
export const lAstSessionDAteStorAgeKey = 'telemetry.lAstSessionDAte';
export const mAchineIdKey = 'telemetry.mAchineId';
