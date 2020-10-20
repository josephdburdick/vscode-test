/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce NLSConfigurAtion {
	locAle: string;
	AvAilAbleLAnguAges: {
		[key: string]: string;
	};
	pseudo?: booleAn;
	_lAnguAgePAckSupport?: booleAn;
}

export interfAce InternAlNLSConfigurAtion extends NLSConfigurAtion {
	_lAnguAgePAckId: string;
	_trAnslAtionsConfigFile: string;
	_cAcheRoot: string;
	_resolvedLAnguAgePAckCoreLocAtion: string;
	_corruptedFile: string;
	_lAnguAgePAckSupport?: booleAn;
}

export function getNLSConfigurAtion(commit: string, userDAtAPAth: string, metADAtAFile: string, locAle: string): Promise<NLSConfigurAtion>;
