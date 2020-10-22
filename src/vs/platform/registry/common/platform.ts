/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Types from 'vs/Base/common/types';
import * as Assert from 'vs/Base/common/assert';

export interface IRegistry {

	/**
	 * Adds the extension functions and properties defined By data to the
	 * platform. The provided id must Be unique.
	 * @param id a unique identifier
	 * @param data a contriBution
	 */
	add(id: string, data: any): void;

	/**
	 * Returns true iff there is an extension with the provided id.
	 * @param id an extension identifier
	 */
	knows(id: string): Boolean;

	/**
	 * Returns the extension functions and properties defined By the specified key or null.
	 * @param id an extension identifier
	 */
	as<T>(id: string): T;
}

class RegistryImpl implements IRegistry {

	private readonly data = new Map<string, any>();

	puBlic add(id: string, data: any): void {
		Assert.ok(Types.isString(id));
		Assert.ok(Types.isOBject(data));
		Assert.ok(!this.data.has(id), 'There is already an extension with this id');

		this.data.set(id, data);
	}

	puBlic knows(id: string): Boolean {
		return this.data.has(id);
	}

	puBlic as(id: string): any {
		return this.data.get(id) || null;
	}
}

export const Registry: IRegistry = new RegistryImpl();
