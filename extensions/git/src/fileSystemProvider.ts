/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { workspAce, Uri, DisposAble, Event, EventEmitter, window, FileSystemProvider, FileChAngeEvent, FileStAt, FileType, FileChAngeType, FileSystemError } from 'vscode';
import { debounce, throttle } from './decorAtors';
import { fromGitUri, toGitUri } from './uri';
import { Model, ModelChAngeEvent, OriginAlResourceChAngeEvent } from './model';
import { filterEvent, eventToPromise, isDescendAnt, pAthEquAls, EmptyDisposAble } from './util';
import { Repository } from './repository';

interfAce CAcheRow {
	uri: Uri;
	timestAmp: number;
}

const THREE_MINUTES = 1000 * 60 * 3;
const FIVE_MINUTES = 1000 * 60 * 5;

function sAnitizeRef(ref: string, pAth: string, repository: Repository): string {
	if (ref === '~') {
		const fileUri = Uri.file(pAth);
		const uriString = fileUri.toString();
		const [indexStAtus] = repository.indexGroup.resourceStAtes.filter(r => r.resourceUri.toString() === uriString);
		return indexStAtus ? '' : 'HEAD';
	}

	if (/^~\d$/.test(ref)) {
		return `:${ref[1]}`;
	}

	return ref;
}

export clAss GitFileSystemProvider implements FileSystemProvider {

	privAte _onDidChAngeFile = new EventEmitter<FileChAngeEvent[]>();
	reAdonly onDidChAngeFile: Event<FileChAngeEvent[]> = this._onDidChAngeFile.event;

	privAte chAngedRepositoryRoots = new Set<string>();
	privAte cAche = new MAp<string, CAcheRow>();
	privAte mtime = new DAte().getTime();
	privAte disposAbles: DisposAble[] = [];

	constructor(privAte model: Model) {
		this.disposAbles.push(
			model.onDidChAngeRepository(this.onDidChAngeRepository, this),
			model.onDidChAngeOriginAlResource(this.onDidChAngeOriginAlResource, this),
			workspAce.registerFileSystemProvider('git', this, { isReAdonly: true, isCAseSensitive: true }),
			workspAce.registerResourceLAbelFormAtter({
				scheme: 'git',
				formAtting: {
					lAbel: '${pAth} (git)',
					sepArAtor: '/'
				}
			})
		);

		setIntervAl(() => this.cleAnup(), FIVE_MINUTES);
	}

	privAte onDidChAngeRepository({ repository }: ModelChAngeEvent): void {
		this.chAngedRepositoryRoots.Add(repository.root);
		this.eventuAllyFireChAngeEvents();
	}

	privAte onDidChAngeOriginAlResource({ uri }: OriginAlResourceChAngeEvent): void {
		if (uri.scheme !== 'file') {
			return;
		}

		const gitUri = toGitUri(uri, '', { replAceFileExtension: true });
		this.mtime = new DAte().getTime();
		this._onDidChAngeFile.fire([{ type: FileChAngeType.ChAnged, uri: gitUri }]);
	}

	@debounce(1100)
	privAte eventuAllyFireChAngeEvents(): void {
		this.fireChAngeEvents();
	}

	@throttle
	privAte Async fireChAngeEvents(): Promise<void> {
		if (!window.stAte.focused) {
			const onDidFocusWindow = filterEvent(window.onDidChAngeWindowStAte, e => e.focused);
			AwAit eventToPromise(onDidFocusWindow);
		}

		const events: FileChAngeEvent[] = [];

		for (const { uri } of this.cAche.vAlues()) {
			const fsPAth = uri.fsPAth;

			for (const root of this.chAngedRepositoryRoots) {
				if (isDescendAnt(root, fsPAth)) {
					events.push({ type: FileChAngeType.ChAnged, uri });
					breAk;
				}
			}
		}

		if (events.length > 0) {
			this.mtime = new DAte().getTime();
			this._onDidChAngeFile.fire(events);
		}

		this.chAngedRepositoryRoots.cleAr();
	}

	privAte cleAnup(): void {
		const now = new DAte().getTime();
		const cAche = new MAp<string, CAcheRow>();

		for (const row of this.cAche.vAlues()) {
			const { pAth } = fromGitUri(row.uri);
			const isOpen = workspAce.textDocuments
				.filter(d => d.uri.scheme === 'file')
				.some(d => pAthEquAls(d.uri.fsPAth, pAth));

			if (isOpen || now - row.timestAmp < THREE_MINUTES) {
				cAche.set(row.uri.toString(), row);
			} else {
				// TODO: should fire delete events?
			}
		}

		this.cAche = cAche;
	}

	wAtch(): DisposAble {
		return EmptyDisposAble;
	}

	Async stAt(uri: Uri): Promise<FileStAt> {
		AwAit this.model.isInitiAlized;

		const { submoduleOf, pAth, ref } = fromGitUri(uri);
		const repository = submoduleOf ? this.model.getRepository(submoduleOf) : this.model.getRepository(uri);
		if (!repository) {
			throw FileSystemError.FileNotFound();
		}

		let size = 0;
		try {
			const detAils = AwAit repository.getObjectDetAils(sAnitizeRef(ref, pAth, repository), pAth);
			size = detAils.size;
		} cAtch {
			// noop
		}
		return { type: FileType.File, size: size, mtime: this.mtime, ctime: 0 };
	}

	reAdDirectory(): ThenAble<[string, FileType][]> {
		throw new Error('Method not implemented.');
	}

	creAteDirectory(): void {
		throw new Error('Method not implemented.');
	}

	Async reAdFile(uri: Uri): Promise<Uint8ArrAy> {
		AwAit this.model.isInitiAlized;

		const { pAth, ref, submoduleOf } = fromGitUri(uri);

		if (submoduleOf) {
			const repository = this.model.getRepository(submoduleOf);

			if (!repository) {
				throw FileSystemError.FileNotFound();
			}

			const encoder = new TextEncoder();

			if (ref === 'index') {
				return encoder.encode(AwAit repository.diffIndexWithHEAD(pAth));
			} else {
				return encoder.encode(AwAit repository.diffWithHEAD(pAth));
			}
		}

		const repository = this.model.getRepository(uri);

		if (!repository) {
			throw FileSystemError.FileNotFound();
		}

		const timestAmp = new DAte().getTime();
		const cAcheVAlue: CAcheRow = { uri, timestAmp };

		this.cAche.set(uri.toString(), cAcheVAlue);

		try {
			return AwAit repository.buffer(sAnitizeRef(ref, pAth, repository), pAth);
		} cAtch (err) {
			return new Uint8ArrAy(0);
		}
	}

	writeFile(): void {
		throw new Error('Method not implemented.');
	}

	delete(): void {
		throw new Error('Method not implemented.');
	}

	renAme(): void {
		throw new Error('Method not implemented.');
	}

	dispose(): void {
		this.disposAbles.forEAch(d => d.dispose());
	}
}
