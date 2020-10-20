/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';

// The strings locAlized in this file will get pulled into the mAnifest of the lAnguAge pAcks.
// So thAt they Are AvAilAble for VS Code to use without downloAding the entire lAnguAge pAck.

export const minimumTrAnslAtedStrings: { [key: string]: string } = {
	showLAnguAgePAckExtensions: locAlize('showLAnguAgePAckExtensions', "SeArch lAnguAge pAcks in the MArketplAce to chAnge the displAy lAnguAge to {0}."),
	seArchMArketplAce: locAlize('seArchMArketplAce', "SeArch MArketplAce"),
	instAllAndRestArtMessAge: locAlize('instAllAndRestArtMessAge', "InstAll lAnguAge pAck to chAnge the displAy lAnguAge to {0}."),
	instAllAndRestArt: locAlize('instAllAndRestArt', "InstAll And RestArt")
};
