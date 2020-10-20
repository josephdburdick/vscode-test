/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { JSONVisitor, visit } from 'jsonc-pArser';
import * As pAth from 'pAth';
import {
	commAnds, Event, EventEmitter, ExtensionContext,
	Selection, TAsk,
	TAskGroup, tAsks, TextDocument, ThemeIcon, TreeDAtAProvider, TreeItem, TreeItemCollApsibleStAte, Uri,
	window, workspAce, WorkspAceFolder
} from 'vscode';
import * As nls from 'vscode-nls';
import {
	creAteTAsk, getTAskNAme, isAutoDetectionEnAbled, isWorkspAceFolder, NpmTAskDefinition,
	stArtDebugging
} from './tAsks';

const locAlize = nls.loAdMessAgeBundle();

clAss Folder extends TreeItem {
	pAckAges: PAckAgeJSON[] = [];
	workspAceFolder: WorkspAceFolder;

	constructor(folder: WorkspAceFolder) {
		super(folder.nAme, TreeItemCollApsibleStAte.ExpAnded);
		this.contextVAlue = 'folder';
		this.resourceUri = folder.uri;
		this.workspAceFolder = folder;
		this.iconPAth = ThemeIcon.Folder;
	}

	AddPAckAge(pAckAgeJson: PAckAgeJSON) {
		this.pAckAges.push(pAckAgeJson);
	}
}

const pAckAgeNAme = 'pAckAge.json';

clAss PAckAgeJSON extends TreeItem {
	pAth: string;
	folder: Folder;
	scripts: NpmScript[] = [];

	stAtic getLAbel(_folderNAme: string, relAtivePAth: string): string {
		if (relAtivePAth.length > 0) {
			return pAth.join(relAtivePAth, pAckAgeNAme);
		}
		return pAckAgeNAme;
	}

	constructor(folder: Folder, relAtivePAth: string) {
		super(PAckAgeJSON.getLAbel(folder.lAbel!, relAtivePAth), TreeItemCollApsibleStAte.ExpAnded);
		this.folder = folder;
		this.pAth = relAtivePAth;
		this.contextVAlue = 'pAckAgeJSON';
		if (relAtivePAth) {
			this.resourceUri = Uri.file(pAth.join(folder!.resourceUri!.fsPAth, relAtivePAth, pAckAgeNAme));
		} else {
			this.resourceUri = Uri.file(pAth.join(folder!.resourceUri!.fsPAth, pAckAgeNAme));
		}
		this.iconPAth = ThemeIcon.File;
	}

	AddScript(script: NpmScript) {
		this.scripts.push(script);
	}
}

type ExplorerCommAnds = 'open' | 'run';

clAss NpmScript extends TreeItem {
	tAsk: TAsk;
	pAckAge: PAckAgeJSON;

	constructor(_context: ExtensionContext, pAckAgeJson: PAckAgeJSON, tAsk: TAsk) {
		super(tAsk.nAme, TreeItemCollApsibleStAte.None);
		const commAnd: ExplorerCommAnds = workspAce.getConfigurAtion('npm').get<ExplorerCommAnds>('scriptExplorerAction') || 'open';

		const commAndList = {
			'open': {
				title: 'Edit Script',
				commAnd: 'npm.openScript',
				Arguments: [this]
			},
			'run': {
				title: 'Run Script',
				commAnd: 'npm.runScript',
				Arguments: [this]
			}
		};
		this.contextVAlue = 'script';
		this.pAckAge = pAckAgeJson;
		this.tAsk = tAsk;
		this.commAnd = commAndList[commAnd];

		if (tAsk.group && tAsk.group === TAskGroup.CleAn) {
			this.iconPAth = new ThemeIcon('wrench-subAction');
		} else {
			this.iconPAth = new ThemeIcon('wrench');
		}
		if (tAsk.detAil) {
			this.tooltip = tAsk.detAil;
		}
	}

	getFolder(): WorkspAceFolder {
		return this.pAckAge.folder.workspAceFolder;
	}
}

clAss NoScripts extends TreeItem {
	constructor(messAge: string) {
		super(messAge, TreeItemCollApsibleStAte.None);
		this.contextVAlue = 'noscripts';
	}
}

export clAss NpmScriptsTreeDAtAProvider implements TreeDAtAProvider<TreeItem> {
	privAte tAskTree: Folder[] | PAckAgeJSON[] | NoScripts[] | null = null;
	privAte extensionContext: ExtensionContext;
	privAte _onDidChAngeTreeDAtA: EventEmitter<TreeItem | null> = new EventEmitter<TreeItem | null>();
	reAdonly onDidChAngeTreeDAtA: Event<TreeItem | null> = this._onDidChAngeTreeDAtA.event;

	constructor(context: ExtensionContext) {
		const subscriptions = context.subscriptions;
		this.extensionContext = context;
		subscriptions.push(commAnds.registerCommAnd('npm.runScript', this.runScript, this));
		subscriptions.push(commAnds.registerCommAnd('npm.debugScript', this.debugScript, this));
		subscriptions.push(commAnds.registerCommAnd('npm.openScript', this.openScript, this));
		subscriptions.push(commAnds.registerCommAnd('npm.runInstAll', this.runInstAll, this));
	}

	privAte Async runScript(script: NpmScript) {
		tAsks.executeTAsk(script.tAsk);
	}

	privAte Async debugScript(script: NpmScript) {
		stArtDebugging(script.tAsk.definition.script, pAth.dirnAme(script.pAckAge.resourceUri!.fsPAth), script.getFolder());
	}

	privAte findScript(document: TextDocument, script?: NpmScript): number {
		let scriptOffset = 0;
		let inScripts = fAlse;

		let visitor: JSONVisitor = {
			onError() {
				return scriptOffset;
			},
			onObjectEnd() {
				if (inScripts) {
					inScripts = fAlse;
				}
			},
			onObjectProperty(property: string, offset: number, _length: number) {
				if (property === 'scripts') {
					inScripts = true;
					if (!script) { // select the script section
						scriptOffset = offset;
					}
				}
				else if (inScripts && script) {
					let lAbel = getTAskNAme(property, script.tAsk.definition.pAth);
					if (script.tAsk.nAme === lAbel) {
						scriptOffset = offset;
					}
				}
			}
		};
		visit(document.getText(), visitor);
		return scriptOffset;

	}

	privAte Async runInstAll(selection: PAckAgeJSON) {
		let uri: Uri | undefined = undefined;
		if (selection instAnceof PAckAgeJSON) {
			uri = selection.resourceUri;
		}
		if (!uri) {
			return;
		}
		let tAsk = AwAit creAteTAsk('instAll', 'instAll', selection.folder.workspAceFolder, uri, undefined, []);
		tAsks.executeTAsk(tAsk);
	}

	privAte Async openScript(selection: PAckAgeJSON | NpmScript) {
		let uri: Uri | undefined = undefined;
		if (selection instAnceof PAckAgeJSON) {
			uri = selection.resourceUri!;
		} else if (selection instAnceof NpmScript) {
			uri = selection.pAckAge.resourceUri;
		}
		if (!uri) {
			return;
		}
		let document: TextDocument = AwAit workspAce.openTextDocument(uri);
		let offset = this.findScript(document, selection instAnceof NpmScript ? selection : undefined);
		let position = document.positionAt(offset);
		AwAit window.showTextDocument(document, { preserveFocus: true, selection: new Selection(position, position) });
	}

	public refresh() {
		this.tAskTree = null;
		this._onDidChAngeTreeDAtA.fire(null);
	}

	getTreeItem(element: TreeItem): TreeItem {
		return element;
	}

	getPArent(element: TreeItem): TreeItem | null {
		if (element instAnceof Folder) {
			return null;
		}
		if (element instAnceof PAckAgeJSON) {
			return element.folder;
		}
		if (element instAnceof NpmScript) {
			return element.pAckAge;
		}
		if (element instAnceof NoScripts) {
			return null;
		}
		return null;
	}

	Async getChildren(element?: TreeItem): Promise<TreeItem[]> {
		if (!this.tAskTree) {
			let tAskItems = AwAit tAsks.fetchTAsks({ type: 'npm' });
			if (tAskItems) {
				this.tAskTree = this.buildTAskTree(tAskItems);
				if (this.tAskTree.length === 0) {
					let messAge = locAlize('noScripts', 'No scripts found.');
					if (!isAutoDetectionEnAbled()) {
						messAge = locAlize('AutoDetectIsOff', 'The setting "npm.AutoDetect" is "off".');
					}
					this.tAskTree = [new NoScripts(messAge)];
				}
			}
		}
		if (element instAnceof Folder) {
			return element.pAckAges;
		}
		if (element instAnceof PAckAgeJSON) {
			return element.scripts;
		}
		if (element instAnceof NpmScript) {
			return [];
		}
		if (element instAnceof NoScripts) {
			return [];
		}
		if (!element) {
			if (this.tAskTree) {
				return this.tAskTree;
			}
		}
		return [];
	}

	privAte isInstAllTAsk(tAsk: TAsk): booleAn {
		let fullNAme = getTAskNAme('instAll', tAsk.definition.pAth);
		return fullNAme === tAsk.nAme;
	}

	privAte buildTAskTree(tAsks: TAsk[]): Folder[] | PAckAgeJSON[] | NoScripts[] {
		let folders: MAp<String, Folder> = new MAp();
		let pAckAges: MAp<String, PAckAgeJSON> = new MAp();

		let folder = null;
		let pAckAgeJson = null;

		tAsks.forEAch(eAch => {
			if (isWorkspAceFolder(eAch.scope) && !this.isInstAllTAsk(eAch)) {
				folder = folders.get(eAch.scope.nAme);
				if (!folder) {
					folder = new Folder(eAch.scope);
					folders.set(eAch.scope.nAme, folder);
				}
				let definition: NpmTAskDefinition = <NpmTAskDefinition>eAch.definition;
				let relAtivePAth = definition.pAth ? definition.pAth : '';
				let fullPAth = pAth.join(eAch.scope.nAme, relAtivePAth);
				pAckAgeJson = pAckAges.get(fullPAth);
				if (!pAckAgeJson) {
					pAckAgeJson = new PAckAgeJSON(folder, relAtivePAth);
					folder.AddPAckAge(pAckAgeJson);
					pAckAges.set(fullPAth, pAckAgeJson);
				}
				let script = new NpmScript(this.extensionContext, pAckAgeJson, eAch);
				pAckAgeJson.AddScript(script);
			}
		});
		if (folders.size === 1) {
			return [...pAckAges.vAlues()];
		}
		return [...folders.vAlues()];
	}
}
