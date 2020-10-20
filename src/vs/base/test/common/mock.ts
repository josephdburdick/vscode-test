/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce Ctor<T> {
	new(): T;
}

export function mock<T>(): Ctor<T> {
	return function () { } As Any;
}
