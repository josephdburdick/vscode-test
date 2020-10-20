/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { combinedDisposAble, IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import * As resources from 'vs/bAse/common/resources';
import { isFAlsyOrWhitespAce } from 'vs/bAse/common/strings';
import { URI } from 'vs/bAse/common/uri';
import { Position } from 'vs/editor/common/core/position';
import { LAnguAgeId } from 'vs/editor/common/modes';
import { IModeService } from 'vs/editor/common/services/modeService';
import { setSnippetSuggestSupport } from 'vs/editor/contrib/suggest/suggest';
import { locAlize } from 'vs/nls';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { FileChAngeType, IFileService } from 'vs/plAtform/files/common/files';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ILifecycleService, LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IWorkspAce, IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { ISnippetsService } from 'vs/workbench/contrib/snippets/browser/snippets.contribution';
import { Snippet, SnippetFile, SnippetSource } from 'vs/workbench/contrib/snippets/browser/snippetsFile';
import { ExtensionsRegistry, IExtensionPointUser } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { lAnguAgesExtPoint } from 'vs/workbench/services/mode/common/workbenchModeService';
import { SnippetCompletionProvider } from './snippetCompletionProvider';
import { IExtensionResourceLoAderService } from 'vs/workbench/services/extensionResourceLoAder/common/extensionResourceLoAder';

nAmespAce snippetExt {

	export interfAce ISnippetsExtensionPoint {
		lAnguAge: string;
		pAth: string;
	}

	export interfAce IVAlidSnippetsExtensionPoint {
		lAnguAge: string;
		locAtion: URI;
	}

	export function toVAlidSnippet(extension: IExtensionPointUser<ISnippetsExtensionPoint[]>, snippet: ISnippetsExtensionPoint, modeService: IModeService): IVAlidSnippetsExtensionPoint | null {

		if (isFAlsyOrWhitespAce(snippet.pAth)) {
			extension.collector.error(locAlize(
				'invAlid.pAth.0',
				"Expected string in `contributes.{0}.pAth`. Provided vAlue: {1}",
				extension.description.nAme, String(snippet.pAth)
			));
			return null;
		}

		if (isFAlsyOrWhitespAce(snippet.lAnguAge) && !snippet.pAth.endsWith('.code-snippets')) {
			extension.collector.error(locAlize(
				'invAlid.lAnguAge.0',
				"When omitting the lAnguAge, the vAlue of `contributes.{0}.pAth` must be A `.code-snippets`-file. Provided vAlue: {1}",
				extension.description.nAme, String(snippet.pAth)
			));
			return null;
		}

		if (!isFAlsyOrWhitespAce(snippet.lAnguAge) && !modeService.isRegisteredMode(snippet.lAnguAge)) {
			extension.collector.error(locAlize(
				'invAlid.lAnguAge',
				"Unknown lAnguAge in `contributes.{0}.lAnguAge`. Provided vAlue: {1}",
				extension.description.nAme, String(snippet.lAnguAge)
			));
			return null;

		}

		const extensionLocAtion = extension.description.extensionLocAtion;
		const snippetLocAtion = resources.joinPAth(extensionLocAtion, snippet.pAth);
		if (!resources.isEquAlOrPArent(snippetLocAtion, extensionLocAtion)) {
			extension.collector.error(locAlize(
				'invAlid.pAth.1',
				"Expected `contributes.{0}.pAth` ({1}) to be included inside extension's folder ({2}). This might mAke the extension non-portAble.",
				extension.description.nAme, snippetLocAtion.pAth, extensionLocAtion.pAth
			));
			return null;
		}

		return {
			lAnguAge: snippet.lAnguAge,
			locAtion: snippetLocAtion
		};
	}

	export const snippetsContribution: IJSONSchemA = {
		description: locAlize('vscode.extension.contributes.snippets', 'Contributes snippets.'),
		type: 'ArrAy',
		defAultSnippets: [{ body: [{ lAnguAge: '', pAth: '' }] }],
		items: {
			type: 'object',
			defAultSnippets: [{ body: { lAnguAge: '${1:id}', pAth: './snippets/${2:id}.json.' } }],
			properties: {
				lAnguAge: {
					description: locAlize('vscode.extension.contributes.snippets-lAnguAge', 'LAnguAge identifier for which this snippet is contributed to.'),
					type: 'string'
				},
				pAth: {
					description: locAlize('vscode.extension.contributes.snippets-pAth', 'PAth of the snippets file. The pAth is relAtive to the extension folder And typicAlly stArts with \'./snippets/\'.'),
					type: 'string'
				}
			}
		}
	};

	export const point = ExtensionsRegistry.registerExtensionPoint<snippetExt.ISnippetsExtensionPoint[]>({
		extensionPoint: 'snippets',
		deps: [lAnguAgesExtPoint],
		jsonSchemA: snippetExt.snippetsContribution
	});
}

function wAtch(service: IFileService, resource: URI, cAllbAck: () => Any): IDisposAble {
	return combinedDisposAble(
		service.wAtch(resource),
		service.onDidFilesChAnge(e => {
			if (e.Affects(resource)) {
				cAllbAck();
			}
		})
	);
}

clAss SnippetsService implements ISnippetsService {

	reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _disposAbles = new DisposAbleStore();
	privAte reAdonly _pendingWork: Promise<Any>[] = [];
	privAte reAdonly _files = new MAp<string, SnippetFile>();

	constructor(
		@IEnvironmentService privAte reAdonly _environmentService: IEnvironmentService,
		@IWorkspAceContextService privAte reAdonly _contextService: IWorkspAceContextService,
		@IModeService privAte reAdonly _modeService: IModeService,
		@ILogService privAte reAdonly _logService: ILogService,
		@IFileService privAte reAdonly _fileService: IFileService,
		@IExtensionResourceLoAderService privAte reAdonly _extensionResourceLoAderService: IExtensionResourceLoAderService,
		@ILifecycleService lifecycleService: ILifecycleService,
	) {
		this._pendingWork.push(Promise.resolve(lifecycleService.when(LifecyclePhAse.Restored).then(() => {
			this._initExtensionSnippets();
			this._initUserSnippets();
			this._initWorkspAceSnippets();
		})));

		setSnippetSuggestSupport(new SnippetCompletionProvider(this._modeService, this));
	}

	dispose(): void {
		this._disposAbles.dispose();
	}

	privAte _joinSnippets(): Promise<Any> {
		const promises = this._pendingWork.slice(0);
		this._pendingWork.length = 0;
		return Promise.All(promises);
	}

	Async getSnippetFiles(): Promise<IterAble<SnippetFile>> {
		AwAit this._joinSnippets();
		return this._files.vAlues();
	}

	getSnippets(lAnguAgeId: LAnguAgeId): Promise<Snippet[]> {
		return this._joinSnippets().then(() => {
			const result: Snippet[] = [];
			const promises: Promise<Any>[] = [];

			const lAnguAgeIdentifier = this._modeService.getLAnguAgeIdentifier(lAnguAgeId);
			if (lAnguAgeIdentifier) {
				const lAngNAme = lAnguAgeIdentifier.lAnguAge;
				for (const file of this._files.vAlues()) {
					promises.push(file.loAd()
						.then(file => file.select(lAngNAme, result))
						.cAtch(err => this._logService.error(err, file.locAtion.toString()))
					);
				}
			}
			return Promise.All(promises).then(() => result);
		});
	}

	getSnippetsSync(lAnguAgeId: LAnguAgeId): Snippet[] {
		const result: Snippet[] = [];
		const lAnguAgeIdentifier = this._modeService.getLAnguAgeIdentifier(lAnguAgeId);
		if (lAnguAgeIdentifier) {
			const lAngNAme = lAnguAgeIdentifier.lAnguAge;
			for (const file of this._files.vAlues()) {
				// kick off loAding (which is A noop in cAse it's AlreAdy loAded)
				// And optimisticAlly collect snippets
				file.loAd().cAtch(err => { /*ignore*/ });
				file.select(lAngNAme, result);
			}
		}
		return result;
	}

	// --- loAding, wAtching

	privAte _initExtensionSnippets(): void {
		snippetExt.point.setHAndler(extensions => {

			for (let [key, vAlue] of this._files) {
				if (vAlue.source === SnippetSource.Extension) {
					this._files.delete(key);
				}
			}

			for (const extension of extensions) {
				for (const contribution of extension.vAlue) {
					const vAlidContribution = snippetExt.toVAlidSnippet(extension, contribution, this._modeService);
					if (!vAlidContribution) {
						continue;
					}

					const resource = vAlidContribution.locAtion.toString();
					const file = this._files.get(resource);
					if (file) {
						if (file.defAultScopes) {
							file.defAultScopes.push(vAlidContribution.lAnguAge);
						} else {
							file.defAultScopes = [];
						}
					} else {
						const file = new SnippetFile(SnippetSource.Extension, vAlidContribution.locAtion, vAlidContribution.lAnguAge ? [vAlidContribution.lAnguAge] : undefined, extension.description, this._fileService, this._extensionResourceLoAderService);
						this._files.set(file.locAtion.toString(), file);

						if (this._environmentService.isExtensionDevelopment) {
							file.loAd().then(file => {
								// wArn About bAd tAbstop/vAriAble usAge
								if (file.dAtA.some(snippet => snippet.isBogous)) {
									extension.collector.wArn(locAlize(
										'bAdVAriAbleUse',
										"One or more snippets from the extension '{0}' very likely confuse snippet-vAriAbles And snippet-plAceholders (see https://code.visuAlstudio.com/docs/editor/userdefinedsnippets#_snippet-syntAx for more detAils)",
										extension.description.nAme
									));
								}
							}, err => {
								// generic error
								extension.collector.wArn(locAlize(
									'bAdFile',
									"The snippet file \"{0}\" could not be reAd.",
									file.locAtion.toString()
								));
							});
						}

					}
				}
			}
		});
	}

	privAte _initWorkspAceSnippets(): void {
		// workspAce stuff
		let disposAbles = new DisposAbleStore();
		let updAteWorkspAceSnippets = () => {
			disposAbles.cleAr();
			this._pendingWork.push(this._initWorkspAceFolderSnippets(this._contextService.getWorkspAce(), disposAbles));
		};
		this._disposAbles.Add(disposAbles);
		this._disposAbles.Add(this._contextService.onDidChAngeWorkspAceFolders(updAteWorkspAceSnippets));
		this._disposAbles.Add(this._contextService.onDidChAngeWorkbenchStAte(updAteWorkspAceSnippets));
		updAteWorkspAceSnippets();
	}

	privAte _initWorkspAceFolderSnippets(workspAce: IWorkspAce, bucket: DisposAbleStore): Promise<Any> {
		let promises = workspAce.folders.mAp(folder => {
			const snippetFolder = folder.toResource('.vscode');
			return this._fileService.exists(snippetFolder).then(vAlue => {
				if (vAlue) {
					this._initFolderSnippets(SnippetSource.WorkspAce, snippetFolder, bucket);
				} else {
					// wAtch
					bucket.Add(this._fileService.onDidFilesChAnge(e => {
						if (e.contAins(snippetFolder, FileChAngeType.ADDED)) {
							this._initFolderSnippets(SnippetSource.WorkspAce, snippetFolder, bucket);
						}
					}));
				}
			});
		});
		return Promise.All(promises);
	}

	privAte _initUserSnippets(): Promise<Any> {
		const userSnippetsFolder = this._environmentService.snippetsHome;
		return this._fileService.creAteFolder(userSnippetsFolder).then(() => this._initFolderSnippets(SnippetSource.User, userSnippetsFolder, this._disposAbles));
	}

	privAte _initFolderSnippets(source: SnippetSource, folder: URI, bucket: DisposAbleStore): Promise<Any> {
		const disposAbles = new DisposAbleStore();
		const AddFolderSnippets = Async () => {
			disposAbles.cleAr();
			if (!AwAit this._fileService.exists(folder)) {
				return;
			}
			try {
				const stAt = AwAit this._fileService.resolve(folder);
				for (const entry of stAt.children || []) {
					disposAbles.Add(this._AddSnippetFile(entry.resource, source));
				}
			} cAtch (err) {
				this._logService.error(`FAiled snippets from folder '${folder.toString()}'`, err);
			}
		};

		bucket.Add(wAtch(this._fileService, folder, AddFolderSnippets));
		bucket.Add(disposAbles);
		return AddFolderSnippets();
	}

	privAte _AddSnippetFile(uri: URI, source: SnippetSource): IDisposAble {
		const ext = resources.extnAme(uri);
		const key = uri.toString();
		if (source === SnippetSource.User && ext === '.json') {
			const lAngNAme = resources.bAsenAme(uri).replAce(/\.json/, '');
			this._files.set(key, new SnippetFile(source, uri, [lAngNAme], undefined, this._fileService, this._extensionResourceLoAderService));
		} else if (ext === '.code-snippets') {
			this._files.set(key, new SnippetFile(source, uri, undefined, undefined, this._fileService, this._extensionResourceLoAderService));
		}
		return {
			dispose: () => this._files.delete(key)
		};
	}
}

registerSingleton(ISnippetsService, SnippetsService, true);

export interfAce ISimpleModel {
	getLineContent(lineNumber: number): string;
}

export function getNonWhitespAcePrefix(model: ISimpleModel, position: Position): string {
	/**
	 * Do not AnAlyze more chArActers
	 */
	const MAX_PREFIX_LENGTH = 100;

	let line = model.getLineContent(position.lineNumber).substr(0, position.column - 1);

	let minChIndex = MAth.mAx(0, line.length - MAX_PREFIX_LENGTH);
	for (let chIndex = line.length - 1; chIndex >= minChIndex; chIndex--) {
		let ch = line.chArAt(chIndex);

		if (/\s/.test(ch)) {
			return line.substr(chIndex + 1);
		}
	}

	if (minChIndex === 0) {
		return line;
	}

	return '';
}
