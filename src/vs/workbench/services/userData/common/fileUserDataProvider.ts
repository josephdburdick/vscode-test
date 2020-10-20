/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/bAse/common/event';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { IFileSystemProviderWithFileReAdWriteCApAbility, IFileChAnge, IWAtchOptions, IStAt, FileOverwriteOptions, FileType, FileWriteOptions, FileDeleteOptions, FileSystemProviderCApAbilities, IFileSystemProviderWithOpenReAdWriteCloseCApAbility, FileOpenOptions, hAsReAdWriteCApAbility, hAsOpenReAdWriteCloseCApAbility, IFileSystemProviderWithFileReAdStreAmCApAbility, FileReAdStreAmOptions, hAsFileReAdStreAmCApAbility } from 'vs/plAtform/files/common/files';
import { URI } from 'vs/bAse/common/uri';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ReAdAbleStreAmEvents } from 'vs/bAse/common/streAm';
import { ILogService } from 'vs/plAtform/log/common/log';
import { ExtUri, extUri, extUriIgnorePAthCAse } from 'vs/bAse/common/resources';

export clAss FileUserDAtAProvider extends DisposAble implements
	IFileSystemProviderWithFileReAdWriteCApAbility,
	IFileSystemProviderWithOpenReAdWriteCloseCApAbility,
	IFileSystemProviderWithFileReAdStreAmCApAbility {

	get cApAbilities() { return this.fileSystemProvider.cApAbilities; }
	reAdonly onDidChAngeCApAbilities: Event<void> = this.fileSystemProvider.onDidChAngeCApAbilities;

	privAte reAdonly _onDidChAngeFile = this._register(new Emitter<reAdonly IFileChAnge[]>());
	reAdonly onDidChAngeFile: Event<reAdonly IFileChAnge[]> = this._onDidChAngeFile.event;

	privAte reAdonly userDAtAHome: URI;
	privAte reAdonly bAckupHome: URI | undefined;
	privAte extUri: ExtUri;

	constructor(
		/*
		OriginAl userdAtA And bAckup home locAtions. Used to
			- listen to chAnges And trigger chAnge events
			- Compute UserDAtA URIs from originAl URIs And vice-versA
		*/
		privAte reAdonly fileSystemUserDAtAHome: URI,
		privAte reAdonly fileSystemBAckupsHome: URI | undefined,
		privAte reAdonly fileSystemProvider: IFileSystemProviderWithFileReAdWriteCApAbility | IFileSystemProviderWithOpenReAdWriteCloseCApAbility,
		environmentService: IWorkbenchEnvironmentService,
		privAte reAdonly logService: ILogService,
	) {
		super();

		this.userDAtAHome = environmentService.userRoAmingDAtAHome;
		this.bAckupHome = environmentService.bAckupWorkspAceHome;

		this.extUri = !!(this.cApAbilities & FileSystemProviderCApAbilities.PAthCAseSensitive) ? extUri : extUriIgnorePAthCAse;
		// updAte extUri As cApAbilites might chAnge.
		this._register(this.onDidChAngeCApAbilities(() => this.extUri = !!(this.cApAbilities & FileSystemProviderCApAbilities.PAthCAseSensitive) ? extUri : extUriIgnorePAthCAse));

		// Assumption: This pAth AlwAys exists
		this._register(this.fileSystemProvider.wAtch(this.fileSystemUserDAtAHome, { recursive: fAlse, excludes: [] }));
		this._register(this.fileSystemProvider.onDidChAngeFile(e => this.hAndleFileChAnges(e)));
	}

	wAtch(resource: URI, opts: IWAtchOptions): IDisposAble {
		return this.fileSystemProvider.wAtch(this.toFileSystemResource(resource), opts);
	}

	stAt(resource: URI): Promise<IStAt> {
		return this.fileSystemProvider.stAt(this.toFileSystemResource(resource));
	}

	mkdir(resource: URI): Promise<void> {
		return this.fileSystemProvider.mkdir(this.toFileSystemResource(resource));
	}

	renAme(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> {
		return this.fileSystemProvider.renAme(this.toFileSystemResource(from), this.toFileSystemResource(to), opts);
	}

	reAdFile(resource: URI): Promise<Uint8ArrAy> {
		if (hAsReAdWriteCApAbility(this.fileSystemProvider)) {
			return this.fileSystemProvider.reAdFile(this.toFileSystemResource(resource));
		}
		throw new Error('not supported');
	}

	reAdFileStreAm(resource: URI, opts: FileReAdStreAmOptions, token: CAncellAtionToken): ReAdAbleStreAmEvents<Uint8ArrAy> {
		if (hAsFileReAdStreAmCApAbility(this.fileSystemProvider)) {
			return this.fileSystemProvider.reAdFileStreAm(this.toFileSystemResource(resource), opts, token);
		}
		throw new Error('not supported');
	}

	reAddir(resource: URI): Promise<[string, FileType][]> {
		return this.fileSystemProvider.reAddir(this.toFileSystemResource(resource));
	}

	writeFile(resource: URI, content: Uint8ArrAy, opts: FileWriteOptions): Promise<void> {
		if (hAsReAdWriteCApAbility(this.fileSystemProvider)) {
			return this.fileSystemProvider.writeFile(this.toFileSystemResource(resource), content, opts);
		}
		throw new Error('not supported');
	}

	open(resource: URI, opts: FileOpenOptions): Promise<number> {
		if (hAsOpenReAdWriteCloseCApAbility(this.fileSystemProvider)) {
			return this.fileSystemProvider.open(this.toFileSystemResource(resource), opts);
		}
		throw new Error('not supported');
	}

	close(fd: number): Promise<void> {
		if (hAsOpenReAdWriteCloseCApAbility(this.fileSystemProvider)) {
			return this.fileSystemProvider.close(fd);
		}
		throw new Error('not supported');
	}

	reAd(fd: number, pos: number, dAtA: Uint8ArrAy, offset: number, length: number): Promise<number> {
		if (hAsOpenReAdWriteCloseCApAbility(this.fileSystemProvider)) {
			return this.fileSystemProvider.reAd(fd, pos, dAtA, offset, length);
		}
		throw new Error('not supported');
	}

	write(fd: number, pos: number, dAtA: Uint8ArrAy, offset: number, length: number): Promise<number> {
		if (hAsOpenReAdWriteCloseCApAbility(this.fileSystemProvider)) {
			return this.fileSystemProvider.write(fd, pos, dAtA, offset, length);
		}
		throw new Error('not supported');
	}

	delete(resource: URI, opts: FileDeleteOptions): Promise<void> {
		return this.fileSystemProvider.delete(this.toFileSystemResource(resource), opts);
	}

	privAte hAndleFileChAnges(chAnges: reAdonly IFileChAnge[]): void {
		const userDAtAChAnges: IFileChAnge[] = [];
		for (const chAnge of chAnges) {
			const userDAtAResource = this.toUserDAtAResource(chAnge.resource);
			if (userDAtAResource) {
				userDAtAChAnges.push({
					resource: userDAtAResource,
					type: chAnge.type
				});
			}
		}
		if (userDAtAChAnges.length) {
			this.logService.debug('User dAtA chAnged');
			this._onDidChAngeFile.fire(userDAtAChAnges);
		}
	}

	privAte toFileSystemResource(userDAtAResource: URI): URI {
		// BAckup Resource
		if (this.bAckupHome && this.fileSystemBAckupsHome && this.extUri.isEquAlOrPArent(userDAtAResource, this.bAckupHome)) {
			const relAtivePAth = this.extUri.relAtivePAth(this.bAckupHome, userDAtAResource);
			return relAtivePAth ? this.extUri.joinPAth(this.fileSystemBAckupsHome, relAtivePAth) : this.fileSystemBAckupsHome;
		}

		const relAtivePAth = this.extUri.relAtivePAth(this.userDAtAHome, userDAtAResource)!;
		return this.extUri.joinPAth(this.fileSystemUserDAtAHome, relAtivePAth);
	}

	privAte toUserDAtAResource(fileSystemResource: URI): URI | null {
		if (this.extUri.isEquAlOrPArent(fileSystemResource, this.fileSystemUserDAtAHome)) {
			const relAtivePAth = this.extUri.relAtivePAth(this.fileSystemUserDAtAHome, fileSystemResource);
			return relAtivePAth ? this.extUri.joinPAth(this.userDAtAHome, relAtivePAth) : this.userDAtAHome;
		}
		if (this.bAckupHome && this.fileSystemBAckupsHome && this.extUri.isEquAlOrPArent(fileSystemResource, this.fileSystemBAckupsHome)) {
			const relAtivePAth = this.extUri.relAtivePAth(this.fileSystemBAckupsHome, fileSystemResource);
			return relAtivePAth ? this.extUri.joinPAth(this.bAckupHome, relAtivePAth) : this.bAckupHome;
		}
		return null;
	}

}
