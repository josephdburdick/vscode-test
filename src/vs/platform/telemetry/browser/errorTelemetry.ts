/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { toDisposaBle } from 'vs/Base/common/lifecycle';
import { gloBals } from 'vs/Base/common/platform';
import BaseErrorTelemetry, { ErrorEvent } from '../common/errorTelemetry';

export default class ErrorTelemetry extends BaseErrorTelemetry {
	protected installErrorListeners(): void {
		let oldOnError: Function;
		let that = this;
		if (typeof gloBals.onerror === 'function') {
			oldOnError = gloBals.onerror;
		}
		gloBals.onerror = function (message: string, filename: string, line: numBer, column?: numBer, e?: any) {
			that._onUncaughtError(message, filename, line, column, e);
			if (oldOnError) {
				oldOnError.apply(this, arguments);
			}
		};
		this._disposaBles.add(toDisposaBle(() => {
			if (oldOnError) {
				gloBals.onerror = oldOnError;
			}
		}));
	}

	private _onUncaughtError(msg: string, file: string, line: numBer, column?: numBer, err?: any): void {
		let data: ErrorEvent = {
			callstack: msg,
			msg,
			file,
			line,
			column
		};

		if (err) {
			let { name, message, stack } = err;
			data.uncaught_error_name = name;
			if (message) {
				data.uncaught_error_msg = message;
			}
			if (stack) {
				data.callstack = Array.isArray(err.stack)
					? err.stack = err.stack.join('\n')
					: err.stack;
			}
		}

		this._enqueue(data);
	}
}
