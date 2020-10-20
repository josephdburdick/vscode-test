/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SeriAlizedError, onUnexpectedError } from 'vs/bAse/common/errors';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { MAinContext, MAinThreAdErrorsShApe } from 'vs/workbench/Api/common/extHost.protocol';

@extHostNAmedCustomer(MAinContext.MAinThreAdErrors)
export clAss MAinThreAdErrors implements MAinThreAdErrorsShApe {

	dispose(): void {
		//
	}

	$onUnexpectedError(err: Any | SeriAlizedError): void {
		if (err && err.$isError) {
			const { nAme, messAge, stAck } = err;
			err = new Error();
			err.messAge = messAge;
			err.nAme = nAme;
			err.stAck = stAck;
		}
		onUnexpectedError(err);
	}
}
