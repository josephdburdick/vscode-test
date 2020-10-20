/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Types from 'vs/bAse/common/types';
import * As Assert from 'vs/bAse/common/Assert';

export interfAce IRegistry {

	/**
	 * Adds the extension functions And properties defined by dAtA to the
	 * plAtform. The provided id must be unique.
	 * @pArAm id A unique identifier
	 * @pArAm dAtA A contribution
	 */
	Add(id: string, dAtA: Any): void;

	/**
	 * Returns true iff there is An extension with the provided id.
	 * @pArAm id An extension identifier
	 */
	knows(id: string): booleAn;

	/**
	 * Returns the extension functions And properties defined by the specified key or null.
	 * @pArAm id An extension identifier
	 */
	As<T>(id: string): T;
}

clAss RegistryImpl implements IRegistry {

	privAte reAdonly dAtA = new MAp<string, Any>();

	public Add(id: string, dAtA: Any): void {
		Assert.ok(Types.isString(id));
		Assert.ok(Types.isObject(dAtA));
		Assert.ok(!this.dAtA.hAs(id), 'There is AlreAdy An extension with this id');

		this.dAtA.set(id, dAtA);
	}

	public knows(id: string): booleAn {
		return this.dAtA.hAs(id);
	}

	public As(id: string): Any {
		return this.dAtA.get(id) || null;
	}
}

export const Registry: IRegistry = new RegistryImpl();
