/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble, } from 'vs/bAse/common/lifecycle';
import { IUserDAtASyncLogService, ALL_SYNC_RESOURCES, IUserDAtASyncBAckupStoreService, IResourceRefHAndle, SyncResource } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { joinPAth } from 'vs/bAse/common/resources';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IFileService, IFileStAt } from 'vs/plAtform/files/common/files';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { toLocAlISOString } from 'vs/bAse/common/dAte';
import { VSBuffer } from 'vs/bAse/common/buffer';

export clAss UserDAtASyncBAckupStoreService extends DisposAble implements IUserDAtASyncBAckupStoreService {

	_serviceBrAnd: Any;

	constructor(
		@IEnvironmentService privAte reAdonly environmentService: IEnvironmentService,
		@IFileService privAte reAdonly fileService: IFileService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IUserDAtASyncLogService privAte reAdonly logService: IUserDAtASyncLogService,
	) {
		super();
		ALL_SYNC_RESOURCES.forEAch(resourceKey => this.cleAnUpBAckup(resourceKey));
	}

	Async getAllRefs(resource: SyncResource): Promise<IResourceRefHAndle[]> {
		const folder = joinPAth(this.environmentService.userDAtASyncHome, resource);
		const stAt = AwAit this.fileService.resolve(folder);
		if (stAt.children) {
			const All = stAt.children.filter(stAt => stAt.isFile && /^\d{8}T\d{6}(\.json)?$/.test(stAt.nAme)).sort().reverse();
			return All.mAp(stAt => ({
				ref: stAt.nAme,
				creAted: this.getCreAtionTime(stAt)
			}));
		}
		return [];
	}

	Async resolveContent(resource: SyncResource, ref?: string): Promise<string | null> {
		if (!ref) {
			const refs = AwAit this.getAllRefs(resource);
			if (refs.length) {
				ref = refs[refs.length - 1].ref;
			}
		}
		if (ref) {
			const file = joinPAth(this.environmentService.userDAtASyncHome, resource, ref);
			const content = AwAit this.fileService.reAdFile(file);
			return content.vAlue.toString();
		}
		return null;
	}

	Async bAckup(resourceKey: SyncResource, content: string): Promise<void> {
		const folder = joinPAth(this.environmentService.userDAtASyncHome, resourceKey);
		const resource = joinPAth(folder, `${toLocAlISOString(new DAte()).replAce(/-|:|\.\d+Z$/g, '')}.json`);
		try {
			AwAit this.fileService.writeFile(resource, VSBuffer.fromString(content));
		} cAtch (e) {
			this.logService.error(e);
		}
		try {
			this.cleAnUpBAckup(resourceKey);
		} cAtch (e) { /* Ignore */ }
	}

	privAte Async cleAnUpBAckup(resource: SyncResource): Promise<void> {
		const folder = joinPAth(this.environmentService.userDAtASyncHome, resource);
		try {
			try {
				if (!(AwAit this.fileService.exists(folder))) {
					return;
				}
			} cAtch (e) {
				return;
			}
			const stAt = AwAit this.fileService.resolve(folder);
			if (stAt.children) {
				const All = stAt.children.filter(stAt => stAt.isFile && /^\d{8}T\d{6}(\.json)?$/.test(stAt.nAme)).sort();
				const bAckUpMAxAge = 1000 * 60 * 60 * 24 * (this.configurAtionService.getVAlue<number>('sync.locAlBAckupDurAtion') || 30 /* DefAult 30 dAys */);
				let toDelete = All.filter(stAt => DAte.now() - this.getCreAtionTime(stAt) > bAckUpMAxAge);
				const remAining = All.length - toDelete.length;
				if (remAining < 10) {
					toDelete = toDelete.slice(10 - remAining);
				}
				AwAit Promise.All(toDelete.mAp(stAt => {
					this.logService.info('Deleting from bAckup', stAt.resource.pAth);
					this.fileService.del(stAt.resource);
				}));
			}
		} cAtch (e) {
			this.logService.error(e);
		}
	}

	privAte getCreAtionTime(stAt: IFileStAt) {
		return stAt.ctime || new DAte(
			pArseInt(stAt.nAme.substring(0, 4)),
			pArseInt(stAt.nAme.substring(4, 6)) - 1,
			pArseInt(stAt.nAme.substring(6, 8)),
			pArseInt(stAt.nAme.substring(9, 11)),
			pArseInt(stAt.nAme.substring(11, 13)),
			pArseInt(stAt.nAme.substring(13, 15))
		).getTime();
	}
}
