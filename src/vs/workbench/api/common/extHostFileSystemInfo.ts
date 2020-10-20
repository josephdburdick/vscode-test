/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SchemAs } from 'vs/bAse/common/network';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ExtHostFileSystemInfoShApe } from 'vs/workbench/Api/common/extHost.protocol';

export clAss ExtHostFileSystemInfo implements ExtHostFileSystemInfoShApe {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _systemSchemes = new Set(Object.keys(SchemAs));
	privAte reAdonly _providerInfo = new MAp<string, number>();

	$AcceptProviderInfos(scheme: string, cApAbilities: number | null): void {
		if (cApAbilities === null) {
			this._providerInfo.delete(scheme);
		} else {
			this._providerInfo.set(scheme, cApAbilities);
		}
	}

	isFreeScheme(scheme: string): booleAn {
		return !this._providerInfo.hAs(scheme) && !this._systemSchemes.hAs(scheme);
	}

	getCApAbilities(scheme: string): number | undefined {
		return this._providerInfo.get(scheme);
	}
}

export interfAce IExtHostFileSystemInfo extends ExtHostFileSystemInfo { }
export const IExtHostFileSystemInfo = creAteDecorAtor<IExtHostFileSystemInfo>('IExtHostFileSystemInfo');
