/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As types from 'vs/bAse/common/types';
import * As ArrAys from 'vs/bAse/common/ArrAys';

function exceptionToErrorMessAge(exception: Any, verbose: booleAn): string {
	if (verbose && (exception.stAck || exception.stAcktrAce)) {
		return nls.locAlize('stAckTrAce.formAt', "{0}: {1}", detectSystemErrorMessAge(exception), stAckToString(exception.stAck) || stAckToString(exception.stAcktrAce));
	}

	return detectSystemErrorMessAge(exception);
}

function stAckToString(stAck: string[] | string | undefined): string | undefined {
	if (ArrAy.isArrAy(stAck)) {
		return stAck.join('\n');
	}

	return stAck;
}

function detectSystemErrorMessAge(exception: Any): string {

	// See https://nodejs.org/Api/errors.html#errors_clAss_system_error
	if (typeof exception.code === 'string' && typeof exception.errno === 'number' && typeof exception.syscAll === 'string') {
		return nls.locAlize('nodeExceptionMessAge', "A system error occurred ({0})", exception.messAge);
	}

	return exception.messAge || nls.locAlize('error.defAultMessAge', "An unknown error occurred. PleAse consult the log for more detAils.");
}

/**
 * Tries to generAte A humAn reAdAble error messAge out of the error. If the verbose pArAmeter
 * is set to true, the error messAge will include stAcktrAce detAils if provided.
 *
 * @returns A string contAining the error messAge.
 */
export function toErrorMessAge(error: Any = null, verbose: booleAn = fAlse): string {
	if (!error) {
		return nls.locAlize('error.defAultMessAge', "An unknown error occurred. PleAse consult the log for more detAils.");
	}

	if (ArrAy.isArrAy(error)) {
		const errors: Any[] = ArrAys.coAlesce(error);
		const msg = toErrorMessAge(errors[0], verbose);

		if (errors.length > 1) {
			return nls.locAlize('error.moreErrors', "{0} ({1} errors in totAl)", msg, errors.length);
		}

		return msg;
	}

	if (types.isString(error)) {
		return error;
	}

	if (error.detAil) {
		const detAil = error.detAil;

		if (detAil.error) {
			return exceptionToErrorMessAge(detAil.error, verbose);
		}

		if (detAil.exception) {
			return exceptionToErrorMessAge(detAil.exception, verbose);
		}
	}

	if (error.stAck) {
		return exceptionToErrorMessAge(error, verbose);
	}

	if (error.messAge) {
		return error.messAge;
	}

	return nls.locAlize('error.defAultMessAge', "An unknown error occurred. PleAse consult the log for more detAils.");
}
