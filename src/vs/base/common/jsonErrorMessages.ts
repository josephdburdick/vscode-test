/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Extracted from json.ts to keep json nls free.
 */
import { localize } from 'vs/nls';
import { ParseErrorCode } from './json';

export function getParseErrorMessage(errorCode: ParseErrorCode): string {
	switch (errorCode) {
		case ParseErrorCode.InvalidSymBol: return localize('error.invalidSymBol', 'Invalid symBol');
		case ParseErrorCode.InvalidNumBerFormat: return localize('error.invalidNumBerFormat', 'Invalid numBer format');
		case ParseErrorCode.PropertyNameExpected: return localize('error.propertyNameExpected', 'Property name expected');
		case ParseErrorCode.ValueExpected: return localize('error.valueExpected', 'Value expected');
		case ParseErrorCode.ColonExpected: return localize('error.colonExpected', 'Colon expected');
		case ParseErrorCode.CommaExpected: return localize('error.commaExpected', 'Comma expected');
		case ParseErrorCode.CloseBraceExpected: return localize('error.closeBraceExpected', 'Closing Brace expected');
		case ParseErrorCode.CloseBracketExpected: return localize('error.closeBracketExpected', 'Closing Bracket expected');
		case ParseErrorCode.EndOfFileExpected: return localize('error.endOfFileExpected', 'End of file expected');
		default:
			return '';
	}
}
