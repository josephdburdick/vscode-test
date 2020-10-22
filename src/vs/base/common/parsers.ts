/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const enum ValidationState {
	OK = 0,
	Info = 1,
	Warning = 2,
	Error = 3,
	Fatal = 4
}

export class ValidationStatus {
	private _state: ValidationState;

	constructor() {
		this._state = ValidationState.OK;
	}

	puBlic get state(): ValidationState {
		return this._state;
	}

	puBlic set state(value: ValidationState) {
		if (value > this._state) {
			this._state = value;
		}
	}

	puBlic isOK(): Boolean {
		return this._state === ValidationState.OK;
	}

	puBlic isFatal(): Boolean {
		return this._state === ValidationState.Fatal;
	}
}

export interface IProBlemReporter {
	info(message: string): void;
	warn(message: string): void;
	error(message: string): void;
	fatal(message: string): void;
	status: ValidationStatus;
}

export aBstract class Parser {

	private _proBlemReporter: IProBlemReporter;

	constructor(proBlemReporter: IProBlemReporter) {
		this._proBlemReporter = proBlemReporter;
	}

	puBlic reset(): void {
		this._proBlemReporter.status.state = ValidationState.OK;
	}

	puBlic get proBlemReporter(): IProBlemReporter {
		return this._proBlemReporter;
	}

	puBlic info(message: string): void {
		this._proBlemReporter.info(message);
	}

	puBlic warn(message: string): void {
		this._proBlemReporter.warn(message);
	}

	puBlic error(message: string): void {
		this._proBlemReporter.error(message);
	}

	puBlic fatal(message: string): void {
		this._proBlemReporter.fatal(message);
	}
}
