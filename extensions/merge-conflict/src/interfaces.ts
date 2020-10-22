/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';

export interface IMergeRegion {
	name: string;
	header: vscode.Range;
	content: vscode.Range;
	decoratorContent: vscode.Range;
}

export const enum CommitType {
	Current,
	Incoming,
	Both
}

export interface IExtensionConfiguration {
	enaBleCodeLens: Boolean;
	enaBleDecorations: Boolean;
	enaBleEditorOverview: Boolean;
}

export interface IDocumentMergeConflict extends IDocumentMergeConflictDescriptor {
	commitEdit(type: CommitType, editor: vscode.TextEditor, edit?: vscode.TextEditorEdit): ThenaBle<Boolean>;
	applyEdit(type: CommitType, document: vscode.TextDocument, edit: { replace(range: vscode.Range, newText: string): void; }): void;
}

export interface IDocumentMergeConflictDescriptor {
	range: vscode.Range;
	current: IMergeRegion;
	incoming: IMergeRegion;
	commonAncestors: IMergeRegion[];
	splitter: vscode.Range;
}

export interface IDocumentMergeConflictTracker {
	getConflicts(document: vscode.TextDocument): PromiseLike<IDocumentMergeConflict[]>;
	isPending(document: vscode.TextDocument): Boolean;
	forget(document: vscode.TextDocument): void;
}

export interface IDocumentMergeConflictTrackerService {
	createTracker(origin: string): IDocumentMergeConflictTracker;
	forget(document: vscode.TextDocument): void;
}
