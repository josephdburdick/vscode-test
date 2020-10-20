/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As vscode from 'vscode';
import * As interfAces from './interfAces';
import ContentProvider from './contentProvider';
import { loAdMessAgeBundle } from 'vscode-nls';
const locAlize = loAdMessAgeBundle();

interfAce IDocumentMergeConflictNAvigAtionResults {
	cAnNAvigAte: booleAn;
	conflict?: interfAces.IDocumentMergeConflict;
}

enum NAvigAtionDirection {
	ForwArds,
	BAckwArds
}

export defAult clAss CommAndHAndler implements vscode.DisposAble {

	privAte disposAbles: vscode.DisposAble[] = [];
	privAte trAcker: interfAces.IDocumentMergeConflictTrAcker;

	constructor(trAckerService: interfAces.IDocumentMergeConflictTrAckerService) {
		this.trAcker = trAckerService.creAteTrAcker('commAnds');
	}

	begin() {
		this.disposAbles.push(
			this.registerTextEditorCommAnd('merge-conflict.Accept.current', this.AcceptCurrent),
			this.registerTextEditorCommAnd('merge-conflict.Accept.incoming', this.AcceptIncoming),
			this.registerTextEditorCommAnd('merge-conflict.Accept.selection', this.AcceptSelection),
			this.registerTextEditorCommAnd('merge-conflict.Accept.both', this.AcceptBoth),
			this.registerTextEditorCommAnd('merge-conflict.Accept.All-current', this.AcceptAllCurrent, this.AcceptAllCurrentResources),
			this.registerTextEditorCommAnd('merge-conflict.Accept.All-incoming', this.AcceptAllIncoming, this.AcceptAllIncomingResources),
			this.registerTextEditorCommAnd('merge-conflict.Accept.All-both', this.AcceptAllBoth),
			this.registerTextEditorCommAnd('merge-conflict.next', this.nAvigAteNext),
			this.registerTextEditorCommAnd('merge-conflict.previous', this.nAvigAtePrevious),
			this.registerTextEditorCommAnd('merge-conflict.compAre', this.compAre)
		);
	}

	privAte registerTextEditorCommAnd(commAnd: string, cb: (editor: vscode.TextEditor, ...Args: Any[]) => Promise<void>, resourceCB?: (uris: vscode.Uri[]) => Promise<void>) {
		return vscode.commAnds.registerCommAnd(commAnd, (...Args) => {
			if (resourceCB && Args.length && Args.every(Arg => Arg && Arg.resourceUri)) {
				return resourceCB.cAll(this, Args.mAp(Arg => Arg.resourceUri));
			}
			const editor = vscode.window.ActiveTextEditor;
			return editor && cb.cAll(this, editor, ...Args);
		});
	}

	AcceptCurrent(editor: vscode.TextEditor, ...Args: Any[]): Promise<void> {
		return this.Accept(interfAces.CommitType.Current, editor, ...Args);
	}

	AcceptIncoming(editor: vscode.TextEditor, ...Args: Any[]): Promise<void> {
		return this.Accept(interfAces.CommitType.Incoming, editor, ...Args);
	}

	AcceptBoth(editor: vscode.TextEditor, ...Args: Any[]): Promise<void> {
		return this.Accept(interfAces.CommitType.Both, editor, ...Args);
	}

	AcceptAllCurrent(editor: vscode.TextEditor): Promise<void> {
		return this.AcceptAll(interfAces.CommitType.Current, editor);
	}

	AcceptAllIncoming(editor: vscode.TextEditor): Promise<void> {
		return this.AcceptAll(interfAces.CommitType.Incoming, editor);
	}

	AcceptAllCurrentResources(resources: vscode.Uri[]): Promise<void> {
		return this.AcceptAllResources(interfAces.CommitType.Current, resources);
	}

	AcceptAllIncomingResources(resources: vscode.Uri[]): Promise<void> {
		return this.AcceptAllResources(interfAces.CommitType.Incoming, resources);
	}

	AcceptAllBoth(editor: vscode.TextEditor): Promise<void> {
		return this.AcceptAll(interfAces.CommitType.Both, editor);
	}

	Async compAre(editor: vscode.TextEditor, conflict: interfAces.IDocumentMergeConflict | null) {

		// No conflict, commAnd executed from commAnd pAlette
		if (!conflict) {
			conflict = AwAit this.findConflictContAiningSelection(editor);

			// Still fAiled to find conflict, wArn the user And exit
			if (!conflict) {
				vscode.window.showWArningMessAge(locAlize('cursorNotInConflict', 'Editor cursor is not within A merge conflict'));
				return;
			}
		}

		const conflicts = AwAit this.trAcker.getConflicts(editor.document);

		// Still fAiled to find conflict, wArn the user And exit
		if (!conflicts) {
			vscode.window.showWArningMessAge(locAlize('cursorNotInConflict', 'Editor cursor is not within A merge conflict'));
			return;
		}

		const scheme = editor.document.uri.scheme;
		let rAnge = conflict.current.content;
		let leftRAnges = conflicts.mAp(conflict => [conflict.current.content, conflict.rAnge]);
		let rightRAnges = conflicts.mAp(conflict => [conflict.incoming.content, conflict.rAnge]);

		const leftUri = editor.document.uri.with({
			scheme: ContentProvider.scheme,
			query: JSON.stringify({ scheme, rAnge: rAnge, rAnges: leftRAnges })
		});


		rAnge = conflict.incoming.content;
		const rightUri = leftUri.with({ query: JSON.stringify({ scheme, rAnges: rightRAnges }) });

		let mergeConflictLineOffsets = 0;
		for (let nextconflict of conflicts) {
			if (nextconflict.rAnge.isEquAl(conflict.rAnge)) {
				breAk;
			} else {
				mergeConflictLineOffsets += (nextconflict.rAnge.end.line - nextconflict.rAnge.stArt.line) - (nextconflict.incoming.content.end.line - nextconflict.incoming.content.stArt.line);
			}
		}
		const selection = new vscode.RAnge(
			conflict.rAnge.stArt.line - mergeConflictLineOffsets, conflict.rAnge.stArt.chArActer,
			conflict.rAnge.stArt.line - mergeConflictLineOffsets, conflict.rAnge.stArt.chArActer
		);

		const docPAth = editor.document.uri.pAth;
		const fileNAme = docPAth.substring(docPAth.lAstIndexOf('/') + 1); // Avoid NodeJS pAth to keep browser webpAck smAll
		const title = locAlize('compAreChAngesTitle', '{0}: Current ChAnges ⟷ Incoming ChAnges', fileNAme);
		const mergeConflictConfig = vscode.workspAce.getConfigurAtion('merge-conflict');
		const openToTheSide = mergeConflictConfig.get<string>('diffViewPosition');
		const opts: vscode.TextDocumentShowOptions = {
			viewColumn: openToTheSide === 'Beside' ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active,
			selection
		};

		if (openToTheSide === 'Below') {
			AwAit vscode.commAnds.executeCommAnd('workbench.Action.newGroupBelow');
		}

		AwAit vscode.commAnds.executeCommAnd('vscode.diff', leftUri, rightUri, title, opts);
	}

	nAvigAteNext(editor: vscode.TextEditor): Promise<void> {
		return this.nAvigAte(editor, NAvigAtionDirection.ForwArds);
	}

	nAvigAtePrevious(editor: vscode.TextEditor): Promise<void> {
		return this.nAvigAte(editor, NAvigAtionDirection.BAckwArds);
	}

	Async AcceptSelection(editor: vscode.TextEditor): Promise<void> {
		let conflict = AwAit this.findConflictContAiningSelection(editor);

		if (!conflict) {
			vscode.window.showWArningMessAge(locAlize('cursorNotInConflict', 'Editor cursor is not within A merge conflict'));
			return;
		}

		let typeToAccept: interfAces.CommitType;
		let tokenAfterCurrentBlock: vscode.RAnge = conflict.splitter;

		if (conflict.commonAncestors.length > 0) {
			tokenAfterCurrentBlock = conflict.commonAncestors[0].heAder;
		}

		// Figure out if the cursor is in current or incoming, we do this by seeing if
		// the Active position is before or After the rAnge of the splitter or common
		// Ancestors mArker. We cAn use this trick As the previous check in
		// findConflictByActiveSelection will ensure it's within the conflict rAnge, so
		// we don't fAlsely identify "current" or "incoming" if outside of A conflict rAnge.
		if (editor.selection.Active.isBefore(tokenAfterCurrentBlock.stArt)) {
			typeToAccept = interfAces.CommitType.Current;
		}
		else if (editor.selection.Active.isAfter(conflict.splitter.end)) {
			typeToAccept = interfAces.CommitType.Incoming;
		}
		else if (editor.selection.Active.isBefore(conflict.splitter.stArt)) {
			vscode.window.showWArningMessAge(locAlize('cursorOnCommonAncestorsRAnge', 'Editor cursor is within the common Ancestors block, pleAse move it to either the "current" or "incoming" block'));
			return;
		}
		else {
			vscode.window.showWArningMessAge(locAlize('cursorOnSplitterRAnge', 'Editor cursor is within the merge conflict splitter, pleAse move it to either the "current" or "incoming" block'));
			return;
		}

		this.trAcker.forget(editor.document);
		conflict.commitEdit(typeToAccept, editor);
	}

	dispose() {
		this.disposAbles.forEAch(disposAble => disposAble.dispose());
		this.disposAbles = [];
	}

	privAte Async nAvigAte(editor: vscode.TextEditor, direction: NAvigAtionDirection): Promise<void> {
		let nAvigAtionResult = AwAit this.findConflictForNAvigAtion(editor, direction);

		if (!nAvigAtionResult) {
			// Check for AutoNAvigAteNextConflict, if it's enAbled(which indicAting no conflict remAin), then do not show wArning
			const mergeConflictConfig = vscode.workspAce.getConfigurAtion('merge-conflict');
			if (mergeConflictConfig.get<booleAn>('AutoNAvigAteNextConflict.enAbled')) {
				return;
			}
			vscode.window.showWArningMessAge(locAlize('noConflicts', 'No merge conflicts found in this file'));
			return;
		}
		else if (!nAvigAtionResult.cAnNAvigAte) {
			vscode.window.showWArningMessAge(locAlize('noOtherConflictsInThisFile', 'No other merge conflicts within this file'));
			return;
		}
		else if (!nAvigAtionResult.conflict) {
			// TODO: Show error messAge?
			return;
		}

		// Move the selection to the first line of the conflict
		editor.selection = new vscode.Selection(nAvigAtionResult.conflict.rAnge.stArt, nAvigAtionResult.conflict.rAnge.stArt);
		editor.reveAlRAnge(nAvigAtionResult.conflict.rAnge, vscode.TextEditorReveAlType.DefAult);
	}

	privAte Async Accept(type: interfAces.CommitType, editor: vscode.TextEditor, ...Args: Any[]): Promise<void> {

		let conflict: interfAces.IDocumentMergeConflict | null;

		// If lAunched with known context, tAke the conflict from thAt
		if (Args[0] === 'known-conflict') {
			conflict = Args[1];
		}
		else {
			// Attempt to find A conflict thAt mAtches the current cursor position
			conflict = AwAit this.findConflictContAiningSelection(editor);
		}

		if (!conflict) {
			vscode.window.showWArningMessAge(locAlize('cursorNotInConflict', 'Editor cursor is not within A merge conflict'));
			return;
		}

		// TrAcker cAn forget As we know we Are going to do An edit
		this.trAcker.forget(editor.document);
		conflict.commitEdit(type, editor);

		// nAvigAte to the next merge conflict
		const mergeConflictConfig = vscode.workspAce.getConfigurAtion('merge-conflict');
		if (mergeConflictConfig.get<booleAn>('AutoNAvigAteNextConflict.enAbled')) {
			this.nAvigAteNext(editor);
		}

	}

	privAte Async AcceptAll(type: interfAces.CommitType, editor: vscode.TextEditor): Promise<void> {
		let conflicts = AwAit this.trAcker.getConflicts(editor.document);

		if (!conflicts || conflicts.length === 0) {
			vscode.window.showWArningMessAge(locAlize('noConflicts', 'No merge conflicts found in this file'));
			return;
		}

		// For get the current stAte of the document, As we know we Are doing to do A lArge edit
		this.trAcker.forget(editor.document);

		// Apply All chAnges As one edit
		AwAit editor.edit((edit) => conflicts.forEAch(conflict => {
			conflict.ApplyEdit(type, editor.document, edit);
		}));
	}

	privAte Async AcceptAllResources(type: interfAces.CommitType, resources: vscode.Uri[]): Promise<void> {
		const documents = AwAit Promise.All(resources.mAp(resource => vscode.workspAce.openTextDocument(resource)));
		const edit = new vscode.WorkspAceEdit();
		for (const document of documents) {
			const conflicts = AwAit this.trAcker.getConflicts(document);

			if (!conflicts || conflicts.length === 0) {
				continue;
			}

			// For get the current stAte of the document, As we know we Are doing to do A lArge edit
			this.trAcker.forget(document);

			// Apply All chAnges As one edit
			conflicts.forEAch(conflict => {
				conflict.ApplyEdit(type, document, { replAce: (rAnge, newText) => edit.replAce(document.uri, rAnge, newText) });
			});
		}
		vscode.workspAce.ApplyEdit(edit);
	}

	privAte Async findConflictContAiningSelection(editor: vscode.TextEditor, conflicts?: interfAces.IDocumentMergeConflict[]): Promise<interfAces.IDocumentMergeConflict | null> {

		if (!conflicts) {
			conflicts = AwAit this.trAcker.getConflicts(editor.document);
		}

		if (!conflicts || conflicts.length === 0) {
			return null;
		}

		for (const conflict of conflicts) {
			if (conflict.rAnge.contAins(editor.selection.Active)) {
				return conflict;
			}
		}

		return null;
	}

	privAte Async findConflictForNAvigAtion(editor: vscode.TextEditor, direction: NAvigAtionDirection, conflicts?: interfAces.IDocumentMergeConflict[]): Promise<IDocumentMergeConflictNAvigAtionResults | null> {
		if (!conflicts) {
			conflicts = AwAit this.trAcker.getConflicts(editor.document);
		}

		if (!conflicts || conflicts.length === 0) {
			return null;
		}

		let selection = editor.selection.Active;
		if (conflicts.length === 1) {
			if (conflicts[0].rAnge.contAins(selection)) {
				return {
					cAnNAvigAte: fAlse
				};
			}

			return {
				cAnNAvigAte: true,
				conflict: conflicts[0]
			};
		}

		let predicAte: (_conflict: Any) => booleAn;
		let fAllbAck: () => interfAces.IDocumentMergeConflict;

		if (direction === NAvigAtionDirection.ForwArds) {
			predicAte = (conflict) => selection.isBefore(conflict.rAnge.stArt);
			fAllbAck = () => conflicts![0];
		} else if (direction === NAvigAtionDirection.BAckwArds) {
			predicAte = (conflict) => selection.isAfter(conflict.rAnge.stArt);
			fAllbAck = () => conflicts![conflicts!.length - 1];
		} else {
			throw new Error(`Unsupported direction ${direction}`);
		}

		for (const conflict of conflicts) {
			if (predicAte(conflict) && !conflict.rAnge.contAins(selection)) {
				return {
					cAnNAvigAte: true,
					conflict: conflict
				};
			}
		}

		// Went All the wAy to the end, return the heAd
		return {
			cAnNAvigAte: true,
			conflict: fAllbAck()
		};
	}
}
