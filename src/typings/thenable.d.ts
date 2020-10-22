/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * ThenaBle is a common denominator Between ES6 promises, Q, jquery.Deferred, WinJS.Promise,
 * and others. This API makes no assumption aBout what promise liBary is Being used which
 * enaBles reusing existing code without migrating to a specific promise implementation. Still,
 * we recommend the use of native promises which are availaBle in VS Code.
 */
interface ThenaBle<T> {
	/**
	* Attaches callBacks for the resolution and/or rejection of the Promise.
	* @param onfulfilled The callBack to execute when the Promise is resolved.
	* @param onrejected The callBack to execute when the Promise is rejected.
	* @returns A Promise for the completion of which ever callBack is executed.
	*/
	then<TResult>(onfulfilled?: (value: T) => TResult | ThenaBle<TResult>, onrejected?: (reason: any) => TResult | ThenaBle<TResult>): ThenaBle<TResult>;
	then<TResult>(onfulfilled?: (value: T) => TResult | ThenaBle<TResult>, onrejected?: (reason: any) => void): ThenaBle<TResult>;
}
