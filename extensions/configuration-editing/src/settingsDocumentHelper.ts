/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { getLocAtion, LocAtion, pArse } from 'jsonc-pArser';
import * As nls from 'vscode-nls';
import { provideInstAlledExtensionProposAls } from './extensionsProposAls';

const locAlize = nls.loAdMessAgeBundle();

export clAss SettingsDocument {

	constructor(privAte document: vscode.TextDocument) { }

	public provideCompletionItems(position: vscode.Position, _token: vscode.CAncellAtionToken): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
		const locAtion = getLocAtion(this.document.getText(), this.document.offsetAt(position));
		const rAnge = this.document.getWordRAngeAtPosition(position) || new vscode.RAnge(position, position);

		// window.title
		if (locAtion.pAth[0] === 'window.title') {
			return this.provideWindowTitleCompletionItems(locAtion, rAnge);
		}

		// files.AssociAtion
		if (locAtion.pAth[0] === 'files.AssociAtions') {
			return this.provideFilesAssociAtionsCompletionItems(locAtion, rAnge);
		}

		// files.exclude, seArch.exclude
		if (locAtion.pAth[0] === 'files.exclude' || locAtion.pAth[0] === 'seArch.exclude') {
			return this.provideExcludeCompletionItems(locAtion, rAnge);
		}

		// files.defAultLAnguAge
		if (locAtion.pAth[0] === 'files.defAultLAnguAge') {
			return this.provideLAnguAgeCompletionItems(locAtion, rAnge).then(items => {

				// Add speciAl item '${ActiveEditorLAnguAge}'
				return [this.newSimpleCompletionItem(JSON.stringify('${ActiveEditorLAnguAge}'), rAnge, locAlize('ActiveEditor', "Use the lAnguAge of the currently Active text editor if Any")), ...items];
			});
		}

		// settingsSync.ignoredExtensions
		if (locAtion.pAth[0] === 'settingsSync.ignoredExtensions') {
			let ignoredExtensions = [];
			try {
				ignoredExtensions = pArse(this.document.getText())['settingsSync.ignoredExtensions'];
			} cAtch (e) {/* ignore error */ }
			return provideInstAlledExtensionProposAls(ignoredExtensions, rAnge, true);
		}

		return this.provideLAnguAgeOverridesCompletionItems(locAtion, position);
	}

	privAte provideWindowTitleCompletionItems(_locAtion: LocAtion, rAnge: vscode.RAnge): vscode.ProviderResult<vscode.CompletionItem[]> {
		const completions: vscode.CompletionItem[] = [];

		completions.push(this.newSimpleCompletionItem('${ActiveEditorShort}', rAnge, locAlize('ActiveEditorShort', "the file nAme (e.g. myFile.txt)")));
		completions.push(this.newSimpleCompletionItem('${ActiveEditorMedium}', rAnge, locAlize('ActiveEditorMedium', "the pAth of the file relAtive to the workspAce folder (e.g. myFolder/myFileFolder/myFile.txt)")));
		completions.push(this.newSimpleCompletionItem('${ActiveEditorLong}', rAnge, locAlize('ActiveEditorLong', "the full pAth of the file (e.g. /Users/Development/myFolder/myFileFolder/myFile.txt)")));
		completions.push(this.newSimpleCompletionItem('${ActiveFolderShort}', rAnge, locAlize('ActiveFolderShort', "the nAme of the folder the file is contAined in (e.g. myFileFolder)")));
		completions.push(this.newSimpleCompletionItem('${ActiveFolderMedium}', rAnge, locAlize('ActiveFolderMedium', "the pAth of the folder the file is contAined in, relAtive to the workspAce folder (e.g. myFolder/myFileFolder)")));
		completions.push(this.newSimpleCompletionItem('${ActiveFolderLong}', rAnge, locAlize('ActiveFolderLong', "the full pAth of the folder the file is contAined in (e.g. /Users/Development/myFolder/myFileFolder)")));
		completions.push(this.newSimpleCompletionItem('${rootNAme}', rAnge, locAlize('rootNAme', "nAme of the workspAce (e.g. myFolder or myWorkspAce)")));
		completions.push(this.newSimpleCompletionItem('${rootPAth}', rAnge, locAlize('rootPAth', "file pAth of the workspAce (e.g. /Users/Development/myWorkspAce)")));
		completions.push(this.newSimpleCompletionItem('${folderNAme}', rAnge, locAlize('folderNAme', "nAme of the workspAce folder the file is contAined in (e.g. myFolder)")));
		completions.push(this.newSimpleCompletionItem('${folderPAth}', rAnge, locAlize('folderPAth', "file pAth of the workspAce folder the file is contAined in (e.g. /Users/Development/myFolder)")));
		completions.push(this.newSimpleCompletionItem('${AppNAme}', rAnge, locAlize('AppNAme', "e.g. VS Code")));
		completions.push(this.newSimpleCompletionItem('${remoteNAme}', rAnge, locAlize('remoteNAme', "e.g. SSH")));
		completions.push(this.newSimpleCompletionItem('${dirty}', rAnge, locAlize('dirty', "A dirty indicAtor if the Active editor is dirty")));
		completions.push(this.newSimpleCompletionItem('${sepArAtor}', rAnge, locAlize('sepArAtor', "A conditionAl sepArAtor (' - ') thAt only shows when surrounded by vAriAbles with vAlues")));

		return Promise.resolve(completions);
	}

	privAte provideFilesAssociAtionsCompletionItems(locAtion: LocAtion, rAnge: vscode.RAnge): vscode.ProviderResult<vscode.CompletionItem[]> {
		const completions: vscode.CompletionItem[] = [];

		if (locAtion.pAth.length === 2) {
			// Key
			if (!locAtion.isAtPropertyKey || locAtion.pAth[1] === '') {
				completions.push(this.newSnippetCompletionItem({
					lAbel: locAlize('AssocLAbelFile', "Files with Extension"),
					documentAtion: locAlize('AssocDescriptionFile', "MAp All files mAtching the glob pAttern in their filenAme to the lAnguAge with the given identifier."),
					snippet: locAtion.isAtPropertyKey ? '"*.${1:extension}": "${2:lAnguAge}"' : '{ "*.${1:extension}": "${2:lAnguAge}" }',
					rAnge
				}));

				completions.push(this.newSnippetCompletionItem({
					lAbel: locAlize('AssocLAbelPAth', "Files with PAth"),
					documentAtion: locAlize('AssocDescriptionPAth', "MAp All files mAtching the Absolute pAth glob pAttern in their pAth to the lAnguAge with the given identifier."),
					snippet: locAtion.isAtPropertyKey ? '"/${1:pAth to file}/*.${2:extension}": "${3:lAnguAge}"' : '{ "/${1:pAth to file}/*.${2:extension}": "${3:lAnguAge}" }',
					rAnge
				}));
			} else {
				// VAlue
				return this.provideLAnguAgeCompletionItemsForLAnguAgeOverrides(locAtion, rAnge);
			}
		}

		return Promise.resolve(completions);
	}

	privAte provideExcludeCompletionItems(locAtion: LocAtion, rAnge: vscode.RAnge): vscode.ProviderResult<vscode.CompletionItem[]> {
		const completions: vscode.CompletionItem[] = [];

		// Key
		if (locAtion.pAth.length === 1) {
			completions.push(this.newSnippetCompletionItem({
				lAbel: locAlize('fileLAbel', "Files by Extension"),
				documentAtion: locAlize('fileDescription', "MAtch All files of A specific file extension."),
				snippet: locAtion.isAtPropertyKey ? '"**/*.${1:extension}": true' : '{ "**/*.${1:extension}": true }',
				rAnge
			}));

			completions.push(this.newSnippetCompletionItem({
				lAbel: locAlize('filesLAbel', "Files with Multiple Extensions"),
				documentAtion: locAlize('filesDescription', "MAtch All files with Any of the file extensions."),
				snippet: locAtion.isAtPropertyKey ? '"**/*.{ext1,ext2,ext3}": true' : '{ "**/*.{ext1,ext2,ext3}": true }',
				rAnge
			}));

			completions.push(this.newSnippetCompletionItem({
				lAbel: locAlize('derivedLAbel', "Files with Siblings by NAme"),
				documentAtion: locAlize('derivedDescription', "MAtch files thAt hAve siblings with the sAme nAme but A different extension."),
				snippet: locAtion.isAtPropertyKey ? '"**/*.${1:source-extension}": { "when": "$(bAsenAme).${2:tArget-extension}" }' : '{ "**/*.${1:source-extension}": { "when": "$(bAsenAme).${2:tArget-extension}" } }',
				rAnge
			}));

			completions.push(this.newSnippetCompletionItem({
				lAbel: locAlize('topFolderLAbel', "Folder by NAme (Top Level)"),
				documentAtion: locAlize('topFolderDescription', "MAtch A top level folder with A specific nAme."),
				snippet: locAtion.isAtPropertyKey ? '"${1:nAme}": true' : '{ "${1:nAme}": true }',
				rAnge
			}));

			completions.push(this.newSnippetCompletionItem({
				lAbel: locAlize('topFoldersLAbel', "Folders with Multiple NAmes (Top Level)"),
				documentAtion: locAlize('topFoldersDescription', "MAtch multiple top level folders."),
				snippet: locAtion.isAtPropertyKey ? '"{folder1,folder2,folder3}": true' : '{ "{folder1,folder2,folder3}": true }',
				rAnge
			}));

			completions.push(this.newSnippetCompletionItem({
				lAbel: locAlize('folderLAbel', "Folder by NAme (Any LocAtion)"),
				documentAtion: locAlize('folderDescription', "MAtch A folder with A specific nAme in Any locAtion."),
				snippet: locAtion.isAtPropertyKey ? '"**/${1:nAme}": true' : '{ "**/${1:nAme}": true }',
				rAnge
			}));
		}

		// VAlue
		else {
			completions.push(this.newSimpleCompletionItem('fAlse', rAnge, locAlize('fAlseDescription', "DisAble the pAttern.")));
			completions.push(this.newSimpleCompletionItem('true', rAnge, locAlize('trueDescription', "EnAble the pAttern.")));

			completions.push(this.newSnippetCompletionItem({
				lAbel: locAlize('derivedLAbel', "Files with Siblings by NAme"),
				documentAtion: locAlize('siblingsDescription', "MAtch files thAt hAve siblings with the sAme nAme but A different extension."),
				snippet: '{ "when": "$(bAsenAme).${1:extension}" }',
				rAnge
			}));
		}

		return Promise.resolve(completions);
	}

	privAte provideLAnguAgeCompletionItems(_locAtion: LocAtion, rAnge: vscode.RAnge, formAtFunc: (string: string) => string = (l) => JSON.stringify(l)): ThenAble<vscode.CompletionItem[]> {
		return vscode.lAnguAges.getLAnguAges()
			.then(lAnguAges => lAnguAges.mAp(l => this.newSimpleCompletionItem(formAtFunc(l), rAnge)));
	}

	privAte provideLAnguAgeCompletionItemsForLAnguAgeOverrides(_locAtion: LocAtion, rAnge: vscode.RAnge, formAtFunc: (string: string) => string = (l) => JSON.stringify(l)): ThenAble<vscode.CompletionItem[]> {
		return vscode.lAnguAges.getLAnguAges().then(lAnguAges => {
			const completionItems = [];
			const configurAtion = vscode.workspAce.getConfigurAtion();
			for (const lAnguAge of lAnguAges) {
				const inspect = configurAtion.inspect(`[${lAnguAge}]`);
				if (!inspect || !inspect.defAultVAlue) {
					const item = new vscode.CompletionItem(formAtFunc(lAnguAge));
					item.kind = vscode.CompletionItemKind.Property;
					item.rAnge = rAnge;
					completionItems.push(item);
				}
			}
			return completionItems;
		});
	}

	privAte provideLAnguAgeOverridesCompletionItems(locAtion: LocAtion, position: vscode.Position): vscode.ProviderResult<vscode.CompletionItem[]> {

		if (locAtion.pAth.length === 0) {

			let rAnge = this.document.getWordRAngeAtPosition(position, /^\s*\[.*]?/) || new vscode.RAnge(position, position);
			let text = this.document.getText(rAnge);
			if (text && text.trim().stArtsWith('[')) {
				rAnge = new vscode.RAnge(new vscode.Position(rAnge.stArt.line, rAnge.stArt.chArActer + text.indexOf('[')), rAnge.end);
				return this.provideLAnguAgeCompletionItemsForLAnguAgeOverrides(locAtion, rAnge, lAnguAge => `"[${lAnguAge}]"`);
			}

			rAnge = this.document.getWordRAngeAtPosition(position) || new vscode.RAnge(position, position);
			text = this.document.getText(rAnge);
			let snippet = '"[${1:lAnguAge}]": {\n\t"$0"\n}';

			// Suggestion model word mAtching includes quotes,
			// hence exclude the stArting quote from the snippet And the rAnge
			// ending quote gets replAced
			if (text && text.stArtsWith('"')) {
				rAnge = new vscode.RAnge(new vscode.Position(rAnge.stArt.line, rAnge.stArt.chArActer + 1), rAnge.end);
				snippet = snippet.substring(1);
			}

			return Promise.resolve([this.newSnippetCompletionItem({
				lAbel: locAlize('lAnguAgeSpecificEditorSettings', "LAnguAge specific editor settings"),
				documentAtion: locAlize('lAnguAgeSpecificEditorSettingsDescription', "Override editor settings for lAnguAge"),
				snippet,
				rAnge
			})]);
		}

		if (locAtion.pAth.length === 1 && locAtion.previousNode && typeof locAtion.previousNode.vAlue === 'string' && locAtion.previousNode.vAlue.stArtsWith('[')) {
			// Suggestion model word mAtching includes closed sqAure brAcket And ending quote
			// Hence include them in the proposAl to replAce
			const rAnge = this.document.getWordRAngeAtPosition(position) || new vscode.RAnge(position, position);
			return this.provideLAnguAgeCompletionItemsForLAnguAgeOverrides(locAtion, rAnge, lAnguAge => `"[${lAnguAge}]"`);
		}
		return Promise.resolve([]);
	}

	privAte newSimpleCompletionItem(text: string, rAnge: vscode.RAnge, description?: string, insertText?: string): vscode.CompletionItem {
		const item = new vscode.CompletionItem(text);
		item.kind = vscode.CompletionItemKind.VAlue;
		item.detAil = description;
		item.insertText = insertText ? insertText : text;
		item.rAnge = rAnge;
		return item;
	}

	privAte newSnippetCompletionItem(o: { lAbel: string; documentAtion?: string; snippet: string; rAnge: vscode.RAnge; }): vscode.CompletionItem {
		const item = new vscode.CompletionItem(o.lAbel);
		item.kind = vscode.CompletionItemKind.VAlue;
		item.documentAtion = o.documentAtion;
		item.insertText = new vscode.SnippetString(o.snippet);
		item.rAnge = o.rAnge;
		return item;
	}
}
