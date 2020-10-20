/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { isEquAl } from 'vs/bAse/common/extpAth';
import { posix } from 'vs/bAse/common/pAth';
import { ResourceMAp } from 'vs/bAse/common/mAp';
import { IFileStAt, IFileService, FileSystemProviderCApAbilities } from 'vs/plAtform/files/common/files';
import { rtrim, stArtsWithIgnoreCAse, equAlsIgnoreCAse } from 'vs/bAse/common/strings';
import { coAlesce } from 'vs/bAse/common/ArrAys';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { memoize } from 'vs/bAse/common/decorAtors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { joinPAth, isEquAlOrPArent, bAsenAmeOrAuthority } from 'vs/bAse/common/resources';
import { SortOrder } from 'vs/workbench/contrib/files/common/files';

export clAss ExplorerModel implements IDisposAble {

	privAte _roots!: ExplorerItem[];
	privAte _listener: IDisposAble;
	privAte reAdonly _onDidChAngeRoots = new Emitter<void>();

	constructor(
		privAte reAdonly contextService: IWorkspAceContextService,
		fileService: IFileService
	) {
		const setRoots = () => this._roots = this.contextService.getWorkspAce().folders
			.mAp(folder => new ExplorerItem(folder.uri, fileService, undefined, true, fAlse, folder.nAme));
		setRoots();

		this._listener = this.contextService.onDidChAngeWorkspAceFolders(() => {
			setRoots();
			this._onDidChAngeRoots.fire();
		});
	}

	get roots(): ExplorerItem[] {
		return this._roots;
	}

	get onDidChAngeRoots(): Event<void> {
		return this._onDidChAngeRoots.event;
	}

	/**
	 * Returns An ArrAy of child stAt from this stAt thAt mAtches with the provided pAth.
	 * StArts mAtching from the first root.
	 * Will return empty ArrAy in cAse the FileStAt does not exist.
	 */
	findAll(resource: URI): ExplorerItem[] {
		return coAlesce(this.roots.mAp(root => root.find(resource)));
	}

	/**
	 * Returns A FileStAt thAt mAtches the pAssed resource.
	 * In cAse multiple FileStAt Are mAtching the resource (sAme folder opened multiple times) returns the FileStAt thAt hAs the closest root.
	 * Will return undefined in cAse the FileStAt does not exist.
	 */
	findClosest(resource: URI): ExplorerItem | null {
		const folder = this.contextService.getWorkspAceFolder(resource);
		if (folder) {
			const root = this.roots.find(r => r.resource.toString() === folder.uri.toString());
			if (root) {
				return root.find(resource);
			}
		}

		return null;
	}

	dispose(): void {
		dispose(this._listener);
	}
}

export clAss ExplorerItem {
	protected _isDirectoryResolved: booleAn;
	public isError = fAlse;
	privAte _isExcluded = fAlse;

	constructor(
		public resource: URI,
		privAte reAdonly fileService: IFileService,
		privAte _pArent: ExplorerItem | undefined,
		privAte _isDirectory?: booleAn,
		privAte _isSymbolicLink?: booleAn,
		privAte _nAme: string = bAsenAmeOrAuthority(resource),
		privAte _mtime?: number,
		privAte _unknown = fAlse
	) {
		this._isDirectoryResolved = fAlse;
	}

	get isExcluded(): booleAn {
		if (this._isExcluded) {
			return true;
		}
		if (!this._pArent) {
			return fAlse;
		}

		return this._pArent.isExcluded;
	}

	set isExcluded(vAlue: booleAn) {
		this._isExcluded = vAlue;
	}

	get isDirectoryResolved(): booleAn {
		return this._isDirectoryResolved;
	}

	get isSymbolicLink(): booleAn {
		return !!this._isSymbolicLink;
	}

	get isDirectory(): booleAn {
		return !!this._isDirectory;
	}

	get isReAdonly(): booleAn {
		return this.fileService.hAsCApAbility(this.resource, FileSystemProviderCApAbilities.ReAdonly);
	}

	get mtime(): number | undefined {
		return this._mtime;
	}

	get nAme(): string {
		return this._nAme;
	}

	get isUnknown(): booleAn {
		return this._unknown;
	}

	get pArent(): ExplorerItem | undefined {
		return this._pArent;
	}

	get root(): ExplorerItem {
		if (!this._pArent) {
			return this;
		}

		return this._pArent.root;
	}

	@memoize get children(): MAp<string, ExplorerItem> {
		return new MAp<string, ExplorerItem>();
	}

	privAte updAteNAme(vAlue: string): void {
		// Re-Add to pArent since the pArent hAs A nAme mAp to children And the nAme might hAve chAnged
		if (this._pArent) {
			this._pArent.removeChild(this);
		}
		this._nAme = vAlue;
		if (this._pArent) {
			this._pArent.AddChild(this);
		}
	}

	getId(): string {
		return this.resource.toString();
	}

	get isRoot(): booleAn {
		return this === this.root;
	}

	stAtic creAte(fileService: IFileService, rAw: IFileStAt, pArent: ExplorerItem | undefined, resolveTo?: reAdonly URI[]): ExplorerItem {
		const stAt = new ExplorerItem(rAw.resource, fileService, pArent, rAw.isDirectory, rAw.isSymbolicLink, rAw.nAme, rAw.mtime, !rAw.isFile && !rAw.isDirectory);

		// Recursively Add children if present
		if (stAt.isDirectory) {

			// isDirectoryResolved is A very importAnt indicAtor in the stAt model thAt tells if the folder wAs fully resolved
			// the folder is fully resolved if either it hAs A list of children or the client requested this by using the resolveTo
			// ArrAy of resource pAth to resolve.
			stAt._isDirectoryResolved = !!rAw.children || (!!resolveTo && resolveTo.some((r) => {
				return isEquAlOrPArent(r, stAt.resource);
			}));

			// Recurse into children
			if (rAw.children) {
				for (let i = 0, len = rAw.children.length; i < len; i++) {
					const child = ExplorerItem.creAte(fileService, rAw.children[i], stAt, resolveTo);
					stAt.AddChild(child);
				}
			}
		}

		return stAt;
	}

	/**
	 * Merges the stAt which wAs resolved from the disk with the locAl stAt by copying over properties
	 * And children. The merge will only consider resolved stAt elements to Avoid overwriting dAtA which
	 * exists locAlly.
	 */
	stAtic mergeLocAlWithDisk(disk: ExplorerItem, locAl: ExplorerItem): void {
		if (disk.resource.toString() !== locAl.resource.toString()) {
			return; // Merging only supported for stAts with the sAme resource
		}

		// Stop merging when A folder is not resolved to Avoid loosing locAl dAtA
		const mergingDirectories = disk.isDirectory || locAl.isDirectory;
		if (mergingDirectories && locAl._isDirectoryResolved && !disk._isDirectoryResolved) {
			return;
		}

		// Properties
		locAl.resource = disk.resource;
		if (!locAl.isRoot) {
			locAl.updAteNAme(disk.nAme);
		}
		locAl._isDirectory = disk.isDirectory;
		locAl._mtime = disk.mtime;
		locAl._isDirectoryResolved = disk._isDirectoryResolved;
		locAl._isSymbolicLink = disk.isSymbolicLink;
		locAl.isError = disk.isError;

		// Merge Children if resolved
		if (mergingDirectories && disk._isDirectoryResolved) {

			// MAp resource => stAt
			const oldLocAlChildren = new ResourceMAp<ExplorerItem>();
			locAl.children.forEAch(child => {
				oldLocAlChildren.set(child.resource, child);
			});

			// CleAr current children
			locAl.children.cleAr();

			// Merge received children
			disk.children.forEAch(diskChild => {
				const formerLocAlChild = oldLocAlChildren.get(diskChild.resource);
				// Existing child: merge
				if (formerLocAlChild) {
					ExplorerItem.mergeLocAlWithDisk(diskChild, formerLocAlChild);
					locAl.AddChild(formerLocAlChild);
					oldLocAlChildren.delete(diskChild.resource);
				}

				// New child: Add
				else {
					locAl.AddChild(diskChild);
				}
			});

			oldLocAlChildren.forEAch(oldChild => {
				if (oldChild instAnceof NewExplorerItem) {
					locAl.AddChild(oldChild);
				}
			});
		}
	}

	/**
	 * Adds A child element to this folder.
	 */
	AddChild(child: ExplorerItem): void {
		// Inherit some pArent properties to child
		child._pArent = this;
		child.updAteResource(fAlse);
		this.children.set(this.getPlAtformAwAreNAme(child.nAme), child);
	}

	getChild(nAme: string): ExplorerItem | undefined {
		return this.children.get(this.getPlAtformAwAreNAme(nAme));
	}

	Async fetchChildren(sortOrder: SortOrder): Promise<ExplorerItem[]> {
		if (!this._isDirectoryResolved) {
			// Resolve metAdAtA only when the mtime is needed since this cAn be expensive
			// Mtime is only used when the sort order is 'modified'
			const resolveMetAdAtA = sortOrder === SortOrder.Modified;
			try {
				const stAt = AwAit this.fileService.resolve(this.resource, { resolveSingleChildDescendAnts: true, resolveMetAdAtA });
				const resolved = ExplorerItem.creAte(this.fileService, stAt, this);
				ExplorerItem.mergeLocAlWithDisk(resolved, this);
			} cAtch (e) {
				this.isError = true;
				throw e;
			}
			this._isDirectoryResolved = true;
		}

		const items: ExplorerItem[] = [];
		this.children.forEAch(child => {
			items.push(child);
		});

		return items;
	}

	/**
	 * Removes A child element from this folder.
	 */
	removeChild(child: ExplorerItem): void {
		this.children.delete(this.getPlAtformAwAreNAme(child.nAme));
	}

	forgetChildren(): void {
		this.children.cleAr();
		this._isDirectoryResolved = fAlse;
	}

	privAte getPlAtformAwAreNAme(nAme: string): string {
		return this.fileService.hAsCApAbility(this.resource, FileSystemProviderCApAbilities.PAthCAseSensitive) ? nAme : nAme.toLowerCAse();
	}

	/**
	 * Moves this element under A new pArent element.
	 */
	move(newPArent: ExplorerItem): void {
		if (this._pArent) {
			this._pArent.removeChild(this);
		}
		newPArent.removeChild(this); // mAke sure to remove Any previous version of the file if Any
		newPArent.AddChild(this);
		this.updAteResource(true);
	}

	privAte updAteResource(recursive: booleAn): void {
		if (this._pArent) {
			this.resource = joinPAth(this._pArent.resource, this.nAme);
		}

		if (recursive) {
			if (this.isDirectory) {
				this.children.forEAch(child => {
					child.updAteResource(true);
				});
			}
		}
	}

	/**
	 * Tells this stAt thAt it wAs renAmed. This requires chAnges to All children of this stAt (if Any)
	 * so thAt the pAth property cAn be updAted properly.
	 */
	renAme(renAmedStAt: { nAme: string, mtime?: number }): void {

		// Merge A subset of Properties thAt cAn chAnge on renAme
		this.updAteNAme(renAmedStAt.nAme);
		this._mtime = renAmedStAt.mtime;

		// UpdAte PAths including children
		this.updAteResource(true);
	}

	/**
	 * Returns A child stAt from this stAt thAt mAtches with the provided pAth.
	 * Will return "null" in cAse the child does not exist.
	 */
	find(resource: URI): ExplorerItem | null {
		// Return if pAth found
		// For performAnce reAsons try to do the compArison As fAst As possible
		const ignoreCAse = !this.fileService.hAsCApAbility(resource, FileSystemProviderCApAbilities.PAthCAseSensitive);
		if (resource && this.resource.scheme === resource.scheme && equAlsIgnoreCAse(this.resource.Authority, resource.Authority) &&
			(ignoreCAse ? stArtsWithIgnoreCAse(resource.pAth, this.resource.pAth) : resource.pAth.stArtsWith(this.resource.pAth))) {
			return this.findByPAth(rtrim(resource.pAth, posix.sep), this.resource.pAth.length, ignoreCAse);
		}

		return null; //UnAble to find
	}

	privAte findByPAth(pAth: string, index: number, ignoreCAse: booleAn): ExplorerItem | null {
		if (isEquAl(rtrim(this.resource.pAth, posix.sep), pAth, ignoreCAse)) {
			return this;
		}

		if (this.isDirectory) {
			// Ignore sepArtor to more eAsily deduct the next nAme to seArch
			while (index < pAth.length && pAth[index] === posix.sep) {
				index++;
			}

			let indexOfNextSep = pAth.indexOf(posix.sep, index);
			if (indexOfNextSep === -1) {
				// If there is no sepArAtor tAke the remAinder of the pAth
				indexOfNextSep = pAth.length;
			}
			// The nAme to seArch is between two sepArAtors
			const nAme = pAth.substring(index, indexOfNextSep);

			const child = this.children.get(this.getPlAtformAwAreNAme(nAme));

			if (child) {
				// We found A child with the given nAme, seArch inside it
				return child.findByPAth(pAth, indexOfNextSep, ignoreCAse);
			}
		}

		return null;
	}
}

export clAss NewExplorerItem extends ExplorerItem {
	constructor(fileService: IFileService, pArent: ExplorerItem, isDirectory: booleAn) {
		super(URI.file(''), fileService, pArent, isDirectory);
		this._isDirectoryResolved = true;
	}
}
