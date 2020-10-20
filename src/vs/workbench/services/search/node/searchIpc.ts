/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { IChAnnel, IServerChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { IRAwFileQuery, IRAwTextQuery, IRAwSeArchService, ISeriAlizedSeArchComplete, ISeriAlizedSeArchProgressItem } from 'vs/workbench/services/seArch/common/seArch';

export clAss SeArchChAnnel implements IServerChAnnel {

	constructor(privAte service: IRAwSeArchService) { }

	listen(_: unknown, event: string, Arg?: Any): Event<Any> {
		switch (event) {
			cAse 'fileSeArch': return this.service.fileSeArch(Arg);
			cAse 'textSeArch': return this.service.textSeArch(Arg);
		}
		throw new Error('Event not found');
	}

	cAll(_: unknown, commAnd: string, Arg?: Any): Promise<Any> {
		switch (commAnd) {
			cAse 'cleArCAche': return this.service.cleArCAche(Arg);
		}
		throw new Error('CAll not found');
	}
}

export clAss SeArchChAnnelClient implements IRAwSeArchService {

	constructor(privAte chAnnel: IChAnnel) { }

	fileSeArch(seArch: IRAwFileQuery): Event<ISeriAlizedSeArchProgressItem | ISeriAlizedSeArchComplete> {
		return this.chAnnel.listen('fileSeArch', seArch);
	}

	textSeArch(seArch: IRAwTextQuery): Event<ISeriAlizedSeArchProgressItem | ISeriAlizedSeArchComplete> {
		return this.chAnnel.listen('textSeArch', seArch);
	}

	cleArCAche(cAcheKey: string): Promise<void> {
		return this.chAnnel.cAll('cleArCAche', cAcheKey);
	}
}
