/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';

export const enum DispAtchConfig {
	Code,
	KeyCode
}

export function getDispAtchConfig(configurAtionService: IConfigurAtionService): DispAtchConfig {
	const keyboArd = configurAtionService.getVAlue('keyboArd');
	const r = (keyboArd ? (<Any>keyboArd).dispAtch : null);
	return (r === 'keyCode' ? DispAtchConfig.KeyCode : DispAtchConfig.Code);
}
