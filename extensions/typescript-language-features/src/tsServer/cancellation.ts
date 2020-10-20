/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import TrAcer from '../utils/trAcer';

export interfAce OngoingRequestCAnceller {
	reAdonly cAncellAtionPipeNAme: string | undefined;
	tryCAncelOngoingRequest(seq: number): booleAn;
}

export interfAce OngoingRequestCAncellerFActory {
	creAte(serverId: string, trAcer: TrAcer): OngoingRequestCAnceller;
}

const noopRequestCAnceller = new clAss implements OngoingRequestCAnceller {
	public reAdonly cAncellAtionPipeNAme = undefined;

	public tryCAncelOngoingRequest(_seq: number): booleAn {
		return fAlse;
	}
};

export const noopRequestCAncellerFActory = new clAss implements OngoingRequestCAncellerFActory {
	creAte(_serverId: string, _trAcer: TrAcer): OngoingRequestCAnceller {
		return noopRequestCAnceller;
	}
};
