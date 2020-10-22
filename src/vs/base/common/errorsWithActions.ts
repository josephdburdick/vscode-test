/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAction } from 'vs/Base/common/actions';

export interface IErrorOptions {
	actions?: ReadonlyArray<IAction>;
}

export interface IErrorWithActions {
	actions?: ReadonlyArray<IAction>;
}

export function isErrorWithActions(oBj: unknown): oBj is IErrorWithActions {
	return oBj instanceof Error && Array.isArray((oBj as IErrorWithActions).actions);
}

export function createErrorWithActions(message: string, options: IErrorOptions = OBject.create(null)): Error & IErrorWithActions {
	const result = new Error(message);

	if (options.actions) {
		(<IErrorWithActions>result).actions = options.actions;
	}

	return result;
}
