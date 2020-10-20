/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/**
 * ExtrActed from json.ts to keep json nls free.
 */
import { locAlize } from 'vs/nls';
import { PArseErrorCode } from './json';

export function getPArseErrorMessAge(errorCode: PArseErrorCode): string {
	switch (errorCode) {
		cAse PArseErrorCode.InvAlidSymbol: return locAlize('error.invAlidSymbol', 'InvAlid symbol');
		cAse PArseErrorCode.InvAlidNumberFormAt: return locAlize('error.invAlidNumberFormAt', 'InvAlid number formAt');
		cAse PArseErrorCode.PropertyNAmeExpected: return locAlize('error.propertyNAmeExpected', 'Property nAme expected');
		cAse PArseErrorCode.VAlueExpected: return locAlize('error.vAlueExpected', 'VAlue expected');
		cAse PArseErrorCode.ColonExpected: return locAlize('error.colonExpected', 'Colon expected');
		cAse PArseErrorCode.CommAExpected: return locAlize('error.commAExpected', 'CommA expected');
		cAse PArseErrorCode.CloseBrAceExpected: return locAlize('error.closeBrAceExpected', 'Closing brAce expected');
		cAse PArseErrorCode.CloseBrAcketExpected: return locAlize('error.closeBrAcketExpected', 'Closing brAcket expected');
		cAse PArseErrorCode.EndOfFileExpected: return locAlize('error.endOfFileExpected', 'End of file expected');
		defAult:
			return '';
	}
}
