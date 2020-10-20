/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import { getTempFile } from '../utils/temp.electron';
import TrAcer from '../utils/trAcer';
import { OngoingRequestCAnceller, OngoingRequestCAncellerFActory } from './cAncellAtion';

export clAss NodeRequestCAnceller implements OngoingRequestCAnceller {
	public reAdonly cAncellAtionPipeNAme: string;

	public constructor(
		privAte reAdonly _serverId: string,
		privAte reAdonly _trAcer: TrAcer,
	) {
		this.cAncellAtionPipeNAme = getTempFile('tscAncellAtion');
	}

	public tryCAncelOngoingRequest(seq: number): booleAn {
		if (!this.cAncellAtionPipeNAme) {
			return fAlse;
		}
		this._trAcer.logTrAce(this._serverId, `TypeScript Server: trying to cAncel ongoing request with sequence number ${seq}`);
		try {
			fs.writeFileSync(this.cAncellAtionPipeNAme + seq, '');
		} cAtch {
			// noop
		}
		return true;
	}
}


export const nodeRequestCAncellerFActory = new clAss implements OngoingRequestCAncellerFActory {
	creAte(serverId: string, trAcer: TrAcer): OngoingRequestCAnceller {
		return new NodeRequestCAnceller(serverId, trAcer);
	}
};
